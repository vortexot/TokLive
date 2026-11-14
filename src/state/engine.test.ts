import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRng } from '../domain/prng';
import { buildRanking } from '../domain/ranking';
import { createLocalDataService } from '../services/dataService';
import { createApp, isValidHandle, type App } from './app';
import { participantStatus, unreadNotifications } from './engine';

const NOW = Date.UTC(2026, 10, 12, 15, 0, 0);

async function makeApp(seed = 'engine', clock: () => number = () => NOW): Promise<App> {
  const now = clock;
  const app = createApp({
    role: 'panel',
    persist: false,
    now,
    rng: createRng(seed),
    dataService: createLocalDataService({ latencyMs: 0, now }),
  });
  await app.actions.bootstrap();
  return app;
}

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.useRealTimers());

describe('inicialização', () => {
  it('carrega o conjunto sintético e fica pronto', async () => {
    const { store } = await makeApp();
    const s = store.getState();
    expect(s.ready).toBe(true);
    expect(s.participants.length).toBeGreaterThanOrEqual(100);
    expect(s.history).toHaveLength(30);
    expect(s.connection.status).toBe('desconectado');
    expect(s.selectedGameId).toBeNull();
  });

  it('mostra erro quando a leitura falha e se recupera ao tentar de novo', async () => {
    const app = await makeApp();
    app.actions.failNextLoad(true);
    await app.actions.bootstrap();
    expect(app.store.getState().ready).toBe(false);
    expect(app.store.getState().loadError).toMatch(/Não foi possível/);
    await app.actions.bootstrap();
    expect(app.store.getState().ready).toBe(true);
    expect(app.store.getState().loadError).toBeNull();
  });
});

