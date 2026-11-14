import type {
  Counters,
  DayPoint,
  EffectItem,
  GameOpens,
  Goal,
  PollState,
  Settings,
  ToastItem,
} from '../domain/session';
import type {
  ActivityItem,
  ChatMessage,
  ConnectionState,
  GameConfig,
  GameId,
  MatchState,
  MatchSummary,
  Participant,
} from '../domain/types';

export interface SimulatorState {
  open: boolean;
  auto: boolean;
  /** Eventos automáticos por segundo (aproximado). */
  rate: number;
}

export interface AppState {
  ready: boolean;
  loadError: string | null;
  settings: Settings;
  connection: ConnectionState;
  participants: Participant[];
  rankPrev: Record<string, Record<string, number>>;
  gameConfigs: Record<GameId, GameConfig>;
  gameOpens: GameOpens;
  selectedGameId: GameId | null;
  /** Fila para a próxima partida (ids de participantes). */
  lobby: string[];
  match: MatchState | null;
  matchHistory: MatchSummary[];
  bestRaceSeconds: number | null;
  counters: Counters;
  goal: Goal;
  poll: PollState;
  history: DayPoint[];
  today: DayPoint;
  hourly: number[];
  activity: ActivityItem[];
  chat: ChatMessage[];
  effects: EffectItem[];
  toasts: ToastItem[];
  notificationsReadAt: number;
  simulator: SimulatorState;
}

/** Fonte de tempo, aleatoriedade e identificadores, injetada para manter o motor puro e testável. */
export interface Ctx {
  now: number;
  rng: () => number;
  id: (prefix: string) => string;
}
