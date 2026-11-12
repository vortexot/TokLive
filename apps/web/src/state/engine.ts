// Motor de eventos e de partida. Funções puras: (estado, entrada, contexto) → novo estado.
// Nada aqui lê relógio, aleatoriedade global ou rede. Quando a integração real chegar,
// os eventos que ela entregar passam por applyLiveEvent exatamente como os do simulador.

import { defaultGameConfigs, getGame, isPlayable, sanitizeGameConfig } from '../domain/games';
import { getGift } from '../domain/gifts';
import { uniqueUsername } from '../domain/names';
import { pick, shuffle } from '../domain/prng';
import {
  advanceMatch,
  applyGiftPower,
  applyTurbo,
  createRace,
  endMatchEarly,
  pauseMatch as pauseRace,
  resumeMatch as resumeRace,
} from '../domain/race';
import { RANK_VIEWS_TRACKED, rankSnapshot } from '../domain/ranking';
import { DEFAULT_CONNECTION, DEFAULT_POLL, DEFAULT_SETTINGS, type EffectKind, type Settings } from '../domain/session';
import type {
  ActivityItem,
  ConnectionStatus,
  GameConfig,
  GameId,
  LiveEvent,
  MatchState,
  Participant,
} from '../domain/types';
import type { DemoDataset } from '../services/mockData';
import type { AppState, Ctx } from './types';

export const INACTIVE_AFTER_MS = 14 * 86_400_000;
const ACTIVITY_LIMIT = 60;
const CHAT_LIMIT = 40;
const EFFECT_LIFETIME_MS = 9000;
const TURBO_SECONDS = 6;
const MIN_FILL = 12;

/* ---------- Construção do estado inicial ---------- */

export interface PersistedPrefs {
  settings?: Partial<Settings>;
  selectedGameId?: GameId | null;
  handle?: string;
  scenario?: AppState['connection']['scenario'];
  lastConnectedAt?: number | null;
}

export function createInitialState(): AppState {
  const now = 0;
  return {
    ready: false,
    loadError: null,
    settings: DEFAULT_SETTINGS,
    connection: DEFAULT_CONNECTION,
    participants: [],
    rankPrev: {},
    gameConfigs: defaultGameConfigs(),
    gameOpens: { corrida: 0, 'chao-de-lava': 0, 'batalha-empurroes': 0, batatinha: 0, futebol: 0, plataformas: 0 },
    selectedGameId: null,
    lobby: [],
    match: null,
    matchHistory: [],
    bestRaceSeconds: null,
    counters: { likes: 0, comments: 0, gifts: 0, shares: 0, follows: 0, events: 0 },
    goal: { target: DEFAULT_SETTINGS.likeGoalTarget, progress: 0, level: 1, reached: 0 },
    poll: DEFAULT_POLL,
    history: [],
    today: { date: '', participants: 0, newParticipants: 0, matches: 0, events: 0, playMinutes: 0 },
    hourly: Array(24).fill(0),
    activity: [],
    chat: [],
    effects: [],
    toasts: [],
    notificationsReadAt: now,
    simulator: { open: false, auto: false, rate: 2 },
  };
}

export function hydrate(state: AppState, dataset: DemoDataset, prefs: PersistedPrefs | null, ctx: Ctx): AppState {
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...prefs?.settings,
    overlay: { ...DEFAULT_SETTINGS.overlay, ...prefs?.settings?.overlay },
    profile: { ...DEFAULT_SETTINGS.profile, ...prefs?.settings?.profile },
  };
  const gameConfigs = defaultGameConfigs();
  for (const id of Object.keys(gameConfigs) as GameId[]) {
    gameConfigs[id] = sanitizeGameConfig(id, dataset.gameConfigs?.[id]);
  }
  const selected = prefs?.selectedGameId && prefs.selectedGameId in gameConfigs ? prefs.selectedGameId : null;
  return {
    ...state,
    ready: true,
    loadError: null,
    settings,
    connection: {
      ...DEFAULT_CONNECTION,
      handle: prefs?.handle ?? '',
      scenario: prefs?.scenario ?? 'ao-vivo',
      lastConnectedAt: prefs?.lastConnectedAt ?? null,
    },
    participants: dataset.participants,
    rankPrev: dataset.rankPrev,
    gameConfigs,
    gameOpens: dataset.gameOpens,
    selectedGameId: selected,
    matchHistory: dataset.matchHistory,
    bestRaceSeconds: dataset.bestRaceSeconds,
    counters: dataset.counters,
    goal: { target: settings.likeGoalTarget, progress: Math.round(settings.likeGoalTarget * 0.34), level: 1, reached: 0 },
    history: dataset.history,
    today: dataset.today,
    hourly: dataset.hourly,
    notificationsReadAt: ctx.now,
    activity: seedActivity(dataset, ctx),
  };
}

