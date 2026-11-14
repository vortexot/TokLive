import { useEffect, useRef, useState } from 'react';
import { generateCharacter } from '../../domain/characters';
import { standings } from '../../domain/match';
import type { GameId } from '../../domain/types';
import type { CharacterSpec, Participant } from '../../domain/types';
import { Avatar } from '../../components/avatar/AvatarSvg';
import { participantMap } from '../arena/useArena';
import { useAppState, useAppStore } from '../../state/store';
import type { AppState } from '../../state/types';
import { ArenaScene } from './arenaScene';
import { RaceScene } from './raceScene';
import type { GameScene, SceneInput, SceneRacer } from './sceneTypes';
import { hasWebGL } from './webgl';
import './scene.css';

const specCache = new Map<string, CharacterSpec>();
function specFor(seed: string): CharacterSpec {
  let spec = specCache.get(seed);
  if (!spec) {
    spec = generateCharacter(seed);
    if (specCache.size > 2000) specCache.clear();
    specCache.set(seed, spec);
  }
  return spec;
}

/** Participantes para a prévia quando não há partida: os de maior XP, recalculados no máximo a cada 3 s. */
function createTopPicker() {
  let at = 0;
  let top: string[] = [];
  let source: Participant[] | null = null;
  return (participants: Participant[], now: number): string[] => {
    if (source !== participants && now - at > 3000) {
      at = now;
      source = participants;
      top = participants
        .slice()
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 10)
        .map((p) => p.id);
    }
    return top;
  };
}

/**
 * Monta a entrada da cena só com os personagens que aparecem (quem joga, quem espera e a prévia).
 * Com milhares de participantes, nada aqui pode crescer com o tamanho da lista.
 */
function toInput(state: AppState, showNames: boolean, gameId: GameId | undefined, pickTop: ReturnType<typeof createTopPicker>): SceneInput {
  const people = participantMap(state.participants);
  const racers = new Map<string, SceneRacer>();
  const need = (id: string) => {
    if (racers.has(id)) return;
    const p = people.get(id);
    if (p) racers.set(id, { id: p.id, username: p.username, spec: specFor(p.characterSeed) });
  };
  state.match?.racers.forEach((r) => need(r.participantId));
  state.lobby.slice(0, 40).forEach(need);
  const lobby = state.lobby.filter((id) => racers.has(id));
  const top = lobby.length >= 4 ? [] : pickTop(state.participants, performance.now());
  top.forEach(need);
  return {
    match: state.match,
    gameId,
    racers,
    previewIds: lobby.length >= 4 ? lobby : [...lobby, ...top.filter((id) => !lobby.includes(id))].slice(0, 10),
    showNames,
  };
}

/** Fallback sem WebGL: raias 2D com o progresso de cada corredor. */
function LanesFallback() {
  const { match, participants } = useAppState((s) => ({ match: s.match, participants: s.participants }));
  const byId = new Map(participants.map((p) => [p.id, p]));
  const rows = match ? standings(match).slice(0, 8) : [];
  return (
    <div className="stage__fallback" role="img" aria-label="Prévia 2D da corrida">
      <p className="stage__fallback-note">A prévia 3D precisa de WebGL, que este navegador não ofereceu. Mostrando as raias em 2D.</p>
      {match ? (
        <ol className="stage__lanes">
          {rows.map((r, i) => {
            const p = byId.get(r.participantId);
            return (
              <li key={r.participantId}>
                <span className="score stage__lane-pos">{i + 1}</span>
                <Avatar seed={p?.characterSeed ?? r.participantId} size={26} />
                <span className="stage__lane-name">@{p?.username}</span>
                <span className="stage__lane-track">
                  <span style={{ width: `${Math.min(100, (r.x / match.trackLength) * 100)}%` }} />
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}

/** Jogo mostrado: o da partida em andamento, senão o pedido pela página, senão o escolhido na arena. */
function useStageGame(forced: GameId | undefined): GameId {
  return useAppState((s) => s.match?.gameId ?? forced ?? s.selectedGameId ?? 'corrida', Object.is);
}

export function RaceStage({
  transparent = false,
  showNames = true,
  label = 'Arena 3D da corrida',
  gameId: forcedGame,
}: {
  transparent?: boolean;
  showNames?: boolean;
  label?: string;
  /** Jogo a mostrar quando não há partida (prévia na página de configuração). */
  gameId?: GameId;
}) {
  const gameId = useStageGame(forcedGame);
  const store = useAppStore();
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const webgl = hasWebGL() && !failed;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !webgl) return;
    // Um canvas novo por montagem: um contexto descartado não pode ser reaproveitado (StrictMode monta duas vezes).
    const canvas = document.createElement('canvas');
    canvas.className = 'stage__canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
    host.appendChild(canvas);

    let scene: GameScene;
    try {
      scene = gameId === 'corrida' ? new RaceScene(canvas, { transparent }) : new ArenaScene(canvas, { transparent });
    } catch {
      canvas.remove();
      setFailed(true);
      return;
    }
    const pickTop = createTopPicker();
    const push = () => scene.setInput(toInput(store.getState(), showNames, gameId, pickTop));
    push();
    // Vários eventos por quadro viram uma única montagem de entrada.
    let queued = 0;
    const unsubscribe = store.subscribe(() => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        push();
      });
    });

    const fit = () => scene.resize(host.clientWidth, host.clientHeight);
    fit();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    observer?.observe(host);

    // Pausa o desenho quando a aba não está visível.
    const onVisibility = () => (document.hidden ? scene.stop() : scene.start());
    document.addEventListener('visibilitychange', onVisibility);
    scene.start();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
      unsubscribe();
      cancelAnimationFrame(queued);
      scene.dispose();
      canvas.remove();
    };
  }, [store, transparent, showNames, webgl, label, gameId]);

  if (!webgl) return <LanesFallback />;
  return <div ref={hostRef} className="stage__host" />;
}
