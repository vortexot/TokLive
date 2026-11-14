// Bonecos do Palco: os personagens que o criador cadastra (imagens ou vídeos que ele gera com IA, voz e falas).
// Só tipos e regras puras. A gravação dos arquivos fica em services/bonecoStore.ts.

export type MediaKind = 'imagem' | 'video';

/** Referência a um arquivo guardado. O conteúdo fica no armazenamento, separado dos dados do boneco. */
export interface MediaRef {
  id: string;
  kind: MediaKind;
  mime: string;
  name: string;
  size: number;
}

/** Estados visuais do boneco. "Parado" aparece sempre; "falando" substitui durante a fala, se existir. */
export type MediaSlot = 'parado' | 'falando';

export interface BonecoVoice {
  /** Tom da voz do navegador na demonstração: 0.5 (grave) a 2 (aguda). */
  pitch: number;
  /** Velocidade: 0.5 (lenta) a 1.5 (rápida). */
  rate: number;
}

export interface Boneco {
  id: string;
  name: string;
  /** Personalidade e jeito de falar. Vai para a IA quando ela for ligada. */
  persona: string;
  /** Falas prontas. `{nome}` vira o nome de quem pediu. Usadas na demonstração e quando a IA falhar. */
  phrases: string[];
  voice: BonecoVoice;
  /** Cor da placa atrás do boneco. */
  color: string;
  media: Record<MediaSlot, MediaRef | null>;
  createdAt: number;
  updatedAt: number;
}

export const NAME_MAX = 40;
export const PERSONA_MAX = 600;
export const PHRASE_MAX = 200;
export const PHRASES_MAX = 30;
export const MEDIA_MAX_BYTES = 25 * 1024 * 1024;

export const DEFAULT_VOICE: BonecoVoice = { pitch: 1, rate: 1 };
export const DEFAULT_COLOR = '#202026';

/** Formatos aceitos. PNG e WebP com fundo transparente e WebM com transparência ficam melhores em cena. */
export const MEDIA_TYPES: Record<string, MediaKind> = {
  'image/png': 'imagem',
  'image/webp': 'imagem',
  'image/gif': 'imagem',
  'image/jpeg': 'imagem',
  'video/webm': 'video',
  'video/mp4': 'video',
};

export const MEDIA_ACCEPT = Object.keys(MEDIA_TYPES).join(',');

export function mediaKindOf(mime: string): MediaKind | null {
  return MEDIA_TYPES[mime.toLowerCase()] ?? null;
}

/** Confere um arquivo antes de guardar. Devolve a mensagem de erro, ou null se estiver tudo certo. */
export function checkMediaFile(file: { type: string; size: number }): string | null {
  if (!mediaKindOf(file.type)) return 'Formato não aceito. Use PNG, WebP, GIF, JPG, WebM ou MP4.';
  if (file.size > MEDIA_MAX_BYTES) return 'Arquivo grande demais. O limite é 25 MB.';
  if (file.size === 0) return 'O arquivo está vazio.';
  return null;
}

/** Uma fala por linha, sem linhas vazias, sem repetidas e dentro dos limites. */
export function parsePhrases(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const clean = line.replace(/\s+/g, ' ').trim().slice(0, PHRASE_MAX);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= PHRASES_MAX) break;
  }
  return out;
}

export interface BonecoDraft {
  name: string;
  persona: string;
  phrasesText: string;
  voice: BonecoVoice;
  color: string;
}

export type DraftErrors = Partial<Record<'name', string>>;

export function validateDraft(draft: BonecoDraft, takenNames: readonly string[]): DraftErrors {
  const name = draft.name.trim();
  if (name.length < 2) return { name: 'Dê um nome com pelo menos 2 caracteres.' };
  if (name.length > NAME_MAX) return { name: `Use no máximo ${NAME_MAX} caracteres.` };
  if (takenNames.some((n) => n.trim().toLowerCase() === name.toLowerCase())) return { name: 'Já existe um boneco com esse nome.' };
  return {};
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export function normalizeColor(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : DEFAULT_COLOR;
}

/** Monta o boneco a partir do formulário. Mantém id, arquivos e data de criação de quem já existia. */
export function bonecoFromDraft(draft: BonecoDraft, base: { id: string; now: number; existing?: Boneco | null; media: Boneco['media'] }): Boneco {
  return {
    id: base.existing?.id ?? base.id,
    name: draft.name.trim().slice(0, NAME_MAX),
    persona: draft.persona.trim().slice(0, PERSONA_MAX),
    phrases: parsePhrases(draft.phrasesText),
    voice: { pitch: clamp(draft.voice.pitch, 0.5, 2), rate: clamp(draft.voice.rate, 0.5, 1.5) },
    color: normalizeColor(draft.color),
    media: base.media,
    createdAt: base.existing?.createdAt ?? base.now,
    updatedAt: base.now,
  };
}

export function draftFromBoneco(boneco: Boneco | null): BonecoDraft {
  return {
    name: boneco?.name ?? '',
    persona: boneco?.persona ?? '',
    phrasesText: boneco?.phrases.join('\n') ?? '',
    voice: boneco?.voice ?? DEFAULT_VOICE,
    color: boneco?.color ?? DEFAULT_COLOR,
  };
}

/** Lê o que veio do armazenamento sem confiar no formato: campos faltando ganham o padrão. */
export function sanitizeBoneco(raw: unknown): Boneco | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, any>;
  if (typeof r.id !== 'string' || typeof r.name !== 'string' || !r.name.trim()) return null;
  const media = (slot: MediaSlot): MediaRef | null => {
    const m = r.media?.[slot];
    if (!m || typeof m.id !== 'string' || typeof m.mime !== 'string') return null;
    const kind = mediaKindOf(m.mime);
    return kind ? { id: m.id, kind, mime: m.mime, name: String(m.name ?? ''), size: Number(m.size) || 0 } : null;
  };
  return {
    id: r.id,
    name: r.name.trim().slice(0, NAME_MAX),
    persona: typeof r.persona === 'string' ? r.persona.slice(0, PERSONA_MAX) : '',
    phrases: Array.isArray(r.phrases) ? parsePhrases(r.phrases.filter((p: unknown) => typeof p === 'string').join('\n')) : [],
    voice: { pitch: clamp(Number(r.voice?.pitch ?? 1), 0.5, 2), rate: clamp(Number(r.voice?.rate ?? 1), 0.5, 1.5) },
    color: normalizeColor(String(r.color ?? '')),
    media: { parado: media('parado'), falando: media('falando') },
    createdAt: Number(r.createdAt) || 0,
    updatedAt: Number(r.updatedAt) || 0,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
