// Tipos compartilhados pelas cenas 3D (corrida e jogos de arena).

import type { CharacterSpec, GameId, MatchState } from '../../domain/types';

export interface SceneRacer {
  id: string;
  username: string;
  spec: CharacterSpec;
}

export interface SceneInput {
  match: MatchState | null;
  /** Jogo mostrado quando não há partida (prévia). */
  gameId?: GameId;
  /** Todos os personagens conhecidos, por id de participante. */
  racers: Map<string, SceneRacer>;
  /** Quem aparece no grid quando não há partida. */
  previewIds: string[];
  showNames: boolean;
}

export interface SceneOptions {
  transparent: boolean;
  pixelRatioCap?: number;
}

/** O que a interface precisa de qualquer cena, independente do jogo. */
export interface GameScene {
  setInput(input: SceneInput): void;
  resize(width: number, height: number): void;
  start(): void;
  stop(): void;
  dispose(): void;
}
