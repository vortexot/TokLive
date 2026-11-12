// Geração de eventos aleatórios para o modo automático do simulador.
// Tudo aqui é sintético; os comentários são frases curtas inventadas.

import { GIFTS } from '../domain/gifts';
import { pick, pickWeighted, randInt, type Rng } from '../domain/prng';
import type { LiveEvent } from '../domain/types';

const COMMENTS = [
  'bora!',
  'que corrida boa',
  'vai vai vai',
  'torcendo pelo meu amigo',
  'essa pista é difícil',
  'primeiro!',
  'gg',
  'quem ganha essa?',
  'salve de Recife',
  'o portão fechou na cara',
  'quero ver o turbo',
  'que personagem maneiro',
  '!entrar',
  '!entrar',
  '!entrar',
  '!voto 1',
  '!voto 2',
];

export function randomLiveEvent(rng: Rng): LiveEvent {
  const kind = pickWeighted<LiveEvent['type']>(rng, [
    { value: 'like', weight: 46 },
    { value: 'comment', weight: 26 },
    { value: 'join', weight: 9 },
    { value: 'follow', weight: 8 },
    { value: 'gift', weight: 7 },
    { value: 'share', weight: 4 },
  ]);
  switch (kind) {
    case 'like':
      return { type: 'like', count: rng() < 0.06 ? randInt(rng, 120, 320) : randInt(rng, 3, 40) };
    case 'comment':
      return { type: 'comment', text: pick(rng, COMMENTS) };
    case 'gift':
      return { type: 'gift', gift: pickWeighted(rng, GIFTS.map((g) => ({ value: g.id, weight: { faisca: 60, escudo: 20, foguete: 15, meteoro: 5 }[g.id] }))) };
    case 'follow':
      return { type: 'follow' };
    case 'share':
      return { type: 'share' };
    default:
      return { type: 'join' };
  }
}

/** Quantos eventos disparar neste intervalo, dado o ritmo (eventos por segundo). */
export function eventsForInterval(rng: Rng, ratePerSecond: number, intervalSeconds: number): number {
  const expected = ratePerSecond * intervalSeconds;
  const whole = Math.floor(expected);
  return whole + (rng() < expected - whole ? 1 : 0);
}
