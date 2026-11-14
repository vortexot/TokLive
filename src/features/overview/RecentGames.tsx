import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GAMES } from '../../domain/games';
import { GameArt } from '../games/GameArt';
import { ButtonLink } from '../../components/ui/Button';
import { Pill } from '../../components/ui/Misc';
import { useAppState } from '../../state/store';

/** Os jogos mais usados, com o jogo da arena em primeiro lugar. */
export function RecentGames() {
  const { opens, selected } = useAppState((s) => ({ opens: s.gameOpens, selected: s.selectedGameId }));
  const list = GAMES.slice()
    .sort((a, b) => (b.id === selected ? 1e9 : opens[b.id]) - (a.id === selected ? 1e9 : opens[a.id]))
    .slice(0, 3);
  return (
    <section className="panel" aria-labelledby="recent-title">
      <header className="panel__head">
        <h2 className="panel__title" id="recent-title">
          Jogos recentes
        </h2>
        <Link to="/game-hub" className="panel__link">
          Ver todos <ArrowRight size={14} aria-hidden />
        </Link>
      </header>
      <ul className="recent">
        {list.map((game) => (
          <li key={game.id} className="recent__item">
            <div className="recent__art" aria-hidden>
              <GameArt id={game.id} />
            </div>
            <div className="recent__text">
              <p className="recent__name">{game.name}</p>
              <p className="recent__sub">{game.playersLabel}</p>
            </div>
            <span className="recent__status">
              {game.id === selected ? <Pill tone="live">Na arena</Pill> : game.availability === 'demo' ? <Pill tone="ok">Disponível na demo</Pill> : <Pill tone="outline">Em desenvolvimento</Pill>}
            </span>
            <ButtonLink to={`/game-hub/${game.id}`} size="sm" iconRight={ArrowRight} aria-label={`Abrir ${game.name}`}>
              Abrir
            </ButtonLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
