// Tipos e padrões da sessão do criador: preferências, contadores, meta coletiva e efeitos.

import type { ConnectionState, GameId } from './types';

export interface OverlayOptions {
  showRanking: boolean;
  showFeed: boolean;
  showGoal: boolean;
  showNames: boolean;
}

export interface Settings {
  arenaName: string;
  sidebarCollapsed: boolean;
  toastEvents: boolean;
  showDemoTools: boolean;
  likeGoalTarget: number;
  overlay: OverlayOptions;
  profile: { displayName: string; email: string };
}

export const DEFAULT_SETTINGS: Settings = {
  arenaName: 'Arena do Demo',
  sidebarCollapsed: false,
  toastEvents: true,
  showDemoTools: true,
  likeGoalTarget: 1000,
  overlay: { showRanking: true, showFeed: true, showGoal: true, showNames: true },
  profile: { displayName: 'Criador Demo', email: 'demo@tokarena.exemplo' },
};

export interface Counters {
  likes: number;
  comments: number;
  gifts: number;
  shares: number;
  follows: number;
  events: number;
}

export const EMPTY_COUNTERS: Counters = { likes: 0, comments: 0, gifts: 0, shares: 0, follows: 0, events: 0 };

export interface Goal {
  target: number;
  progress: number;
  level: number;
  reached: number;
}

export interface DayPoint {
  date: string;
  participants: number;
  newParticipants: number;
  matches: number;
  events: number;
  playMinutes: number;
}

export type EffectKind = 'presente' | 'turbo' | 'meta' | 'vitoria';

export interface EffectItem {
  id: string;
  at: number;
  kind: EffectKind;
  title: string;
  detail?: string;
}

export interface ToastItem {
  id: string;
  tone: 'info' | 'ok' | 'warn' | 'erro';
  title: string;
  detail?: string;
}

export interface PollState {
  question: string;
  options: { label: string; votes: number }[];
  voters: string[];
}

export const DEFAULT_POLL: PollState = {
  question: 'Como a próxima rodada deve ser?',
  options: [
    { label: 'Mais fácil', votes: 0 },
    { label: 'Mais difícil', votes: 0 },
  ],
  voters: [],
};

export const DEFAULT_CONNECTION: ConnectionState = {
  status: 'desconectado',
  handle: '',
  scenario: 'ao-vivo',
  lastConnectedAt: null,
  connectedSince: null,
  message: 'Informe o @ do TikTok e conecte a LIVE.',
};

export type GameOpens = Record<GameId, number>;
