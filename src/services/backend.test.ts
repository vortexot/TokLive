import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../state/app';
import type { SessionSnapshot } from '../state/channel';
import { authMessage, createBackend, joinOverlay, lookupOverlayToken, statusFromWorker, type SupabaseLike } from './backend';
import { readConfig } from './config';

/* Cliente falso com o mínimo que o backend usa: tabelas em memória, RPC, canais e login. */
function fakeClient(seed: Record<string, any[]> = {}) {
  const tables: Record<string, any[]> = { workspaces: [{ id: 'ws-1', name: 'alice' }], overlay_tokens: [{ token: 'a'.repeat(44), workspace_id: 'ws-1', revoked_at: null }], live_connections: [{ workspace_id: 'ws-1', handle: null, desired: 'disconnected', status: 'desconectado', message: null }], workspace_state: [], ...seed };
  const channels: any[] = [];
  const calls: { fn: string; args?: any }[] = [];

  const query = (table: string) => {
    const filters: [string, unknown][] = [];
    let patch: any = null;
    let upsertRow: any = null;
    const run = () => {
      let rows = tables[table] ?? [];
      for (const [col, val] of filters) rows = rows.filter((r) => (val === null ? r[col] === null : r[col] === val));
      if (upsertRow) {
        const i = (tables[table] ?? []).findIndex((r) => r.workspace_id === upsertRow.workspace_id);
        if (i >= 0) tables[table]![i] = { ...tables[table]![i], ...upsertRow };
        else tables[table]!.push(upsertRow);
        return { data: null, error: null };
      }
      if (patch) {
        rows.forEach((r) => Object.assign(r, patch));
        return { data: null, error: null };
      }
      return { data: rows[0] ?? null, error: null };
    };
    const q: any = {
      select: () => q,
      eq: (c: string, v: unknown) => (filters.push([c, v]), q),
      is: (c: string, v: null) => (filters.push([c, v]), q),
      update: (v: any) => ((patch = v), q),
      upsert: (v: any) => ((upsertRow = v), q),
      maybeSingle: () => Promise.resolve(run()),
      then: (ok: any, bad: any) => Promise.resolve(run()).then(ok, bad),
    };
    return q;
  };

  const client = {
    from: (t: string) => query(t),
    rpc: (fn: string, args?: any) => {
      calls.push({ fn, args });
      if (fn === 'rotate_overlay_token') {
        tables.overlay_tokens!.forEach((t) => (t.revoked_at = 'now'));
        const token = 'b'.repeat(44);
        tables.overlay_tokens!.push({ token, workspace_id: 'ws-1', revoked_at: null });
        return Promise.resolve({ data: token, error: null });
      }
      if (fn === 'resolve_overlay_token') {
        const row = tables.overlay_tokens!.find((t) => t.token === args.p_token && t.revoked_at === null);
        return Promise.resolve({ data: row ? [{ workspace_id: row.workspace_id, workspace_name: 'alice' }] : [], error: null });
      }
      return Promise.resolve({ data: null, error: { message: 'unknown rpc' } });
    },
    channel: (name: string) => {
      const handlers: { type: string; filter: any; cb: (p: any) => void }[] = [];
      const ch: any = {
        name,
        sent: [] as any[],
        handlers,
        on: (type: string, filter: any, cb: any) => (handlers.push({ type, filter, cb }), ch),
        subscribe: (cb?: (s: string) => void) => (cb?.('SUBSCRIBED'), ch),
        send: (m: any) => (ch.sent.push(m), Promise.resolve('ok')),
        unsubscribe: () => undefined,
      };
      channels.push(ch);
      return ch;
    },
    removeChannel: vi.fn(),
    auth: {} as any,
  };
  return { client: client as unknown as SupabaseLike, tables, channels, calls };
}

const session = { userId: 'u1', email: 'alice@example.com' };

describe('configuração em tempo de execução', () => {
  it('só considera configurado com URL https e chave', () => {
    expect(readConfig({})).toBeNull();
    expect(readConfig({ supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: '' })).toBeNull();
    expect(readConfig({ supabaseUrl: 'http://x.supabase.co', supabaseAnonKey: 'k' })).toBeNull();
    expect(readConfig({ supabaseUrl: 'não é url', supabaseAnonKey: 'k' })).toBeNull();
    expect(readConfig({ supabaseUrl: 'https://x.supabase.co/', supabaseAnonKey: ' k ' })).toEqual({ supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'k' });
    expect(readConfig({ supabaseUrl: 'http://localhost:54321', supabaseAnonKey: 'k' })).not.toBeNull();
  });
});

describe('mensagens', () => {
  it('traduz erros de login sem vazar detalhes técnicos', () => {
    expect(authMessage('Invalid login credentials')).toBe('E-mail ou senha incorretos.');
    expect(authMessage('User already registered')).toContain('já tem conta');
    expect(authMessage('algo estranho no servidor 500')).toBe('Não foi possível concluir. Tente novamente.');
  });
  it('mapeia o andamento gravado pelo worker', () => {
    expect(statusFromWorker('conectado')).toBe('ao-vivo');
    expect(statusFromWorker('erro')).toBe('erro');
    expect(statusFromWorker('qualquer')).toBe('desconectado');
  });
});