function seedActivity(dataset: DemoDataset, ctx: Ctx): ActivityItem[] {
  const recent = dataset.participants
    .slice()
    .sort((a, b) => b.joinedAt - a.joinedAt)
    .slice(0, 3);
  const items: ActivityItem[] = [];
  const last = dataset.matchHistory[0];
  if (last) {
    items.push({
      id: ctx.id('a'),
      at: last.endedAt,
      kind: 'partida',
      title: 'Partida encerrada',
      detail: last.winnerName ? `Vitória de @${last.winnerName}` : 'Sem vencedor',
    });
  }
  for (const p of recent) {
    items.push({ id: ctx.id('a'), at: p.joinedAt, kind: 'participante', title: 'Novo participante', detail: `@${p.username}`, username: p.username });
  }
  return items.sort((a, b) => b.at - a.at);
}

/* ---------- Utilidades ---------- */

export function normalizeUsername(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const clean = raw.trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 24);
  return clean.length >= 2 ? clean : undefined;
}

export function participantStatus(state: AppState, p: Participant, now: number) {
  if (state.match && state.match.status !== 'encerrada' && state.match.racers.some((r) => r.participantId === p.id)) {
    return 'em-partida' as const;
  }
  if (state.lobby.includes(p.id)) return 'na-fila' as const;
  if (now - p.lastSeenAt > INACTIVE_AFTER_MS) return 'inativo' as const;
  return 'ativo' as const;
}

export function isMatchActive(match: MatchState | null): boolean {
  return !!match && match.status !== 'encerrada';
}

function findByUsername(state: AppState, username: string): Participant | undefined {
  return state.participants.find((p) => p.username === username);
}

function pickParticipant(state: AppState, ctx: Ctx): Participant | undefined {
  const pool = state.participants.filter((p) => ctx.now - p.lastSeenAt <= INACTIVE_AFTER_MS);
  return pool.length ? pick(ctx.rng, pool) : state.participants[0];
}

function pushActivity(state: AppState, item: Omit<ActivityItem, 'id' | 'at'>, ctx: Ctx): AppState {
  const entry: ActivityItem = { id: ctx.id('a'), at: ctx.now, ...item };
  return { ...state, activity: [entry, ...state.activity].slice(0, ACTIVITY_LIMIT) };
}

function pushEffect(state: AppState, kind: EffectKind, title: string, detail: string | undefined, ctx: Ctx): AppState {
  return { ...state, effects: [...state.effects, { id: ctx.id('e'), at: ctx.now, kind, title, detail }] };
}

export function pushToast(
  state: AppState,
  toast: Omit<AppState['toasts'][number], 'id'>,
  ctx: Ctx,
): AppState {
  return { ...state, toasts: [...state.toasts, { id: ctx.id('t'), ...toast }].slice(-4) };
}

export function dismissToast(state: AppState, id: string): AppState {
  return { ...state, toasts: state.toasts.filter((t) => t.id !== id) };
}

function toastForEvent(state: AppState, toast: Omit<AppState['toasts'][number], 'id'>, ctx: Ctx): AppState {
  return state.settings.toastEvents ? pushToast(state, toast, ctx) : state;
}

function bumpEvent(state: AppState, ctx: Ctx, extra: Partial<AppState['counters']> = {}): AppState {
  const hour = new Date(ctx.now).getHours();
  const hourly = state.hourly.slice();
  hourly[hour] = (hourly[hour] ?? 0) + 1;
  const counters = { ...state.counters, events: state.counters.events + 1 };
  for (const [key, amount] of Object.entries(extra) as [keyof typeof counters, number][]) {
    counters[key] += amount;
  }
  return { ...state, counters, hourly, today: { ...state.today, events: state.today.events + 1 } };
}

function touch(state: AppState, id: string, ctx: Ctx, patch: (p: Participant) => Partial<Participant> = () => ({})): AppState {
  return {
    ...state,
    participants: state.participants.map((p) => (p.id === id ? { ...p, lastSeenAt: ctx.now, ...patch(p) } : p)),
  };
}

