// Gerador do conjunto de dados SINTÉTICO da demonstração.
// Nenhum dado aqui vem de usuários reais. A mesma semente e o mesmo "agora" geram o mesmo conjunto.

import { defaultGameConfigs } from '../domain/games';
import { clamp, createRng, randInt, pick } from '../domain/prng';
import { uniqueUsername } from '../domain/names';
import { rankSnapshot, RANK_VIEWS_TRACKED } from '../domain/ranking';
import type { Counters, DayPoint, GameOpens } from '../domain/session';
import type { GameId, MatchSummary, Participant } from '../domain/types';

export const DAY_MS = 86_400_000;
export const PARTICIPANT_COUNT = 120;
export const HISTORY_DAYS = 30;

export interface DemoDataset {
  version: 1;
  generatedAt: number;
  participants: Participant[];
  /** Dias anteriores a hoje, do mais antigo ao mais recente. */
  history: DayPoint[];
  today: DayPoint;
  /** Eventos por hora de hoje (24 posições). */
  hourly: number[];
  gameOpens: GameOpens;
  matchHistory: MatchSummary[];
  rankPrev: Record<string, Record<string, number>>;
  bestRaceSeconds: number | null;
  counters: Counters;
  gameConfigs: ReturnType<typeof defaultGameConfigs>;
}

