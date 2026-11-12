// Simulação da corrida de obstáculos. Pura e determinística: a mesma semente produz a mesma corrida.
// Não sabe nada de React, relógio ou rede: quem chama decide o passo de tempo.

import { getGift } from './gifts';
import { clamp, createRng, hashNoise, shuffle } from './prng';
import type {
  Difficulty,
  GameId,
  GiftId,
  MatchResult,
  MatchState,
  Obstacle,
  ObstacleKind,
  Racer,
} from './types';

export const TRACK_LENGTH = 420;
export const COUNTDOWN_SECONDS = 3;
const BOOST_FACTOR = 1.65;
const TURBO_FACTOR = 1.3;
const STUN_FACTOR = 0.2;

interface DifficultyParams {
  dodge: number;
  stunSec: number;
  obstacles: number;
}

export function difficultyParams(difficulty: Difficulty): DifficultyParams {
  switch (difficulty) {
    case 'facil':
      return { dodge: 0.75, stunSec: 0.6, obstacles: 7 };
    case 'dificil':
      return { dodge: 0.35, stunSec: 1.2, obstacles: 13 };
    default:
      return { dodge: 0.55, stunSec: 0.9, obstacles: 10 };
  }
}

export interface RaceSetup {
  id: string;
  gameId?: GameId;
  participantIds: string[];
  durationSec: number;
  difficulty: Difficulty;
  seed: number;
  startedAt?: number;
}

export function createRace(setup: RaceSetup): MatchState {
  const rng = createRng(setup.seed);
  const lanes = shuffle(
    rng,
    setup.participantIds.map((_, i) => i),
  );
  const params = difficultyParams(setup.difficulty);
  const baseSpeed = TRACK_LENGTH / (setup.durationSec * 0.72);

  const racers: Racer[] = setup.participantIds.map((participantId, i) => {
    const agility = hashNoise(setup.seed, i, 11);
    return {
      participantId,
      lane: lanes[i] as number,
      x: 0,
      speedBase: baseSpeed * (0.92 + 0.16 * agility),
      agility,
      stunnedUntil: 0,
      boostUntil: 0,
      shieldUntil: 0,
      finishedAt: null,
      position: null,
      hits: 0,
      lastGift: null,
    };
  });

  const kinds: ObstacleKind[] = ['portao', 'bloco', 'pendulo'];
  const obstacles: Obstacle[] = Array.from({ length: params.obstacles }, (_, i) => {
    const span = (0.92 - 0.18) / Math.max(1, params.obstacles - 1);
    const jitter = (rng() - 0.5) * span * 0.35;
    return {
      id: i,
      kind: kinds[i % kinds.length] as ObstacleKind,
      x: Math.round(TRACK_LENGTH * (0.18 + span * i + jitter)),
      phase: rng() * Math.PI * 2,
    };
  });

  return {
    id: setup.id,
    gameId: setup.gameId ?? 'corrida',
    status: 'contagem',
    seed: setup.seed,
    trackLength: TRACK_LENGTH,
    laneCount: Math.max(1, setup.participantIds.length),
    durationSec: setup.durationSec,
    difficulty: setup.difficulty,
    t: 0,
    countdown: COUNTDOWN_SECONDS,
    turboUntil: 0,
    racers,
    obstacles,
    results: null,
    startedAt: setup.startedAt ?? 0,
  };
}

/** Quais raias o obstáculo bloqueia no instante t. Usado pela simulação e pelo desenho da cena. */
export function isLaneBlocked(o: Obstacle, lane: number, laneCount: number, t: number): boolean {
  const top = Math.max(1, laneCount - 1);
  switch (o.kind) {
    case 'portao': {
      const gapCenter = (0.5 + 0.5 * Math.sin(t * 0.9 + o.phase)) * top;
      const gapHalf = Math.max(1.5, laneCount * 0.22);
      return Math.abs(lane - gapCenter) > gapHalf;
    }
    case 'pendulo': {
      const center = (0.5 + 0.5 * Math.sin(t * 1.4 + o.phase)) * top;
      const half = Math.max(1, laneCount * 0.18);
      return Math.abs(lane - center) <= half;
    }
    default:
      return (lane + o.id) % 3 === 0;
  }
}

function stepCountdown(state: MatchState, dt: number): MatchState {
  const countdown = state.countdown - dt;
  if (countdown > 0) return { ...state, countdown };
  return { ...state, countdown: 0, status: 'em-andamento' };
}

export function standings(state: MatchState): Racer[] {
  return state.racers.slice().sort((a, b) => {
    if (a.finishedAt !== null && b.finishedAt !== null) return a.finishedAt - b.finishedAt;
    if (a.finishedAt !== null) return -1;
    if (b.finishedAt !== null) return 1;
    return b.x - a.x;
  });
}

export function computeResults(state: MatchState): MatchResult[] {
  const order = standings(state);
  const n = order.length;
  return order.map((racer, i) => {
    const position = i + 1;
    const finished = racer.finishedAt !== null;
    const won = position === 1 && finished;
    const share = finished ? 1 : 0.4;
    return {
      participantId: racer.participantId,
      position,
      finishedAt: racer.finishedAt,
      points: Math.round((10 + (n - position) * 4 + (won ? 25 : 0)) * share),
      xp: Math.round((12 + (n - position + 1) * 2 + (won ? 30 : 0)) * share),
      won,
    };
  });
}