function addParticipant(state: AppState, username: string, ctx: Ctx): { state: AppState; participant: Participant } {
  const participant: Participant = {
    id: ctx.id('p'),
    username,
    characterSeed: username,
    joinedAt: ctx.now,
    lastSeenAt: ctx.now,
    xp: 0,
    wins: 0,
    matches: 0,
    points: 0,
    weekly: { points: 0, wins: 0 },
    daily: { points: 0, wins: 0 },
    byGame: {},
    origin: 'simulador',
  };
  const participants = [participant, ...state.participants];
  return {
    participant,
    state: {
      ...state,
      participants,
      today: {
        ...state.today,
        participants: participants.length,
        newParticipants: state.today.newParticipants + 1,
      },
    },
  };
}

/* ---------- Eventos da LIVE ---------- */

function resolveActor(state: AppState, raw: string | undefined, ctx: Ctx): Participant | undefined {
  const name = normalizeUsername(raw);
  if (name) return findByUsername(state, name);
  return pickParticipant(state, ctx);
}

export function applyLiveEvent(input: AppState, event: LiveEvent, ctx: Ctx): AppState {
  switch (event.type) {
    case 'follow': {
      const wanted = normalizeUsername(event.username);
      if (wanted && findByUsername(input, wanted)) {
        const existing = findByUsername(input, wanted) as Participant;
        let s = bumpEvent(input, ctx);
        s = touch(s, existing.id, ctx);
        return toastForEvent(s, { tone: 'info', title: `@${existing.username} já é participante`, detail: 'O personagem existente foi mantido.' }, ctx);
      }
      const username = wanted ?? uniqueUsername(ctx.rng, new Set(input.participants.map((p) => p.username)));
      const added = addParticipant(input, username, ctx);
      let s = bumpEvent(added.state, ctx, { follows: 1 });
      s = pushActivity(s, { kind: 'participante', title: 'Novo participante', detail: `@${username}`, username }, ctx);
      s = pushActivity(s, { kind: 'personagem', title: 'Personagem criado', detail: `@${username}`, username }, ctx);
      return toastForEvent(s, { tone: 'ok', title: `@${username} começou a seguir`, detail: 'Personagem criado automaticamente.' }, ctx);
    }

    case 'comment': {
      const actor = resolveActor(input, event.username, ctx);
      const username = actor?.username ?? normalizeUsername(event.username) ?? 'espectador';
      const text = event.text.trim().slice(0, 140);
      if (!text) return input;
      const lower = text.toLowerCase();
      const command = /^!entrar\b/.test(lower) ? ('entrar' as const) : /^!voto\s+[12]\b/.test(lower) ? ('voto' as const) : undefined;
      let s: AppState = {
        ...input,
        chat: [...input.chat, { id: ctx.id('c'), at: ctx.now, username, text, command }].slice(-CHAT_LIMIT),
      };
      s = bumpEvent(s, ctx, { comments: 1 });
      if (actor) s = touch(s, actor.id, ctx);
      if (command === 'entrar' && actor) {
        return getRuleValue(s, 'entrada-por-comentario') ? joinLobby(s, actor, ctx) : s;
      }
      if (command === 'voto' && actor) return castVote(s, actor.username, Number(lower.match(/[12]/)?.[0]) - 1, ctx);
      return s;
    }

    case 'like': {
      const count = Math.max(1, Math.min(5000, Math.floor(event.count)));
      let s = bumpEvent(input, ctx, { likes: count });
      const actor = resolveActor(input, event.username, ctx);
      if (actor) s = touch(s, actor.id, ctx);
      s = pushLikeActivity(s, count, ctx);
      return addGoalProgress(s, count, ctx);
    }

    case 'gift': {
      const gift = getGift(event.gift);
      const actor = resolveActor(input, event.username, ctx);
      const username = actor?.username ?? normalizeUsername(event.username) ?? 'espectador';
      let s = bumpEvent(input, ctx, { gifts: 1 });
      if (actor) s = touch(s, actor.id, ctx, (p) => ({ xp: p.xp + 5 }));
      s = pushActivity(s, { kind: 'presente', title: `${gift.name} recebido`, detail: `@${username} · ${gift.powerLabel}`, username }, ctx);
      s = pushEffect(s, 'presente', `${gift.name} de @${username}`, gift.effect, ctx);
      s = toastForEvent(s, { tone: 'ok', title: `@${username} enviou ${gift.name}`, detail: gift.effect }, ctx);
      const rule = getRuleValue(s, 'poderes-presentes');
      if (s.match && isMatchActive(s.match) && actor && rule) {
        s = { ...s, match: applyGiftPower(s.match, actor.id, event.gift) };
      }
      return s;
    }

    case 'share': {
      const actor = resolveActor(input, event.username, ctx);
      const username = actor?.username ?? 'espectador';
      let s = bumpEvent(input, ctx, { shares: 1 });
      if (actor) s = touch(s, actor.id, ctx, (p) => ({ xp: p.xp + 10 }));
      s = pushActivity(s, { kind: 'compartilhamento', title: 'LIVE compartilhada', detail: `@${username} · +10 XP de bônus`, username }, ctx);
      return toastForEvent(s, { tone: 'info', title: `@${username} compartilhou a LIVE`, detail: 'Bônus de 10 XP.' }, ctx);
    }

    case 'join': {
      const actor = event.participantId
        ? input.participants.find((p) => p.id === event.participantId)
        : input.participants.find((p) => !input.lobby.includes(p.id) && ctx.now - p.lastSeenAt <= INACTIVE_AFTER_MS);
      if (!actor) return input;
      return joinLobby(bumpEvent(input, ctx), actor, ctx);
    }

    case 'live-end': {
      let s = bumpEvent(input, ctx);
      s = {
        ...s,
        connection: {
          ...s.connection,
          status: 'desconectado',
          connectedSince: null,
          message: 'A LIVE foi encerrada.',
        },
      };
      s = pushActivity(s, { kind: 'conexao', title: 'LIVE encerrada', detail: s.connection.handle ? `@${s.connection.handle}` : undefined }, ctx);
      if (s.match && isMatchActive(s.match)) s = finishMatch(s, endMatchEarly(s.match), ctx);
      return toastForEvent(s, { tone: 'warn', title: 'LIVE encerrada', detail: 'A conexão foi finalizada.' }, ctx);
    }
  }
}

