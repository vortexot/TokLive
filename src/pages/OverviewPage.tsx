import { lazy, Suspense } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ActivityFeed } from '../components/ActivityFeed';
import { GoalMeter } from '../components/GoalMeter';
import { ButtonLink } from '../components/ui/Button';
import { KeyValue } from '../components/ui/Misc';
import { Skeleton } from '../components/ui/States';
import { ConnectionPanel } from '../features/overview/ConnectionPanel';
import { RecentGames } from '../features/overview/RecentGames';
import { formatMinutes, formatNumber } from '../lib/format';
import { useAppState } from '../state/store';
import '../features/overview/overview.css';

const RaceStage = lazy(() => import('../features/scene/RaceStage').then((m) => ({ default: m.RaceStage })));

function Summary() {
  const s = useAppState((st) => ({
    participants: st.participants.length,
    today: st.today,
    history: st.history,
  }));
  const matches = s.history.reduce((a, d) => a + d.matches, 0) + s.today.matches;
  const minutes = s.history.reduce((a, d) => a + d.playMinutes, 0) + s.today.playMinutes;
  return (
    <section className="panel" aria-labelledby="sum-title">
      <header className="panel__head">
        <h2 className="panel__title" id="sum-title">
          Resumo do ambiente
        </h2>
        <Link to="/estatisticas" className="panel__link">
          Estatísticas <ArrowRight size={14} aria-hidden />
        </Link>
      </header>
      <div className="panel__body">
        <KeyValue
          items={[
            { label: 'Participantes totais', value: formatNumber(s.participants), sub: `+${s.today.newParticipants} hoje` },
            { label: 'Personagens criados', value: formatNumber(s.participants), sub: 'gerados automaticamente' },
            { label: 'Partidas realizadas', value: formatNumber(matches), sub: `${s.today.matches} hoje` },
            { label: 'Tempo de jogo', value: formatMinutes(minutes), sub: `${formatMinutes(s.today.playMinutes)} hoje` },
          ]}
        />
      </div>
    </section>
  );
}

export default function OverviewPage() {
  const match = useAppState((s) => s.match?.status ?? null, Object.is);
  return (
    <div className="overview">
      <div className="overview__hello">
        <div>
          <h2 className="overview__title">Bem-vindo de volta!</h2>
          <p className="overview__sub">Prepare sua arena e transforme sua LIVE em uma experiência interativa.</p>
        </div>
        <ButtonLink to="/arena" variant="primary" iconRight={ArrowRight}>
          {match && match !== 'encerrada' ? 'Voltar à arena' : 'Ir para a arena'}
        </ButtonLink>
      </div>

      <div className="overview__top">
        <ConnectionPanel />
        <GoalMeter />
      </div>

      <div className="overview__grid">
        <div className="stack">
          <section className="panel stage-panel" aria-label="Prévia da arena">
            <div className="stage-panel__view">
              <Suspense fallback={<Skeleton height="100%" />}>
                <RaceStage label="Prévia 3D da arena" />
              </Suspense>
              <span className="stage-panel__tag">{match && match !== 'encerrada' ? 'Partida em andamento' : 'Prévia da arena'}</span>
            </div>
          </section>
          <RecentGames />
        </div>

        <div className="stack">
          <Summary />
          <section className="panel" aria-labelledby="act-title">
            <header className="panel__head">
              <h2 className="panel__title" id="act-title">
                Atividade recente
              </h2>
            </header>
            <ActivityFeed limit={8} />
          </section>
        </div>
      </div>
    </div>
  );
}
