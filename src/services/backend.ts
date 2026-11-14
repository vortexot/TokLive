// Camada do Supabase: login, dados do criador, pedido de conexão com a LIVE, eventos em tempo real e overlay.
// Fala com um "cliente mínimo" (SupabaseLike) em vez do SDK inteiro: o SDK real cabe nesse formato e os testes
// usam um cliente falso. Nada aqui conhece React.

import type { ConnectionStatus, LiveEvent } from '../domain/types';
import type { SessionSnapshot } from '../state/channel';
import { DataServiceError, type DataService, type StatisticsPayload } from './dataService';
import { emptyDataset, type DemoDataset } from './mockData';

/* ---------- formato mínimo do cliente ---------- */

interface Result<T> {
  data: T | null;
  error: { message: string } | null;
}

interface QueryLike<T = unknown> extends PromiseLike<Result<T>> {
  select(columns?: string): QueryLike<T>;
  eq(column: string, value: unknown): QueryLike<T>;
  is(column: string, value: null): QueryLike<T>;
  maybeSingle(): PromiseLike<Result<T>>;
  upsert(values: unknown, options?: { onConflict?: string }): QueryLike<T>;
  update(values: unknown): QueryLike<T>;
}

export interface RealtimeChannelLike {
  on(type: string, filter: Record<string, unknown>, callback: (payload: any) => void): RealtimeChannelLike;
  subscribe(callback?: (status: string) => void): RealtimeChannelLike;
  send(message: { type: 'broadcast'; event: string; payload: unknown }): Promise<unknown> | unknown;
  unsubscribe(): unknown;
}

export interface SupabaseLike {
  from(table: string): QueryLike<any>;
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<Result<any>>;
  channel(name: string, options?: Record<string, unknown>): RealtimeChannelLike;
  removeChannel(channel: RealtimeChannelLike): unknown;
  auth: {
    getSession(): PromiseLike<{ data: { session: { user: { id: string; email?: string | null } } | null } }>;
    onAuthStateChange(callback: (event: string, session: { user: { id: string; email?: string | null } } | null) => void): { data: { subscription: { unsubscribe(): void } } };
    signInWithPassword(credentials: { email: string; password: string }): PromiseLike<Result<unknown>>;
    signUp(credentials: { email: string; password: string }): PromiseLike<Result<{ session: unknown } | unknown>>;
    signOut(): PromiseLike<{ error: { message: string } | null }>;
  };
}

/* ---------- tipos públicos ---------- */

export interface WorkspaceInfo {
  id: string;
  name: string;
  overlayToken: string;
}

export interface LiveConnectionRow {
  handle: string | null;
  desired: 'connected' | 'disconnected';
  status: string;
  message: string | null;
}

/** Estado da conexão como o painel entende, a partir do texto gravado pelo worker. */
export function statusFromWorker(status: string): ConnectionStatus {
  switch (status) {
    case 'conectado':
    case 'ao-vivo':
      return 'ao-vivo';
    case 'conectando':
    case 'aguardando':
    case 'reconectando':
    case 'erro':
      return status;
    default:
      return 'desconectado';
  }
}

export interface LiveHandlers {
  onEvent(event: LiveEvent): void;
  onConnection(row: LiveConnectionRow): void;
}

export interface Backend {
  workspace: WorkspaceInfo;
  userEmail: string | null;
  dataService: DataService;
  /** Escuta eventos da LIVE (gravados pelo worker) e o andamento da conexão. Devolve o cancelamento. */
  subscribeLive(handlers: LiveHandlers): () => void;
  /** Pede ao worker para conectar ou desconectar. */
  requestConnection(handle: string, desired: 'connected' | 'disconnected'): Promise<void>;
  /** Publica o estado da partida para os overlays abertos com o token. */
  publishSnapshot(snapshot: SessionSnapshot): void;
  /** Gera um token novo e revoga o anterior. */
  rotateOverlayToken(): Promise<string>;
}

function fail(message: string, error: { message: string } | null): never {
  throw new DataServiceError(error ? `${message} (${error.message})` : message);
}

/* ---------- login ---------- */

export interface Session {
  userId: string;
  email: string | null;
}

