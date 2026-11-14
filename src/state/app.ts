// Composição do app: store + ações ligadas a relógio, aleatoriedade, persistência e sincronização.
// Toda a lógica de regra fica em engine.ts; aqui só há temporizadores e efeitos colaterais.

import type { ConnectionScenario, ConnectionStatus, GameConfig, GameId, LiveEvent } from '../domain/types';
import type { Settings } from '../domain/session';
import { createLocalDataService, type DataService } from '../services/dataService';
import { generateDataset, type DemoDataset } from '../services/mockData';
import { loadJson, saveJson } from '../services/storage';
import { eventsForInterval, randomLiveEvent } from './autoSim';
import { statusFromWorker, type Backend } from '../services/backend';
import { applySnapshot, openChannel, slimSnapshot, toSnapshot, type Channel, type SessionSnapshot } from './channel';
import * as engine from './engine';
import { createStore, type Store } from './store';
import type { AppState, Ctx, SimulatorState } from './types';

export type Role = 'panel' | 'overlay';

export interface AppOptions {
  role?: Role;
  persist?: boolean;
  dataService?: DataService;
  /** Conta real: dados do criador, conexão com a LIVE e overlay pela internet. Sem isto, tudo é demonstração local. */
  backend?: Backend;
  /** Overlay com token real: recebe os snapshots do painel pela internet em vez de simular. */
  overlayFeed?: (onSnapshot: (snapshot: SessionSnapshot) => void) => () => void;
  now?: () => number;
  rng?: () => number;
}

export interface Actions {
  bootstrap(): Promise<void>;
  emit(event: LiveEvent): void;
  /**
   * Avisa a cada evento da LIVE aplicado (simulador, worker ou ponte do Palco), depois de o motor processar.
   * Devolve a função que cancela o aviso.
   */
  onLiveEvent(listener: (event: LiveEvent) => void): () => void;
  connect(handle?: string): boolean;
  disconnect(): void;
  setHandle(handle: string): void;
  setScenario(scenario: ConnectionScenario): void;
  forceConnection(status: ConnectionStatus): void;
  selectGame(id: GameId | null): void;
  openGame(id: GameId): void;
  updateGameConfig(id: GameId, patch: Partial<GameConfig>): void;
  resetGameConfig(id: GameId): void;
  startMatch(): void;
  pauseMatch(): void;
  resumeMatch(): void;
  endMatch(): void;
  dismissMatch(): void;
  resetPoll(): void;
  rerollCharacter(participantId: string): void;
  updateSettings(patch: Partial<Settings>): void;
  setSimulator(patch: Partial<SimulatorState>): void;
  toast(tone: 'info' | 'ok' | 'warn' | 'erro', title: string, detail?: string): void;
  dismissToast(id: string): void;
  markNotificationsRead(): void;
  failNextLoad(value: boolean): void;
  resetDemoData(): Promise<void>;
}

export interface App {
  store: Store<AppState>;
  actions: Actions;
  dataService: DataService;
  /** Liga temporizadores (partida, simulação automática, persistência, sincronização). Devolve o desligamento. */
  start(): () => void;
}

export function isValidHandle(raw: string): boolean {
  return engine.HANDLE_PATTERN.test(engine.normalizeHandle(raw));
}

/** Teto de participantes gravados: acima disso ficam os vistos mais recentemente (o armazenamento tem limite de tamanho). */
export const MAX_STORED_PARTICIPANTS = 8000;

function toDataset(state: AppState, now: number): DemoDataset {
  const participants =
    state.participants.length > MAX_STORED_PARTICIPANTS
      ? state.participants.slice().sort((a, b) => b.lastSeenAt - a.lastSeenAt).slice(0, MAX_STORED_PARTICIPANTS)
      : state.participants;
  return {
    version: 1,
    generatedAt: now,
    participants,
    history: state.history,
    today: state.today,
    hourly: state.hourly,
    gameOpens: state.gameOpens,
    matchHistory: state.matchHistory,
    rankPrev: state.rankPrev,
    bestRaceSeconds: state.bestRaceSeconds,
    counters: state.counters,
    gameConfigs: state.gameConfigs,
  };
}

