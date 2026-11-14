import { Target } from 'lucide-react';
import { formatNumber } from '../lib/format';
import { useAppState } from '../state/store';
import { ProgressBar } from './ui/Misc';

/** Barra do objetivo coletivo: as curtidas dos espectadores enchem a barra e liberam o turbo. */
export function GoalMeter() {
  const goal = useAppState((s) => s.goal);
  const turboRule = useAppState((s) => s.gameConfigs.corrida.rules['turbo-curtidas'] ?? false, Object.is);
  return (
    <section className="panel goal" aria-labelledby="goal-title">
      <header className="panel__head">
        <h2 className="panel__title" id="goal-title">
          Objetivo coletivo
        </h2>
        <Target size={17} aria-hidden className="goal__icon" />
      </header>
      <div className="panel__body goal__body">
        <p className="goal__figures">
          <span className="score goal__now">{formatNumber(goal.progress)}</span>
          <span className="goal__of"> / {formatNumber(goal.target)} curtidas</span>
        </p>
        <ProgressBar value={goal.progress / goal.target} label="Progresso da meta de curtidas" thick />
        <p className="panel__sub">
          Meta nº {goal.level}. {turboRule ? 'Ao encher, todos os corredores ganham o turbo coletivo.' : 'O turbo coletivo está desligado nas regras da corrida.'}
        </p>
        {goal.reached > 0 ? <p className="goal__reached">{goal.reached} {goal.reached === 1 ? 'meta atingida' : 'metas atingidas'} nesta sessão</p> : null}
      </div>
    </section>
  );
}