export async function currentSession(client: SupabaseLike): Promise<Session | null> {
  const { data } = await client.auth.getSession();
  const user = data.session?.user;
  return user ? { userId: user.id, email: user.email ?? null } : null;
}

/** Mensagens de erro do login em português, sem expor detalhes técnicos. */
export function authMessage(raw: string): string {
  const text = raw.toLowerCase();
  if (text.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (text.includes('already registered') || text.includes('already been registered')) return 'Este e-mail já tem conta. Entre com a senha.';
  if (text.includes('password') && text.includes('least')) return 'A senha precisa de pelo menos 6 caracteres.';
  if (text.includes('email not confirmed')) return 'Confirme o e-mail pelo link que enviamos antes de entrar.';
  if (text.includes('rate limit') || text.includes('too many')) return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
  if (text.includes('network') || text.includes('failed to fetch')) return 'Sem conexão com o servidor. Verifique a internet.';
  return 'Não foi possível concluir. Tente novamente.';
}

/* ---------- espaço de trabalho ---------- */

export async function loadWorkspace(client: SupabaseLike): Promise<WorkspaceInfo> {
  const ws = await client.from('workspaces').select('id, name').maybeSingle();
  if (ws.error || !ws.data) fail('Não encontramos o seu espaço de trabalho.', ws.error);
  const id = (ws.data as { id: string }).id;
  const name = (ws.data as { name: string }).name;
  const tok = await client.from('overlay_tokens').select('token').eq('workspace_id', id).is('revoked_at', null).maybeSingle();
  let token = (tok.data as { token: string } | null)?.token;
  if (!token) {
    const rotated = await client.rpc('rotate_overlay_token');
    if (rotated.error || typeof rotated.data !== 'string') fail('Não foi possível criar o link do overlay.', rotated.error);
    token = rotated.data as string;
  }
  return { id, name, overlayToken: token };
}

/* ---------- dados do criador ---------- */

export interface RemoteDataOptions {
  now?: () => number;
  /** Intervalo mínimo entre gravações. */
  debounceMs?: number;
}

export function createRemoteDataService(client: SupabaseLike, workspaceId: string, options: RemoteDataOptions = {}): DataService {
  const now = options.now ?? Date.now;
  const debounceMs = options.debounceMs ?? 10_000;
  let shouldFail = false;
  let cache: DemoDataset | null = null;
  let pending: DemoDataset | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = async () => {
    timer = undefined;
    if (!pending) return;
    const dataset = pending;
    pending = null;
    await client.from('workspace_state').upsert({ workspace_id: workspaceId, dataset, updated_at: new Date(now()).toISOString() }, { onConflict: 'workspace_id' });
  };

  const guard = () => {
    if (shouldFail) {
      shouldFail = false;
      throw new DataServiceError('Não foi possível carregar os seus dados.');
    }
  };

  return {
    async loadDataset() {
      guard();
      const res = await client.from('workspace_state').select('dataset').eq('workspace_id', workspaceId).maybeSingle();
      if (res.error) fail('Não foi possível carregar os seus dados.', res.error);
      const stored = (res.data as { dataset?: DemoDataset } | null)?.dataset;
      cache = stored && stored.version === 1 && Array.isArray(stored.participants) ? stored : emptyDataset(now());
      return cache;
    },
    saveDataset(dataset) {
      cache = dataset;
      pending = dataset;
      // Grava no máximo uma vez por janela, mesmo com alterações contínuas durante a LIVE.
      timer ??= setTimeout(() => void flush(), debounceMs);
    },
    async resetDataset() {
      clearTimeout(timer);
      pending = null;
      cache = emptyDataset(now());
      await client.from('workspace_state').upsert({ workspace_id: workspaceId, dataset: cache }, { onConflict: 'workspace_id' });
      return cache;
    },
    async loadStatistics(rangeDays): Promise<StatisticsPayload> {
      guard();
      const dataset = cache ?? emptyDataset(now());
      return { days: dataset.history.slice(-(rangeDays - 1)) };
    },
    failNext(value) {
      shouldFail = value;
    },
  };
}

/* ---------- fábrica ---------- */

export async function createBackend(client: SupabaseLike, session: Session, options: RemoteDataOptions = {}): Promise<Backend> {
  const workspace = await loadWorkspace(client);
  const dataService = createRemoteDataService(client, workspace.id, options);
  let overlayChannel: RealtimeChannelLike | null = null;
  let overlayReady = false;
  let token = workspace.overlayToken;

  const openOverlayChannel = () => {
    if (overlayChannel) client.removeChannel(overlayChannel);
    overlayReady = false;
    overlayChannel = client.channel(`overlay:${token}`, { config: { broadcast: { self: false } } });
    overlayChannel.on('broadcast', { event: 'hello' }, () => lastSnapshot && send(lastSnapshot));
    overlayChannel.subscribe((status) => {
      overlayReady = status === 'SUBSCRIBED';
      if (overlayReady && lastSnapshot) send(lastSnapshot);
    });
  };
  let lastSnapshot: SessionSnapshot | null = null;
  const send = (snapshot: SessionSnapshot) => {
    if (overlayChannel && overlayReady) void overlayChannel.send({ type: 'broadcast', event: 'snapshot', payload: snapshot });
  };

  return {
    workspace,
    userEmail: session.email,
    dataService,

    subscribeLive(handlers) {
      const channel = client
        .channel(`live:${workspace.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_events', filter: `workspace_id=eq.${workspace.id}` }, (payload) => {
          const event = payload?.new?.event as LiveEvent | undefined;
          if (event && typeof event.type === 'string') handlers.onEvent(event);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_connections', filter: `workspace_id=eq.${workspace.id}` }, (payload) => {
          const row = payload?.new as LiveConnectionRow | undefined;
          if (row) handlers.onConnection(row);
        })
        .subscribe();
      // Estado atual, para o caso de a conexão já estar de pé quando o painel abre.
      void client
        .from('live_connections')
        .select('handle, desired, status, message')
        .eq('workspace_id', workspace.id)
        .maybeSingle()
        .then((res) => {
          if (res.data) handlers.onConnection(res.data as LiveConnectionRow);
        });
      return () => void client.removeChannel(channel);
    },

    async requestConnection(handle, desired) {
      const res = await client.from('live_connections').update({ handle, desired }).eq('workspace_id', workspace.id);
      if (res.error) fail('Não foi possível pedir a conexão.', res.error);
    },

    publishSnapshot(snapshot) {
      lastSnapshot = snapshot;
      if (!overlayChannel) openOverlayChannel();
      else send(snapshot);
    },

    async rotateOverlayToken() {
      const res = await client.rpc('rotate_overlay_token');
      if (res.error || typeof res.data !== 'string') fail('Não foi possível gerar um novo link.', res.error);
      token = res.data as string;
      workspace.overlayToken = token;
      openOverlayChannel();
      return token;
    },
  };
}

/* ---------- overlay (sem login) ---------- */

export interface OverlayLookup {
  valid: boolean;
  workspace: string | null;
  reason?: string;
}

export async function lookupOverlayToken(client: SupabaseLike, token: string): Promise<OverlayLookup> {
  if (!/^[0-9a-f]{32,64}$/.test(token)) return { valid: false, workspace: null, reason: 'Token inválido ou revogado.' };
  const res = await client.rpc('resolve_overlay_token', { p_token: token });
  if (res.error) return { valid: false, workspace: null, reason: 'Não foi possível verificar o token.' };
  const row = Array.isArray(res.data) ? (res.data[0] as { workspace_name?: string } | undefined) : undefined;
  return row ? { valid: true, workspace: row.workspace_name ?? 'arena' } : { valid: false, workspace: null, reason: 'Token inválido ou revogado.' };
}

/** Recebe os snapshots que o painel publica. Devolve o cancelamento. */
export function joinOverlay(client: SupabaseLike, token: string, onSnapshot: (snapshot: SessionSnapshot) => void): () => void {
  const channel = client.channel(`overlay:${token}`, { config: { broadcast: { self: false } } });
  channel.on('broadcast', { event: 'snapshot' }, (message) => {
    const snap = message?.payload as SessionSnapshot | undefined;
    if (snap && snap.v === 1) onSnapshot(snap);
  });
  channel.subscribe((status) => {
    // Pede o estado atual ao painel assim que entra no canal.
    if (status === 'SUBSCRIBED') void channel.send({ type: 'broadcast', event: 'hello', payload: {} });
  });
  return () => void client.removeChannel(channel);
}
