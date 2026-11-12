import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, SearchX, Users } from 'lucide-react';
import { levelProgress } from '../domain/leveling';
import type { Participant, ParticipantStatus } from '../domain/types';
import { Avatar } from '../components/avatar/AvatarSvg';
import { Button } from '../components/ui/Button';
import { SearchField, SelectField } from '../components/ui/Controls';
import { ProgressBar } from '../components/ui/Misc';
import { EmptyState } from '../components/ui/States';
import { ParticipantDialog } from '../features/participants/ParticipantDialog';
import { STATUS_LABEL, StatusPill } from '../features/participants/status';
import { formatDate, formatNumber, plural } from '../lib/format';
import { useDebounced, useNow } from '../lib/hooks';
import { INACTIVE_AFTER_MS } from '../state/engine';
import { useAppState } from '../state/store';
import '../features/participants/participants.css';

type SortKey = 'entrada' | 'nome' | 'nivel' | 'vitorias' | 'partidas' | 'estado';
type Dir = 'asc' | 'desc';

const PAGE_SIZE = 15;
const STATUS_ORDER: Record<ParticipantStatus, number> = { 'em-partida': 0, 'na-fila': 1, ativo: 2, inativo: 3 };

const SORT_LABEL: Record<SortKey, string> = {
  entrada: 'Data de entrada',
  nome: 'Nome',
  nivel: 'Nível e XP',
  vitorias: 'Vitórias',
  partidas: 'Partidas',
  estado: 'Estado',
};

const DEFAULT_DIR: Record<SortKey, Dir> = { entrada: 'desc', nome: 'asc', nivel: 'desc', vitorias: 'desc', partidas: 'desc', estado: 'asc' };

interface Row {
  p: Participant;
  status: ParticipantStatus;
}

function compare(a: Row, b: Row, key: SortKey): number {
  switch (key) {
    case 'nome':
      return a.p.username.localeCompare(b.p.username);
    case 'nivel':
      return a.p.xp - b.p.xp;
    case 'vitorias':
      return a.p.wins - b.p.wins || a.p.points - b.p.points;
    case 'partidas':
      return a.p.matches - b.p.matches;
    case 'estado':
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    default:
      return a.p.joinedAt - b.p.joinedAt;
  }
}

function SortHeader({ label, k, sort, dir, onSort, numeric }: { label: string; k: SortKey; sort: SortKey; dir: Dir; onSort: (k: SortKey) => void; numeric?: boolean }) {
  const active = sort === k;
  return (
    <th scope="col" className={numeric ? 'num-col' : undefined} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sort-btn" data-active={active} onClick={() => onSort(k)}>
        {label}
        {active ? dir === 'asc' ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden /> : null}
      </button>
    </th>
  );
}