function getRuleValue(state: AppState, rule: string): boolean {
  const id = state.selectedGameId ?? 'corrida';
  return state.gameConfigs[id]?.rules[rule] ?? false;
}

function pushLikeActivity(state: AppState, count: number, ctx: Ctx): AppState {
  const last = state.activity[0];
  if (last?.kind === 'curtidas' && ctx.now - last.at < 8000) {
    const total = (Number(last.detail?.match(/\d+/)?.[0]) || 0) + count;
    const merged: ActivityItem = { ...last, at: ctx.now, title: 'Curtidas acumuladas', detail: `+${total} nos últimos segundos` };
    return { ...state, activity: [merged, ...state.activity.slice(1)] };
  }
  return pushActivity(state, { kind: 'curtidas', title: 'Curtidas acumuladas', detail: `+${count} nos últimos segundos` }, ctx);
}

function addGoalProgress(state: AppState, count: number, ctx: Ctx): AppState {
  let goal = { ...state.goal, progress: state.goal.progress + count };
  let s = state;
  let reached = false;
  while (goal.progress >= goal.target) {
    goal = {
      target: Math.round((goal.target * 1.35) / 10) * 10,
      progress: goal.progress - goal.target,
      level: goal.level + 1,
      reached: goal.reached + 1,
    };
    reached = true;
  }
  s = { ...s, goal };
  if (!reached) return s;
  s = pushActivity(s, { kind: 'meta', title: 'Meta de curtidas atingida', detail: `Nova meta: ${goal.target.toLocaleString('pt-BR')}` }, ctx);
  s = pushEffect(s, 'meta', 'Meta de curtidas atingida', 'Turbo coletivo ativado', ctx);
  s = toastForEvent(s, { tone: 'ok', title: 'Meta de curtidas atingida', detail: 'Turbo coletivo liberado.' }, ctx);
  if (s.match && isMatchActive(s.match) && getRuleValue(s, 'turbo-curtidas')) {
    s = { ...s, match: applyTurbo(s.match, TURBO_SECONDS) };
    s = pushEffect(s, 'turbo', 'Turbo coletivo', `${TURBO_SECONDS} segundos para todos`, ctx);
  }
  return s;
}

