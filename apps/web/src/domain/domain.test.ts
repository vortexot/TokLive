import { describe, expect, it } from 'vitest';
import { combinationCount, describeCharacter, generateCharacter } from './characters';
import { defaultGameConfigs, GAMES, isPlayable, sanitizeGameConfig } from './games';
import { levelFromXp, levelProgress, xpForLevel } from './leveling';
import { generateUsername, uniqueUsername } from './names';
import { createRng, hashNoise } from './prng';

describe('personagens procedurais', () => {
  it('a mesma semente gera sempre o mesmo personagem', () => {
    expect(generateCharacter('lu_turbo')).toEqual(generateCharacter('lu_turbo'));
  });

  it('sementes diferentes variam a aparência', () => {
    const looks = new Set(
      Array.from({ length: 200 }, (_, i) => {
        const c = generateCharacter(`viewer-${i}`);
        return [c.skin, c.hairStyle, c.hairColor, c.topColor, c.accessory].join('|');
      }),
    );
    expect(looks.size).toBeGreaterThan(150);
  });

  it('respeita as regras de compatibilidade entre cabelo e acessório', () => {
    for (let i = 0; i < 600; i++) {
      const c = generateCharacter(`compat-${i}`);
      const hatLike = c.accessory === 'bone' || c.accessory === 'coroa' || c.accessory === 'faixa';
      if (hatLike) expect(['moicano', 'coque']).not.toContain(c.hairStyle);
      if (c.accessory === 'coroa') expect(c.hairStyle).not.toBe('careca');
      expect(c.accessoryColor).not.toBe(c.topColor);
    }
  });

  it('descreve os itens equipados e lista o acessório só quando existe', () => {
    const base = generateCharacter('itens');
    const items = describeCharacter({ ...base, accessory: 'nenhum' });
    expect(items.map((i) => i.slot)).toEqual(['Pele', 'Cabelo', 'Roupa', 'Calça']);
    const withHat = describeCharacter({ ...base, accessory: 'bone', hairStyle: 'curto' });
    expect(withHat.at(-1)).toMatchObject({ slot: 'Acessório', label: 'Boné' });
  });

  it('o gerador alcança um espaço grande de combinações', () => {
    expect(combinationCount()).toBeGreaterThan(1_000_000);
  });
});

describe('nomes sintéticos', () => {
  it('são válidos para o formato de usuário e únicos', () => {
    const rng = createRng('nomes');
    const taken = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const name = uniqueUsername(rng, taken);
      expect(name).toMatch(/^[a-z0-9._]{2,24}$/);
      expect(taken.has(name)).toBe(false);
      taken.add(name);
    }
    expect(generateUsername(createRng(1))).toBe(generateUsername(createRng(1)));
  });
});

describe('níveis', () => {
  it('sobem de forma monotônica e a barra de progresso fica entre 0 e 1', () => {
    let last = 0;
    for (let xp = 0; xp < 4000; xp += 37) {
      const level = levelFromXp(xp);
      expect(level).toBeGreaterThanOrEqual(last);
      last = level;
      const p = levelProgress(xp);
      expect(p.ratio).toBeGreaterThanOrEqual(0);
      expect(p.ratio).toBeLessThanOrEqual(1);
    }
    expect(levelFromXp(xpForLevel(5))).toBe(5);
    expect(levelFromXp(xpForLevel(5) - 1)).toBe(4);
  });
});

describe('catálogo de jogos', () => {
  it('traz os seis jogos e só a corrida é jogável', () => {
    expect(GAMES).toHaveLength(6);
    expect(GAMES.filter((g) => isPlayable(g.id)).map((g) => g.id)).toEqual(['corrida']);
  });

  it('corrige configurações inválidas para os limites do jogo', () => {
    const fixed = sanitizeGameConfig('corrida', { durationSec: 17, maxParticipants: 999, difficulty: 'caotico' as never });
    expect(fixed.durationSec).toBe(90);
    expect(fixed.maxParticipants).toBe(30);
    expect(fixed.difficulty).toBe('normal');
    expect(sanitizeGameConfig('corrida', { maxParticipants: 1 }).maxParticipants).toBe(4);
  });

  it('cada configuração padrão cobre todas as regras do jogo', () => {
    const all = defaultGameConfigs();
    for (const game of GAMES) {
      expect(Object.keys(all[game.id].rules).sort()).toEqual(game.rules.map((r) => r.id).sort());
    }
  });
});

describe('ruído determinístico', () => {
  it('é estável e fica em [0, 1)', () => {
    expect(hashNoise(7, 3, 5)).toBe(hashNoise(7, 3, 5));
    for (let i = 0; i < 500; i++) {
      const n = hashNoise(99, i, i * 3);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});
