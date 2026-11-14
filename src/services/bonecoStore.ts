// Onde os bonecos do Palco ficam guardados: no IndexedDB do navegador, que aguenta imagens e vídeos grandes
// (o localStorage tem cerca de 5 MB). Sem IndexedDB (modo privado, testes), tudo fica na memória da aba.
// Os dados de cada boneco e os arquivos ficam em lojas separadas: listar bonecos não carrega vídeo nenhum.

import { useEffect, useState, useSyncExternalStore } from 'react';
import { mediaKindOf, sanitizeBoneco, type Boneco, type MediaRef, type MediaSlot } from '../domain/bonecos';

const DB_NAME = 'tokarena-palco';
const DB_VERSION = 1;
const BONECOS = 'bonecos';
const MEDIA = 'media';

interface Backend {
  all(): Promise<unknown[]>;
  put(boneco: Boneco): Promise<void>;
  remove(id: string): Promise<void>;
  putBlob(id: string, blob: Blob): Promise<void>;
  getBlob(id: string): Promise<Blob | null>;
  removeBlobs(ids: string[]): Promise<void>;
}

function memoryBackend(): Backend {
  const bonecos = new Map<string, Boneco>();
  const blobs = new Map<string, Blob>();
  return {
    all: async () => [...bonecos.values()],
    put: async (b) => void bonecos.set(b.id, b),
    remove: async (id) => void bonecos.delete(id),
    putBlob: async (id, blob) => void blobs.set(id, blob),
    getBlob: async (id) => blobs.get(id) ?? null,
    removeBlobs: async (ids) => ids.forEach((id) => blobs.delete(id)),
  };
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Gravação cancelada.'));
  });
}

async function indexedDbBackend(): Promise<Backend> {
  const open = indexedDB.open(DB_NAME, DB_VERSION);
  open.onupgradeneeded = () => {
    const db = open.result;
    if (!db.objectStoreNames.contains(BONECOS)) db.createObjectStore(BONECOS, { keyPath: 'id' });
    if (!db.objectStoreNames.contains(MEDIA)) db.createObjectStore(MEDIA);
  };
  const db = await request(open);
  const store = (name: string, mode: IDBTransactionMode) => db.transaction(name, mode).objectStore(name);
  return {
    all: () => request(store(BONECOS, 'readonly').getAll()),
    put: async (b) => {
      const s = store(BONECOS, 'readwrite');
      s.put(b);
      await done(s.transaction);
    },
    remove: async (id) => {
      const s = store(BONECOS, 'readwrite');
      s.delete(id);
      await done(s.transaction);
    },
    putBlob: async (id, blob) => {
      const s = store(MEDIA, 'readwrite');
      s.put(blob, id);
      await done(s.transaction);
    },
    getBlob: async (id) => ((await request(store(MEDIA, 'readonly').get(id))) as Blob | undefined) ?? null,
    removeBlobs: async (ids) => {
      if (!ids.length) return;
      const s = store(MEDIA, 'readwrite');
      ids.forEach((id) => s.delete(id));
      await done(s.transaction);
    },
  };
}

let backendPromise: Promise<Backend> | null = null;

function backend(): Promise<Backend> {
  if (!backendPromise) {
    backendPromise =
      typeof indexedDB === 'undefined'
        ? Promise.resolve(memoryBackend())
        : indexedDbBackend().catch(() => memoryBackend());
  }
  return backendPromise;
}

/* Estado compartilhado: a lista de bonecos, para as duas abas do Palco lerem a mesma coisa */

export interface BonecosState {
  status: 'loading' | 'ready' | 'error';
  items: Boneco[];
  error: string | null;
}

let state: BonecosState = { status: 'loading', items: [], error: null };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: BonecosState) {
  state = next;
  listeners.forEach((l) => l());
}

const byCreation = (a: Boneco, b: Boneco) => a.createdAt - b.createdAt || a.name.localeCompare(b.name);

