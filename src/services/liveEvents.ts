// Tradução dos eventos de uma LIVE real para os LiveEvent do motor de estado.
// É puro e sem dependências: o worker (que fala com o TikTok) e os testes usam o mesmo código.
// Os formatos da biblioteca mudam entre versões, então a leitura é tolerante: aceita `user.uniqueId` e `uniqueId`.

import type { GiftId, LiveEvent } from '../domain/types';

/** Faixas de valor (em diamantes) que mapeiam um presente real para um dos presentes do jogo. */
export const GIFT_TIERS: readonly { min: number; gift: GiftId }[] = [
  { min: 100, gift: 'meteoro' },
  { min: 30, gift: 'foguete' },
  { min: 10, gift: 'escudo' },
  { min: 0, gift: 'faisca' },
];

export function giftFromDiamonds(diamonds: number): GiftId {
  const value = Number.isFinite(diamonds) ? diamonds : 0;
  return (GIFT_TIERS.find((t) => value >= t.min) ?? GIFT_TIERS[GIFT_TIERS.length - 1]!).gift;
}

/** Quantas vezes um combo de presentes repetidos conta no máximo. */
export const MAX_GIFT_REPEATS = 5;

type Loose = Record<string, any> | null | undefined;

function uniqueId(data: Loose): string | undefined {
  const raw = data?.user?.uniqueId ?? data?.uniqueId ?? data?.user?.userId;
  return typeof raw === 'string' && raw.length ? raw : undefined;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'string' ? Number(value) : (value as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

export type WebcastKind = 'chat' | 'gift' | 'like' | 'follow' | 'share' | 'streamEnd';

/**
 * Converte uma mensagem da LIVE em zero ou mais eventos do jogo.
 * - Presente em combo (tipo 1): só conta quando o combo termina, e uma vez por repetição (até MAX_GIFT_REPEATS).
 * - Curtida: usa a quantidade do próprio evento.
 * - Mensagens sem usuário identificável são ignoradas (não dá para beneficiar ninguém).
 */
export function normalizeWebcast(kind: WebcastKind, data: Loose): LiveEvent[] {
  switch (kind) {
    case 'chat': {
      const username = uniqueId(data);
      const text = typeof data?.comment === 'string' ? data.comment : typeof data?.text === 'string' ? data.text : '';
      if (!username || !text.trim()) return [];
      return [{ type: 'comment', username, text }];
    }
    case 'follow': {
      const username = uniqueId(data);
      return username ? [{ type: 'follow', username }] : [];
    }
    case 'share': {
      const username = uniqueId(data);
      return username ? [{ type: 'share', username }] : [];
    }
    case 'like': {
      const username = uniqueId(data);
      const count = Math.max(0, Math.floor(toNumber(data?.likeCount, 1)));
      return username && count > 0 ? [{ type: 'like', username, count }] : [];
    }
    case 'gift': {
      const username = uniqueId(data);
      if (!username) return [];
      const details = data?.giftDetails ?? data?.extendedGiftInfo ?? {};
      const streakable = toNumber(details.giftType ?? data?.giftType) === 1;
      if (streakable && data?.repeatEnd === false) return [];
      const unit = toNumber(details.diamondCount ?? details.diamond_count ?? data?.diamondCount);
      const repeats = streakable ? Math.min(MAX_GIFT_REPEATS, Math.max(1, Math.floor(toNumber(data?.repeatCount, 1)))) : 1;
      const gift = giftFromDiamonds(unit);
      return Array.from({ length: repeats }, () => ({ type: 'gift' as const, username, gift }));
    }
    case 'streamEnd':
      return [{ type: 'live-end' }];
  }
}
