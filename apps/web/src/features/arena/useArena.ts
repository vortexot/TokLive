import { standings, racerCondition } from '../../domain/race';
import type { Participant } from '../../domain/types';
import type { LaneRow } from '../../components/board/LaneBoard';
import { formatClock } from '../../lib/format';
import { useAppState } from '../../state/store';
import type { AppState } from '../../state/types';

const byIdCache = new WeakMap<Participant[], Map<string, Participant>>();

export function participantMap(list: Participant[]): Map<string, Participant> {
  let map = byIdCache.get(list);
  if (!map) {
    map = new Map(list.map((p) => [p.id, p]));
    byIdCache.set(list, map);
  }
  return map;
}

function rowsOf(state: AppState, limit: number): LaneRow[] {
  const match = state.match;
  if (!match) return [];
  const people = participantMap(state.participants);
  return standings(match)
    .slice(0, limit)
    .map((racer, i) => {
      const p = people.get(racer.participantId);
      return {
        id: racer.participantId,
        position: i + 1,
        username: p?.username ?? '?',
        seed: p?.characterSeed ?? racer.participantId,
        progress: racer.x / match.trackLength,
        value: racer.finishedAt !== null ? formatClock(racer.finishedAt, true) : `${Math.round(racer.x)} m`,
        condition: racerCondition(match, racer),
      };
    });
}

function sameRows(a: LaneRow[], b: LaneRow[]): boolean {
  return (
    a.length === b.length &&
    a.every((r, i) => {
      const o = b[i]!;
      return r.id === o.id && r.condition === o.condition && r.value === o.value && Math.round((r.progress ?? 0) * 200) === Math.round((o.progress ?? 0) * 200);
    })
  );
}

/** Classificação ao vivo. Só muda quando algo visível muda (posição, metros, estado). */
export function useStandingRows(limit = 12): LaneRow[] {
  return useAppState((s) => rowsOf(s, limit), sameRows);
}

/** Décimos de segundo da partida, para o cronômetro. */
export function useMatchTenths(): number {
  return useAppState((s) => (s.match ? Math.floor(s.match.t * 10) : 0), Object.is);
}
