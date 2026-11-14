// Presentes do jogo. Os nomes e valores são do TokArena e não são os do catálogo do TikTok:
// um presente real vira um destes pela faixa de diamantes (veja GIFT_TIERS em services/liveEvents.ts).

import type { GiftId } from './types';

export type GiftPower = 'impulso' | 'escudo' | 'abalo';

export interface GiftDef {
  id: GiftId;
  name: string;
  value: number;
  power: GiftPower;
  powerLabel: string;
  durationSec: number;
  effect: string;
}

export const GIFTS: readonly GiftDef[] = [
  { id: 'faisca', name: 'Faísca', value: 1, power: 'impulso', powerLabel: 'Impulso curto', durationSec: 2.5, effect: 'Velocidade extra por 2,5 s' },
  { id: 'escudo', name: 'Escudo', value: 15, power: 'escudo', powerLabel: 'Escudo', durationSec: 6, effect: 'Protege de obstáculos, quedas e eliminações por 6 s' },
  { id: 'foguete', name: 'Foguete', value: 30, power: 'impulso', powerLabel: 'Impulso', durationSec: 5, effect: 'Velocidade extra por 5 s' },
  { id: 'meteoro', name: 'Meteoro', value: 150, power: 'abalo', powerLabel: 'Abalo', durationSec: 1.4, effect: 'Paralisa os rivais por 1,4 s' },
];

export function getGift(id: GiftId): GiftDef {
  return GIFTS.find((g) => g.id === id) as GiftDef;
}