function stepRunning(prev: MatchState, dt: number): MatchState {
  const t = prev.t + dt;
  const params = difficultyParams(prev.difficulty);
  let finishedCount = prev.racers.filter((r) => r.finishedAt !== null).length;

  const racers = prev.racers.map((r) => {
    if (r.finishedAt !== null) return r;
    const next = { ...r };
    const stunned = t < r.stunnedUntil;
    const boosted = t < r.boostUntil;
    const turbo = t < prev.turboUntil;
    const wobble = 1 + (hashNoise(prev.seed, r.lane, Math.floor(t * 3)) - 0.5) * 0.18;
    const speed =
      r.speedBase * wobble * (stunned ? STUN_FACTOR : 1) * (boosted ? BOOST_FACTOR : 1) * (turbo ? TURBO_FACTOR : 1);
    const nx = r.x + speed * dt;

    for (const o of prev.obstacles) {
      if (r.x < o.x && nx >= o.x && t >= r.shieldUntil && isLaneBlocked(o, r.lane, prev.laneCount, t)) {
        const dodge = clamp(params.dodge * (0.7 + 0.6 * r.agility), 0, 0.95);
        if (hashNoise(prev.seed, o.id, r.lane + 101) > dodge) {
          next.stunnedUntil = t + params.stunSec;
          next.hits += 1;
        }
      }
    }

    if (nx >= prev.trackLength) {
      const overshoot = speed > 0 ? (nx - prev.trackLength) / speed : 0;
      next.x = prev.trackLength;
      next.finishedAt = Math.max(prev.t, t - overshoot);
      finishedCount += 1;
      next.position = finishedCount;
    } else {
      next.x = nx;
    }
    return next;
  });

  const allDone = racers.every((r) => r.finishedAt !== null);
  const timeUp = t >= prev.durationSec;
  const draft: MatchState = { ...prev, t, racers };
  if (!allDone && !timeUp) return draft;

  const ended: MatchState = { ...draft, status: 'encerrada' };
  const results = computeResults(ended);
  const positionById = new Map(results.map((r) => [r.participantId, r.position]));
  return {
    ...ended,
    racers: ended.racers.map((r) => ({ ...r, position: positionById.get(r.participantId) ?? r.position })),
    results,
  };
}

/** Avança a partida em dt segundos. Pausada ou encerrada, o estado não muda. */
export function advanceMatch(state: MatchState, dt: number): MatchState {
  if (dt <= 0) return state;
  switch (state.status) {
    case 'contagem':
      return stepCountdown(state, dt);
    case 'em-andamento':
      return stepRunning(state, dt);
    default:
      return state;
  }
}

export function pauseMatch(state: MatchState): MatchState {
  return state.status === 'em-andamento' || state.status === 'contagem' ? { ...state, status: 'pausada' } : state;
}

export function resumeMatch(state: MatchState): MatchState {
  if (state.status !== 'pausada') return state;
  return { ...state, status: state.countdown > 0 ? 'contagem' : 'em-andamento' };
}

/** Encerra antes do fim: classifica pelo que cada um já correu. */
export function endMatchEarly(state: MatchState): MatchState {
  if (state.status === 'encerrada') return state;
  const ended: MatchState = { ...state, status: 'encerrada' };
  const results = computeResults(ended);
  const positionById = new Map(results.map((r) => [r.participantId, r.position]));
  return {
    ...ended,
    racers: ended.racers.map((r) => ({ ...r, position: positionById.get(r.participantId) ?? r.position })),
    results,
  };
}

/** Aplica o poder de um presente ao personagem de quem enviou. Retorna o mesmo estado se ele não corre. */
export function applyGiftPower(state: MatchState, participantId: string, giftId: GiftId): MatchState {
  if (state.status === 'encerrada') return state;
  if (!state.racers.some((r) => r.participantId === participantId)) return state;
  const gift = getGift(giftId);
  const racers = state.racers.map((r) => {
    if (r.participantId === participantId) {
      const next = { ...r, lastGift: giftId };
      if (gift.power === 'impulso') next.boostUntil = Math.max(r.boostUntil, state.t) + gift.durationSec;
      if (gift.power === 'escudo') next.shieldUntil = Math.max(r.shieldUntil, state.t) + gift.durationSec;
      return next;
    }
    if (gift.power === 'abalo' && r.finishedAt === null && state.t >= r.shieldUntil) {
      return { ...r, stunnedUntil: Math.max(r.stunnedUntil, state.t + gift.durationSec) };
    }
    return r;
  });
  return { ...state, racers };
}

export function applyTurbo(state: MatchState, seconds: number): MatchState {
  if (state.status === 'encerrada') return state;
  return { ...state, turboUntil: Math.max(state.turboUntil, state.t) + seconds };
}

/** Estado visual de um corredor, para desenho e leitura de tela. */
export function racerCondition(state: MatchState, racer: Racer): 'chegou' | 'atordoado' | 'impulso' | 'escudo' | 'correndo' {
  if (racer.finishedAt !== null) return 'chegou';
  if (state.t < racer.stunnedUntil) return 'atordoado';
  if (state.t < racer.boostUntil) return 'impulso';
  if (state.t < racer.shieldUntil) return 'escudo';
  return 'correndo';
}
