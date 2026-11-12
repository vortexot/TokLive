import { ArrowRight, Play, Settings2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { CATEGORY_LABELS } from '../../domain/games';
import type { GameDef } from '../../domain/types';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Pill } from '../../components/ui/Misc';
import { useActions } from '../../state/AppProvider';
import { GameArt } from '../games/GameArt';

export function GameCard({ game, selected, featured }: { game: GameDef; selected: boolean; featured?: boolean }) {
  const actions = useActions();
  const navigate = useNavigate();
  const playable = game.availability === 'demo';
  const openInArena = () => {
    actions.selectGame(game.id);
    navigate('/arena');
  };
  return (
    <article className={`game${featured ? ' game--featured' : ''}${selected ? ' game--selected' : ''}`} aria-labelledby={`game-${game.id}`}>
      <Link className="game__art" to={`/game-hub/${game.id}`} tabIndex={-1} aria-hidden>
        <GameArt id={game.id} />
        <span className="game__status">
          {selected ? <Pill tone="live">Na arena</Pill> : playable ? <Pill tone="ok">Disponível na demo</Pill> : <Pill>Em desenvolvimento</Pill>}
        </span>
      </Link>
      <div className="game__body">
        <div className="game__text">
          <h3 className="game__name" id={`game-${game.id}`}>
            <Link to={`/game-hub/${game.id}`}>{game.name}</Link>
          </h3>
          <p className="game__summary">{featured ? game.description : game.summary}</p>
          <p className="game__meta">
            <span>{game.playersLabel}</span>
            <span aria-hidden>·</span>
            <span>{game.categories.map((c) => CATEGORY_LABELS[c]).join(', ')}</span>
          </p>
        </div>
        <div className="game__actions">
          <ButtonLink to={`/game-hub/${game.id}`} size="sm" icon={Settings2} aria-label={`Configurar ${game.name}`}>
            Configurar
          </ButtonLink>
          {playable ? (
            <Button size="sm" variant="primary" icon={Play} iconRight={ArrowRight} onClick={openInArena} aria-label={`Abrir ${game.name} na arena`}>
              Abrir na arena
            </Button>
          ) : (
            <Button size="sm" disabled title="Este jogo ainda está em desenvolvimento">
              Em breve
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
