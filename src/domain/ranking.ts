// Ranking competitivo a partir dos participantes.

import type { GameId, Participant } from './types';

export type RankView = 'geral' | 'semanal' | 'diario' | `jogo:${GameId}`;

export interface RankRow {
  participant: Participant;
  position: number;
  points: number;
  wins: number;
  xp: number;
  /** Positivo = subiu posições, negativo = caiu, 0 = igual. */
  delta: number;
}

export const RANK_VIEWS_TRACKED: RankView[] = ['geral', 'semanal', 'diario', 'jogo:corrida'];

export function viewScore(p: Participant, view: RankView): { points: number; wins: number } {
  if (view === 'geral') return { points: p.points, wins: p.wins };
  if (view === 'semanal') return p.weekly;
  if (view === 'diario') return p.daily;
  const game = view.slice('jogo:'.length) as GameId;
  const stats = p.byGame[game];
  return { points: stats?.points ?? 0, wins: stats?.wins ?? 0 };
}

function sorted(participants: readonly Participant[], view: RankView) {
  return participants
    .map((participant) => ({ participant, ...viewScore(participant, view) }))
    .filter((row) => row.points > 0)
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.participant.xp - a.participant.xp ||
        a.participant.username.localeCompare(b.participant.username),
    );
}

/** Posição de cada participante nesta visão (usada como referência para a evolução). */
export function rankSnapshot(participants: readonly Participant[], view: RankView): Record<string, number> {
  return Object.fromEntries(sorted(participants, view).map((row, i) => [row.participant.id, i + 1]));
}

export function buildRanking(
  participants: readonly Participant[],
  view: RankView,
  previous?: Record<string, number>,
): RankRow[] {
  return sorted(participants, view).map((row, i) => {
    const position = i + 1;
    const before = previous?.[row.participant.id];
    return {
      participant: row.participant,
      position,
      points: row.points,
      wins: row.wins,
      xp: row.participant.xp,
      delta: before === undefined ? 0 : before - position,
    };
  });
}
