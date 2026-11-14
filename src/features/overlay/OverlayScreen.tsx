import { useEffect, useState } from 'react';
import { Crown, Flame, Gift, Radio, Target, Trophy, Zap } from 'lucide-react';
import { LaneBoard } from '../../components/board/LaneBoard';
import { Avatar } from '../../components/avatar/AvatarSvg';
import { ActivityIcon } from '../../components/ui/ActivityIcon';
import { LogoMark } from '../../components/layout/Logo';
import { formatClock, formatNumber } from '../../lib/format';
import type { OverlayOptions } from '../../domain/session';
import { useAppState } from '../../state/store';
import { participantMap, useStandingRows } from '../arena/useArena';
import { RaceStage } from '../scene/RaceStage';
import './overlay.css';

const W = 1920;
const H = 1080;

/** Escala do espaço de desenho 1920×1080 para a janela real (o OBS pode usar qualquer resolução). */
function useScale(): number {
  const [scale, setScale] = useState(() => Math.min(window.innerWidth / W, window.innerHeight / H));
  useEffect(() => {
    const on = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return scale;
}

function Brand() {
  const { name, live } = useAppState((s) => ({ name: s.settings.arenaName, live: s.connection.status === 'ao-vivo' }));
  return (
    <div className="ov-brand">
      <LogoMark size={40} />
      <div>
        <p className="ov-brand__word">TokArena</p>
        <p className="ov-brand__sub">{name}</p>
      </div>
      {live ? (
        <span className="ov-live">
          <span className="live-dot" aria-hidden /> Ao vivo
        </span>
      ) : null}
    </div>
  );
}

function Goal() {
  const goal = useAppState((s) => s.goal);
  return (
    <div className="ov-goal">
      <p className="ov-goal__head">
        <Target size={22} aria-hidden /> Objetivo coletivo
        <span className="score ov-goal__fig">
          {formatNumber(goal.progress)} <small>/ {formatNumber(goal.target)} curtidas</small>
        </span>
      </p>
      <div className="ov-bar">
        <div className="ov-bar__fill" style={{ width: `${Math.min(100, (goal.progress / goal.target) * 100)}%` }} />
      </div>
    </div>
  );
}

function Ranking() {
  const rows = useStandingRows(8);
  if (!rows.length) return null;
  return (
    <div className="ov-panel ov-rank">
      <p className="ov-panel__title">Classificação</p>
      <LaneBoard rows={rows.map((r) => ({ ...r, value: r.value }))} label="Classificação da corrida" compact />
    </div>
  );
}

function Feed() {
  const items = useAppState((s) => s.activity.filter((a) => a.kind !== 'conexao').slice(0, 5), (a, b) => a.length === b.length && a.every((x, i) => x.id === b[i]?.id && x.detail === b[i]?.detail));
  if (!items.length) return null;
  return (
    <div className="ov-panel ov-feed">
      <p className="ov-panel__title">
        <Radio size={20} aria-hidden /> Acontecendo agora
      </p>
      <ul>
        {items.map((a) => (
          <li key={a.id}>
            <span className="ov-feed__icon">
              <ActivityIcon kind={a.kind} size={22} />
            </span>
            <span>
              <strong>{a.title}</strong>
              {a.detail ? <small>{a.detail}</small> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Effects() {
  const effects = useAppState((s) => s.effects.slice(-3), (a, b) => a.length === b.length && a.every((e, i) => e.id === b[i]?.id));
  return (
    <ul className="ov-fx">
      {effects.map((e) => (
        <li key={e.id} className={`ov-fx__item ov-fx__item--${e.kind}`}>
          {e.kind === 'presente' ? <Gift size={30} /> : e.kind === 'vitoria' ? <Trophy size={30} /> : e.kind === 'turbo' ? <Flame size={30} /> : <Zap size={30} />}
          <span>
            <strong>{e.title}</strong>
            {e.detail ? <small>{e.detail}</small> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Center() {
  const { match, participants, lobby } = useAppState((s) => ({ match: s.match, participants: s.participants, lobby: s.lobby.length }));
  const people = participantMap(participants);
  if (!match) {
    return (
      <div className="ov-center ov-center--wait">
        <p className="score ov-wait">Próxima partida em instantes</p>
        <p className="ov-wait__sub">Comente <strong>!entrar</strong> para participar{lobby ? ` · ${lobby} na fila` : ''}</p>
      </div>
    );
  }
  if (match.status === 'contagem') {
    return (
      <div className="ov-center">
        <span key={Math.ceil(match.countdown)} className="score ov-count">
          {Math.max(1, Math.ceil(match.countdown))}
        </span>
      </div>
    );
  }
  if (match.status === 'em-andamento' && match.t < 0.9) {
    return (
      <div className="ov-center">
        <span className="score ov-count">JÁ!</span>
      </div>
    );
  }
  if (match.status === 'pausada') {
    return (
      <div className="ov-center">
        <span className="score ov-wait">Pausada</span>
      </div>
    );
  }
  if (match.status === 'encerrada' && match.results) {
    return (
      <div className="ov-center">
        <div className="ov-panel ov-results">
          <p className="ov-panel__title">
            <Crown size={26} aria-hidden /> Resultado
          </p>
          <ol>
            {match.results.slice(0, 3).map((r) => {
              const p = people.get(r.participantId);
              return (
                <li key={r.participantId} className={r.position === 1 ? 'ov-results__win' : undefined}>
                  <span className="score ov-results__pos">{r.position}</span>
                  <Avatar seed={p?.characterSeed ?? r.participantId} size={54} />
                  <span className="ov-results__who">
                    <strong>@{p?.username}</strong>
                    <small>{r.finishedAt !== null ? formatClock(r.finishedAt, true) : 'Não chegou'} · +{r.points} pts</small>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    );
  }
  return null;
}

function Turbo() {
  const on = useAppState((s) => !!s.match && s.match.status === 'em-andamento' && s.match.t < s.match.turboUntil, Object.is);
  if (!on) return null;
  return (
    <div className="ov-turbo">
      <Flame size={34} aria-hidden /> Turbo coletivo
    </div>
  );
}

export function OverlayScreen({ options, debug }: { options: OverlayOptions; debug: boolean }) {
  const ready = useAppState((s) => s.ready, Object.is);
  const scale = useScale();
  const mode = useAppState((s) => (s.simulator.auto ? 'autônomo' : 'sincronizado'), Object.is);
  if (!ready) return null;
  return (
    <div className="ov" style={{ ['--s' as string]: scale }}>
      <div className="ov__scene">
        <RaceStage transparent showNames={options.showNames} label="Arena da corrida" />
      </div>
      <div className="ov__hud" aria-hidden>
        <Brand />
        {options.showGoal ? <Goal /> : null}
        {options.showRanking ? <Ranking /> : null}
        {options.showFeed ? <Feed /> : null}
        <Effects />
        <Turbo />
        <Center />
        {debug ? <p className="ov-debug">Modo {mode}</p> : null}
      </div>
    </div>
  );
}