describe('eventos da LIVE', () => {
  it('novo seguidor cria participante, personagem, atividade e contadores', async () => {
    const { store, actions } = await makeApp();
    const before = store.getState();
    actions.emit({ type: 'follow', username: '@Nova.Pessoa' });
    const s = store.getState();
    expect(s.participants).toHaveLength(before.participants.length + 1);
    const created = s.participants.find((p) => p.username === 'nova.pessoa')!;
    expect(created).toMatchObject({ origin: 'simulador', xp: 0, wins: 0 });
    expect(created.characterSeed).toBe('nova.pessoa');
    expect(s.counters.follows).toBe(before.counters.follows + 1);
    expect(s.today.newParticipants).toBe(before.today.newParticipants + 1);
    expect(s.activity.slice(0, 2).map((a) => a.kind)).toEqual(['personagem', 'participante']);
    expect(s.toasts.at(-1)?.title).toContain('nova.pessoa');
  });

  it('seguir de novo não duplica o participante', async () => {
    const { store, actions } = await makeApp();
    actions.emit({ type: 'follow', username: 'repetido' });
    const count = store.getState().participants.length;
    actions.emit({ type: 'follow', username: 'repetido' });
    expect(store.getState().participants).toHaveLength(count);
  });

  it('gera sozinho um nome novo quando o seguidor não é informado', async () => {
    const { store, actions } = await makeApp();
    const names = new Set(store.getState().participants.map((p) => p.username));
    actions.emit({ type: 'follow' });
    const added = store.getState().participants[0]!;
    expect(names.has(added.username)).toBe(false);
  });

  it('comentário aparece no chat, é limitado a 140 caracteres e ignora texto vazio', async () => {
    const { store, actions } = await makeApp();
    actions.emit({ type: 'comment', text: 'a'.repeat(300) });
    actions.emit({ type: 'comment', text: '   ' });
    const chat = store.getState().chat;
    expect(chat).toHaveLength(1);
    expect(chat[0]!.text).toHaveLength(140);
    expect(store.getState().counters.comments).toBeGreaterThan(0);
  });

  it('!entrar coloca o participante na fila, respeita a regra e não duplica', async () => {
    const { store, actions } = await makeApp();
    const user = store.getState().participants[3]!;
    actions.emit({ type: 'comment', username: user.username, text: '!entrar' });
    actions.emit({ type: 'comment', username: user.username, text: '!ENTRAR de novo' });
    expect(store.getState().lobby).toEqual([user.id]);
    expect(store.getState().chat.at(-1)?.command).toBe('entrar');
    expect(participantStatus(store.getState(), user, NOW)).toBe('na-fila');

    actions.updateGameConfig('corrida', { rules: { 'entrada-por-comentario': false } });
    const other = store.getState().participants[4]!;
    actions.emit({ type: 'comment', username: other.username, text: '!entrar' });
    expect(store.getState().lobby).toEqual([user.id]);
  });

  it('!voto registra um voto por pessoa', async () => {
    const { store, actions } = await makeApp();
    const [a, b] = store.getState().participants;
    actions.emit({ type: 'comment', username: a!.username, text: '!voto 2' });
    actions.emit({ type: 'comment', username: a!.username, text: '!voto 1' });
    actions.emit({ type: 'comment', username: b!.username, text: '!voto 2' });
    expect(store.getState().poll.options.map((o) => o.votes)).toEqual([0, 2]);
    actions.resetPoll();
    expect(store.getState().poll.options.map((o) => o.votes)).toEqual([0, 0]);
  });

  it('curtidas somam, enchem a meta e liberam uma nova meta maior', async () => {
    const { store, actions } = await makeApp();
    const before = store.getState();
    actions.emit({ type: 'like', count: 10 });
    expect(store.getState().counters.likes).toBe(before.counters.likes + 10);
    expect(store.getState().goal.progress).toBe(before.goal.progress + 10);

    const missing = before.goal.target - store.getState().goal.progress;
    actions.emit({ type: 'like', count: missing + 5 });
    const s = store.getState();
    expect(s.goal.reached).toBe(1);
    expect(s.goal.level).toBe(2);
    expect(s.goal.target).toBeGreaterThan(before.goal.target);
    expect(s.goal.progress).toBe(5);
    expect(s.activity.some((a) => a.kind === 'meta')).toBe(true);
    expect(s.effects.some((e) => e.kind === 'meta')).toBe(true);
  });

  it('curtidas seguidas se agrupam em uma única atividade', async () => {
    const { store, actions } = await makeApp();
    actions.emit({ type: 'like', count: 5 });
    const len = store.getState().activity.length;
    actions.emit({ type: 'like', count: 7 });
    expect(store.getState().activity).toHaveLength(len);
    expect(store.getState().activity[0]!.detail).toContain('12');
  });

  it('presente registra atividade, efeito e XP; compartilhamento dá bônus', async () => {
    const { store, actions } = await makeApp();
    const user = store.getState().participants[0]!;
    actions.emit({ type: 'gift', username: user.username, gift: 'foguete' });
    let s = store.getState();
    expect(s.counters.gifts).toBeGreaterThan(0);
    expect(s.activity[0]).toMatchObject({ kind: 'presente' });
    expect(s.effects.at(-1)?.kind).toBe('presente');
    expect(s.participants.find((p) => p.id === user.id)!.xp).toBe(user.xp + 5);

    actions.emit({ type: 'share', username: user.username });
    s = store.getState();
    expect(s.participants.find((p) => p.id === user.id)!.xp).toBe(user.xp + 15);
  });

  it('desliga os avisos quando a preferência pede', async () => {
    const { store, actions } = await makeApp();
    actions.updateSettings({ toastEvents: false });
    actions.emit({ type: 'follow', username: 'sem.aviso' });
    expect(store.getState().toasts).toHaveLength(0);
  });

  it('notificações não lidas contam eventos relevantes e zeram ao marcar como lidas', async () => {
    const { store, actions } = await makeApp();
    expect(unreadNotifications(store.getState())).toBe(0);
    store.setState((s) => ({ ...s, notificationsReadAt: NOW - 1000 }));
    actions.emit({ type: 'follow', username: 'avisar.me' });
    expect(unreadNotifications(store.getState())).toBeGreaterThan(0);
    actions.markNotificationsRead();
    expect(unreadNotifications(store.getState())).toBe(0);
  });
});