function joinLobby(state: AppState, actor: Participant, ctx: Ctx): AppState {
  const gameId = state.selectedGameId ?? 'corrida';
  const max = state.gameConfigs[gameId].maxParticipants;
  if (state.lobby.includes(actor.id)) return state;
  if (state.lobby.length >= max) {
    return toastForEvent(state, { tone: 'warn', title: 'Fila cheia', detail: `Limite de ${max} participantes.` }, ctx);
  }
  let s: AppState = { ...state, lobby: [...state.lobby, actor.id] };
  s = pushActivity(s, { kind: 'participante', title: 'Entrou na fila', detail: `@${actor.username}`, username: actor.username }, ctx);
  return s;
}

/* ---------- Personagens ---------- */

/** Sorteia uma nova aparência: troca a semente persistida do personagem. */
export function rerollCharacter(state: AppState, participantId: string, ctx: Ctx): AppState {
  const target = state.participants.find((p) => p.id === participantId);
  if (!target) return state;
  const base = target.characterSeed.split('~')[0] ?? target.username;
  const characterSeed = `${base}~${Math.floor(ctx.rng() * 36 ** 5).toString(36)}`;
  const participants = state.participants.map((p) => (p.id === participantId ? { ...p, characterSeed } : p));
  return pushToast({ ...state, participants }, { tone: 'ok', title: `Nova aparência para @${target.username}`, detail: 'A semente do personagem foi atualizada e fica salva.' }, ctx);
}

/* ---------- Votação da plateia ---------- */

export function castVote(state: AppState, username: string, option: number, ctx: Ctx): AppState {
  if (option < 0 || option >= state.poll.options.length || state.poll.voters.includes(username)) return state;
  const options = state.poll.options.map((o, i) => (i === option ? { ...o, votes: o.votes + 1 } : o));
  const s = { ...state, poll: { ...state.poll, options, voters: [...state.poll.voters, username] } };
  return pushActivity(s, { kind: 'comentario', title: 'Voto registrado', detail: `@${username} · ${options[option]?.label}`, username }, ctx);
}

export function resetPoll(state: AppState): AppState {
  return { ...state, poll: DEFAULT_POLL };
}

/* ---------- Partida ---------- */

export function startMatch(state: AppState, ctx: Ctx): AppState {
  const gameId = state.selectedGameId;
  if (!gameId) return pushToast(state, { tone: 'warn', title: 'Escolha um jogo', detail: 'Selecione um jogo no Game Hub para iniciar.' }, ctx);
  if (!isPlayable(gameId)) {
    return pushToast(state, { tone: 'warn', title: `${getGame(gameId).name} em desenvolvimento`, detail: 'Somente a corrida de obstáculos inicia partidas nesta demonstração.' }, ctx);
  }
  if (isMatchActive(state.match)) return state;

  const config = state.gameConfigs[gameId];
  const limits = getGame(gameId).limits;
  const ids = state.lobby.filter((id) => state.participants.some((p) => p.id === id)).slice(0, config.maxParticipants);

  if (config.rules['completar-fila']) {
    const target = Math.min(config.maxParticipants, Math.max(ids.length, MIN_FILL));
    const candidates = shuffle(
      ctx.rng,
      state.participants.filter((p) => !ids.includes(p.id) && ctx.now - p.lastSeenAt <= INACTIVE_AFTER_MS),
    );
    for (const p of candidates) {
      if (ids.length >= target) break;
      ids.push(p.id);
    }
  }

  if (ids.length < limits.minParticipants) {
    return pushToast(
      state,
      { tone: 'warn', title: 'Fila insuficiente', detail: `São necessários ao menos ${limits.minParticipants} participantes. Use o simulador ou ative "Completar a fila".` },
      ctx,
    );
  }

  const seed = Math.floor(ctx.rng() * 2 ** 31);
  const match = createRace({
    id: ctx.id('m'),
    gameId,
    participantIds: ids,
    durationSec: config.durationSec,
    difficulty: config.difficulty,
    seed,
    startedAt: ctx.now,
  });
  let s: AppState = { ...state, match, lobby: state.lobby.filter((id) => !ids.includes(id)), effects: [] };
  s = pushActivity(s, { kind: 'partida', title: 'Partida iniciada', detail: `${getGame(gameId).name} · ${ids.length} participantes` }, ctx);
  return s;
}

export function pauseMatch(state: AppState): AppState {
  return state.match ? { ...state, match: pauseRace(state.match) } : state;
}

export function resumeMatch(state: AppState): AppState {
  return state.match ? { ...state, match: resumeRace(state.match) } : state;
}

