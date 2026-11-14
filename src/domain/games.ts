// Catálogo de minigames. Todos os jogos iniciam partida; as regras de cada um ficam em race.ts e arena.ts.

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

function arenaRules(entryLabel: string, powers: string, turbo: string): GameDef['rules'] {
  return [
    { id: 'entrada-por-comentario', label: entryLabel, hint: 'O espectador entra na fila ao comentar !entrar.', default: true },
    { id: 'completar-fila', label: 'Completar a fila com participantes recentes', hint: 'Se faltar gente, a partida chama participantes que já têm personagem.', default: true },
    { id: 'turbo-curtidas', label: 'Turbo coletivo ao bater a meta de curtidas', hint: turbo, default: true },
    { id: 'poderes-presentes', label: 'Presentes ativam poderes', hint: powers, default: true },
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
      'Casas da arena avisam, piscam e afundam na lava. Quem estiver nelas cai e está fora. O último em pé vence; presentes dão escudo e impulso.',
    categories: ['sobrevivencia', 'minigames'],
    availability: 'demo',
    playersLabel: 'Até 40 jogadores',
    limits: { minParticipants: 4, maxParticipants: 40 },
    durations: [60, 90, 120],
    rules: arenaRules('Entrada por comentário', 'Escudo faz o personagem flutuar sobre a lava, impulso acelera a fuga e o abalo paralisa os rivais.', 'Quando a barra enche, todos correm mais rápido por alguns segundos.'),
    defaultConfig: config(90, 30, arenaRules('Entrada por comentário', 'Escudo faz o personagem flutuar sobre a lava, impulso acelera a fuga e o abalo paralisa os rivais.', 'Quando a barra enche, todos correm mais rápido por alguns segundos.')),
  },
  {
    id: 'batalha-empurroes',
    name: 'Batalha de empurrões',
    summary: 'Empurre os rivais para fora da plataforma.',
    description:
      'Uma plataforma redonda que encolhe com o tempo. Os personagens se empurram até restar um. Quem sai da borda está eliminado.',
    categories: ['competicao'],
    availability: 'demo',
    playersLabel: 'Até 16 jogadores',
    limits: { minParticipants: 4, maxParticipants: 16 },
    durations: [60, 90, 120],
    rules: arenaRules('Entrada por comentário', 'Impulso dá empurrões mais fortes, escudo impede ser empurrado e o abalo paralisa os rivais.', 'Quando a barra enche, todos se movem mais rápido por alguns segundos.'),
    defaultConfig: config(90, 12, arenaRules('Entrada por comentário', 'Impulso dá empurrões mais fortes, escudo impede ser empurrado e o abalo paralisa os rivais.', 'Quando a barra enche, todos se movem mais rápido por alguns segundos.')),
  },
  {
    id: 'batatinha',
    name: 'Batatinha frita 1, 2, 3',
    summary: 'Corra no verde, congele no vermelho.',
    description:
      'Um sinal alterna entre verde e vermelho. Quem ainda está se mexendo no vermelho é eliminado. Chega primeiro quem cruzar a linha de chegada.',
    categories: ['sobrevivencia', 'minigames'],
    availability: 'demo',
    playersLabel: 'Até 30 jogadores',
    limits: { minParticipants: 4, maxParticipants: 30 },
    durations: [60, 90, 120, 180],
    rules: arenaRules('Entrada por comentário', 'Escudo salva de ser pego no vermelho, impulso acelera a corrida e o abalo atrasa os rivais.', 'Quando a barra enche, todos correm mais rápido por alguns segundos.'),
    defaultConfig: config(120, 30, arenaRules('Entrada por comentário', 'Escudo salva de ser pego no vermelho, impulso acelera a corrida e o abalo atrasa os rivais.', 'Quando a barra enche, todos correm mais rápido por alguns segundos.')),
  },
  {
    id: 'futebol',
    name: 'Futebol maluco',
    summary: 'Dois times, uma bola e física exagerada.',
    description:
      'Os participantes são divididos em dois times e disputam uma bola num campo com paredes. Vence o time com mais gols.',
    categories: ['competicao', 'minigames'],
    availability: 'demo',
    playersLabel: '2 times de até 10',
    limits: { minParticipants: 4, maxParticipants: 20 },
    durations: [90, 120, 180],
    rules: arenaRules('Entrada por comentário', 'Impulso dá chutes mais fortes, escudo não faz efeito e o abalo paralisa o time rival.', 'Quando a barra enche, todos correm mais rápido e chutam mais forte.'),
    defaultConfig: config(120, 16, arenaRules('Entrada por comentário', 'Impulso dá chutes mais fortes, escudo não faz efeito e o abalo paralisa o time rival.', 'Quando a barra enche, todos correm mais rápido e chutam mais forte.')),
  },
  {
    id: 'plataformas',
    name: 'Plataformas desaparecendo',
    summary: 'O chão some a cada passo. Pense antes de pular.',
    description:
      'Uma ponte de três casas por fileira, e uma delas é falsa. Quem pisa nela cai e revela o caminho para os próximos.',
    categories: ['sobrevivencia', 'minigames'],
    availability: 'demo',
    playersLabel: 'Até 30 jogadores',
    limits: { minParticipants: 4, maxParticipants: 30 },
    durations: [60, 90, 120],
    rules: arenaRules('Entrada por comentário', 'Escudo evita uma queda, impulso acelera os saltos e o abalo paralisa os rivais.', 'Quando a barra enche, todos saltam mais rápido por alguns segundos.'),
    defaultConfig: config(90, 24, arenaRules('Entrada por comentário', 'Escudo evita uma queda, impulso acelera os saltos e o abalo paralisa os rivais.', 'Quando a barra enche, todos saltam mais rápido por alguns segundos.')),
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
