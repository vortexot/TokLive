import { describe, expect, it } from 'vitest';
import {
  advanceMatch,
  applyGiftPower,
  applyTurbo,
  computeResults,
  createRace,
  endMatchEarly,
  isLaneBlocked,
  pauseMatch,
  racerCondition,
  resumeMatch,
  standings,
  TRACK_LENGTH,
} from './race';
import { buildRanking, rankSnapshot, viewScore } from './ranking';
import type { MatchState, Participant } from './types';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

function setup(n = 12, seed = 42, difficulty: 'facil' | 'normal' | 'dificil' = 'normal', durationSec = 90) {
  return createRace({ id: 'm1', participantIds: ids(n), durationSec, difficulty, seed });
}

function runToEnd(initial: MatchState, dt = 0.05, maxSeconds = 400): MatchState {
  let state = initial;
  for (let i = 0; i < maxSeconds / dt && state.status !== 'encerrada'; i++) {
    state = advanceMatch(state, dt);
  }
  return state;
}

describe('corrida: criação', () => {
  it('atribui uma raia distinta a cada corredor e cria obstáculos ordenados na pista', () => {
    const race = setup(10);
    expect(new Set(race.racers.map((r) => r.lane)).size).toBe(10);
    expect(race.status).toBe('contagem');
    const xs = race.obstacles.map((o) => o.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(xs[0]).toBeGreaterThan(0);
    expect(xs.at(-1)).toBeLessThan(TRACK_LENGTH);
  });

  it('a dificuldade muda a quantidade de obstáculos', () => {
    expect(setup(8, 1, 'facil').obstacles.length).toBeLessThan(setup(8, 1, 'dificil').obstacles.length);
  });
});

describe('corrida: andamento', () => {
  it('a contagem regressiva libera a largada e não move ninguém antes disso', () => {
    let race = setup();
    race = advanceMatch(race, 1);
    expect(race.status).toBe('contagem');
    expect(race.racers.every((r) => r.x === 0)).toBe(true);
    race = advanceMatch(race, 2.5);
    expect(race.status).toBe('em-andamento');
  });

  it('é determinística: mesma semente, mesmo resultado', () => {
    const a = runToEnd(advanceMatch(setup(14, 7), 4));
    const b = runToEnd(advanceMatch(setup(14, 7), 4));
    expect(a.results).toEqual(b.results);
    expect(a.t).toBe(b.t);
  });

  it('sementes diferentes dão corridas diferentes', () => {
    const a = runToEnd(advanceMatch(setup(14, 1), 4));
    const b = runToEnd(advanceMatch(setup(14, 2), 4));
    expect(a.results?.map((r) => r.participantId)).not.toEqual(b.results?.map((r) => r.participantId));
  });

  it('termina dentro do tempo, com posições únicas de 1 a N e vencedor único', () => {
    const end = runToEnd(advanceMatch(setup(16, 3), 4));
    expect(end.status).toBe('encerrada');
    expect(end.t).toBeLessThanOrEqual(end.durationSec + 0.1);
    const results = end.results!;
    expect(results.map((r) => r.position)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    expect(results.filter((r) => r.won)).toHaveLength(1);
    expect(results[0]!.points).toBeGreaterThan(results.at(-1)!.points);
    expect(end.racers.every((r) => r.x <= TRACK_LENGTH)).toBe(true);
  });

  it('a ordem de chegada respeita o tempo de cada corredor', () => {
    const end = runToEnd(advanceMatch(setup(12, 9), 4));
    const finished = standings(end).filter((r) => r.finishedAt !== null);
    const times = finished.map((r) => r.finishedAt as number);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('pausada não avança e retomar continua do mesmo ponto', () => {
    let race = advanceMatch(setup(), 4);
    race = advanceMatch(race, 5);
    const paused = pauseMatch(race);
    expect(advanceMatch(paused, 10)).toBe(paused);
    const resumed = resumeMatch(paused);
    expect(resumed.status).toBe('em-andamento');
    expect(advanceMatch(resumed, 1).t).toBeGreaterThan(race.t);
  });

  it('encerrar antes do fim classifica por distância percorrida', () => {
    const race = advanceMatch(advanceMatch(setup(10, 5), 4), 20);
    const ended = endMatchEarly(race);
    expect(ended.status).toBe('encerrada');
    const order = standings(race);
    expect(ended.results!.map((r) => r.participantId)).toEqual(order.map((r) => r.participantId));
    expect(ended.results!.every((r) => !r.won)).toBe(true);
  });
});

describe('corrida: obstáculos e poderes', () => {
  it('portões deixam um vão que muda com o tempo', () => {
    const race = setup(12, 11);
    const gate = race.obstacles.find((o) => o.kind === 'portao')!;
    const open = (t: number) => Array.from({ length: 12 }, (_, l) => l).filter((l) => !isLaneBlocked(gate, l, 12, t));
    expect(open(0).length).toBeGreaterThan(0);
    expect(open(0).length).toBeLessThan(12);
    expect(open(0)).not.toEqual(open(2.4));
  });

  it('presente de impulso acelera só quem enviou', () => {
    const base = advanceMatch(setup(12, 21), 4);
    const boosted = applyGiftPower(base, 'p3', 'foguete');
    expect(racerCondition(boosted, boosted.racers.find((r) => r.participantId === 'p3')!)).toBe('impulso');
    const a = advanceMatch(base, 3);
    const b = advanceMatch(boosted, 3);
    const xOf = (s: MatchState, id: string) => s.racers.find((r) => r.participantId === id)!.x;
    expect(xOf(b, 'p3')).toBeGreaterThan(xOf(a, 'p3'));
    expect(xOf(b, 'p5')).toBe(xOf(a, 'p5'));
  });

  it('escudo protege contra obstáculos', () => {
    let shielded = applyGiftPower(advanceMatch(setup(18, 33, 'dificil'), 4), 'p0', 'escudo');
    shielded = {
      ...shielded,
      racers: shielded.racers.map((r) => (r.participantId === 'p0' ? { ...r, shieldUntil: 9999 } : r)),
    };
    const end = runToEnd(shielded);
    expect(end.racers.find((r) => r.participantId === 'p0')!.hits).toBe(0);
  });

  it('meteoro atordoa os rivais mas não quem enviou', () => {
    const base = advanceMatch(setup(10, 4), 4);
    const hit = applyGiftPower(base, 'p2', 'meteoro');
    expect(racerCondition(hit, hit.racers.find((r) => r.participantId === 'p2')!)).not.toBe('atordoado');
    expect(racerCondition(hit, hit.racers.find((r) => r.participantId === 'p4')!)).toBe('atordoado');
  });

  it('presente de quem não corre não altera a partida', () => {
    const race = advanceMatch(setup(), 4);
    expect(applyGiftPower(race, 'desconhecido', 'foguete')).toBe(race);
  });

  it('turbo coletivo adianta a chegada de todos', () => {
    const plain = runToEnd(advanceMatch(setup(12, 8), 4));
    const turbo = runToEnd(applyTurbo(advanceMatch(setup(12, 8), 4), 30));
    expect(turbo.t).toBeLessThan(plain.t);
  });

  it('resultados dão pontos decrescentes por posição', () => {
    const results = computeResults(runToEnd(advanceMatch(setup(10, 6), 4)));
    const points = results.map((r) => r.points);
    expect(points).toEqual([...points].sort((a, b) => b - a));
  });
});

function participant(id: string, points: number, wins = 0, extra: Partial<Participant> = {}): Participant {
  return {
    id,
    username: id,
    characterSeed: id,
    joinedAt: 0,
    lastSeenAt: 0,
    xp: points * 2,
    wins,
    matches: 5,
    points,
    weekly: { points: Math.floor(points / 2), wins: 0 },
    daily: { points: 0, wins: 0 },
    byGame: { corrida: { points, wins, matches: 5 } },
    origin: 'sintetico',
    ...extra,
  };
}

describe('ranking', () => {
  const people = [participant('a', 100, 3), participant('b', 250, 7), participant('c', 100, 5), participant('d', 0)];

  it('ordena por pontos, depois vitórias, e omite quem não pontuou na visão', () => {
    const rows = buildRanking(people, 'geral');
    expect(rows.map((r) => r.participant.id)).toEqual(['b', 'c', 'a']);
    expect(rows.map((r) => r.position)).toEqual([1, 2, 3]);
    expect(buildRanking(people, 'diario')).toHaveLength(0);
  });

  it('calcula a evolução a partir do instantâneo anterior', () => {
    const before = rankSnapshot(people, 'geral');
    const after = [...people.slice(0, 3).map((p) => (p.id === 'a' ? { ...p, points: 400 } : p))];
    const rows = buildRanking(after, 'geral', before);
    const a = rows.find((r) => r.participant.id === 'a')!;
    expect(a.position).toBe(1);
    expect(a.delta).toBe(2);
    expect(rows.find((r) => r.participant.id === 'b')!.delta).toBe(-1);
  });

  it('lê pontos por jogo e trata jogo sem dados como vazio', () => {
    expect(viewScore(people[0]!, 'jogo:corrida')).toEqual({ points: 100, wins: 3 });
    expect(buildRanking(people, 'jogo:futebol')).toHaveLength(0);
  });
});