describe('personagens', () => {
  it('sortear nova aparência troca a semente, mantém o usuário e se repete de forma diferente', async () => {
    const { store, actions } = await makeApp();
    const target = store.getState().participants[5]!;
    actions.rerollCharacter(target.id);
    const first = store.getState().participants.find((p) => p.id === target.id)!;
    expect(first.characterSeed).not.toBe(target.characterSeed);
    expect(first.characterSeed.startsWith(`${target.username}~`)).toBe(true);
    expect(first.username).toBe(target.username);
    actions.rerollCharacter(target.id);
    const second = store.getState().participants.find((p) => p.id === target.id)!;
    expect(second.characterSeed.startsWith(`${target.username}~`)).toBe(true);
    expect(second.characterSeed).not.toBe(first.characterSeed);
    expect(second.characterSeed.split('~')).toHaveLength(2);
  });

  it('ignora participante inexistente', async () => {
    const { store, actions } = await makeApp();
    const before = store.getState().participants;
    actions.rerollCharacter('nao-existe');
    expect(store.getState().participants).toBe(before);
  });
});

describe('partida', () => {
  it('exige jogo escolhido antes de iniciar', async () => {
    const { store, actions } = await makeApp();
    actions.startMatch();
    expect(store.getState().match).toBeNull();
    expect(store.getState().toasts.at(-1)?.title).toBe('Escolha um jogo');
  });

  it.each(['chao-de-lava', 'batalha-empurroes', 'batatinha', 'futebol', 'plataformas'] as const)('inicia e conclui uma partida de %s', async (game) => {
    const { store, actions } = await makeApp();
    actions.selectGame(game);
    actions.startMatch();
    const match = store.getState().match;
    expect(match?.gameId).toBe(game);
    expect(match?.racers.length).toBeGreaterThanOrEqual(4);
    actions.endMatch();
    expect(store.getState().match?.status).toBe('encerrada');
    expect(store.getState().matchHistory[0]?.gameId).toBe(game);
  });

  it('completa a fila com participantes recentes e consome a fila', async () => {
    const { store, actions } = await makeApp();
    actions.selectGame('corrida');
    const queued = store.getState().participants[0]!;
    actions.emit({ type: 'join', participantId: queued.id });
    actions.startMatch();
    const s = store.getState();
    expect(s.match?.status).toBe('contagem');
    expect(s.match!.racers.length).toBeGreaterThanOrEqual(12);
    expect(s.match!.racers.some((r) => r.participantId === queued.id)).toBe(true);
    expect(s.lobby).toEqual([]);
    expect(participantStatus(s, queued, NOW)).toBe('em-partida');
  });

  it('sem a regra de completar e com fila pequena, avisa e não inicia', async () => {
    const { store, actions } = await makeApp();
    actions.selectGame('corrida');
    actions.updateGameConfig('corrida', { rules: { 'completar-fila': false } });
    actions.startMatch();
    expect(store.getState().match).toBeNull();
    expect(store.getState().toasts.at(-1)?.title).toBe('Fila insuficiente');
  });

  it('respeita o limite de participantes configurado', async () => {
    const { store, actions } = await makeApp();
    actions.selectGame('corrida');
    actions.updateGameConfig('corrida', { maxParticipants: 6 });
    actions.startMatch();
    expect(store.getState().match!.racers).toHaveLength(6);
  });

  it('pausar e retomar controlam o andamento; iniciar de novo é ignorado', async () => {
    const { store, actions } = await makeApp();
    actions.selectGame('corrida');
    actions.startMatch();
    const id = store.getState().match!.id;
    actions.startMatch();
    expect(store.getState().match!.id).toBe(id);
    actions.pauseMatch();
    expect(store.getState().match!.status).toBe('pausada');
    actions.resumeMatch();
    expect(store.getState().match!.status).toBe('contagem');
  });

  it('a corrida roda até o fim, premia os participantes e atualiza ranking e histórico', async () => {
    // Relógio real (controlado pelos timers falsos): o passo da partida depende do tempo decorrido.
    const app = await makeApp('corrida-completa', () => Date.now());
    const { store, actions } = app;
    actions.selectGame('corrida');
    actions.startMatch();
    const ids = store.getState().match!.racers.map((r) => r.participantId);
    const before = store.getState();
    const prevMatches = before.today.matches;

    vi.useFakeTimers();
    const stop = app.start();
    for (let i = 0; i < 4000 && store.getState().match?.status !== 'encerrada'; i++) {
      vi.advanceTimersByTime(50);
    }
    stop();
    vi.useRealTimers();

    const s = store.getState();
    expect(s.match?.status).toBe('encerrada');
    const results = s.match!.results!;
    expect(results).toHaveLength(ids.length);
    const winner = results[0]!;
    expect(winner.won).toBe(true);
    const winnerAfter = s.participants.find((p) => p.id === winner.participantId)!;
    const winnerBefore = before.participants.find((p) => p.id === winner.participantId)!;
    expect(winnerAfter.wins).toBe(winnerBefore.wins + 1);
    expect(winnerAfter.points).toBe(winnerBefore.points + winner.points);
    expect(winnerAfter.byGame.corrida!.matches).toBe((winnerBefore.byGame.corrida?.matches ?? 0) + 1);
    expect(s.today.matches).toBe(prevMatches + 1);
    expect(s.matchHistory[0]!.winnerId).toBe(winner.participantId);
    expect(s.rankPrev.geral).toBeDefined();
    expect(buildRanking(s.participants, 'geral', s.rankPrev.geral).some((r) => r.delta !== 0)).toBe(true);
    expect(s.effects.some((e) => e.kind === 'vitoria')).toBe(true);

    actions.dismissMatch();
    expect(store.getState().match).toBeNull();
  });

  it('recupera o tempo perdido quando o navegador reduz os temporizadores (aba oculta)', async () => {
    const app = await makeApp('segundo-plano', () => Date.now());
    app.actions.selectGame('corrida');
    app.actions.startMatch();
    app.store.setState((s) => ({ ...s, match: { ...s.match!, status: 'em-andamento', countdown: 0 } }));
    vi.useFakeTimers();
    const stop = app.start();
    // Um único disparo do temporizador depois de 1,5 s de "silêncio".
    vi.setSystemTime(Date.now() + 1500);
    vi.advanceTimersByTime(50);
    stop();
    expect(app.store.getState().match!.t).toBeGreaterThan(1.4);
  });

  it('presente de impulso durante a corrida altera só o personagem de quem enviou', async () => {
    const { store, actions } = await makeApp();
    actions.selectGame('corrida');
    actions.startMatch();
    const racer = store.getState().match!.racers[0]!;
    const user = store.getState().participants.find((p) => p.id === racer.participantId)!;
    store.setState((s) => ({ ...s, match: { ...s.match!, status: 'em-andamento', countdown: 0 } }));
    actions.emit({ type: 'gift', username: user.username, gift: 'foguete' });
    const after = store.getState().match!.racers;
    expect(after.find((r) => r.participantId === user.id)!.boostUntil).toBeGreaterThan(0);
    expect(after.filter((r) => r.boostUntil > 0)).toHaveLength(1);
  });

  it('a meta de curtidas liga o turbo coletivo durante a partida', async () => {
    const { store, actions } = await makeApp();
    actions.selectGame('corrida');
    actions.startMatch();
    store.setState((s) => ({ ...s, match: { ...s.match!, status: 'em-andamento', countdown: 0 } }));
    actions.emit({ type: 'like', count: 5000 });
    expect(store.getState().match!.turboUntil).toBeGreaterThan(0);
    expect(store.getState().effects.some((e) => e.kind === 'turbo')).toBe(true);
  });

  it('encerrar a LIVE encerra a partida em andamento', async () => {
    const { store, actions } = await makeApp();
    actions.selectGame('corrida');
    actions.startMatch();
    store.setState((s) => ({ ...s, match: { ...s.match!, status: 'em-andamento', countdown: 0 } }));
    actions.emit({ type: 'live-end' });
    expect(store.getState().match!.status).toBe('encerrada');
    expect(store.getState().connection.status).toBe('desconectado');
  });
});

