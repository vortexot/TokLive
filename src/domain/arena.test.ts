import { describe, expect, it } from 'vitest';
import { advanceMatch, computeResults, createMatch, standings } from './match';
import { ARENA_GAMES } from './arena';
import type { Difficulty, GameId, MatchState } from './types';

const IDS = Array.from({ length: 16 }, (_, i) => `p${i}`);

function make(gameId: GameId, seed = 7, difficulty: Difficulty = 'normal', ids = IDS, durationSec = 90): MatchState {
  return createMatch({ id: 'm', gameId, participantIds: ids, durationSec, difficulty, seed });
}

function run(match: MatchState, dt = 0.1, limit = 400): MatchState {
  let s = match;
  for (let t = 0; t < limit && s.status !== 'encerrada'; t += dt) s = advanceMatch(s, dt);
  return s;
}

const GAMES = Object.keys(ARENA_GAMES) as GameId[];

describe.each(GAMES)('jogo de arena %s', (gameId) => {
  it('é determinístico para a mesma semente', () => {
    const a = run(make(gameId));
    const b = run(make(gameId));
    expect(a.results).toEqual(b.results);
    expect(a.t).toBeCloseTo(b.t, 6);
  });

  it('termina dentro do tempo e classifica todos os participantes', () => {
    const end = run(make(gameId));
    expect(end.status).toBe('encerrada');
    expect(end.t).toBeLessThanOrEqual(90 + 0.2);
    expect(end.results).toHaveLength(IDS.length);
    const positions = end.results!.map((r) => r.position).sort((a, b) => a - b);
    expect(positions).toEqual(IDS.map((_, i) => i + 1));
    expect(new Set(end.results!.map((r) => r.participantId)).size).toBe(IDS.length);
    expect(standings(end)[0]!.participantId).toBe(end.results!.find((r) => r.position === 1)!.participantId);
  });

  it('não tem partida em andamento antes da contagem acabar', () => {
    let s = make(gameId);
    s = advanceMatch(s, 1);
    expect(s.status).toBe('contagem');
    expect(s.t).toBe(0);
    s = advanceMatch(s, 3);
    expect(s.status).toBe('em-andamento');
  });

  it('muda o resultado com outra semente em ao menos algum caso', () => {
    const outcomes = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6]) outcomes.add(JSON.stringify(run(make(gameId, seed)).results!.slice(0, 3).map((r) => r.participantId)));
    expect(outcomes.size).toBeGreaterThan(1);
  });

  it('funciona com o mínimo e com o máximo de participantes', () => {
    for (const n of [4, 30]) {
      const ids = Array.from({ length: n }, (_, i) => `q${i}`);
      const end = run(make(gameId, 3, 'normal', ids));
      expect(end.results).toHaveLength(n);
    }
  });
});

describe('regras específicas', () => {
  it('chão de lava: há eliminados e no máximo um vencedor', () => {
    const end = run(make('chao-de-lava', 11, 'dificil'));
    expect(end.racers.some((r) => !r.alive)).toBe(true);
    expect(end.results!.filter((r) => r.won).length).toBeLessThanOrEqual(1);
  });

  it('batalha: a plataforma encolhe e quem sai é eliminado', () => {
    const end = run(make('batalha-empurroes', 5, 'dificil'));
    expect(end.racers.filter((r) => !r.alive).length).toBeGreaterThan(0);
    for (const r of end.racers) if (!r.alive) expect(r.outAt).not.toBeNull();
  });

  it('batatinha: eliminados nunca passam do último que chegou', () => {
    const end = run(make('batatinha', 9, 'dificil'));
    const out = end.racers.filter((r) => !r.alive);
    expect(out.length).toBeGreaterThan(0);
    for (const r of out) expect(r.finishedAt).toBeNull();
  });

  it('batatinha: o escudo evita a eliminação no vermelho', () => {
    const base = make('batatinha', 9, 'dificil');
    const shielded: MatchState = { ...base, racers: base.racers.map((r) => ({ ...r, shieldUntil: 1000 })) };
    const end = run(shielded);
    expect(end.racers.every((r) => r.alive)).toBe(true);
  });

  it('futebol: dois times equilibrados e placar coerente com os gols individuais', () => {
    const end = run(make('futebol', 4));
    const t0 = end.racers.filter((r) => r.team === 0).length;
    const t1 = end.racers.filter((r) => r.team === 1).length;
    expect(Math.abs(t0 - t1)).toBeLessThanOrEqual(1);
    if (end.world?.kind !== 'soccer') throw new Error('mundo errado');
    const scored = (team: number) => end.racers.filter((r) => r.team === team).reduce((n, r) => n + r.score, 0);
    expect(scored(0)).toBeLessThanOrEqual(end.world.goals[0]);
    expect(scored(1)).toBeLessThanOrEqual(end.world.goals[1]);
    const total = end.world.goals[0] + end.world.goals[1];
    expect(total).toBeGreaterThanOrEqual(0);
  });

  it('futebol: a bola fica dentro do campo', () => {
    let s = make('futebol', 6);
    for (let i = 0; i < 400 && s.status !== 'encerrada'; i++) {
      s = advanceMatch(s, 0.1);
      if (s.world?.kind === 'soccer') {
        expect(Math.abs(s.world.ball.x)).toBeLessThanOrEqual(s.world.w / 2 + 1e-6);
        expect(Math.abs(s.world.ball.y)).toBeLessThanOrEqual(s.world.h / 2 + 1e-6);
      }
    }
  });

  it('plataformas: cada fileira revela a casa falsa depois do primeiro passo', () => {
    const end = run(make('plataformas', 2));
    if (end.world?.kind !== 'bridge') throw new Error('mundo errado');
    end.world.known.forEach((k, row) => {
      if (k !== -1) expect(k).toBe(end.world && end.world.kind === 'bridge' ? end.world.fake[row] : -2);
    });
    expect(end.racers.some((r) => !r.alive)).toBe(true);
  });

  it('computeResults dá vitória a no máximo um jogador fora do futebol', () => {
    for (const g of GAMES.filter((x) => x !== 'futebol')) {
      const end = run(make(g, 13));
      expect(computeResults(end).filter((r) => r.won).length).toBeLessThanOrEqual(1);
    }
  });
});
