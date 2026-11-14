// Catálogo de minigames. Apenas a corrida de obstáculos é priorizada nesta etapa;
// os demais aparecem no catálogo como "em desenvolvimento" e não iniciam partida.

import type { Difficulty, GameCategory, GameConfig, GameDef, GameId } from './types';

export const CATEGORY_LABELS: Record<GameCategory, string> = {
  corrida: 'Corrida',
  sobrevivencia: 'Sobrevivência',
  competicao: 'Competição',
  minigames: 'Minigames',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
};

function config(durationSec: number, maxParticipants: number, rules: GameDef['rules']): GameConfig {
  return {
    durationSec,
    maxParticipants,
    difficulty: 'normal',
    rules: Object.fromEntries(rules.map((r) => [r.id, r.default])),
  };
}

const RACE_RULES: GameDef['rules'] = [
  {
    id: 'entrada-por-comentario',
    label: 'Entrada por comentário',
    hint: 'O espectador entra na fila ao comentar !entrar.',
    default: true,
  },
  {
    id: 'completar-fila',
    label: 'Completar a fila com participantes recentes',
    hint: 'Se faltar gente, a corrida chama participantes que já têm personagem.',
    default: true,
  },
  {
    id: 'turbo-curtidas',
    label: 'Turbo coletivo ao bater a meta de curtidas',
    hint: 'Quando a barra de curtidas enche, todos os corredores ganham velocidade por alguns segundos.',
    default: true,
  },
  {
    id: 'poderes-presentes',
    label: 'Presentes ativam poderes',
    hint: 'Impulso, escudo e outros efeitos para o personagem de quem enviou o presente.',
    default: true,
  },
];

function futureRules(entryLabel: string): GameDef['rules'] {
  return [
    { id: 'entrada-por-comentario', label: entryLabel, hint: 'Configuração salva para quando o jogo estiver disponível.', default: true },
    { id: 'poderes-presentes', label: 'Presentes ativam poderes', hint: 'Configuração salva para quando o jogo estiver disponível.', default: true },
  ];
}

