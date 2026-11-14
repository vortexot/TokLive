// Compatibilidade com LIVEs grandes: mais de mil pessoas interagindo ao mesmo tempo.
// Os limites são folgados de propósito (para não falhar em máquinas lentas); o que importa é o custo não explodir.

import { describe, expect, it } from 'vitest';
import { createRng } from './domain/prng';
import { createLocalDataService } from './services/dataService';
import { createApp, MAX_STORED_PARTICIPANTS } from './state/app';
import { slimSnapshot, toSnapshot } from './state/channel';

const now = () => Date.UTC(2026, 10, 12, 15, 0, 0);

async function bigApp(viewers: number) {
  const app = createApp({ role: 'panel', persist: false, now, rng: createRng(`big${viewers}`), dataService: createLocalDataService({ latencyMs: 0, now }) });
  await app.actions.bootstrap();
  for (let i = 0; i < viewers; i++) app.actions.emit({ type: 'follow', username: `viewer${i}` });
  return app;
}

describe('LIVE com mais de mil pessoas', () => {
  it('cria 5.000 participantes e processa 3.000 eventos de tipos misturados em poucos segundos', async () => {
    const app = await bigApp(5000);
    expect(app.store.getState().participants.length).toBeGreaterThanOrEqual(5000);
    app.actions.selectGame('corrida');
    const t0 = performance.now();
    for (let i = 0; i < 3000; i++) {
      const who = `viewer${(i * 7) % 5000}`;
      if (i % 4 === 0) app.actions.emit({ type: 'comment', username: who, text: i % 8 === 0 ? '!entrar' : 'oi' });
      else if (i % 4 === 1) app.actions.emit({ type: 'like', username: who, count: 3 });
      else if (i % 4 === 2) app.actions.emit({ type: 'gift', username: who, gift: 'faisca' });
      else app.actions.emit({ type: 'share', username: who });
    }
    expect(performance.now() - t0).toBeLessThan(6000);
  });

  it('a fila respeita o limite mesmo com mil pessoas comentando !entrar, e o aviso de fila cheia não se repete', async () => {
    const app = await bigApp(1200);
    app.actions.selectGame('corrida');
    const max = app.store.getState().gameConfigs.corrida.maxParticipants;
    for (let i = 0; i < 1200; i++) app.actions.emit({ type: 'comment', username: `viewer${i}`, text: '!entrar' });
    const s = app.store.getState();
    expect(s.lobby.length).toBe(max);
    expect(s.toasts.filter((t) => t.title === 'Fila cheia').length).toBeLessThanOrEqual(1);
    expect(new Set(s.lobby).size).toBe(max);
  });

  it('inicia a partida e aplica 1.000 presentes e curtidas sem custo proporcional ao número de participantes', async () => {
    const app = await bigApp(3000);
    app.actions.selectGame('batatinha');
    app.actions.startMatch();
    expect(app.store.getState().match?.racers.length).toBeLessThanOrEqual(30);
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) {
      app.actions.emit({ type: i % 2 ? 'gift' : 'like', username: `viewer${i}`, gift: 'escudo', count: 10 } as never);
    }
    expect(performance.now() - t0).toBeLessThan(4000);
  });

  it('o estado enviado ao overlay tem tamanho fixo, não cresce com a plateia', async () => {
    const small = await bigApp(200);
    const large = await bigApp(10000);
    for (const app of [small, large]) {
      app.actions.selectGame('corrida');
      app.actions.startMatch();
    }
    const size = (a: typeof small) => JSON.stringify(slimSnapshot(toSnapshot(a.store.getState(), 0))).length;
    expect(size(large)).toBeLessThan(120 * 1024);
    expect(size(large) / size(small)).toBeLessThan(1.6);
  });

  it('o que vai para o armazenamento tem teto de participantes', () => {
    expect(MAX_STORED_PARTICIPANTS).toBeLessThanOrEqual(10000);
  });
});
