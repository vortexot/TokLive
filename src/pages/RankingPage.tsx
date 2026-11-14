import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { GAMES } from '../domain/games';
import { buildRanking, type RankRow, type RankView } from '../domain/ranking';
import type { GameId } from '../domain/types';
import { Avatar } from '../components/avatar/AvatarSvg';
import { Button } from '../components/ui/Button';
import { SelectField, Tabs } from '../components/ui/Controls';
import { Delta } from '../components/ui/Misc';
import { EmptyState } from '../components/ui/States';
import { formatNumber, plural } from '../lib/format';
import { useAppState } from '../state/store';
import '../features/ranking/ranking.css';

type Tab = 'geral' | 'semanal' | 'diario' | 'jogo';
const TABS = [
  { value: 'geral', label: 'Geral' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'diario', label: 'Diário' },
  { value: 'jogo', label: 'Por jogo' },
] as const;
const PAGE = 20;

function Podium({ rows }: { rows: RankRow[] }) {
  return (
    <div className="podium" aria-label="Três primeiros colocados">
      {rows.slice(0, 3).map((r) => (
        <div key={r.participant.id} className={`podium__spot podium__spot--${r.position}`}>
          <Avatar seed={r.participant.characterSeed} size={r.position === 1 ? 84 : 66} variant="full" />
          <span className="podium__name">@{r.participant.username}</span>
          <span className="podium__stats">
            <span className="score podium__points">{formatNumber(r.points)}</span> pts · {formatNumber(r.wins)} {plural(r.wins, 'vitória', 'vitórias')}
          </span>
          <span className="podium__delta">
            <Delta value={r.delta} />
          </span>
          <div className="podium__block" aria-hidden>
            <span className="score podium__num">{r.position}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RankingPage() {
  const { participants, rankPrev } = useAppState((s) => ({ participants: s.participants, rankPrev: s.rankPrev }));
  const [tab, setTab] = useState<Tab>('geral');
  const [game, setGame] = useState<GameId>('corrida');
  const [shown, setShown] = useState(PAGE);

  const view: RankView = tab === 'jogo' ? `jogo:${game}` : tab;
  const rows = useMemo(() => buildRanking(participants, view, rankPrev[view]), [participants, view, rankPrev]);
  const rest = rows.slice(3);
  const gameName = GAMES.find((g) => g.id === game)?.name ?? '';

  return (
    <div className="rank">
      <div className="rank__bar">
        <Tabs
          label="Período do ranking"
          value={tab}
          options={TABS.map((t) => ({ value: t.value, label: t.label }))}
          onChange={(v) => {
            setTab(v);
            setShown(PAGE);
          }}
          panelId="rank-panel"
        />
        {tab === 'jogo' ? (
          <div className="select">
            <SelectField label="Jogo" value={game} onChange={(e) => { setGame(e.target.value as GameId); setShown(PAGE); }}>
              {GAMES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </SelectField>
          </div>
        ) : null}
        <p className="panel__sub" role="status">
          {formatNumber(rows.length)} {plural(rows.length, 'participante pontuou', 'participantes pontuaram')}
        </p>
      </div>

      <section className="panel" id="rank-panel" role="tabpanel" aria-labelledby={`rank-panel-tab-${tab}`}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title={tab === 'jogo' ? `Sem classificação em ${gameName}` : 'Sem classificação neste período'}
            text={tab === 'jogo' ? 'Este jogo ainda não tem partidas registradas. Só a corrida de obstáculos está disponível na demonstração.' : 'Ninguém pontuou neste período ainda. Inicie uma partida para ver o ranking mudar.'}
          />
        ) : (
          <>
            <Podium rows={rows} />
            {rest.length ? (
              <>
                <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabela de classificação (rolável)">
                  <table className="rank-table">
                    <caption className="sr-only">Classificação a partir do 4º lugar</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="pos">#</th>
                        <th scope="col" className="evo">Evolução</th>
                        <th scope="col">Participante</th>
                        <th scope="col" className="r">Vitórias</th>
                        <th scope="col" className="r">Pontuação</th>
                        <th scope="col" className="r">XP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rest.slice(0, shown - 3).map((r) => (
                        <tr key={r.participant.id}>
                          <td className="pos score">{r.position}</td>
                          <td className="evo">
                            <Delta value={r.delta} />
                          </td>
                          <td>
                            <span className="who-cell">
                              <Avatar seed={r.participant.characterSeed} size={30} />@{r.participant.username}
                            </span>
                          </td>
                          <td className="r">{formatNumber(r.wins)}</td>
                          <td className="r">{formatNumber(r.points)}</td>
                          <td className="r">{formatNumber(r.xp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {shown - 3 < rest.length ? (
                  <div className="rank-more">
                    <Button onClick={() => setShown(shown + PAGE)}>Mostrar mais ({rest.length - (shown - 3)})</Button>
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
