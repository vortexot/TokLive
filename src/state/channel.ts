// Sincronização entre o painel e o overlay quando abertos no MESMO navegador (abas diferentes).
// No OBS, a fonte de navegador roda em outro processo e não compartilha este canal:
// ali o overlay usa a simulação autônoma. Em produção, este canal dá lugar à conexão com o servidor.

import type { EffectItem, Goal, PollState, Settings } from '../domain/session';
import type {
  ActivityItem,
  ChatMessage,
  ConnectionState,
  GameConfig,
  GameId,
  MatchState,
  Participant,
} from '../domain/types';
import type { AppState } from './types';

export interface SessionSnapshot {
  v: 1;
  at: number;
  connection: ConnectionState;
  participants: Participant[];
  lobby: string[];
  match: MatchState | null;
  selectedGameId: GameId | null;
  gameConfigs: Record<GameId, GameConfig>;
  counters: AppState['counters'];
  goal: Goal;
  poll: PollState;
  activity: ActivityItem[];
  chat: ChatMessage[];
  effects: EffectItem[];
  arenaName: Settings['arenaName'];
  overlay: Settings['overlay'];
  bestRaceSeconds: number | null;
}

export type ChannelMessage = { type: 'hello' } | { type: 'snapshot'; snapshot: SessionSnapshot };

export function toSnapshot(state: AppState, now: number): SessionSnapshot {
  return {
    v: 1,
    at: now,
    connection: state.connection,
    participants: state.participants,
    lobby: state.lobby,
    match: state.match,
    selectedGameId: state.selectedGameId,
    gameConfigs: state.gameConfigs,
    counters: state.counters,
    goal: state.goal,
    poll: state.poll,
    activity: state.activity.slice(0, 12),
    chat: state.chat.slice(-12),
    effects: state.effects,
    arenaName: state.settings.arenaName,
    overlay: state.settings.overlay,
    bestRaceSeconds: state.bestRaceSeconds,
  };
}

export function applySnapshot(state: AppState, snap: SessionSnapshot): AppState {
  return {
    ...state,
    ready: true,
    connection: snap.connection,
    participants: snap.participants,
    lobby: snap.lobby,
    match: snap.match,
    selectedGameId: snap.selectedGameId,
    gameConfigs: snap.gameConfigs,
    counters: snap.counters,
    goal: snap.goal,
    poll: snap.poll,
    activity: snap.activity,
    chat: snap.chat,
    effects: snap.effects,
    bestRaceSeconds: snap.bestRaceSeconds,
    settings: { ...state.settings, arenaName: snap.arenaName, overlay: snap.overlay },
  };
}

export interface Channel {
  post(message: ChannelMessage): void;
  close(): void;
}

const NAME = 'tokarena-demo-session';

export function openChannel(onMessage: (message: ChannelMessage) => void): Channel {
  if (typeof BroadcastChannel === 'undefined') return { post() {}, close() {} };
  const channel = new BroadcastChannel(NAME);
  channel.onmessage = (event: MessageEvent<ChannelMessage>) => onMessage(event.data);
  return {
    post: (message) => channel.postMessage(message),
    close: () => channel.close(),
  };
}
