import { Gamepad2, Play } from 'lucide-react';
import { GIFTS } from '../domain/gifts';
import { GoalMeter } from '../components/GoalMeter';
import { Button, ButtonLink } from '../components/ui/Button';
import { EmptyState } from '../components/ui/States';
import { ArenaStage } from '../features/arena/ArenaStage';
import { MatchControls } from '../features/arena/MatchControls';
import { ChatPanel, LobbyPanel, PollPanel, StandingsPanel } from '../features/arena/SidePanels';
import { useActions } from '../state/AppProvider';
import { useAppState } from '../state/store';
import '../features/arena/arena.css';

function GiftsLegend() {
  return (
    <section className="panel" aria-labelledby="gifts-title">
      <header className="panel__head">
        <h2 className="panel__title" id="gifts-title">
          Poderes dos presentes
        </h2>
        <span className="panel__sub">simulados</span>
      </header>
      <ul className="gifts">
        {GIFTS.map((g) => (
          <li key={g.id} className="gifts__item">
            <strong>{g.name}</strong>
            <span>{g.effect}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ArenaPage() {
  const actions = useActions();
  const selected = useAppState((s) => s.selectedGameId, Object.is);

  if (!selected) {
    return (
      <div className="panel">
        <EmptyState icon={Gamepad2} title="Nenhuma partida em andamento" text="Escolha um jogo para montar a arena. Ele aparece aqui, pronto para iniciar.">
          <ButtonLink to="/game-hub" variant="primary" icon={Gamepad2}>
            Escolher jogo
          </ButtonLink>
          <Button icon={Play} onClick={() => actions.selectGame('corrida')}>
            Usar a corrida de obstáculos
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="arena">
      <MatchControls />
      <div className="arena__grid">
        <div className="stack">
          <section className="panel arena__stage" aria-label="Arena">
            <ArenaStage />
          </section>
          <div className="arena__below">
            <GoalMeter />
            <GiftsLegend />
          </div>
        </div>
        <div className="stack">
          <StandingsPanel />
          <LobbyPanel />
          <PollPanel />
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}
