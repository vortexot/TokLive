// Modelos do domínio do TokArena. Nenhum deles depende de React ou do navegador.

export type GameId =
  | 'corrida'
  | 'chao-de-lava'
  | 'batalha-empurroes'
  | 'batatinha'
  | 'futebol'
  | 'plataformas';

export type GameCategory = 'corrida' | 'sobrevivencia' | 'competicao' | 'minigames';
export type GameAvailability = 'demo' | 'desenvolvimento';
export type Difficulty = 'facil' | 'normal' | 'dificil';

export interface RuleDef {
  id: string;
  label: string;
  hint: string;
  default: boolean;
}

export interface GameConfig {
  durationSec: number;
  maxParticipants: number;
  difficulty: Difficulty;
  rules: Record<string, boolean>;
}

export interface GameDef {
  id: GameId;
  name: string;
  summary: string;
  description: string;
  categories: GameCategory[];
  availability: GameAvailability;
  playersLabel: string;
  limits: { minParticipants: number; maxParticipants: number };
  durations: number[];
  rules: RuleDef[];
  defaultConfig: GameConfig;
}

/* Personagens procedurais */

export type HairStyle = 'curto' | 'topete' | 'longo' | 'coque' | 'moicano' | 'careca' | 'cacheado';
export type TopStyle = 'camiseta' | 'moletom' | 'camisa-time' | 'regata';
export type Accessory = 'nenhum' | 'bone' | 'oculos' | 'faixa' | 'mochila' | 'coroa' | 'fone';

export interface CharacterSpec {
  seed: string;
  version: 1;
  skin: string;
  hairStyle: HairStyle;
  hairColor: string;
  topStyle: TopStyle;
  topColor: string;
  bottomColor: string;
  shoeColor: string;
  accessory: Accessory;
  accessoryColor: string;
}

/* Participantes */

export interface GameStats {
  points: number;
  wins: number;
  matches: number;
}

export interface Participant {
  id: string;
  username: string;
  characterSeed: string;
  joinedAt: number;
  lastSeenAt: number;
  xp: number;
  wins: number;
  matches: number;
  points: number;
  weekly: { points: number; wins: number };
  daily: { points: number; wins: number };
  byGame: Partial<Record<GameId, GameStats>>;
  origin: 'sintetico' | 'simulador';
}

export type ParticipantStatus = 'em-partida' | 'na-fila' | 'ativo' | 'inativo';

/* Conexão com a LIVE (simulada) */

export type ConnectionStatus =
  | 'desconectado'
  | 'aguardando'
  | 'conectando'
  | 'ao-vivo'
  | 'reconectando'
  | 'erro';

export type ConnectionScenario = 'ao-vivo' | 'aguardando-inicio' | 'falha';

export interface ConnectionState {
  status: ConnectionStatus;
  handle: string;
  scenario: ConnectionScenario;
  lastConnectedAt: number | null;
  connectedSince: number | null;
  message: string;
}

/* Eventos da LIVE (simulados) */

export type GiftId = 'faisca' | 'escudo' | 'foguete' | 'meteoro';

export type LiveEvent =
  | { type: 'follow'; username?: string }
  | { type: 'comment'; username?: string; text: string }
  | { type: 'like'; username?: string; count: number }
  | { type: 'gift'; username?: string; gift: GiftId }
  | { type: 'share'; username?: string }
  | { type: 'join'; participantId?: string }
  | { type: 'live-end' };

export type ActivityKind =
  | 'participante'
  | 'personagem'
  | 'presente'
  | 'curtidas'
  | 'partida'
  | 'recorde'
  | 'comentario'
  | 'compartilhamento'
  | 'meta'
  | 'conexao';

export interface ActivityItem {
  id: string;
  at: number;
  kind: ActivityKind;
  title: string;
  detail?: string;
  username?: string;
}

export interface ChatMessage {
  id: string;
  at: number;
  username: string;
  text: string;
  command?: 'entrar' | 'voto';
}

/* Partida (corrida) */

export type MatchStatus = 'contagem' | 'em-andamento' | 'pausada' | 'encerrada';

export interface Racer {
  participantId: string;
  lane: number;
  x: number;
  speedBase: number;
  agility: number;
  stunnedUntil: number;
  boostUntil: number;
  shieldUntil: number;
  finishedAt: number | null;
  position: number | null;
  hits: number;
  lastGift: GiftId | null;
  /** Posição lateral (jogos de arena). Na corrida, a posição lateral vem da raia. */
  y: number;
  /** Velocidade de empurrão (batalha) em unidades por segundo. */
  vx: number;
  vy: number;
  /** Fora de jogo: caiu, foi empurrado ou foi pego se mexendo. */
  alive: boolean;
  outAt: number | null;
  /** Time (futebol): 0 ou 1. */
  team: 0 | 1 | null;
  /** Gols (futebol). */
  score: number;
  /** Instante em que pode agir de novo (chute, empurrão, salto). */
  cooldownUntil: number;
}

export type World =
  | { kind: 'lava'; n: number; tile: number; sinkAt: number[]; warn: number }
  | { kind: 'brawl'; r0: number; r1: number }
  | { kind: 'freeze'; length: number; phases: number[] }
  | {
      kind: 'soccer';
      w: number;
      h: number;
      goal: number;
      ball: { x: number; y: number; vx: number; vy: number };
      goals: [number, number];
      lastTouch: string | null;
      kickoffAt: number;
    }
  | { kind: 'bridge'; rows: number; cols: number; fake: number[]; known: number[]; hop: number };

export type ObstacleKind = 'portao' | 'bloco' | 'pendulo';

export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  x: number;
  phase: number;
}

export interface MatchResult {
  participantId: string;
  position: number;
  finishedAt: number | null;
  points: number;
  xp: number;
  won: boolean;
}

export interface MatchState {
  id: string;
  gameId: GameId;
  status: MatchStatus;
  seed: number;
  trackLength: number;
  laneCount: number;
  durationSec: number;
  difficulty: Difficulty;
  t: number;
  countdown: number;
  turboUntil: number;
  racers: Racer[];
  obstacles: Obstacle[];
  /** Estado do mundo dos jogos de arena. A corrida não usa. */
  world: World | null;
  results: MatchResult[] | null;
  startedAt: number;
}

export interface MatchSummary {
  id: string;
  gameId: GameId;
  endedAt: number;
  durationSec: number;
  participants: number;
  winnerId: string | null;
  winnerName: string | null;
}
