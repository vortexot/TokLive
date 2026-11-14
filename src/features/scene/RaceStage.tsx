import { useEffect, useRef, useState } from 'react';
import { generateCharacter } from '../../domain/characters';
import { standings } from '../../domain/race';
import type { CharacterSpec, Participant } from '../../domain/types';
import { Avatar } from '../../components/avatar/AvatarSvg';
import { useAppState, useAppStore } from '../../state/store';
import type { AppState } from '../../state/types';
import { RaceScene, type SceneInput, type SceneRacer } from './raceScene';
import { hasWebGL } from './webgl';
import './scene.css';

const specCache = new Map<string, CharacterSpec>();
function specFor(seed: string): CharacterSpec {
  let spec = specCache.get(seed);
  if (!spec) {
    spec = generateCharacter(seed);
    if (specCache.size > 600) specCache.clear();
    specCache.set(seed, spec);
  }
  return spec;
}

interface Derived {
  participants: Participant[];
  racers: Map<string, SceneRacer>;
  top: string[];
}

/** Deriva o mapa de personagens só quando a lista de participantes muda de identidade. */
function deriveFrom(participants: Participant[], previous: Derived | null): Derived {
  if (previous && previous.participants === participants) return previous;
  const racers = new Map<string, SceneRacer>();
  for (const p of participants) racers.set(p.id, { id: p.id, username: p.username, spec: specFor(p.characterSeed) });
  const top = participants
    .slice()
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10)
    .map((p) => p.id);
  return { participants, racers, top };
}

function toInput(state: AppState, derived: Derived, showNames: boolean): SceneInput {
  const lobby = state.lobby.filter((id) => derived.racers.has(id));
  return {
    match: state.match,
    racers: derived.racers,
    previewIds: lobby.length >= 4 ? lobby : [...lobby, ...derived.top.filter((id) => !lobby.includes(id))].slice(0, 10),
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

export function RaceStage({
  transparent = false,
  showNames = true,
  label = 'Arena 3D da corrida',
}: {
  transparent?: boolean;
  showNames?: boolean;
  label?: string;
}) {
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

    let scene: RaceScene;
    try {
      scene = new RaceScene(canvas, { transparent });
    } catch {
      canvas.remove();
      setFailed(true);
      return;
    }
    let derived: Derived | null = null;
    const push = () => {
      const state = store.getState();
      derived = deriveFrom(state.participants, derived);
      scene.setInput(toInput(state, derived, showNames));
    };
    push();
    const unsubscribe = store.subscribe(push);

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
      scene.dispose();
      canvas.remove();
    };
  }, [store, transparent, showNames, webgl, label]);

  if (!webgl) return <LanesFallback />;
  return <div ref={hostRef} className="stage__host" />;
}