function dateKey(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function makeParticipants(now: number, rng: () => number): Participant[] {
  const taken = new Set<string>();
  const list: Participant[] = [];
  for (let i = 0; i < PARTICIPANT_COUNT; i++) {
    const username = uniqueUsername(rng, taken);
    taken.add(username);
    const ageDays = Math.min(HISTORY_DAYS - 1, Math.floor(-Math.log(1 - rng() * 0.96) * 11));
    const joinedAt = now - ageDays * DAY_MS - randInt(rng, 0, DAY_MS - 1);
    const skill = 0.15 + rng() * 0.85;
    const matches = randInt(rng, 0, 3 + Math.floor(ageDays * 0.55));
    const wins = Math.min(matches, Math.round(matches * skill * 0.32 + rng() * 1.1));
    const points = matches === 0 ? 0 : matches * 10 + wins * 30 + randInt(rng, 0, 40);
    const xp = matches * 14 + wins * 40 + (matches === 0 ? 0 : randInt(rng, 0, 25));
    const inactive = rng() < 0.14 && ageDays > 16;
    const lastSeenAt = inactive
      ? Math.max(joinedAt, now - randInt(rng, 15, 28) * DAY_MS)
      : Math.max(joinedAt, now - randInt(rng, 0, Math.min(3 * DAY_MS, now - joinedAt)));
    const weeklyShare = ageDays < 7 ? 1 : rng() * 0.3;
    const weeklyPoints = inactive ? 0 : Math.round(points * weeklyShare);
    const weeklyWins = inactive ? 0 : Math.min(wins, Math.round(wins * weeklyShare));
    const hasDaily = !inactive && matches > 0 && rng() < 0.22;
    list.push({
      id: `p-${i + 1}`,
      username,
      characterSeed: username,
      joinedAt,
      lastSeenAt,
      xp,
      wins,
      matches,
      points,
      weekly: { points: weeklyPoints, wins: weeklyWins },
      daily: { points: hasDaily ? Math.round(points * 0.08) + 10 : 0, wins: hasDaily && rng() < 0.3 ? 1 : 0 },
      byGame: matches > 0 ? { corrida: { points, wins, matches } } : {},
      origin: 'sintetico',
    });
  }
  // Garante que daily/weekly não excedam o total e que vitórias diárias caibam nas totais.
  return list.map((p) => ({
    ...p,
    weekly: { points: Math.min(p.points, p.weekly.points), wins: Math.min(p.wins, p.weekly.wins) },
    daily: { points: Math.min(p.points, p.daily.points), wins: Math.min(p.wins, p.daily.wins) },
  }));
}

function makeHourly(now: number, rng: () => number): number[] {
  const hour = new Date(now).getHours();
  const curve = [4, 2, 1, 1, 1, 2, 5, 12, 20, 24, 28, 30, 34, 36, 40, 46, 58, 76, 98, 120, 130, 110, 70, 30];
  return curve.map((base, h) => {
    if (h > hour) return 0;
    const full = Math.round(base * (0.8 + rng() * 0.5) * 2.4);
    return h === hour ? Math.round(full * (new Date(now).getMinutes() / 60)) : full;
  });
}

function makeHistory(now: number, participants: Participant[], rng: () => number): DayPoint[] {
  const today0 = startOfDay(now);
  const days: DayPoint[] = [];
  for (let d = HISTORY_DAYS; d >= 1; d--) {
    const dayStart = today0 - d * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    const date = new Date(dayStart);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const matches = randInt(rng, 1, 5) + (weekend ? randInt(rng, 2, 4) : 0);
    days.push({
      date: dateKey(dayStart),
      participants: participants.filter((p) => p.joinedAt < dayEnd).length,
      newParticipants: participants.filter((p) => p.joinedAt >= dayStart && p.joinedAt < dayEnd).length,
      matches,
      events: Math.round((380 + rng() * 1500) * (weekend ? 1.5 : 1)),
      playMinutes: Math.round(matches * (1.2 + rng() * 0.6) * 10) / 10,
    });
  }
  return days;
}

function makeMatchHistory(now: number, participants: Participant[], rng: () => number): MatchSummary[] {
  const winners = participants.filter((p) => p.wins > 0);
  return Array.from({ length: 14 }, (_, i) => {
    const winner = winners.length ? pick(rng, winners) : null;
    return {
      id: `hist-${i + 1}`,
      gameId: 'corrida' as GameId,
      endedAt: now - (i * 3 + randInt(rng, 1, 5)) * 3_600_000,
      durationSec: pick(rng, [60, 90, 90, 120]),
      participants: randInt(rng, 8, 24),
      winnerId: winner?.id ?? null,
      winnerName: winner?.username ?? null,
    };
  });
}

export function generateDataset(now: number, seedKey = 'tokarena-demo'): DemoDataset {
  const rng = createRng(seedKey);
  const participants = makeParticipants(now, rng);
  const history = makeHistory(now, participants, rng);
  const today0 = startOfDay(now);
  const hourly = makeHourly(now, rng);
  const events = hourly.reduce((a, b) => a + b, 0);
  const joinedToday = participants.filter((p) => p.joinedAt >= today0).length;
  const matchesToday = randInt(rng, 1, 4);
  const counters: Counters = {
    events,
    likes: Math.round(events * 0.62),
    comments: Math.round(events * 0.24),
    gifts: Math.round(events * 0.04),
    shares: Math.round(events * 0.03),
    follows: joinedToday,
  };

  // Posições anteriores: o mesmo ranking com pequenas variações, para mostrar evolução.
  const perturbed = participants.map((p) => ({
    ...p,
    points: Math.round(p.points * clamp(0.88 + rng() * 0.24, 0.8, 1.2)),
    weekly: { ...p.weekly, points: Math.round(p.weekly.points * clamp(0.85 + rng() * 0.3, 0.7, 1.3)) },
    daily: { ...p.daily },
    byGame: p.byGame.corrida
      ? { corrida: { ...p.byGame.corrida, points: Math.round(p.byGame.corrida.points * clamp(0.88 + rng() * 0.24, 0.8, 1.2)) } }
      : {},
  }));
  const rankPrev = Object.fromEntries(RANK_VIEWS_TRACKED.map((view) => [view, rankSnapshot(perturbed, view)]));

  const gameOpens: GameOpens = {
    corrida: 86,
    'chao-de-lava': 31,
    'batalha-empurroes': 24,
    batatinha: 29,
    futebol: 17,
    plataformas: 12,
  };

  return {
    version: 1,
    generatedAt: now,
    participants,
    history,
    today: {
      date: dateKey(now),
      participants: participants.length,
      newParticipants: joinedToday,
      matches: matchesToday,
      events,
      playMinutes: Math.round(matchesToday * 1.5 * 10) / 10,
    },
    hourly,
    gameOpens,
    matchHistory: makeMatchHistory(now, participants, rng),
    rankPrev,
    bestRaceSeconds: 58.4,
    counters,
    gameConfigs: defaultGameConfigs(),
  };
}

/** Conjunto vazio de uma conta nova: nenhum participante, nenhum dado inventado. */
export function emptyDataset(now: number): DemoDataset {
  const history: DayPoint[] = Array.from({ length: HISTORY_DAYS - 1 }, (_, i) => ({
    date: dateKey(now - (HISTORY_DAYS - 1 - i) * DAY_MS),
    participants: 0,
    newParticipants: 0,
    matches: 0,
    events: 0,
    playMinutes: 0,
  }));
  return {
    version: 1,
    generatedAt: now,
    participants: [],
    history,
    today: { date: dateKey(now), participants: 0, newParticipants: 0, matches: 0, events: 0, playMinutes: 0 },
    hourly: new Array<number>(24).fill(0),
    gameOpens: { corrida: 0, 'chao-de-lava': 0, 'batalha-empurroes': 0, batatinha: 0, futebol: 0, plataformas: 0 },
    matchHistory: [],
    rankPrev: {},
    bestRaceSeconds: null,
    counters: { likes: 0, comments: 0, gifts: 0, shares: 0, follows: 0, events: 0 },
    gameConfigs: defaultGameConfigs(),
  };
}