describe('espaço de trabalho e dados', () => {
  it('carrega o workspace e o token ativo', async () => {
    const { client } = fakeClient();
    const backend = await createBackend(client, session);
    expect(backend.workspace).toEqual({ id: 'ws-1', name: 'alice', overlayToken: 'a'.repeat(44) });
  });

  it('conta nova começa vazia, sem dados inventados, e grava com atraso', async () => {
    vi.useFakeTimers();
    const { client, tables } = fakeClient();
    const backend = await createBackend(client, session, { debounceMs: 500, now: () => Date.UTC(2026, 10, 12) });
    const dataset = await backend.dataService.loadDataset();
    expect(dataset.participants).toEqual([]);
    expect(dataset.counters.events).toBe(0);

    backend.dataService.saveDataset({ ...dataset, bestRaceSeconds: 42 });
    backend.dataService.saveDataset({ ...dataset, bestRaceSeconds: 41 });
    expect(tables.workspace_state).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(600);
    expect(tables.workspace_state).toHaveLength(1);
    expect(tables.workspace_state![0].dataset.bestRaceSeconds).toBe(41);

    const again = await backend.dataService.loadDataset();
    expect(again.bestRaceSeconds).toBe(41);
    vi.useRealTimers();
  });

  it('pede conexão à LIVE gravando o @ e o desejo', async () => {
    const { client, tables } = fakeClient();
    const backend = await createBackend(client, session);
    await backend.requestConnection('streamer.demo', 'connected');
    expect(tables.live_connections![0]).toMatchObject({ handle: 'streamer.demo', desired: 'connected' });
  });

  it('gira o token do overlay', async () => {
    const { client } = fakeClient();
    const backend = await createBackend(client, session);
    const fresh = await backend.rotateOverlayToken();
    expect(fresh).toBe('b'.repeat(44));
    expect(backend.workspace.overlayToken).toBe(fresh);
  });
});

describe('overlay pela internet', () => {
  it('valida o token pelo servidor e recusa formatos estranhos sem consultar', async () => {
    const { client, calls } = fakeClient();
    expect((await lookupOverlayToken(client, 'a'.repeat(44))).valid).toBe(true);
    expect((await lookupOverlayToken(client, 'b'.repeat(44))).valid).toBe(false);
    const before = calls.length;
    expect((await lookupOverlayToken(client, "x'; drop table")).valid).toBe(false);
    expect(calls.length).toBe(before);
  });

  it('o painel publica o estado e o overlay o recebe', async () => {
    const { client, channels } = fakeClient();
    const backend = await createBackend(client, session);
    const received: SessionSnapshot[] = [];
    const stop = joinOverlay(client, 'a'.repeat(44), (s) => received.push(s));
    const overlayCh = channels.find((c) => c.name === `overlay:${'a'.repeat(44)}`)!;
    expect(overlayCh.sent[0]).toMatchObject({ event: 'hello' });

    const snap = { v: 1, at: 1 } as SessionSnapshot;
    overlayCh.handlers.find((h: any) => h.filter.event === 'snapshot').cb({ payload: snap });
    expect(received).toEqual([snap]);
    overlayCh.handlers.find((h: any) => h.filter.event === 'snapshot').cb({ payload: { v: 2 } });
    expect(received).toHaveLength(1);

    backend.publishSnapshot(snap);
    const panelCh = channels.filter((c) => c.name === `overlay:${'a'.repeat(44)}`).at(-1)!;
    expect(panelCh.sent.some((m: any) => m.event === 'snapshot' && m.payload === snap)).toBe(true);
    stop();
  });
});

describe('painel com conta: eventos reais entram no jogo', () => {
  it('um evento gravado pelo worker chega ao motor e o andamento da conexão atualiza o estado', async () => {
    const { client, channels, tables } = fakeClient();
    tables.live_connections![0] = { workspace_id: 'ws-1', handle: 'streamer.demo', desired: 'connected', status: 'conectado', message: null };
    const backend = await createBackend(client, session);
    const app = createApp({ role: 'panel', persist: false, backend });
    await app.actions.bootstrap();
    const stop = app.start();

    const liveCh = channels.find((c) => c.name === `live:ws-1`)!;
    const onInsert = liveCh.handlers.find((h: any) => h.filter.table === 'live_events').cb;
    onInsert({ new: { event: { type: 'follow', username: 'ana.real' } } });
    onInsert({ new: { event: { type: 'gift', username: 'ana.real', gift: 'foguete' } } });
    // Eventos remotos são aplicados em lote (até 10 vezes por segundo).
    expect(app.store.getState().participants.map((p) => p.username)).not.toContain('ana.real');
    await new Promise((r) => setTimeout(r, 150));
    const s = app.store.getState();
    expect(s.participants.map((p) => p.username)).toContain('ana.real');
    expect(s.counters.gifts).toBe(1);

    await Promise.resolve();
    await Promise.resolve();
    expect(app.store.getState().connection.status).toBe('ao-vivo');
    expect(app.store.getState().connection.handle).toBe('streamer.demo');

    // Conectar pelo painel pede ao worker, não simula.
    app.actions.disconnect();
    await Promise.resolve();
    expect(tables.live_connections![0].desired).toBe('disconnected');
    stop();
  });
});
