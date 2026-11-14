import { useMemo, useState } from 'react';
import { SearchX } from 'lucide-react';
import { CATEGORY_LABELS, GAMES } from '../domain/games';
import type { GameCategory } from '../domain/types';
import { SearchField } from '../components/ui/Controls';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/States';
import { GameCard } from '../features/hub/GameCard';
import { useDebounced } from '../lib/hooks';
import { plural } from '../lib/format';
import { useAppState } from '../state/store';
import '../features/hub/hub.css';

type Filter = 'todos' | GameCategory;
const FILTERS: Filter[] = ['todos', 'corrida', 'sobrevivencia', 'competicao', 'minigames'];

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function GameHubPage() {
  const selected = useAppState((s) => s.selectedGameId, Object.is);
  const [filter, setFilter] = useState<Filter>('todos');
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 150);

  const games = useMemo(() => {
    const q = normalize(debounced.trim());
    return GAMES.filter(
      (g) => (filter === 'todos' || g.categories.includes(filter)) && (!q || normalize(`${g.name} ${g.summary}`).includes(q)),
    );
  }, [filter, debounced]);

  const clear = () => {
    setFilter('todos');
    setQuery('');
  };

  return (
    <div className="hub">
      <div className="hub__bar">
        <div className="hub__search">
          <SearchField label="Buscar jogo pelo nome" placeholder="Buscar jogo" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="chip-row" role="group" aria-label="Filtrar por categoria">
          {FILTERS.map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'todos' ? 'Todos' : CATEGORY_LABELS[f]}
            </button>
          ))}
        </div>
        <p className="hub__count" role="status">
          {games.length} {plural(games.length, 'jogo', 'jogos')}
        </p>
      </div>

      {games.length ? (
        <div className="hub__grid">
          {games.map((game, i) => (
            <GameCard key={game.id} game={game} selected={selected === game.id} featured={game.id === 'corrida' && i === 0} />
          ))}
        </div>
      ) : (
        <div className="panel">
          <EmptyState icon={SearchX} title="Nenhum jogo encontrado" text="Nenhum jogo corresponde à busca e à categoria escolhidas.">
            <Button onClick={clear}>Limpar filtros</Button>
          </EmptyState>
        </div>
      )}
    </div>
  );
}
