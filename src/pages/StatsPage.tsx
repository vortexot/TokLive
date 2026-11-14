import { useMemo, useState } from 'react';
import { BarChart, HorizontalBars, LineChart, type Point } from '../components/charts/Charts';
import { Segmented } from '../components/ui/Controls';
import { KeyValue } from '../components/ui/Misc';
import { ErrorState, Skeleton } from '../components/ui/States';
import { GAMES } from '../domain/games';
import { formatDay, formatMinutes, formatNumber } from '../lib/format';
import { useAsync } from '../lib/hooks';
import { useDataService } from '../state/AppProvider';
import { useAppState } from '../state/store';
import '../features/stats/stats.css';

type Range = 7 | 30;

const MIX = [
  { key: 'likes', label: 'Curtidas', color: '#e32636' },
  { key: 'comments', label: 'Comentários', color: '#a1a1aa' },
  { key: 'gifts', label: 'Presentes', color: '#ff5c68' },
  { key: 'shares', label: 'Compartilhamentos', color: '#6e6e7a' },
  { key: 'follows', label: 'Novos seguidores', color: '#f5f5f5' },
] as const;

function shortDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return formatDay(new Date(y!, m! - 1, d!).getTime());
}

function Loading() {
  return (
    <div className="stats-loading" aria-busy="true" aria-label="Carregando estatísticas">
      <Skeleton height="2.5rem" width="14rem" />
      <div className="stats__grid">
        <Skeleton height="18rem" />
        <Skeleton height="18rem" />
      </div>
      <Skeleton height="16rem" />
    </div>
  );
}

export default function StatsPage() {
  const service = useDataService();
  const [range, setRange] = useState<Range>(7);
  const { today, hourly, counters, gameOpens, participants } = useAppState((s) => ({
    today: s.today,
    hourly: s.hourly,
    counters: s.counters,
    gameOpens: s.gameOpens,
    participants: s.participants.length,
  }));
  const { data, error, loading, reload } = useAsync(() => service.loadStatistics(range), [service, range]);

  const days = useMemo(() => (data ? [...data.days, today] : []), [data, today]);

  const totals = useMemo(
    () => ({
      newcomers: days.reduce((a, d) => a + d.newParticipants, 0),
      matches: days.reduce((a, d) => a + d.matches, 0),
      minutes: days.reduce((a, d) => a + d.playMinutes, 0),
      events: days.reduce((a, d) => a + d.events, 0),
    }),
    [days],
  );

  const dayLabel = (iso: string, i: number) => (i === days.length - 1 ? 'Hoje' : shortDay(iso));
  const growth: Point[] = days.map((d, i) => ({ label: dayLabel(d.date, i), value: d.participants }));
  const activity: Point[] = days.map((d, i) => ({ label: dayLabel(d.date, i), value: d.events }));
  const byHour: Point[] = hourly.map((v, h) => ({ label: `${String(h).padStart(2, '0')}h`, value: v }));
  const usage: Point[] = GAMES.map((g) => ({ label: g.name, value: gameOpens[g.id] })).sort((a, b) => b.value - a.value);
  const mixTotal = MIX.reduce((a, m) => a + counters[m.key], 0) || 1;

  return (
    <div className="stats">
      <div className="stats__bar">
        <Segmented<Range>
          label="Período"
          value={range}
          onChange={setRange}
          options={[
            { value: 7, label: 'Últimos 7 dias' },
            { value: 30, label: 'Últimos 30 dias' },
          ]}
        />
        <p className="panel__sub">Dados simulados. Hoje acompanha os eventos do simulador.</p>
      </div>

      {error ? (
        <div className="panel">
          <ErrorState title="Não foi possível carregar as estatísticas" text={error} onRetry={reload} />
        </div>
      ) : loading && !data ? (
        <Loading />
      ) : (
        <>
          <div className="stats__grid" aria-busy={loading}>
            <section className="panel" aria-labelledby="g1">
              <header className="panel__head">
                <h2 className="panel__title" id="g1">
                  Evolução de participantes
                </h2>
                <span className="panel__sub num">{formatNumber(participants)} no total</span>
              </header>
              <div className="chart-panel__body">
                <LineChart data={growth} label={`Participantes acumulados nos últimos ${range} dias`} unit="participantes" />
              </div>
            </section>

            <section className="panel" aria-labelledby="s1">
              <header className="panel__head">
                <h2 className="panel__title" id="s1">
                  Resumo do período
                </h2>
              </header>
              <div className="panel__body">
                <KeyValue
                  items={[
                    { label: 'Total de participantes', value: formatNumber(participants) },
                    { label: 'Novos participantes', value: formatNumber(totals.newcomers), sub: `nos últimos ${range} dias` },
                    { label: 'Partidas realizadas', value: formatNumber(totals.matches) },
                    { label: 'Tempo total de jogo', value: formatMinutes(totals.minutes) },
                    { label: 'Eventos recebidos', value: formatNumber(totals.events) },
                  ]}
                />
              </div>
            </section>
          </div>

          <div className="stats__grid">
            <section className="panel" aria-labelledby="a1">
              <header className="panel__head">
                <h2 className="panel__title" id="a1">
                  Atividade ao longo do tempo
                </h2>
                <span className="panel__sub">eventos por dia (hoje é parcial)</span>
              </header>
              <div className="chart-panel__body">
                <BarChart data={activity} label={`Eventos recebidos por dia nos últimos ${range} dias`} unit="eventos" highlightLast />
              </div>
            </section>

            <div className="stats__sub">
              <section className="panel" aria-labelledby="u1">
                <header className="panel__head">
                  <h2 className="panel__title" id="u1">
                    Jogos mais utilizados
                  </h2>
                  <span className="panel__sub">aberturas no painel</span>
                </header>
                <div className="panel__body">
                  <HorizontalBars data={usage} label="Jogos mais utilizados" unit="aberturas" />
                </div>
              </section>

              <section className="panel" aria-labelledby="m1">
                <header className="panel__head">
                  <h2 className="panel__title" id="m1">
                    Eventos de hoje, por tipo
                  </h2>
                  <span className="panel__sub num">{formatNumber(counters.events)}</span>
                </header>
                <div className="panel__body">
                  <div className="mix" aria-hidden>
                    {MIX.map((m) => (
                      <span key={m.key} className="mix__seg" style={{ width: `${(counters[m.key] / mixTotal) * 100}%`, background: m.color }} />
                    ))}
                  </div>
                  <ul className="legend">
                    {MIX.map((m) => (
                      <li key={m.key} className="legend__item">
                        <span className="legend__sw" style={{ background: m.color }} aria-hidden />
                        {m.label} <strong className="num">{formatNumber(counters[m.key])}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          </div>

          <section className="panel" aria-labelledby="h1">
            <header className="panel__head">
              <h2 className="panel__title" id="h1">
                Hoje, hora a hora
              </h2>
              <span className="panel__sub">eventos por hora</span>
            </header>
            <div className="chart-panel__body">
              <BarChart data={byHour} label="Eventos recebidos hoje, por hora" unit="eventos" wide />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
