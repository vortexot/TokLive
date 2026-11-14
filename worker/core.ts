// Núcleo do worker da LIVE: lê os pedidos de conexão gravados pelos criadores, mantém uma conexão por workspace,
// agrupa os eventos e os grava em live_events. Não conhece o TikTok nem o Supabase: recebe os dois por interface,
// o que permite testar tudo sem rede.

import type { LiveEvent } from '../src/domain/types';
import { normalizeWebcast, type WebcastKind } from '../src/services/liveEvents';

export interface ConnectionRow {
  workspace_id: string;
  handle: string | null;
  desired: 'connected' | 'disconnected';
  status: string;
}

export interface Db {
  listConnections(): Promise<ConnectionRow[]>;
  setStatus(workspaceId: string, status: string, message: string | null): Promise<void>;
  insertEvents(rows: { workspace_id: string; event: LiveEvent }[]): Promise<void>;
}

export interface LiveCallbacks {
  onMessage(kind: WebcastKind, data: unknown): void;
  onConnected(): void;
  /** Fim da LIVE ou queda da conexão. `ended` indica que a LIVE acabou (não adianta reconectar). */
  onClosed(info: { ended: boolean; reason?: string }): void;
}

export interface LiveConnection {
  close(): void;
}

export type ConnectFn = (handle: string, callbacks: LiveCallbacks) => Promise<LiveConnection>;

export interface WorkerOptions {
  db: Db;
  connect: ConnectFn;
  /** Intervalo da consulta aos pedidos (ms). */
  pollMs?: number;
  /** Intervalo de gravação dos eventos agrupados (ms). */
  flushMs?: number;
  /** Máximo de tentativas de reconexão depois de uma queda. */
  maxRetries?: number;
  retryBaseMs?: number;
  log?: (message: string) => void;
}

interface Session {
  handle: string;
  connection: LiveConnection | null;
  retries: number;
  closed: boolean;
  retryTimer?: ReturnType<typeof setTimeout>;
}

/** Dá um nome seguro ao erro para mostrar ao criador: nunca despeja mensagens internas da biblioteca. */
export function friendlyReason(raw: string | undefined): string {
  const text = (raw ?? '').toLowerCase();
  if (text.includes('offline') || text.includes('not live') || text.includes('isn\'t live') || text.includes('room id')) return 'A LIVE não está no ar agora. Inicie a LIVE e tente de novo.';
  if (text.includes('user') && (text.includes('not found') || text.includes('exist'))) return 'Não encontramos esse @ no TikTok. Confira como está escrito.';
  if (text.includes('rate') || text.includes('limit') || text.includes('429')) return 'O serviço de conexão está limitando pedidos. Aguarde um minuto e tente de novo.';
  return 'Não foi possível conectar à LIVE. Tente de novo em instantes.';
}

export function createWorker(options: WorkerOptions) {
  const { db, connect } = options;
  const pollMs = options.pollMs ?? 3000;
  const flushMs = options.flushMs ?? 500;
  const maxRetries = options.maxRetries ?? 5;
  const retryBase = options.retryBaseMs ?? 4000;
  const log = options.log ?? (() => undefined);

  const sessions = new Map<string, Session>();
  let buffer: { workspace_id: string; event: LiveEvent }[] = [];
  let flushTimer: ReturnType<typeof setInterval> | undefined;
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  const push = (workspaceId: string, kind: WebcastKind, data: unknown) => {
    for (const event of normalizeWebcast(kind, data as Record<string, unknown>)) {
      // Curtidas chegam aos montes: somam por usuário dentro da janela de gravação.
      if (event.type === 'like') {
        const same = buffer.find((b) => b.workspace_id === workspaceId && b.event.type === 'like' && b.event.username === event.username);
        if (same && same.event.type === 'like') {
          same.event = { ...same.event, count: same.event.count + event.count };
          continue;
        }
      }
      buffer.push({ workspace_id: workspaceId, event });
    }
  };

  const flush = async () => {
    if (!buffer.length) return;
    const rows = buffer;
    buffer = [];
    try {
      await db.insertEvents(rows);
    } catch (error) {
      log(`falha ao gravar ${rows.length} eventos: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const stopSession = (workspaceId: string) => {
    const s = sessions.get(workspaceId);
    if (!s) return;
    s.closed = true;
    clearTimeout(s.retryTimer);
    s.connection?.close();
    sessions.delete(workspaceId);
  };

  const start = async (workspaceId: string, handle: string) => {
    const session: Session = { handle, connection: null, retries: 0, closed: false };
    sessions.set(workspaceId, session);

    const attempt = async (): Promise<void> => {
      if (session.closed) return;
      try {
        session.connection = await connect(handle, {
          onMessage: (kind, data) => push(workspaceId, kind, data),
          onConnected: () => {
            session.retries = 0;
            void db.setStatus(workspaceId, 'conectado', null);
          },
          onClosed: ({ ended, reason }) => {
            if (session.closed) return;
            session.connection = null;
            if (ended) {
              void db.setStatus(workspaceId, 'desconectado', 'A LIVE foi encerrada.');
              push(workspaceId, 'streamEnd', {});
              sessions.delete(workspaceId);
              return;
            }
            scheduleRetry(reason);
          },
        });
      } catch (error) {
        scheduleRetry(error instanceof Error ? error.message : String(error));
      }
    };

    const scheduleRetry = (reason?: string) => {
      if (session.closed) return;
      if (session.retries >= maxRetries) {
        void db.setStatus(workspaceId, 'erro', friendlyReason(reason));
        sessions.delete(workspaceId);
        return;
      }
      session.retries += 1;
      void db.setStatus(workspaceId, session.retries === 1 && !reason ? 'conectando' : 'reconectando', null);
      session.retryTimer = setTimeout(() => void attempt(), retryBase * 2 ** (session.retries - 1));
    };

    await attempt();
  };

  /** Uma rodada: compara o que os criadores pediram com o que está de pé. */
  async function reconcile(): Promise<void> {
    let rows: ConnectionRow[];
    try {
      rows = await db.listConnections();
    } catch (error) {
      log(`falha ao ler pedidos: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    const wanted = new Map(rows.filter((r) => r.desired === 'connected' && r.handle).map((r) => [r.workspace_id, r.handle as string]));

    for (const [id, session] of sessions) {
      if (wanted.get(id) !== session.handle) stopSession(id);
    }
    for (const row of rows) {
      if (row.desired === 'disconnected' && row.status !== 'desconectado' && row.status !== 'erro') {
        void db.setStatus(row.workspace_id, 'desconectado', null);
      }
    }
    for (const [id, handle] of wanted) {
      if (!sessions.has(id)) {
        log(`conectando @${handle}`);
        await start(id, handle);
      }
    }
  }

  return {
    reconcile,
    flush,
    activeCount: () => sessions.size,
    run() {
      pollTimer = setInterval(() => void reconcile(), pollMs);
      flushTimer = setInterval(() => void flush(), flushMs);
      void reconcile();
    },
    async stop() {
      clearInterval(pollTimer);
      clearInterval(flushTimer);
      for (const id of [...sessions.keys()]) stopSession(id);
      await flush();
    },
  };
}
