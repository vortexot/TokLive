// Tradução dos eventos de uma LIVE real para os LiveEvent do motor de estado.
// É puro e sem dependências: o worker, a ponte do Palco e os testes usam o mesmo código.
// Os formatos da biblioteca mudam entre versões, então a leitura é tolerante. A documentação da
// tiktok-live-connector 2.x mostra `user.uniqueId` e `giftDetails`, mas os tipos da 2.5 (protocolo v3)
// trazem `user.displayId`, `gift.name` e `repeatEnd` como número. Aceitamos todos.

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

const text = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

function uniqueId(data: Loose): string | undefined {
  const u = data?.user;
  return text(u?.uniqueId) ?? text(u?.displayId) ?? text(data?.uniqueId) ?? text(u?.userId) ?? text(u?.id);
}

function nickname(data: Loose): string | undefined {
  return text(data?.user?.nickname) ?? text(data?.nickname);
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'string' ? Number(value) : (value as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

/** Quem fez a ação: @ e apelido, sem campos vazios. */
function who(data: Loose): { username?: string; nickname?: string } {
  const out: { username?: string; nickname?: string } = {};
  const u = uniqueId(data);
  const n = nickname(data);
  if (u) out.username = u;
  if (n) out.nickname = n;
  return out;
}

export type WebcastKind = 'chat' | 'gift' | 'like' | 'follow' | 'share' | 'member' | 'streamEnd';

/**
 * Converte uma mensagem da LIVE em zero ou mais eventos do jogo.
 * - Presente em combo (tipo 1): só conta quando o combo termina, e uma vez por repetição (até MAX_GIFT_REPEATS).
 * - Curtida: usa a quantidade do próprio evento.
 * - Mensagens sem usuário identificável são ignoradas (não dá para beneficiar ninguém).
 */
export function normalizeWebcast(kind: WebcastKind, data: Loose): LiveEvent[] {
  switch (kind) {
    case 'chat': {
      const person = who(data);
      const comment = typeof data?.comment === 'string' ? data.comment : typeof data?.text === 'string' ? data.text : '';
      if (!person.username || !comment.trim()) return [];
      return [{ type: 'comment', ...person, text: comment }];
    }
    case 'follow': {
      const person = who(data);
      return person.username ? [{ type: 'follow', ...person }] : [];
    }
    case 'share': {
      const person = who(data);
      return person.username ? [{ type: 'share', ...person }] : [];
    }
    case 'member': {
      const person = who(data);
      return person.username ? [{ type: 'enter', ...person }] : [];
    }
    case 'like': {
      const person = who(data);
      const count = Math.max(0, Math.floor(toNumber(data?.likeCount, 1)));
      return person.username && count > 0 ? [{ type: 'like', ...person, count }] : [];
    }
    case 'gift': {
      const person = who(data);
      if (!person.username) return [];
      const details = data?.giftDetails ?? {};
      const giftInfo = data?.gift ?? {};
      const extended = data?.extendedGiftInfo ?? {};
      const streakable = toNumber(details.giftType ?? giftInfo.type ?? data?.giftType) === 1;
      // Combo em andamento: `repeatEnd` vem como false ou 0 até o combo acabar.
      if (streakable && !data?.repeatEnd) return [];
      const unit = toNumber(details.diamondCount ?? giftInfo.diamondCount ?? extended.diamond_count ?? data?.diamondCount);
      const repeats = streakable ? Math.min(MAX_GIFT_REPEATS, Math.max(1, Math.floor(toNumber(data?.repeatCount, 1)))) : 1;
      const gift = giftFromDiamonds(unit);
      const giftName = text(details.giftName) ?? text(giftInfo.name) ?? text(extended.name) ?? text(data?.giftName);
      const base = { type: 'gift' as const, ...person, gift, diamonds: unit, ...(giftName ? { giftName } : {}) };
      return Array.from({ length: repeats }, () => ({ ...base }));
    }
    case 'streamEnd':
      return [{ type: 'live-end' }];
  }
}
