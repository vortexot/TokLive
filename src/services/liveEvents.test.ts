import { beforeEach, describe, expect, it } from 'vitest';
import { createRng } from '../domain/prng';
import { createApp } from '../state/app';
import { createLocalDataService } from './dataService';
import { giftFromDiamonds, MAX_GIFT_REPEATS, normalizeWebcast } from './liveEvents';

describe('presentes: faixas de valor', () => {
  it.each([
    [0, 'faisca'],
    [1, 'faisca'],
    [9, 'faisca'],
    [10, 'escudo'],
    [29, 'escudo'],
    [30, 'foguete'],
    [99, 'foguete'],
    [100, 'meteoro'],
    [34999, 'meteoro'],
    [Number.NaN, 'faisca'],
  ])('%s diamantes vira %s', (diamonds, gift) => {
    expect(giftFromDiamonds(diamonds)).toBe(gift);
  });
});

describe('tradução de mensagens da LIVE', () => {
  it('lê usuário no formato novo (user.uniqueId) e no antigo (uniqueId)', () => {
    expect(normalizeWebcast('chat', { user: { uniqueId: 'Ana.Live' }, comment: '!entrar' })).toEqual([{ type: 'comment', username: 'Ana.Live', text: '!entrar' }]);
    expect(normalizeWebcast('chat', { uniqueId: 'bia', comment: 'oi' })).toEqual([{ type: 'comment', username: 'bia', text: 'oi' }]);
    expect(normalizeWebcast('follow', { user: { uniqueId: 'caio' } })).toEqual([{ type: 'follow', username: 'caio' }]);
    expect(normalizeWebcast('share', { uniqueId: 'duda' })).toEqual([{ type: 'share', username: 'duda' }]);
  });

  it('ignora mensagens sem usuário ou sem texto', () => {
    expect(normalizeWebcast('chat', { comment: 'oi' })).toEqual([]);
    expect(normalizeWebcast('chat', { user: { uniqueId: 'x' }, comment: '   ' })).toEqual([]);
    expect(normalizeWebcast('gift', {})).toEqual([]);
    expect(normalizeWebcast('like', null)).toEqual([]);
  });

  it('curtida usa a quantidade do evento', () => {
    expect(normalizeWebcast('like', { user: { uniqueId: 'eli' }, likeCount: 15, totalLikeCount: 900 })).toEqual([{ type: 'like', username: 'eli', count: 15 }]);
    expect(normalizeWebcast('like', { user: { uniqueId: 'eli' } })).toEqual([{ type: 'like', username: 'eli', count: 1 }]);
    expect(normalizeWebcast('like', { user: { uniqueId: 'eli' }, likeCount: 0 })).toEqual([]);
  });

  it('presente simples conta uma vez, com o valor da faixa', () => {
    const data = { user: { uniqueId: 'fabi' }, giftDetails: { giftType: 2, diamondCount: 99 }, repeatCount: 1 };
    expect(normalizeWebcast('gift', data)).toEqual([{ type: 'gift', username: 'fabi', gift: 'foguete' }]);
  });

  it('presente em combo só conta no fim, uma vez por repetição, com teto', () => {
    const mid = { user: { uniqueId: 'gui' }, giftDetails: { giftType: 1, diamondCount: 1 }, repeatCount: 3, repeatEnd: false };
    expect(normalizeWebcast('gift', mid)).toEqual([]);
    const end = { ...mid, repeatEnd: true, repeatCount: 3 };
    expect(normalizeWebcast('gift', end)).toHaveLength(3);
    expect(normalizeWebcast('gift', { ...end, repeatCount: 500 })).toHaveLength(MAX_GIFT_REPEATS);
  });

  it('fim da LIVE', () => {
    expect(normalizeWebcast('streamEnd', {})).toEqual([{ type: 'live-end' }]);
  });
});

beforeEach(() => window.localStorage.clear());

describe('integração: eventos reais beneficiam quem interagiu', () => {
  async function app() {
    const now = () => Date.UTC(2026, 10, 12, 15, 0, 0);
    const a = createApp({ role: 'panel', persist: false, now, rng: createRng('compat'), dataService: createLocalDataService({ latencyMs: 0, now }) });
    await a.actions.bootstrap();
    return a;
  }

  it('um presente real vira poder no personagem de quem enviou, mesmo sem ter seguido antes', async () => {
    const { store, actions } = await app();
    actions.selectGame('batatinha');
    actions.startMatch();
    const racerId = store.getState().match!.racers[0]!.participantId;
    const name = store.getState().participants.find((p) => p.id === racerId)!.username;
    for (const e of normalizeWebcast('gift', { user: { uniqueId: name }, giftDetails: { giftType: 2, diamondCount: 40 } })) actions.emit(e);
    expect(store.getState().match!.racers.find((r) => r.participantId === racerId)!.boostUntil).toBeGreaterThan(0);

    for (const e of normalizeWebcast('gift', { user: { uniqueId: 'DoadorNovo_9' }, giftDetails: { giftType: 2, diamondCount: 5 } })) actions.emit(e);
    const s = store.getState();
    const donor = s.participants.find((p) => p.username === 'doadornovo_9');
    expect(donor).toBeDefined();
    expect(s.lobby[0]).toBe(donor!.id);
  });

  it('curtidas reais de quem joga viram impulso só para ele', async () => {
    const { store, actions } = await app();
    actions.selectGame('futebol');
    actions.startMatch();
    const [first, second] = store.getState().match!.racers;
    const name = store.getState().participants.find((p) => p.id === first!.participantId)!.username;
    for (const e of normalizeWebcast('like', { user: { uniqueId: name }, likeCount: 25 })) actions.emit(e);
    const racers = store.getState().match!.racers;
    expect(racers.find((r) => r.participantId === first!.participantId)!.boostUntil).toBeGreaterThan(0);
    expect(racers.find((r) => r.participantId === second!.participantId)!.boostUntil).toBe(0);
  });
});
