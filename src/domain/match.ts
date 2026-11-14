// Ponto único de entrada para as partidas. A corrida de obstáculos mora em race.ts e os demais jogos em arena.ts;
// quem usa a partida (motor de estado, interface) fala só com este módulo e não precisa saber qual jogo é.

import { ARENA_GAMES, soccerWinner, type ArenaSetup } from './arena';
import * as race from './race';
import type { GameId, MatchResult, MatchState, Racer } from './types';

export { applyGiftPower, applyTurbo, pauseMatch, resumeMatch } from './race';

const SUBSTEP = 0.05;

export function createMatch(setup: ArenaSetup): MatchState {
  const game = ARENA_GAMES[setup.gameId];
  if (!game) return race.createRace(setup);
  const created = game.create(setup);
  return {
    id: setup.id,
    gameId: setup.gameId,
    status: 'contagem',
    seed: setup.seed,
    trackLength: created.trackLength,
    laneCount: Math.max(1, setup.participantIds.length),
    durationSec: setup.durationSec,
    difficulty: setup.difficulty,
    t: 0,
    countdown: race.COUNTDOWN_SECONDS,
    turboUntil: 0,
    racers: created.racers,
    obstacles: [],
    world: created.world,
    results: null,
    startedAt: setup.startedAt ?? 0,
  };
}

function finish(state: MatchState): MatchState {
  const ended: MatchState = { ...state, status: 'encerrada' };
  const results = computeResults(ended);
  const positionById = new Map(results.map((r) => [r.participantId, r.position]));
  return {
    ...ended,
    racers: ended.racers.map((r) => ({ ...r, position: positionById.get(r.participantId) ?? r.position })),
    results,
  };
}

export function advanceMatch(state: MatchState, dt: number): MatchState {
  const game = ARENA_GAMES[state.gameId];
  if (!game) return race.advanceMatch(state, dt);
  if (dt <= 0) return state;
  if (state.status === 'contagem') {
    const countdown = state.countdown - dt;
    return countdown > 0 ? { ...state, countdown } : { ...state, countdown: 0, status: 'em-andamento' };
  }
  if (state.status !== 'em-andamento') return state;

  // Passos curtos mantêm a física estável mesmo quando a aba volta de um tempo parada.
  let s = state;
  let left = dt;
  while (left > 1e-9) {
    const h = Math.min(SUBSTEP, left);
    left -= h;
    const out = game.step(s, h);
    s = { ...s, t: s.t + h, racers: out.racers, world: out.world };
    if (out.done) return finish(s);
  }
  return s;
}

export function standings(state: MatchState): Racer[] {
  const game = ARENA_GAMES[state.gameId];
  return game ? game.order(state) : race.standings(state);
}

export function computeResults(state: MatchState): MatchResult[] {
  const game = ARENA_GAMES[state.gameId];
  if (!game) return race.computeResults(state);
  const order = game.order(state);
  const n = order.length;
  const winnerTeam = state.world?.kind === 'soccer' ? soccerWinner(state.world) : null;
  const decided = state.world?.kind === 'soccer' ? winnerTeam !== null : true;
  return order.map((racer, i) => {
    const position = i + 1;
    const standing = racer.alive || racer.finishedAt !== null;
    // Na lava e na batalha, o último a cair vence mesmo quando todos caem no mesmo instante.
    const lastOut = state.world?.kind === 'lava' || state.world?.kind === 'brawl';
    const won = state.world?.kind === 'soccer' ? decided && racer.team === winnerTeam : position === 1 && (standing || lastOut);
    const share = standing ? 1 : 0.5;
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

export function endMatchEarly(state: MatchState): MatchState {
  if (state.status === 'encerrada') return state;
  const game = ARENA_GAMES[state.gameId];
  return game ? finish(state) : race.endMatchEarly(state);
}

export type RacerCondition = 'chegou' | 'atordoado' | 'impulso' | 'escudo' | 'correndo' | 'fora';

export function racerCondition(state: MatchState, racer: Racer): RacerCondition {
  if (!racer.alive) return 'fora';
  return race.racerCondition(state, racer);
}

/** Texto e progresso de cada jogador na classificação, de acordo com o jogo. */
export function describeRacer(state: MatchState, racer: Racer): { progress?: number; value: string } {
  const gameId: GameId = state.gameId;
  switch (gameId) {
    case 'chao-de-lava':
      return { value: racer.alive ? 'em pé' : 'caiu' };
    case 'batalha-empurroes':
      return { value: racer.alive ? `${racer.score} empurrões` : 'fora da arena' };
    case 'futebol':
      return { value: `${racer.score} ${racer.score === 1 ? 'gol' : 'gols'}` };
    case 'plataformas':
      return {
        progress: racer.x / state.trackLength,
        value: !racer.alive ? 'caiu' : racer.finishedAt !== null ? 'chegou' : `${racer.x}/${state.trackLength}`,
      };
    case 'batatinha':
      return {
        progress: racer.x / state.trackLength,
        value: !racer.alive ? 'eliminado' : racer.finishedAt !== null ? 'chegou' : `${Math.round(racer.x)} m`,
      };
    default:
      return { progress: racer.x / state.trackLength, value: '' };
  }
}
