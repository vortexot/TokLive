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
}

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
