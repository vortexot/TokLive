// Nível a partir de XP. Curva quadrática: cada nível pede mais XP que o anterior.

const BASE = 60;

export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return BASE * (l - 1) ** 2;
}

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / BASE)) + 1;
}

export interface LevelProgress {
  level: number;
  current: number;
  needed: number;
  ratio: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const needed = ceil - floor;
  const current = Math.max(0, xp - floor);
  return { level, current, needed, ratio: needed > 0 ? Math.min(1, current / needed) : 1 };
}
