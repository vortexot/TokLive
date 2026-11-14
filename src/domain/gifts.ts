// Presentes SIMULADOS. Os nomes e valores são inventados para a demonstração
// e não correspondem ao catálogo real de presentes do TikTok.

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
  { id: 'escudo', name: 'Escudo', value: 15, power: 'escudo', powerLabel: 'Escudo', durationSec: 6, effect: 'Ignora obstáculos por 6 s' },
  { id: 'foguete', name: 'Foguete', value: 30, power: 'impulso', powerLabel: 'Impulso', durationSec: 5, effect: 'Velocidade extra por 5 s' },
  { id: 'meteoro', name: 'Meteoro', value: 150, power: 'abalo', powerLabel: 'Abalo', durationSec: 1.4, effect: 'Atordoa os rivais por 1,4 s' },
];

export function getGift(id: GiftId): GiftDef {
  return GIFTS.find((g) => g.id === id) as GiftDef;
}
