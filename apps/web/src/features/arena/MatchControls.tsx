import { useState } from 'react';
import { Cast, Pause, Play, Settings2, Square } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DIFFICULTY_LABELS, GAME_BY_ID, isPlayable } from '../../domain/games';
import type { MatchStatus } from '../../domain/types';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Pill } from '../../components/ui/Misc';
import { formatClock, formatDuration } from '../../lib/format';
import { useActions } from '../../state/AppProvider';
import { useAppState } from '../../state/store';
import { GameArt } from '../games/GameArt';
import { OverlayDialog } from '../overlay/OverlayDialog';
import { useMatchTenths } from './useArena';

const STATUS_LABEL: Record<MatchStatus | 'pronta', string> = {
  pronta: 'Pronta para iniciar',
  contagem: 'Largando',
  'em-andamento': 'Em andamento',
  pausada: 'Pausada',
  encerrada: 'Encerrada',
};

function Timer() {
  const tenths = useMatchTenths();
  const limit = useAppState((s) => s.match?.durationSec ?? 0, Object.is);
  return (
    <p className="timer" aria-label="Tempo de partida">
      <span className="score timer__now">{formatClock(tenths / 10, true)}</span>
      <span className="timer__limit"> / {formatClock(limit)}</span>
    </p>
  );
}

export function MatchControls() {
  const actions = useActions();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const { gameId, status, racers, config } = useAppState((s) => ({
    gameId: s.selectedGameId,
    status: s.match?.status ?? null,
    racers: s.match?.racers.length ?? 0,
    config: s.selectedGameId ? s.gameConfigs[s.selectedGameId] : null,
  }));
  if (!gameId || !config) return null;
  const game = GAME_BY_ID[gameId];
  const playable = isPlayable(gameId);
  const active = status === 'contagem' || status === 'em-andamento' || status === 'pausada';
  const label = STATUS_LABEL[status ?? 'pronta'];

  return (
    <section className="panel match" aria-label="Controle da partida">
      <div className="match__game">
        <div className="match__art" aria-hidden>
          <GameArt id={gameId} />
        </div>
        <div className="match__text">
          <h2 className="match__name">{game.name}</h2>
          <p className="match__meta">
            <Pill tone={status === 'em-andamento' ? 'live' : status === 'pausada' ? 'warn' : status === 'encerrada' ? 'ok' : 'neutral'} dot={status === 'em-andamento'}>
              {label}
            </Pill>
            <span>
              {active ? `${racers} participantes` : `até ${config.maxParticipants} participantes`} · {formatDuration(config.durationSec)} · {DIFFICULTY_LABELS[config.difficulty]}
            </span>
          </p>
        </div>
      </div>

      <Timer />

      <div className="match__actions">
        {!active ? (
          <Button variant="primary" icon={Play} disabled={!playable} onClick={() => (status === 'encerrada' ? (actions.dismissMatch(), actions.startMatch()) : actions.startMatch())}>
            {status === 'encerrada' ? 'Nova partida' : 'Iniciar partida'}
          </Button>
        ) : status === 'pausada' ? (
          <Button variant="primary" icon={Play} onClick={() => actions.resumeMatch()}>
            Retomar
          </Button>
        ) : (
          <Button icon={Pause} onClick={() => actions.pauseMatch()}>
            Pausar
          </Button>
        )}
        <Button variant="danger" icon={Square} disabled={!active} onClick={() => setConfirmEnd(true)}>
          Encerrar
        </Button>
        <Link className="btn btn--ghost" to={`/game-hub/${gameId}`}>
          <Settings2 size={17} aria-hidden /> Configurar
        </Link>
        <Button variant="ghost" icon={Cast} onClick={() => setOverlayOpen(true)}>
          Overlay OBS
        </Button>
      </div>

      <Dialog
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title="Encerrar a partida agora?"
        description="A classificação será calculada pela posição atual de cada corredor e os prêmios serão aplicados."
        footer={
          <>
            <Button onClick={() => setConfirmEnd(false)}>Continuar partida</Button>
            <Button
              variant="primary"
              onClick={() => {
                actions.endMatch();
                setConfirmEnd(false);
              }}
            >
              Encerrar partida
            </Button>
          </>
        }
      >
        <p>Quem ainda não chegou recebe pontos reduzidos e não há vencedor se ninguém cruzou a linha.</p>
      </Dialog>
      <OverlayDialog open={overlayOpen} onClose={() => setOverlayOpen(false)} />
    </section>
  );
}
