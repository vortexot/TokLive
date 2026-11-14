// Geração procedural de personagens.
// Um personagem é só uma CharacterSpec derivada de uma semente: o que se persiste é a semente.
// O desenho (SVG 2D e malha 3D) é produzido a partir da spec por quem for renderizar.

import { createRng, pick, pickWeighted, type Rng } from './prng';
import type { Accessory, CharacterSpec, HairStyle, TopStyle } from './types';

interface Swatch {
  name: string;
  hex: string;
}

export const SKIN_TONES: readonly Swatch[] = [
  { name: 'Claro', hex: '#f2d0b5' },
  { name: 'Bege', hex: '#e3b58f' },
  { name: 'Dourado', hex: '#d39b6c' },
  { name: 'Oliva', hex: '#b97e52' },
  { name: 'Caramelo', hex: '#9c6a44' },
  { name: 'Castanho', hex: '#7b4f32' },
  { name: 'Ébano', hex: '#5a3824' },
  { name: 'Profundo', hex: '#3f2819' },
];

const HAIR_COLORS: readonly { value: Swatch; weight: number }[] = [
  { value: { name: 'Preto', hex: '#1a1412' }, weight: 30 },
  { value: { name: 'Castanho', hex: '#4a2f1e' }, weight: 26 },
  { value: { name: 'Loiro', hex: '#d9b15a' }, weight: 10 },
  { value: { name: 'Ruivo', hex: '#b5472a' }, weight: 7 },
  { value: { name: 'Grafite', hex: '#5b5f69' }, weight: 6 },
  { value: { name: 'Branco', hex: '#e4e4e8' }, weight: 4 },
  { value: { name: 'Vermelho', hex: '#e32636' }, weight: 6 },
  { value: { name: 'Azul', hex: '#2e6fdb' }, weight: 5 },
  { value: { name: 'Rosa', hex: '#e86aa6' }, weight: 4 },
  { value: { name: 'Verde', hex: '#2fae6b' }, weight: 2 },
];

const TOP_COLORS: readonly Swatch[] = [
  { name: 'Preto', hex: '#1f1f24' },
  { name: 'Branco', hex: '#ededf0' },
  { name: 'Vermelho', hex: '#e32636' },
  { name: 'Cinza', hex: '#6f7280' },
  { name: 'Azul-marinho', hex: '#1e3a6b' },
  { name: 'Verde', hex: '#2f8f5b' },
  { name: 'Amarelo', hex: '#e2b33c' },
  { name: 'Roxo', hex: '#6a45b8' },
  { name: 'Laranja', hex: '#e26f2c' },
];

const BOTTOM_COLORS: readonly Swatch[] = [
  { name: 'Preto', hex: '#17171b' },
  { name: 'Jeans', hex: '#2c4a7c' },
  { name: 'Cinza', hex: '#4a4d58' },
  { name: 'Bege', hex: '#b9a07a' },
  { name: 'Grafite', hex: '#2b2d35' },
  { name: 'Vinho', hex: '#6d1a28' },
];

const SHOE_COLORS: readonly string[] = ['#f5f5f5', '#17171b', '#e32636', '#a1a1aa', '#e2b33c'];
const ACCESSORY_COLORS: readonly string[] = ['#e32636', '#17171b', '#f5f5f5', '#e2b33c', '#2e6fdb', '#6a45b8'];

export const HAIR_LABELS: Record<HairStyle, string> = {
  curto: 'Curto',
  topete: 'Topete',
  longo: 'Longo',
  coque: 'Coque',
  moicano: 'Moicano',
  careca: 'Sem cabelo',
  cacheado: 'Cacheado',
};

export const TOP_LABELS: Record<TopStyle, string> = {
  camiseta: 'Camiseta',
  moletom: 'Moletom',
  'camisa-time': 'Camisa de time',
  regata: 'Regata',
};

export const ACCESSORY_LABELS: Record<Accessory, string> = {
  nenhum: 'Nenhum',
  bone: 'Boné',
  oculos: 'Óculos',
  faixa: 'Faixa',
  mochila: 'Mochila',
  coroa: 'Coroa',
  fone: 'Fone de ouvido',
};