export default function ParticipantsPage() {
  const { participants, lobby, match } = useAppState((s) => ({ participants: s.participants, lobby: s.lobby, match: s.match }));
  const now = useNow(60_000);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'todos' | ParticipantStatus>('todos');
  const [sort, setSort] = useState<SortKey>('entrada');
  const [dir, setDir] = useState<Dir>('desc');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const debounced = useDebounced(query, 150);

  const rows = useMemo<Row[]>(() => {
    const racing = new Set(match && match.status !== 'encerrada' ? match.racers.map((r) => r.participantId) : []);
    const queued = new Set(lobby);
    return participants.map((p) => ({
      p,
      status: racing.has(p.id) ? 'em-partida' : queued.has(p.id) ? 'na-fila' : now - p.lastSeenAt > INACTIVE_AFTER_MS ? 'inativo' : 'ativo',
    }));
  }, [participants, lobby, match, now]);

  const visible = useMemo(() => {
    const q = debounced.trim().replace(/^@/, '').toLowerCase();
    const filtered = rows.filter((r) => (status === 'todos' || r.status === status) && (!q || r.p.username.includes(q)));
    const sign = dir === 'asc' ? 1 : -1;
    return filtered.slice().sort((a, b) => sign * compare(a, b, sort) || a.p.username.localeCompare(b.p.username));
  }, [rows, debounced, status, sort, dir]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const open = rows.find((r) => r.p.id === openId) ?? null;

  const onSort = (k: SortKey) => {
    if (k === sort) setDir(dir === 'asc' ? 'desc' : 'asc');
    else {
      setSort(k);
      setDir(DEFAULT_DIR[k]);
    }
    setPage(1);
  };
  const reset = () => {
    setQuery('');
    setStatus('todos');
    setPage(1);
  };

  return (
    <div className="people">
      <div className="people__bar">
        <div className="grow">
          <SearchField label="Buscar participante por usuário" placeholder="Buscar usuário" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
        </div>
        <div className="select">
          <SelectField label="Estado" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}>
            <option value="todos">Todos os estados</option>
            {(Object.keys(STATUS_LABEL) as ParticipantStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="select">
          <SelectField label="Ordenar por" value={sort} onChange={(e) => onSort(e.target.value as SortKey)}>
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABEL[k]}
              </option>
            ))}
          </SelectField>
        </div>
        <Button iconOnly icon={dir === 'asc' ? ArrowUp : ArrowDown} aria-label={dir === 'asc' ? 'Ordem crescente. Inverter' : 'Ordem decrescente. Inverter'} onClick={() => setDir(dir === 'asc' ? 'desc' : 'asc')} />
        <p className="people__count" role="status">
          {formatNumber(visible.length)} {plural(visible.length, 'participante', 'participantes')}
        </p>
      </div>

      <section className="panel" aria-label="Lista de participantes">
        {participants.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum participante ainda" text="Quando espectadores seguirem a LIVE, os personagens aparecem aqui. Use o simulador para testar." />
        ) : visible.length === 0 ? (
          <EmptyState icon={SearchX} title="Nenhum participante encontrado" text="Nada corresponde à busca e ao estado escolhidos.">
            <Button onClick={reset}>Limpar filtros</Button>
          </EmptyState>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">Participantes, ordenados por {SORT_LABEL[sort].toLowerCase()}</caption>
                <thead>
                  <tr>
                    <SortHeader label="Participante" k="nome" sort={sort} dir={dir} onSort={onSort} />
                    <SortHeader label="Entrada" k="entrada" sort={sort} dir={dir} onSort={onSort} />
                    <SortHeader label="Nível" k="nivel" sort={sort} dir={dir} onSort={onSort} />
                    <th scope="col" className="num-col">XP</th>
                    <SortHeader label="Vitórias" k="vitorias" sort={sort} dir={dir} onSort={onSort} numeric />
                    <SortHeader label="Partidas" k="partidas" sort={sort} dir={dir} onSort={onSort} numeric />
                    <SortHeader label="Estado" k="estado" sort={sort} dir={dir} onSort={onSort} />
                  </tr>
                </thead>
                <tbody>
                  {slice.map(({ p, status: st }) => {
                    const lvl = levelProgress(p.xp);
                    return (
                      <tr key={p.id}>
                        <td>
                          <button type="button" className="who" onClick={() => setOpenId(p.id)} aria-label={`Ver detalhes de @${p.username}`}>
                            <Avatar seed={p.characterSeed} size={34} />
                            <span>@{p.username}</span>
                          </button>
                        </td>
                        <td data-label="Entrada">{formatDate(p.joinedAt)}</td>
                        <td data-label="Nível">
                          <div className="lvl">
                            <span className="score">Nv {lvl.level}</span>
                            <ProgressBar value={lvl.ratio} label={`Progresso do nível de @${p.username}`} />
                          </div>
                        </td>
                        <td className="num-col" data-label="XP">{formatNumber(p.xp)}</td>
                        <td className="num-col" data-label="Vitórias">{formatNumber(p.wins)}</td>
                        <td className="num-col" data-label="Partidas">{formatNumber(p.matches)}</td>
                        <td data-label="Estado">
                          <StatusPill status={st} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <nav className="pager" aria-label="Paginação">
              <span>
                {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, visible.length)} de {formatNumber(visible.length)}
              </span>
              <span className="pager__btns">
                <Button size="sm" iconOnly icon={ChevronLeft} aria-label="Página anterior" disabled={current <= 1} onClick={() => setPage(current - 1)} />
                <span className="num">
                  Página {current} de {pages}
                </span>
                <Button size="sm" iconOnly icon={ChevronRight} aria-label="Próxima página" disabled={current >= pages} onClick={() => setPage(current + 1)} />
              </span>
            </nav>
          </>
        )}
      </section>

      <ParticipantDialog participant={open?.p ?? null} status={open?.status ?? 'ativo'} now={now} onClose={() => setOpenId(null)} />
    </div>
  );
}