export const GAMES: readonly GameDef[] = [
  {
    id: 'corrida',
    name: 'Corrida de obstáculos',
    summary: 'Portões, blocos e pêndulos entre o grid e a linha de chegada.',
    description:
      'Os personagens largam juntos numa pista com portões que abrem e fecham, blocos e pêndulos. Quem tropeça perde ritmo. Curtidas enchem o turbo coletivo e presentes dão impulso e escudo ao personagem de quem enviou.',
    categories: ['corrida', 'competicao'],
    availability: 'demo',
    playersLabel: 'Até 30 jogadores',
    limits: { minParticipants: 4, maxParticipants: 30 },
    durations: [60, 90, 120, 180],
    rules: RACE_RULES,
    defaultConfig: config(90, 24, RACE_RULES),
  },
  {
    id: 'chao-de-lava',
    name: 'Chão de lava',
    summary: 'A arena afunda em lava. Fique em pé até o fim.',
    description:
      'Plataformas somem em ondas e a lava sobe. Cada queda elimina o personagem; o último de pé vence a rodada.',
    categories: ['sobrevivencia', 'minigames'],
    availability: 'desenvolvimento',
    playersLabel: 'Até 40 jogadores',
    limits: { minParticipants: 4, maxParticipants: 40 },
    durations: [60, 90, 120],
    rules: futureRules('Entrada por comentário'),
    defaultConfig: config(90, 30, futureRules('Entrada por comentário')),
  },
  {
    id: 'batalha-empurroes',
    name: 'Batalha de empurrões',
    summary: 'Empurre os rivais para fora da plataforma.',
    description:
      'Uma plataforma que encolhe a cada rodada. Os personagens se empurram até restar um. Presentes dão força extra.',
    categories: ['competicao'],
    availability: 'desenvolvimento',
    playersLabel: 'Até 16 jogadores',
    limits: { minParticipants: 4, maxParticipants: 16 },
    durations: [60, 90, 120],
    rules: futureRules('Entrada por comentário'),
    defaultConfig: config(90, 12, futureRules('Entrada por comentário')),
  },
  {
    id: 'batatinha',
    name: 'Batatinha frita 1, 2, 3',
    summary: 'Corra no verde, congele no vermelho.',
    description:
      'Um sinal alterna entre verde e vermelho. Quem se mexe no vermelho é eliminado. Os comentários podem sabotar ou ajudar.',
    categories: ['sobrevivencia', 'minigames'],
    availability: 'desenvolvimento',
    playersLabel: 'Até 40 jogadores',
    limits: { minParticipants: 4, maxParticipants: 40 },
    durations: [60, 90, 120, 180],
    rules: futureRules('Entrada por comentário'),
    defaultConfig: config(120, 30, futureRules('Entrada por comentário')),
  },
  {
    id: 'futebol',
    name: 'Futebol maluco',
    summary: 'Dois times, uma bola e física exagerada.',
    description:
      'Os seguidores são divididos em dois times e disputam uma bola com física exagerada. Curtidas viram força de chute.',
    categories: ['competicao', 'minigames'],
    availability: 'desenvolvimento',
    playersLabel: '2 times de até 10',
    limits: { minParticipants: 4, maxParticipants: 20 },
    durations: [90, 120, 180],
    rules: futureRules('Escolha de time por comentário'),
    defaultConfig: config(120, 16, futureRules('Escolha de time por comentário')),
  },
  {
    id: 'plataformas',
    name: 'Plataformas desaparecendo',
    summary: 'O chão some a cada passo. Pense antes de pular.',
    description:
      'Uma grade de plataformas que desaparece depois de pisada. Cada rodada acelera o desaparecimento.',
    categories: ['sobrevivencia', 'minigames'],
    availability: 'desenvolvimento',
    playersLabel: 'Até 30 jogadores',
    limits: { minParticipants: 4, maxParticipants: 30 },
    durations: [60, 90, 120],
    rules: futureRules('Entrada por comentário'),
    defaultConfig: config(90, 24, futureRules('Entrada por comentário')),
  },
];

export const GAME_BY_ID: Record<GameId, GameDef> = Object.fromEntries(GAMES.map((g) => [g.id, g])) as Record<
  GameId,
  GameDef
>;

export function getGame(id: GameId): GameDef {
  return GAME_BY_ID[id];
}

export function isPlayable(id: GameId): boolean {
  return GAME_BY_ID[id].availability === 'demo';
}

export function defaultGameConfigs(): Record<GameId, GameConfig> {
  return Object.fromEntries(
    GAMES.map((g) => [g.id, { ...g.defaultConfig, rules: { ...g.defaultConfig.rules } }]),
  ) as Record<GameId, GameConfig>;
}

/** Corrige uma configuração para os limites do jogo (valores salvos antigos ou inválidos). */
export function sanitizeGameConfig(id: GameId, input: Partial<GameConfig> | undefined): GameConfig {
  const def = GAME_BY_ID[id];
  const base = def.defaultConfig;
  const duration = def.durations.includes(input?.durationSec ?? -1) ? (input!.durationSec as number) : base.durationSec;
  const max = Math.round(input?.maxParticipants ?? base.maxParticipants);
  const difficulty: Difficulty =
    input?.difficulty === 'facil' || input?.difficulty === 'normal' || input?.difficulty === 'dificil'
      ? input.difficulty
      : base.difficulty;
  const rules: Record<string, boolean> = {};
  for (const rule of def.rules) {
    const value = input?.rules?.[rule.id];
    rules[rule.id] = typeof value === 'boolean' ? value : rule.default;
  }
  return {
    durationSec: duration,
    maxParticipants: Math.min(def.limits.maxParticipants, Math.max(def.limits.minParticipants, max)),
    difficulty,
    rules,
  };
}