export function createApp(options: AppOptions = {}): App {
  const role = options.role ?? 'panel';
  const persist = options.persist ?? role === 'panel';
  const now = options.now ?? Date.now;
  const rng = options.rng ?? Math.random;
  const backend = options.backend;
  const dataService = options.dataService ?? backend?.dataService ?? createLocalDataService();
  const store = createStore<AppState>(engine.createInitialState());

  let counter = 0;
  const eventListeners = new Set<(event: LiveEvent) => void>();
  const notify = (events: readonly LiveEvent[]) => {
    for (const event of events) {
      for (const listener of eventListeners) {
        try {
          listener(event);
        } catch {
          /* um ouvinte com erro não pode parar os outros nem o motor */
        }
      }
    }
  };
  const ctx = (): Ctx => ({ now: now(), rng, id: (prefix) => `${prefix}-${now().toString(36)}-${(counter++).toString(36)}` });
  const update = (fn: (state: AppState, c: Ctx) => AppState) => store.setState((s) => fn(s, ctx()));

  /* ----- conexão simulada ----- */
  let loading: Promise<void> | null = null;
  let timers: ReturnType<typeof setTimeout>[] = [];
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };
  const later = (ms: number, fn: () => void) => {
    timers.push(setTimeout(fn, ms));
  };
  const setStatus = (status: ConnectionStatus) => update((s, c) => engine.setConnectionStatus(s, status, c));
  const setRemoteStatus = (status: ConnectionStatus) => update((s, c) => engine.setConnectionStatus(s, status, c, true));

  const actions: Actions = {
    bootstrap() {
      // Idempotente: chamadas simultâneas (ex.: StrictMode) compartilham o mesmo carregamento.
      if (loading) return loading;
      store.setState((s) => ({ ...s, loadError: null, ready: false }));
      loading = (async () => {
        try {
          const dataset = await dataService.loadDataset();
          const prefs = loadJson<engine.PersistedPrefs>('prefs');
          update((s, c) => engine.hydrate(s, dataset, prefs, c));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Falha ao carregar os dados.';
          store.setState((s) => ({ ...s, loadError: message }));
        } finally {
          loading = null;
        }
      })();
      return loading;
    },

    emit(event) {
      update((s, c) => engine.applyLiveEvent(s, event, c));
      notify([event]);
    },

    onLiveEvent(listener) {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    },

    connect(rawHandle) {
      const handle = engine.normalizeHandle(rawHandle ?? store.getState().connection.handle);
      if (!engine.HANDLE_PATTERN.test(handle)) return false;
      clearTimers();
      update((s) => engine.setConnectionHandle(s, handle));
      setStatus('conectando');
      if (backend) {
        // Conexão real: o worker faz a ligação e o andamento volta por subscribeLive.
        backend.requestConnection(handle, 'connected').catch(() => setRemoteStatus('erro'));
        return true;
      }
      later(1400, () => {
        const scenario = store.getState().connection.scenario;
        if (scenario === 'falha') return setStatus('erro');
        if (scenario === 'aguardando-inicio') {
          setStatus('aguardando');
          later(7000, () => setStatus('ao-vivo'));
          return;
        }
        setStatus('ao-vivo');
      });
      return true;
    },

    disconnect() {
      clearTimers();
      if (backend) {
        const handle = store.getState().connection.handle;
        if (handle) void backend.requestConnection(handle, 'disconnected').catch(() => undefined);
        setRemoteStatus('desconectado');
        return;
      }
      setStatus('desconectado');
    },

    setHandle: (handle) => update((s) => engine.setConnectionHandle(s, handle.replace(/^@/, ''))),
    setScenario: (scenario) => update((s) => engine.setScenario(s, scenario)),

    forceConnection(status) {
      clearTimers();
      if (!store.getState().connection.handle) update((s) => engine.setConnectionHandle(s, 'demo.live'));
      setStatus(status);
      if (status === 'reconectando') later(3500, () => setStatus('ao-vivo'));
    },

    selectGame: (id) => update((s) => engine.selectGame(s, id)),
    openGame: (id) => update((s) => engine.registerGameOpen(s, id)),
    updateGameConfig: (id, patch) => update((s) => engine.updateGameConfig(s, id, patch)),
    resetGameConfig: (id) => update((s) => engine.resetGameConfig(s, id)),

    startMatch: () => update((s, c) => engine.startMatch(s, c)),
    pauseMatch: () => update((s) => engine.pauseMatch(s)),
    resumeMatch: () => update((s) => engine.resumeMatch(s)),
    endMatch: () => update((s, c) => engine.endMatch(s, c)),
    dismissMatch: () => update((s) => engine.dismissMatch(s)),
    resetPoll: () => update((s) => engine.resetPoll(s)),
    rerollCharacter: (id) => update((s, c) => engine.rerollCharacter(s, id, c)),

    updateSettings: (patch) => update((s) => engine.updateSettings(s, patch)),
    setSimulator: (patch) => update((s) => engine.setSimulator(s, patch)),
    toast: (tone, title, detail) => update((s, c) => engine.pushToast(s, { tone, title, detail }, c)),
    dismissToast: (id) => update((s) => engine.dismissToast(s, id)),
    markNotificationsRead: () => update((s, c) => engine.markNotificationsRead(s, c)),
    failNextLoad: (value) => dataService.failNext(value),

    async resetDemoData() {
      clearTimers();
      const dataset = await dataService.resetDataset();
      store.setState(() => engine.hydrate(engine.createInitialState(), dataset, null, ctx()));
    },
  };

  /* ----- temporizadores e efeitos ----- */

  function start(): () => void {
    const stops: (() => void)[] = [];
    let last = now();

    // Passo da partida e limpeza de efeitos (20 vezes por segundo, só quando há o que atualizar).
    // Em aba oculta o navegador reduz a frequência dos temporizadores; por isso o tempo decorrido
    // é consumido em passos curtos, e a partida segue em tempo real em vez de ficar lenta.
    const ticker = setInterval(() => {
      const t = now();
      let remaining = Math.min(2, Math.max(0, (t - last) / 1000));
      last = t;
      const s = store.getState();
      if (!s.match && !s.effects.length) return;
      do {
        const step = Math.min(0.1, remaining);
        update((state, c) => engine.tickMatch(state, step, c));
        remaining -= step;
      } while (remaining > 1e-6);
    }, 50);
    stops.push(() => clearInterval(ticker));

    // Eventos automáticos do simulador.
    const auto = setInterval(() => {
      const s = store.getState();
      if (!s.simulator.auto || !s.ready) return;
      const n = eventsForInterval(rng, s.simulator.rate, 0.25);
      for (let i = 0; i < n; i++) actions.emit(randomLiveEvent(rng));
    }, 250);
    stops.push(() => clearInterval(auto));

    if (role === 'panel') stops.push(startPanelEffects());
    else stops.push(startOverlayEffects());

    return () => {
      stops.forEach((stop) => stop());
      clearTimers();
    };
  }

  function startPanelEffects(): () => void {
    let channel: Channel | null = null;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let sendTimer: ReturnType<typeof setTimeout> | undefined;

    const send = () => {
      const s = store.getState();
      if (!s.ready) return;
      const snapshot = toSnapshot(s, now());
      channel?.post({ type: 'snapshot', snapshot });
      backend?.publishSnapshot(slimSnapshot(snapshot));
    };
    channel = openChannel((message) => {
      if (message.type === 'hello') send();
    });

    const save = () => {
      const s = store.getState();
      if (!s.ready) return;
      dataService.saveDataset(toDataset(s, now()));
      saveJson('prefs', {
        settings: s.settings,
        selectedGameId: s.selectedGameId,
        handle: s.connection.handle,
        scenario: s.connection.scenario,
        lastConnectedAt: s.connection.lastConnectedAt,
      } satisfies engine.PersistedPrefs);
    };

    // Eventos e andamento da conexão vindos do worker da LIVE.
    // Com mil espectadores, chegam dezenas de eventos por segundo: aplicam-se em lote, no máximo 10 vezes por segundo.
    let inbox: LiveEvent[] = [];
    let inboxTimer: ReturnType<typeof setTimeout> | undefined;
    const drainInbox = () => {
      inboxTimer = undefined;
      const batch = inbox;
      inbox = [];
      if (!batch.length) return;
      update((state, c) => batch.reduce((acc, event) => engine.applyLiveEvent(acc, event, c), state));
      notify(batch);
    };
    const stopLive = backend?.subscribeLive({
      onEvent: (event) => {
        inbox.push(event);
        inboxTimer ??= setTimeout(drainInbox, 100);
      },
      onConnection: (row) => {
        if (row.handle && row.handle !== store.getState().connection.handle) update((s) => engine.setConnectionHandle(s, row.handle as string));
        setRemoteStatus(statusFromWorker(row.status));
      },
    });

    const unsubscribe = store.subscribe(() => {
      if (!sendTimer) {
        sendTimer = setTimeout(() => {
          sendTimer = undefined;
          send();
        }, 250);
      }
      // Grava no máximo a cada 3 s, mesmo com eventos o tempo todo (um "debounce" nunca gravaria durante a LIVE).
      if (persist && !saveTimer) {
        saveTimer = setTimeout(() => {
          saveTimer = undefined;
          save();
        }, 3000);
      }
    });

    return () => {
      stopLive?.();
      clearTimeout(inboxTimer);
      drainInbox();
      unsubscribe();
      clearTimeout(saveTimer);
      clearTimeout(sendTimer);
      if (persist) save();
      channel?.close();
    };
  }

  /** Overlay: usa os dados do painel quando ele está aberto no mesmo navegador; senão, simula sozinho. */
  function startOverlayEffects(): () => void {
    if (options.overlayFeed) {
      // Token real: nada de simulação. Espera o painel publicar e mostra o que ele mandar.
      store.setState((s) => ({ ...s, ready: true }));
      return options.overlayFeed((snapshot) => store.setState((s) => applySnapshot(s, snapshot)));
    }
    let synced = false;
    let standalone = false;
    let autoplayTimer: ReturnType<typeof setTimeout> | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const channel = openChannel((message) => {
      if (message.type !== 'snapshot') return;
      synced = true;
      if (standalone) {
        // O painel apareceu depois da espera: abandona a simulação própria e passa a seguir o painel.
        standalone = false;
        clearTimeout(autoplayTimer);
        store.setState((s) => ({ ...s, simulator: { ...s.simulator, auto: false } }));
      }
      store.setState((s) => applySnapshot(s, message.snapshot));
    });
    channel.post({ type: 'hello' });

    const autoplay = () => {
      const s = store.getState();
      if (!standalone) return;
      if (!s.match) update((state, c) => engine.startMatch(state, c));
      else if (s.match.status === 'encerrada') {
        autoplayTimer = setTimeout(() => {
          update((state) => engine.dismissMatch(state));
          autoplayTimer = setTimeout(autoplay, 2500);
        }, 9000);
        return;
      }
      autoplayTimer = setTimeout(autoplay, 1000);
    };

    const beginStandalone = () => {
      if (synced) return;
      standalone = true;
      const dataset = generateDataset(now());
      update((s, c) => engine.hydrate(s, dataset, { handle: 'arena.demo', selectedGameId: 'corrida' }, c));
      update((s) => engine.updateGameConfig(s, 'corrida', { durationSec: 60 }));
      update((s, c) => engine.setConnectionStatus(s, 'ao-vivo', c));
      store.setState((s) => ({ ...s, simulator: { ...s.simulator, auto: true, rate: 2 } }));
      autoplayTimer = setTimeout(autoplay, 1500);
    };
    fallbackTimer = setTimeout(beginStandalone, 1500);

    return () => {
      clearTimeout(fallbackTimer);
      clearTimeout(autoplayTimer);
      channel.close();
    };
  }

  return { store, actions, dataService, start };
}