export function endMatch(state: AppState, ctx: Ctx): AppState {
  if (!state.match || state.match.status === 'encerrada') return state;
  return finishMatch(state, endMatchEarly(state.match), ctx);
}

export function dismissMatch(state: AppState): AppState {
  return state.match?.status === 'encerrada' ? { ...state, match: null } : state;
}

export function tickMatch(state: AppState, dt: number, ctx: Ctx): AppState {
  let s = state;
  if (s.effects.length && s.effects.some((e) => ctx.now - e.at > EFFECT_LIFETIME_MS)) {
    s = { ...s, effects: s.effects.filter((e) => ctx.now - e.at <= EFFECT_LIFETIME_MS) };
  }
  if (!s.match) return s;
  const next = advanceMatch(s.match, dt);
  if (next === s.match) return s;
  if (next.status === 'encerrada') return finishMatch(s, next, ctx);
  return { ...s, match: next };
}

function finishMatch(state: AppState, ended: MatchState, ctx: Ctx): AppState {
  const results = ended.results ?? [];
  const byId = new Map(results.map((r) => [r.participantId, r]));
  const rankPrev = { ...state.rankPrev };
  for (const view of RANK_VIEWS_TRACKED) rankPrev[view] = rankSnapshot(state.participants, view);

  const participants = state.participants.map((p) => {
    const r = byId.get(p.id);
    if (!r) return p;
    const game = p.byGame[ended.gameId] ?? { points: 0, wins: 0, matches: 0 };
    const win = r.won ? 1 : 0;
    return {
      ...p,
      lastSeenAt: ctx.now,
      xp: p.xp + r.xp,
      points: p.points + r.points,
      wins: p.wins + win,
      matches: p.matches + 1,
      weekly: { points: p.weekly.points + r.points, wins: p.weekly.wins + win },
      daily: { points: p.daily.points + r.points, wins: p.daily.wins + win },
      byGame: { ...p.byGame, [ended.gameId]: { points: game.points + r.points, wins: game.wins + win, matches: game.matches + 1 } },
    };
  });

  const winner = results.find((r) => r.won);
  const winnerP = winner ? participants.find((p) => p.id === winner.participantId) : undefined;
  let s: AppState = {
    ...state,
    match: ended,
    participants,
    rankPrev,
    matchHistory: [
      {
        id: ended.id,
        gameId: ended.gameId,
        endedAt: ctx.now,
        durationSec: Math.round(ended.t),
        participants: ended.racers.length,
        winnerId: winnerP?.id ?? null,
        winnerName: winnerP?.username ?? null,
      },
      ...state.matchHistory,
    ].slice(0, 30),
    today: {
      ...state.today,
      matches: state.today.matches + 1,
      playMinutes: Math.round((state.today.playMinutes + ended.t / 60) * 10) / 10,
    },
  };

  s = pushActivity(s, { kind: 'partida', title: 'Partida encerrada', detail: winnerP ? `Vitória de @${winnerP.username}` : 'Encerrada antes de ter vencedor' }, ctx);
  if (winner?.finishedAt != null && (s.bestRaceSeconds === null || winner.finishedAt < s.bestRaceSeconds)) {
    s = { ...s, bestRaceSeconds: winner.finishedAt };
    s = pushActivity(s, { kind: 'recorde', title: 'Novo recorde de pista', detail: `@${winnerP?.username} · ${winner.finishedAt.toFixed(1)} s`, username: winnerP?.username }, ctx);
  }
  if (winnerP) {
    s = pushEffect(s, 'vitoria', `Vitória de @${winnerP.username}`, undefined, ctx);
    s = toastForEvent(s, { tone: 'ok', title: `@${winnerP.username} venceu a corrida` }, ctx);
  }
  return s;
}

/* ---------- Jogos e configurações ---------- */

export function selectGame(state: AppState, id: GameId | null): AppState {
  return { ...state, selectedGameId: id };
}

export function registerGameOpen(state: AppState, id: GameId): AppState {
  return { ...state, gameOpens: { ...state.gameOpens, [id]: state.gameOpens[id] + 1 } };
}

export function updateGameConfig(state: AppState, id: GameId, patch: Partial<GameConfig>): AppState {
  const merged = { ...state.gameConfigs[id], ...patch, rules: { ...state.gameConfigs[id].rules, ...patch.rules } };
  return { ...state, gameConfigs: { ...state.gameConfigs, [id]: sanitizeGameConfig(id, merged) } };
}

