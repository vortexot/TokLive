// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiveEvent } from '../src/domain/types';
import { createWorker, friendlyReason, type ConnectionRow, type Db, type LiveCallbacks } from './core';

function setup(rows: ConnectionRow[], connectImpl?: (handle: string, cb: LiveCallbacks) => Promise<void>) {
  const state = { rows, statuses: [] as { id: string; status: string; message: string | null }[], events: [] as { workspace_id: string; event: LiveEvent }[] };
  const callbacks = new Map<string, LiveCallbacks>();
  const closed: string[] = [];
  const db: Db = {
    listConnections: async () => state.rows,
    setStatus: async (id, status, message) => void state.statuses.push({ id, status, message }),
    insertEvents: async (r) => void state.events.push(...r),
  };
  const worker = createWorker({
    db,
    retryBaseMs: 1000,
    maxRetries: 2,
    connect: async (handle, cb) => {
      callbacks.set(handle, cb);
      if (connectImpl) await connectImpl(handle, cb);
      return { close: () => void closed.push(handle) };
    },
  });
  return { state, worker, callbacks, closed };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const row = (over: Partial<ConnectionRow> = {}): ConnectionRow => ({ workspace_id: 'ws1', handle: 'streamer', desired: 'connected', status: 'conectando', ...over });

describe('worker da LIVE', () => {
  it('conecta o que foi pedido, uma vez só, e grava eventos traduzidos', async () => {
    const { state, worker, callbacks } = setup([row()]);
    await worker.reconcile();
    await worker.reconcile();
    expect(worker.activeCount()).toBe(1);

    const cb = callbacks.get('streamer')!;
    cb.onConnected();
    cb.onMessage('chat', { user: { uniqueId: 'ana' }, comment: '!entrar' });
    cb.onMessage('gift', { user: { uniqueId: 'ana' }, giftDetails: { giftType: 2, diamondCount: 50 } });
    await worker.flush();
    expect(state.events.map((e) => e.event.type)).toEqual(['comment', 'gift']);
    expect(state.events.every((e) => e.workspace_id === 'ws1')).toBe(true);
    expect(state.statuses.at(-1)).toMatchObject({ status: 'conectado' });
  });

  it('soma curtidas do mesmo usuário na janela, sem misturar usuários', async () => {
    const { state, worker, callbacks } = setup([row()]);
    await worker.reconcile();
    const cb = callbacks.get('streamer')!;
    for (let i = 0; i < 40; i++) cb.onMessage('like', { user: { uniqueId: 'ana' }, likeCount: 2 });
    cb.onMessage('like', { user: { uniqueId: 'bia' }, likeCount: 5 });
    await worker.flush();
    expect(state.events.map((e) => e.event)).toEqual([
      { type: 'like', username: 'ana', count: 80 },
      { type: 'like', username: 'bia', count: 5 },
    ]);
  });

  it('desconecta quando o criador pede, e muda de @ reconectando no novo', async () => {
    const { state, worker, closed } = setup([row()]);
    await worker.reconcile();
    state.rows = [row({ handle: 'outro' })];
    await worker.reconcile();
    expect(closed).toEqual(['streamer']);
    expect(worker.activeCount()).toBe(1);
    state.rows = [row({ handle: 'outro', desired: 'disconnected', status: 'conectando' })];
    await worker.reconcile();
    expect(closed).toEqual(['streamer', 'outro']);
    expect(worker.activeCount()).toBe(0);
    expect(state.statuses.at(-1)).toMatchObject({ status: 'desconectado' });
  });

  it('falha ao conectar: tenta de novo com espera e depois mostra erro amigável', async () => {
    const { state, worker } = setup([row()], async () => {
      throw new Error('Room ID not found: user is offline');
    });
    await worker.reconcile();
    expect(state.statuses.at(-1)).toMatchObject({ status: 'reconectando' });
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    const last = state.statuses.at(-1)!;
    expect(last.status).toBe('erro');
    expect(last.message).toBe('A LIVE não está no ar agora. Inicie a LIVE e tente de novo.');
    expect(worker.activeCount()).toBe(0);
  });

  it('queda inesperada reconecta; fim da LIVE encerra e avisa o jogo', async () => {
    const { state, worker, callbacks } = setup([row()]);
    await worker.reconcile();
    callbacks.get('streamer')!.onClosed({ ended: false, reason: 'disconnected' });
    expect(state.statuses.at(-1)).toMatchObject({ status: 'reconectando' });
    await vi.advanceTimersByTimeAsync(1000);
    callbacks.get('streamer')!.onConnected();
    expect(state.statuses.at(-1)).toMatchObject({ status: 'conectado' });

    callbacks.get('streamer')!.onClosed({ ended: true });
    await worker.flush();
    expect(state.statuses.at(-1)).toMatchObject({ status: 'desconectado', message: 'A LIVE foi encerrada.' });
    expect(state.events.at(-1)!.event).toEqual({ type: 'live-end' });
    expect(worker.activeCount()).toBe(0);
  });

  it('separa os criadores: eventos de cada LIVE vão para o workspace certo', async () => {
    const { state, worker, callbacks } = setup([row(), row({ workspace_id: 'ws2', handle: 'outra' })]);
    await worker.reconcile();
    callbacks.get('streamer')!.onMessage('follow', { user: { uniqueId: 'x1' } });
    callbacks.get('outra')!.onMessage('follow', { user: { uniqueId: 'x2' } });
    await worker.flush();
    expect(state.events.map((e) => [e.workspace_id, (e.event as { username: string }).username])).toEqual([
      ['ws1', 'x1'],
      ['ws2', 'x2'],
    ]);
  });
});

describe('mensagens de erro', () => {
  it('traduz sem expor o texto interno', () => {
    expect(friendlyReason('USER_NOT_FOUND: user does not exist')).toContain('Não encontramos esse @');
    expect(friendlyReason('HTTP 429 rate limited')).toContain('limitando');
    expect(friendlyReason('boom stack trace')).toBe('Não foi possível conectar à LIVE. Tente de novo em instantes.');
  });
});