describe('conexão com a LIVE (simulada)', () => {
  // Carrega os dados com timers reais e só depois passa a controlar o tempo.
  const makeFakeTimerApp = async () => {
    const app = await makeApp();
    vi.useFakeTimers();
    return app;
  };

  it('valida o @ antes de conectar', async () => {
    const { actions, store } = await makeFakeTimerApp();
    expect(isValidHandle('@usuario.demo')).toBe(true);
    expect(isValidHandle('https://www.tiktok.com/@usuario.demo/live')).toBe(true);
    expect(isValidHandle('x')).toBe(false);
    expect(isValidHandle('com espaço')).toBe(false);
    expect(actions.connect('x')).toBe(false);
    expect(store.getState().connection.status).toBe('desconectado');
  });

  it('cenário "ao vivo": conectando → ao vivo', async () => {
    const { actions, store } = await makeFakeTimerApp();
    expect(actions.connect('@criador.demo')).toBe(true);
    expect(store.getState().connection).toMatchObject({ status: 'conectando', handle: 'criador.demo' });
    vi.advanceTimersByTime(1500);
    expect(store.getState().connection.status).toBe('ao-vivo');
    expect(store.getState().connection.connectedSince).not.toBeNull();
  });

  it('cenário "aguardando início": aguarda e depois conecta sozinho', async () => {
    const { actions, store } = await makeFakeTimerApp();
    actions.setScenario('aguardando-inicio');
    actions.connect('criador.demo');
    vi.advanceTimersByTime(1500);
    expect(store.getState().connection.status).toBe('aguardando');
    expect(store.getState().connection.message).toContain('Aguardando');
    vi.advanceTimersByTime(7100);
    expect(store.getState().connection.status).toBe('ao-vivo');
  });

  it('cenário "falha": termina em erro e permite tentar de novo', async () => {
    const { actions, store } = await makeFakeTimerApp();
    actions.setScenario('falha');
    actions.connect('criador.demo');
    vi.advanceTimersByTime(1500);
    expect(store.getState().connection.status).toBe('erro');
    expect(store.getState().toasts.at(-1)?.tone).toBe('erro');
    actions.setScenario('ao-vivo');
    actions.connect();
    vi.advanceTimersByTime(1500);
    expect(store.getState().connection.status).toBe('ao-vivo');
  });

  it('desconectar durante a conexão cancela a progressão', async () => {
    const { actions, store } = await makeFakeTimerApp();
    actions.connect('criador.demo');
    actions.disconnect();
    vi.advanceTimersByTime(10_000);
    expect(store.getState().connection.status).toBe('desconectado');
  });

  it('reconectando volta a ficar ao vivo sozinho', async () => {
    const { actions, store } = await makeFakeTimerApp();
    actions.forceConnection('reconectando');
    expect(store.getState().connection.status).toBe('reconectando');
    vi.advanceTimersByTime(3600);
    expect(store.getState().connection.status).toBe('ao-vivo');
  });
});