export function resetGameConfig(state: AppState, id: GameId): AppState {
  return { ...state, gameConfigs: { ...state.gameConfigs, [id]: defaultGameConfigs()[id] } };
}

export function updateSettings(state: AppState, patch: Partial<Settings>): AppState {
  const settings: Settings = {
    ...state.settings,
    ...patch,
    overlay: { ...state.settings.overlay, ...patch.overlay },
    profile: { ...state.settings.profile, ...patch.profile },
  };
  const goal =
    patch.likeGoalTarget !== undefined
      ? { ...state.goal, target: settings.likeGoalTarget, progress: Math.min(state.goal.progress, settings.likeGoalTarget - 1) }
      : state.goal;
  return { ...state, settings, goal };
}

/* ---------- Conexão simulada ---------- */

const CONNECTION_MESSAGES: Record<ConnectionStatus, (handle: string) => string> = {
  desconectado: () => 'Desconectado. Informe o @ do TikTok e conecte a LIVE.',
  aguardando: (h) => `Aguardando @${h} iniciar a LIVE. A conexão começa assim que a transmissão abrir.`,
  conectando: (h) => `Conectando a @${h}…`,
  'ao-vivo': (h) => `Conectado. Recebendo eventos de @${h}.`,
  reconectando: () => 'Conexão perdida. Tentando reconectar…',
  erro: () => 'Não foi possível conectar. Verifique o @ e tente novamente.',
};

export const HANDLE_PATTERN = /^[A-Za-z0-9._]{2,24}$/;

export function normalizeHandle(raw: string): string {
  const fromUrl = raw.trim().match(/tiktok\.com\/@([^/?#\s]+)/i);
  return (fromUrl?.[1] ?? raw.trim()).replace(/^@/, '');
}

export function setConnectionHandle(state: AppState, handle: string): AppState {
  return { ...state, connection: { ...state.connection, handle } };
}

export function setScenario(state: AppState, scenario: AppState['connection']['scenario']): AppState {
  return { ...state, connection: { ...state.connection, scenario } };
}

export function setConnectionStatus(state: AppState, status: ConnectionStatus, ctx: Ctx): AppState {
  const was = state.connection.status;
  if (was === status) return state;
  const handle = state.connection.handle;
  const live = status === 'ao-vivo';
  let s: AppState = {
    ...state,
    connection: {
      ...state.connection,
      status,
      message: CONNECTION_MESSAGES[status](handle),
      lastConnectedAt: live ? ctx.now : state.connection.lastConnectedAt,
      connectedSince: live ? ctx.now : status === 'desconectado' || status === 'erro' ? null : state.connection.connectedSince,
    },
  };
  s = pushActivity(s, { kind: 'conexao', title: connectionActivityTitle(status), detail: handle ? `@${handle}` : undefined }, ctx);
  if (status === 'ao-vivo') s = pushToast(s, { tone: 'ok', title: 'LIVE conectada', detail: `Recebendo eventos de @${handle} (simulação).` }, ctx);
  if (status === 'erro') s = pushToast(s, { tone: 'erro', title: 'Falha de conexão', detail: 'Simulação de erro. Tente conectar novamente.' }, ctx);
  return s;
}

function connectionActivityTitle(status: ConnectionStatus): string {
  switch (status) {
    case 'ao-vivo':
      return 'Conectado à LIVE';
    case 'aguardando':
      return 'Aguardando a LIVE começar';
    case 'conectando':
      return 'Conectando à LIVE';
    case 'reconectando':
      return 'Reconectando à LIVE';
    case 'erro':
      return 'Erro de conexão';
    default:
      return 'Desconectado da LIVE';
  }
}

/* ---------- Notificações e simulador ---------- */

export const NOTIFIABLE: ActivityItem['kind'][] = ['participante', 'presente', 'meta', 'recorde', 'partida', 'conexao'];

export function unreadNotifications(state: AppState): number {
  return state.activity.filter((a) => NOTIFIABLE.includes(a.kind) && a.at > state.notificationsReadAt).length;
}

export function markNotificationsRead(state: AppState, ctx: Ctx): AppState {
  return { ...state, notificationsReadAt: ctx.now };
}

export function setSimulator(state: AppState, patch: Partial<AppState['simulator']>): AppState {
  return { ...state, simulator: { ...state.simulator, ...patch } };
}
