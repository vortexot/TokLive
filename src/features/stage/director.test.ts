import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LIVE_SETTINGS, type SlotInfo } from '../../domain/stageLive';
import { StageDirector, type DirectorConfig, type IaReply } from './director';

const slots: SlotInfo[] = [{ label: 'Anfitrião', name: 'Zé', persona: 'Brincalhão.', phrases: ['Fala, {nome}!'] }];

function setup(options: { ai?: ((p: unknown) => Promise<IaReply>) | null; config?: Partial<DirectorConfig> } = {}) {
  const spoken: string[] = [];
  const handles: { cancel: () => void }[] = [];
  const director = new StageDirector(
    {
      now: () => Date.now(),
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
      ai: options.ai === undefined ? null : options.ai,
      speak(text) {
        spoken.push(text);
        let finish!: () => void;
        const done = new Promise<void>((r) => (finish = r));
        const timer = setTimeout(finish, 1000);
        const handle = { done, cancel: () => (clearTimeout(timer), finish()) };
        handles.push(handle);
        return handle;
      },
    },
    { format: 'papo-reto', slots, voices: [null], settings: { ...DEFAULT_LIVE_SETTINGS }, ...options.config },
  );
  return { director, spoken, handles };
}

/** Deixa promessas e temporizadores andarem. */
async function run(ms = 0) {
  await vi.advanceTimersByTimeAsync(ms);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-14T20:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('diretor do palco', () => {
  it('parado, só junta a fila; ligado, responde pelo roteiro quando não há IA', async () => {
    const { director, spoken } = setup();
    director.handleEvent({ type: 'comment', username: 'lu_gamer', nickname: 'Lu', text: '!pergunta tudo bem?' });
    await run(100);
    expect(spoken).toEqual([]);
    expect(director.getState().queue).toHaveLength(1);

    director.start();
    await run(10);
    expect(spoken).toEqual(['Fala, Lu!']);
    expect(director.getState().status).toBe('falando');
    await run(3000);
    expect(director.getState().status).toBe('ocioso');
    expect(director.getState().log[0]).toMatchObject({ kind: 'pedido', source: 'roteiro', note: 'IA desligada', asked: 'tudo bem?' });
  });

  it('usa a fala da IA e manda o pedido como dado, com o nome da pessoa', async () => {
    const ai = vi.fn(async (_prompt: unknown) => ({ ok: true as const, falas: [{ vaga: 0, texto: 'Tudo ótimo, Lu! E aí?' }], ms: 900, modelo: 'm' }));
    const { director, spoken } = setup({ ai });
    director.start();
    director.handleEvent({ type: 'comment', username: 'lu_gamer', nickname: 'Lu', text: '!pergunta tudo bem?' });
    await run(10);
    expect(spoken).toEqual(['Tudo ótimo, Lu! E aí?']);
    const prompt = ai.mock.calls[0]![0] as unknown as { user: string; system: string };
    expect(prompt.user).toContain('<<<tudo bem?>>>');
    expect(prompt.system).toContain('Zé. Brincalhão.');
    await run(3000);
    expect(director.getState()).toMatchObject({ spoken: 1, fromAi: 1 });
    expect(director.getState().log[0]).toMatchObject({ source: 'ia', ms: 900 });
  });

  it('quando a IA falha, fala o roteiro e registra o motivo', async () => {
    const { director, spoken } = setup({ ai: async () => ({ ok: false, erro: 'rede', mensagem: 'Sem resposta da IA a tempo.' }) });
    director.start();
    director.ask('qual seu nome?', 'voce');
    await run(10);
    expect(spoken).toEqual(['Fala, Voce!']);
    await run(3000);
    expect(director.getState().log[0]).toMatchObject({ source: 'roteiro', note: 'Sem resposta da IA a tempo.', who: 'Você como @voce', names: ['Zé'] });
  });

  it('descarta resposta da IA com termo bloqueado', async () => {
    const { director, spoken } = setup({ ai: async () => ({ ok: true, falas: [{ vaga: 0, texto: 'que porra' }], ms: 1, modelo: 'm' }) });
    director.start();
    director.ask('oi');
    await run(10);
    expect(spoken).toEqual(['Fala, Voce!']);
    await run(3000);
    expect(director.getState().log[0]?.note).toBe('resposta da IA descartada pelo filtro');
  });

  it('ignora pedido bloqueado ou sem conteúdo sem falar nada', async () => {
    const ai = vi.fn();
    const { director, spoken } = setup({ ai });
    director.start();
    director.handleEvent({ type: 'comment', username: 'a', text: '!pergunta seu porra' });
    await run(10);
    director.handleEvent({ type: 'comment', username: 'b', text: '!pergunta kkkkkkkk' });
    await run(10);
    expect(spoken).toEqual([]);
    expect(ai).not.toHaveBeenCalled();
    expect(director.getState().log.map((l) => l.dropped)).toEqual([true, true]);
  });

  it('agradece presente antes de responder pergunta, e junta presentes repetidos', async () => {
    const { director, spoken } = setup();
    director.handleEvent({ type: 'comment', username: 'lu', text: '!pergunta oi' });
    director.handleEvent({ type: 'gift', username: 'rafa', nickname: 'Rafa', gift: 'faisca', giftName: 'Rose', diamonds: 1 });
    director.handleEvent({ type: 'gift', username: 'rafa', nickname: 'Rafa', gift: 'faisca', giftName: 'Rose', diamonds: 1 });
    director.start();
    await run(10);
    expect(spoken[0]).toMatch(/2 Rose/);
    await run(3000);
    expect(spoken[1]).toBe('Fala, Lu!');
  });

  it('cumprimenta seguidores em grupo e respeita o intervalo entre cumprimentos', async () => {
    const { director, spoken } = setup();
    director.start();
    director.handleEvent({ type: 'follow', username: 'ana' });
    await run(500);
    director.handleEvent({ type: 'follow', username: 'bia' });
    await run(500);
    expect(spoken).toHaveLength(0);
    await run(600);
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toMatch(/Ana e Bia/);
    await run(3000);
    director.handleEvent({ type: 'follow', username: 'caio' });
    await run(5000);
    expect(spoken).toHaveLength(1);
    await run(15000);
    expect(spoken).toHaveLength(2);
    expect(spoken[1]).toMatch(/Caio/);
  });

  it('com aprovação ligada, só fala o que o criador aprova', async () => {
    const { director, spoken } = setup({ config: { settings: { ...DEFAULT_LIVE_SETTINGS, approve: true } } });
    director.start();
    director.ask('primeira');
    await run(10);
    expect(director.getState().status).toBe('aprovacao');
    expect(director.getState().approval?.lines[0]?.text).toBe('Fala, Voce!');
    director.reject();
    await run(10);
    expect(spoken).toEqual([]);
    expect(director.getState().log[0]).toMatchObject({ dropped: true, note: 'descartado na aprovação' });

    director.ask('segunda', 'lu');
    await run(10);
    director.approve();
    await run(10);
    expect(spoken).toEqual(['Fala, Lu!']);
  });

  it('fala manual passa na frente e não pede aprovação', async () => {
    const { director, spoken } = setup({ config: { settings: { ...DEFAULT_LIVE_SETTINGS, approve: true } } });
    director.handleEvent({ type: 'comment', username: 'lu', text: '!pergunta oi' });
    director.say('Boa noite, LIVE!');
    director.start();
    await run(10);
    expect(spoken).toEqual(['Boa noite, LIVE!']);
  });

  it('pular corta a fala na hora; pausar termina a fala atual e para', async () => {
    const { director, spoken } = setup();
    director.start();
    director.ask('um', 'a');
    director.ask('dois', 'b');
    await run(10);
    expect(spoken).toEqual(['Fala, visitante!']);
    director.skip();
    await run(1000);
    expect(spoken).toEqual(['Fala, visitante!', 'Fala, visitante!']);
    director.pause();
    director.ask('três', 'c');
    await run(5000);
    expect(spoken).toHaveLength(2);
    expect(director.getState().status).toBe('pausado');
    director.start();
    await run(10);
    expect(spoken).toHaveLength(3);
  });

  it('tribunal com dois bonecos: a IA escreve acusação e defesa, nessa ordem', async () => {
    const two: SlotInfo[] = [...slots, { label: 'Defesa', name: 'Bia', persona: '', phrases: [] }];
    const ai = async () => ({ ok: true as const, falas: [{ vaga: 1, texto: 'Inocente!' }, { vaga: 0, texto: 'Culpada!' }], ms: 5, modelo: 'm' });
    const { director, spoken } = setup({ ai, config: { format: 'tribunal', slots: two, voices: [null, null] } });
    director.start();
    director.handleEvent({ type: 'comment', username: 'lu', text: '!confesso comi a pizza' });
    await run(10);
    expect(spoken).toEqual(['Culpada!']);
    await run(1500);
    expect(spoken).toEqual(['Culpada!', 'Inocente!']);
  });

  it('trocar de quadro descarta pedidos do chat, mas mantém presentes', () => {
    const { director } = setup();
    director.handleEvent({ type: 'comment', username: 'lu', text: '!pergunta oi' });
    director.handleEvent({ type: 'gift', username: 'rafa', gift: 'escudo' });
    director.setConfig({ format: 'duelo' });
    expect(director.getState().queue.map((r) => r.kind)).toEqual(['presente']);
  });
});