describe('configurações', () => {
  it('limita a configuração do jogo e restaura o padrão', async () => {
    const { actions, store } = await makeApp();
    actions.updateGameConfig('corrida', { maxParticipants: 500, durationSec: 120, difficulty: 'dificil' });
    expect(store.getState().gameConfigs.corrida).toMatchObject({ maxParticipants: 30, durationSec: 120, difficulty: 'dificil' });
    actions.resetGameConfig('corrida');
    expect(store.getState().gameConfigs.corrida).toMatchObject({ maxParticipants: 24, durationSec: 90, difficulty: 'normal' });
  });

  it('ajustar a meta de curtidas limita o progresso atual', async () => {
    const { actions, store } = await makeApp();
    actions.updateSettings({ likeGoalTarget: 100 });
    expect(store.getState().goal.target).toBe(100);
    expect(store.getState().goal.progress).toBeLessThan(100);
  });

  it('persiste e restaura preferências e dados entre sessões', async () => {
    const now = () => NOW;
    const make = () =>
      createApp({ role: 'panel', persist: true, now, rng: createRng('p'), dataService: createLocalDataService({ latencyMs: 0, now }) });
    const first = make();
    await first.actions.bootstrap();
    const stop = first.start();
    first.actions.updateSettings({ arenaName: 'Minha Arena' });
    first.actions.selectGame('corrida');
    first.actions.setHandle('@meu.usuario');
    first.actions.emit({ type: 'follow', username: 'persistida' });
    stop();

    const second = make();
    await second.actions.bootstrap();
    const s = second.store.getState();
    expect(s.settings.arenaName).toBe('Minha Arena');
    expect(s.selectedGameId).toBe('corrida');
    expect(s.connection.handle).toBe('meu.usuario');
    expect(s.participants.some((p) => p.username === 'persistida')).toBe(true);
  });

  it('restaurar os dados de demonstração apaga o que foi criado', async () => {
    const app = await makeApp();
    app.actions.emit({ type: 'follow', username: 'vai.sumir' });
    await app.actions.resetDemoData();
    expect(app.store.getState().participants.some((p) => p.username === 'vai.sumir')).toBe(false);
    expect(app.store.getState().ready).toBe(true);
  });
});
