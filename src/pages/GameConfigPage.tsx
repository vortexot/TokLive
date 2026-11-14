import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Cast, Gamepad2, Play, RotateCcw, Save } from 'lucide-react';
import { CATEGORY_LABELS, DIFFICULTY_LABELS, GAME_BY_ID, isPlayable } from '../domain/games';
import type { Difficulty, GameId } from '../domain/types';
import { Button } from '../components/ui/Button';
import { Segmented, SwitchRow, Slider } from '../components/ui/Controls';
import { Pill } from '../components/ui/Misc';
import { EmptyState, Skeleton } from '../components/ui/States';
import { GameArt } from '../features/games/GameArt';
import { OverlayDialog } from '../features/overlay/OverlayDialog';
import { useActions } from '../state/AppProvider';
import { useAppState } from '../state/store';
import '../features/hub/hub.css';

const RaceStage = lazy(() => import('../features/scene/RaceStage').then((m) => ({ default: m.RaceStage })));

const durationLabel = (s: number) => (s < 120 ? `${s} s` : `${s / 60} min`);

export default function GameConfigPage() {
  const { gameId } = useParams();
  const game = gameId && gameId in GAME_BY_ID ? GAME_BY_ID[gameId as GameId] : null;
  const actions = useActions();
  const navigate = useNavigate();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const config = useAppState((s) => (game ? s.gameConfigs[game.id] : null));
  const selected = useAppState((s) => s.selectedGameId, Object.is);

  // Conta uma abertura do jogo no painel (alimenta "jogos mais utilizados").
  useEffect(() => {
    if (game) actions.openGame(game.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id]);

  if (!game || !config) {
    return (
      <div className="panel">
        <EmptyState icon={Gamepad2} title="Jogo não encontrado" text="Esse jogo não existe no catálogo.">
          <Link className="btn btn--primary" to="/game-hub">
            Voltar ao Game Hub
          </Link>
        </EmptyState>
      </div>
    );
  }

  const playable = isPlayable(game.id);
  const set = (patch: Parameters<typeof actions.updateGameConfig>[1]) => actions.updateGameConfig(game.id, patch);

  const start = () => {
    actions.selectGame(game.id);
    actions.startMatch();
    navigate('/arena');
  };

  return (
    <div className="cfg">
      <div className="stack">
        <section className="panel" aria-label={`Prévia de ${game.name}`}>
          <div className="cfg__stage">
            {playable ? (
              <Suspense fallback={<Skeleton height="100%" />}>
                <RaceStage label={`Prévia 3D de ${game.name}`} />
              </Suspense>
            ) : (
              <>
                <GameArt id={game.id} />
                <div className="cfg__soon">
                  <strong>Prévia 3D em desenvolvimento</strong>
                  Você já pode ajustar as regras. Elas ficam salvas até o jogo estar disponível.
                </div>
              </>
            )}
          </div>
          <div className="cfg__about">
            <div className="toolbar">
              <h2>{game.name}</h2>
              {selected === game.id ? <Pill tone="live">Na arena</Pill> : playable ? <Pill tone="ok">Disponível na demo</Pill> : <Pill>Em desenvolvimento</Pill>}
            </div>
            <p>{game.description}</p>
            <p className="panel__sub">
              {game.playersLabel} · {game.categories.map((c) => CATEGORY_LABELS[c]).join(', ')}
            </p>
          </div>
        </section>
      </div>

      <section className="panel" aria-labelledby="cfg-title">
        <header className="panel__head">
          <h2 className="panel__title" id="cfg-title">
            Configurações da partida
          </h2>
        </header>
        <div className="cfg__form">
          <div className="cfg__group">
            <span className="cfg__legend" id="dur-l">Duração da partida</span>
            <Segmented
              label="Duração da partida"
              value={config.durationSec}
              onChange={(durationSec) => set({ durationSec })}
              options={game.durations.map((d) => ({ value: d, label: durationLabel(d) }))}
            />
          </div>

          <Slider
            label="Limite de participantes"
            value={config.maxParticipants}
            min={game.limits.minParticipants}
            max={game.limits.maxParticipants}
            onChange={(maxParticipants) => set({ maxParticipants })}
            hint={`De ${game.limits.minParticipants} a ${game.limits.maxParticipants}. Quem passar do limite espera a próxima partida.`}
          />

          <div className="cfg__group">
            <span className="cfg__legend">Dificuldade</span>
            <Segmented<Difficulty>
              label="Dificuldade"
              value={config.difficulty}
              onChange={(difficulty) => set({ difficulty })}
              options={(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
            />
            <p className="field__hint">Mais difícil significa mais obstáculos, tropeços mais longos e menos chance de desviar.</p>
          </div>

          <div className="cfg__group">
            <span className="cfg__legend">Regras básicas</span>
            <div>
              {game.rules.map((rule) => (
                <SwitchRow key={rule.id} label={rule.label} hint={rule.hint} checked={config.rules[rule.id] ?? rule.default} onChange={(v) => set({ rules: { [rule.id]: v } })} />
              ))}
            </div>
          </div>

          <p className="cfg__saved">
            <Save size={15} aria-hidden /> As alterações são salvas automaticamente neste navegador.
          </p>

          <div className="cfg__foot">
            <Button
              variant="primary"
              icon={Play}
              disabled={!playable}
              onClick={start}
              title={playable ? undefined : 'Este jogo ainda está em desenvolvimento'}
            >
              Iniciar
            </Button>
            <Button icon={Cast} onClick={() => setOverlayOpen(true)}>
              Abrir overlay OBS
            </Button>
            <span className="grow" />
            <Button
              variant="ghost"
              icon={RotateCcw}
              onClick={() => {
                actions.resetGameConfig(game.id);
                actions.toast('info', 'Padrão restaurado', `Configurações de ${game.name} voltaram ao início.`);
              }}
            >
              Restaurar padrão
            </Button>
          </div>
          {!playable ? <p className="field__hint">“Iniciar” fica disponível quando o jogo sair de desenvolvimento. Nesta demonstração, só a corrida de obstáculos inicia partidas.</p> : null}
        </div>
      </section>

      <OverlayDialog open={overlayOpen} onClose={() => setOverlayOpen(false)} />
    </div>
  );
}
