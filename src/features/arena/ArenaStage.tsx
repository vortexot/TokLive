import { lazy, Suspense } from 'react';
import { Crown, Flame, Gift, Pause, Trophy, Zap } from 'lucide-react';
import { Avatar } from '../../components/avatar/AvatarSvg';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/States';
import { formatClock } from '../../lib/format';
import { useActions } from '../../state/AppProvider';
import { useAppState } from '../../state/store';
import { participantMap } from './useArena';

const RaceStage = lazy(() => import('../scene/RaceStage').then((m) => ({ default: m.RaceStage })));

function Countdown() {
  const value = useAppState((s) => (s.match?.status === 'contagem' ? Math.ceil(s.match.countdown) : 0), Object.is);
  const go = useAppState((s) => s.match?.status === 'em-andamento' && s.match.t < 0.9, Object.is);
  if (!value && !go) return null;
  return (
    <div className="stage-over stage-over--count" aria-hidden>
      <span key={value || 'go'} className="count score">
        {value || 'JÁ!'}
      </span>
    </div>
  );
}

function Turbo() {
  const on = useAppState((s) => !!s.match && s.match.status === 'em-andamento' && s.match.t < s.match.turboUntil, Object.is);
  if (!on) return null;
  return (
    <div className="turbo" role="status">
      <Flame size={18} aria-hidden /> Turbo coletivo
    </div>
  );
}

function Effects() {
  const effects = useAppState((s) => s.effects.slice(-3), (a, b) => a.length === b.length && a.every((e, i) => e.id === b[i]?.id));
  return (
    <ul className="fx" aria-hidden>
      {effects.map((e) => (
        <li key={e.id} className={`fx__item fx__item--${e.kind}`}>
          {e.kind === 'presente' ? <Gift size={15} /> : e.kind === 'vitoria' ? <Trophy size={15} /> : <Zap size={15} />}
          <span>
            <strong>{e.title}</strong>
            {e.detail ? <small>{e.detail}</small> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Results() {
  const actions = useActions();
  const data = useAppState((s) => ({ match: s.match, participants: s.participants }));
  const { match } = data;
  if (!match || match.status !== 'encerrada' || !match.results) return null;
  const people = participantMap(data.participants);
  const top = match.results.slice(0, 3);
  return (
    <div className="stage-over stage-over--results" role="dialog" aria-modal="false" aria-label="Resultado da partida">
      <div className="results">
        <h3 className="results__title">
          <Crown size={20} aria-hidden /> Resultado
        </h3>
        <ol className="results__top">
          {top.map((r) => {
            const p = people.get(r.participantId);
            return (
              <li key={r.participantId} className={`results__item${r.position === 1 ? ' results__item--win' : ''}`}>
                <span className="score results__pos">{r.position}</span>
                <Avatar seed={p?.characterSeed ?? r.participantId} size={38} />
                <span className="results__who">
                  <strong>@{p?.username}</strong>
                  <small>{r.finishedAt !== null ? formatClock(r.finishedAt, true) : 'Não chegou'} · +{r.points} pts · +{r.xp} XP</small>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="results__actions">
          <Button variant="primary" onClick={() => { actions.dismissMatch(); actions.startMatch(); }}>
            Nova partida
          </Button>
          <Button onClick={() => actions.dismissMatch()}>Fechar resultado</Button>
        </div>
      </div>
    </div>
  );
}

export function ArenaStage() {
  const paused = useAppState((s) => s.match?.status === 'pausada', Object.is);
  const showNames = useAppState((s) => s.settings.overlay.showNames, Object.is);
  return (
    <div className="stage">
      <Suspense fallback={<Skeleton height="100%" />}>
        <RaceStage showNames={showNames} label="Arena 3D da corrida" />
      </Suspense>
      <Countdown />
      <Turbo />
      <Effects />
      {paused ? (
        <div className="stage-over stage-over--paused" role="status">
          <Pause size={34} aria-hidden />
          <span className="score">Pausada</span>
        </div>
      ) : null}
      <Results />
    </div>
  );
}