const HAIR_STYLES: readonly { value: HairStyle; weight: number }[] = [
  { value: 'curto', weight: 20 },
  { value: 'topete', weight: 16 },
  { value: 'longo', weight: 16 },
  { value: 'coque', weight: 11 },
  { value: 'moicano', weight: 8 },
  { value: 'careca', weight: 6 },
  { value: 'cacheado', weight: 14 },
];

const TOP_STYLES: readonly TopStyle[] = ['camiseta', 'camiseta', 'moletom', 'camisa-time', 'regata'];

const ACCESSORIES: readonly { value: Accessory; weight: number }[] = [
  { value: 'nenhum', weight: 34 },
  { value: 'bone', weight: 14 },
  { value: 'oculos', weight: 16 },
  { value: 'faixa', weight: 9 },
  { value: 'mochila', weight: 13 },
  { value: 'fone', weight: 11 },
  { value: 'coroa', weight: 3 },
];

/** Regras de compatibilidade: evita combinações que o desenho não sustenta. */
function reconcile(spec: CharacterSpec, rng: Rng): CharacterSpec {
  const next = { ...spec };
  const hatLike = next.accessory === 'bone' || next.accessory === 'coroa' || next.accessory === 'faixa';
  if (hatLike && (next.hairStyle === 'moicano' || next.hairStyle === 'coque')) {
    next.hairStyle = pick(rng, ['curto', 'longo', 'cacheado'] as const);
  }
  if (next.accessory === 'coroa' && next.hairStyle === 'careca') next.hairStyle = 'curto';
  return next;
}

export function generateCharacter(seed: string): CharacterSpec {
  const rng = createRng(`personagem:${seed}`);
  const topColor = pick(rng, TOP_COLORS).hex;
  const spec: CharacterSpec = {
    seed,
    version: 1,
    skin: pick(rng, SKIN_TONES).hex,
    hairStyle: pickWeighted(rng, HAIR_STYLES),
    hairColor: pickWeighted(rng, HAIR_COLORS).hex,
    topStyle: pick(rng, TOP_STYLES),
    topColor,
    bottomColor: pick(rng, BOTTOM_COLORS).hex,
    shoeColor: pick(rng, SHOE_COLORS),
    accessory: pickWeighted(rng, ACCESSORIES),
    accessoryColor: pick(rng, ACCESSORY_COLORS),
  };
  // Evita acessório invisível: a cor do acessório nunca é igual à da roupa.
  if (spec.accessoryColor === spec.topColor) spec.accessoryColor = '#17171b';
  return reconcile(spec, rng);
}

function nameOf(list: readonly Swatch[], hex: string): string {
  return list.find((s) => s.hex === hex)?.name ?? 'Personalizado';
}

export interface EquippedItem {
  slot: string;
  label: string;
  swatch: string;
}

/** Itens legíveis do personagem, para galeria e detalhes. */
export function describeCharacter(spec: CharacterSpec): EquippedItem[] {
  const hairName = HAIR_COLORS.find((c) => c.value.hex === spec.hairColor)?.value.name ?? 'Personalizado';
  const items: EquippedItem[] = [
    { slot: 'Pele', label: nameOf(SKIN_TONES, spec.skin), swatch: spec.skin },
    { slot: 'Cabelo', label: `${HAIR_LABELS[spec.hairStyle]} · ${hairName}`, swatch: spec.hairColor },
    { slot: 'Roupa', label: `${TOP_LABELS[spec.topStyle]} · ${nameOf(TOP_COLORS, spec.topColor)}`, swatch: spec.topColor },
    { slot: 'Calça', label: nameOf(BOTTOM_COLORS, spec.bottomColor), swatch: spec.bottomColor },
  ];
  if (spec.accessory !== 'nenhum') {
    items.push({ slot: 'Acessório', label: ACCESSORY_LABELS[spec.accessory], swatch: spec.accessoryColor });
  }
  return items;
}

/** Quantidade de combinações distintas que o gerador alcança (sem contar as regras de compatibilidade). */
export function combinationCount(): number {
  return (
    SKIN_TONES.length *
    HAIR_STYLES.length *
    HAIR_COLORS.length *
    TOP_STYLES.length *
    TOP_COLORS.length *
    BOTTOM_COLORS.length *
    SHOE_COLORS.length *
    ACCESSORIES.length *
    ACCESSORY_COLORS.length
  );
}