export function loadBonecos(): Promise<void> {
  if (!loading) {
    loading = backend()
      .then((b) => b.all())
      .then((rows) => {
        const items = rows.map(sanitizeBoneco).filter((b): b is Boneco => b !== null).sort(byCreation);
        setState({ status: 'ready', items, error: null });
      })
      .catch(() => {
        loading = null;
        setState({ status: 'error', items: [], error: 'Não foi possível abrir os bonecos guardados neste navegador.' });
      });
  }
  return loading;
}

export function useBonecos(): BonecosState {
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
  useEffect(() => {
    void loadBonecos();
  }, []);
  return snapshot;
}

export function newId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${random}`;
}

/** Arquivos escolhidos no formulário: novo arquivo, remover o atual, ou manter (ausente). */
export type MediaChanges = Partial<Record<MediaSlot, File | null>>;

/**
 * Grava o boneco e os arquivos novos. Os arquivos substituídos ou removidos são apagados depois,
 * só quando a gravação deu certo, para nunca deixar um boneco apontando para um arquivo que sumiu.
 */
export async function saveBoneco(boneco: Boneco, changes: MediaChanges = {}): Promise<Boneco> {
  const b = await backend();
  const previous = state.items.find((x) => x.id === boneco.id) ?? null;
  const media = { ...boneco.media };
  const orphans: string[] = [];
  for (const slot of ['parado', 'falando'] as const) {
    if (!(slot in changes)) continue;
    const file = changes[slot];
    const old = previous?.media[slot];
    if (old) orphans.push(old.id);
    if (!file) {
      media[slot] = null;
      continue;
    }
    const kind = mediaKindOf(file.type);
    if (!kind) throw new Error('Formato de arquivo não aceito.');
    const ref: MediaRef = { id: newId('m'), kind, mime: file.type, name: file.name, size: file.size };
    await b.putBlob(ref.id, file);
    media[slot] = ref;
  }
  const saved = { ...boneco, media };
  await b.put(saved);
  await b.removeBlobs(orphans).catch(() => undefined);
  orphans.forEach(forgetUrl);
  const items = previous ? state.items.map((x) => (x.id === saved.id ? saved : x)) : [...state.items, saved];
  setState({ status: 'ready', items: items.sort(byCreation), error: null });
  return saved;
}

export async function deleteBoneco(id: string): Promise<void> {
  const b = await backend();
  const target = state.items.find((x) => x.id === id);
  await b.remove(id);
  const ids = [target?.media.parado?.id, target?.media.falando?.id].filter((x): x is string => Boolean(x));
  await b.removeBlobs(ids).catch(() => undefined);
  ids.forEach(forgetUrl);
  setState({ ...state, items: state.items.filter((x) => x.id !== id) });
}

/* Endereços dos arquivos para <img> e <video>, criados uma vez por arquivo e reaproveitados */

const urls = new Map<string, Promise<string | null>>();

function forgetUrl(id: string) {
  const pending = urls.get(id);
  urls.delete(id);
  void pending?.then((url) => url && typeof URL.revokeObjectURL === 'function' && URL.revokeObjectURL(url));
}

function mediaUrl(id: string): Promise<string | null> {
  let pending = urls.get(id);
  if (!pending) {
    pending = backend()
      .then((b) => b.getBlob(id))
      .then((blob) => (blob && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : null))
      .catch(() => null);
    urls.set(id, pending);
  }
  return pending;
}

/** Endereço do arquivo guardado, ou null enquanto carrega (ou se ele não existir mais). */
export function useMediaUrl(ref: MediaRef | null | undefined): string | null {
  const id = ref?.id ?? null;
  const [loaded, setLoaded] = useState<{ id: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    void mediaUrl(id).then((url) => alive && setLoaded({ id, url }));
    return () => {
      alive = false;
    };
  }, [id]);
  return id && loaded?.id === id ? loaded.url : null;
}

/** Só para testes: volta ao estado inicial, com armazenamento novo na memória. */
export function resetBonecoStoreForTests(): void {
  backendPromise = Promise.resolve(memoryBackend());
  loading = null;
  urls.clear();
  state = { status: 'loading', items: [], error: null };
}
