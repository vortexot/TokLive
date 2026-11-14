// Simulação dos jogos de arena: chão de lava, batalha de empurrões, batatinha frita, futebol e plataformas.
// Pura e determinística, como a corrida: a mesma semente produz a mesma partida e nada aqui conhece relógio, rede ou React.
// Cada jogo expõe create (estado inicial), step (avança dt segundos) e order (classificação).

import { clamp, createRng, hashNoise, shuffle } from './prng';
import type { Difficulty, GameId, MatchState, Racer, World } from './types';

export interface ArenaSetup {
  id: string;
  gameId: GameId;
  participantIds: string[];
  durationSec: number;
  difficulty: Difficulty;
  seed: number;
  startedAt?: number;
}

export interface Created {
  racers: Racer[];
  world: World;
  trackLength: number;
}

export interface StepOut {
  racers: Racer[];
  world: World;
  done: boolean;
}

function baseRacer(participantId: string, i: number, seed: number, lane: number): Racer {
  return {
    participantId,
    lane,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speedBase: 1,
    agility: hashNoise(seed, i, 11),
    stunnedUntil: 0,
    boostUntil: 0,
    shieldUntil: 0,
    finishedAt: null,
    position: null,
    hits: 0,
    lastGift: null,
    alive: true,
    outAt: null,
    team: null,
    score: 0,
    cooldownUntil: 0,
    likeCharge: 0,
  };
}

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

/** Multiplicador de velocidade por presente de impulso, turbo coletivo e atordoamento. */
function speedFactor(r: Racer, t: number, turboUntil: number, boost = 1.65): number {
  if (t < r.stunnedUntil) return 0;
  return (t < r.boostUntil ? boost : 1) * (t < turboUntil ? 1.3 : 1);
}

/* ====================================================================== */
/* Chão de lava                                                           */
/* ====================================================================== */

const LAVA_N = 9;
const LAVA_TILE = 2.2;

export function lavaTileCenter(world: Extract<World, { kind: 'lava' }>, index: number): { x: number; y: number } {
  const c = index % world.n;
  const r = Math.floor(index / world.n);
  return { x: (c - (world.n - 1) / 2) * world.tile, y: (r - (world.n - 1) / 2) * world.tile };
}

export function lavaTileAt(world: Extract<World, { kind: 'lava' }>, x: number, y: number): number {
  const c = Math.floor(x / world.tile + world.n / 2);
  const r = Math.floor(y / world.tile + world.n / 2);
  if (c < 0 || r < 0 || c >= world.n || r >= world.n) return -1;
  return r * world.n + c;
}

export type TileState = 'solido' | 'aviso' | 'lava';

export function lavaTileState(world: Extract<World, { kind: 'lava' }>, index: number, t: number): TileState {
  const sink = world.sinkAt[index] ?? 1e9;
  if (t >= sink) return 'lava';
  if (t >= sink - world.warn) return 'aviso';
  return 'solido';
}

function createLava(setup: ArenaSetup): Created {
  const rng = createRng(setup.seed);
  const total = LAVA_N * LAVA_N;
  const fraction = setup.difficulty === 'facil' ? 0.93 : 1;
  const sunk = Math.floor(total * fraction);
  const order = shuffle(rng, Array.from({ length: total }, (_, i) => i));
  const sinkAt = new Array<number>(total).fill(1e9);
  const first = 5;
  const last = Math.max(first + 5, setup.durationSec * 0.88);
  for (let j = 0; j < sunk; j++) sinkAt[order[j] as number] = first + (j / Math.max(1, sunk - 1)) * (last - first);
  const world: Extract<World, { kind: 'lava' }> = { kind: 'lava', n: LAVA_N, tile: LAVA_TILE, sinkAt, warn: 1.5 };

  // Cada jogador começa numa casa que ainda não afunda tão cedo.
  const spawn = shuffle(rng, order.slice().reverse()).slice(0, setup.participantIds.length);
  const racers = setup.participantIds.map((id, i) => {
    const r = baseRacer(id, i, setup.seed, i);
    const tile = spawn[i % spawn.length] as number;
    const c = lavaTileCenter(world, tile);
    r.x = c.x;
    r.y = c.y;
    r.vx = c.x;
    r.vy = c.y;
    return r;
  });
  return { racers, world, trackLength: LAVA_N * LAVA_TILE };
}

function stepLava(prev: MatchState, dt: number): StepOut {
  const world = prev.world as Extract<World, { kind: 'lava' }>;
  const t = prev.t + dt;
  const racers = prev.racers.map((r, i) => {
    if (!r.alive) return r;
    const n = { ...r };
    const shielded = t < r.shieldUntil;
    const here = lavaTileAt(world, r.x, r.y);
    const hereState: TileState = here < 0 ? 'lava' : lavaTileState(world, here, t);
    // Alguns jogadores não percebem o aviso a tempo: é isso que faz a arena ter perdedores.
    const noticed = here >= 0 && hashNoise(prev.seed, i, here) < 0.5 + 0.45 * r.agility;
    const flee = hereState === 'lava' || (hereState === 'aviso' && noticed);

    if (flee) {
      let best = -1;
      let bestD = Infinity;
      for (let k = 0; k < world.sinkAt.length; k++) {
        if (lavaTileState(world, k, t) !== 'solido') continue;
        const c = lavaTileCenter(world, k);
        const d = dist(r.x, r.y, c.x, c.y);
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      }
      if (best >= 0) {
        const c = lavaTileCenter(world, best);
        n.vx = c.x;
        n.vy = c.y;
      }
    } else if (dist(r.x, r.y, r.vx, r.vy) < 0.25) {
      // Passeia pela casa em que está.
      const base = here >= 0 ? lavaTileCenter(world, here) : { x: r.x, y: r.y };
      const slot = Math.floor(t / 1.6);
      n.vx = base.x + (hashNoise(prev.seed, i, slot * 2) - 0.5) * world.tile * 0.7;
      n.vy = base.y + (hashNoise(prev.seed, i, slot * 2 + 1) - 0.5) * world.tile * 0.7;
    }

    const speed = 3.4 * (0.85 + 0.3 * r.agility) * speedFactor(r, t, prev.turboUntil);
    const dx = n.vx - r.x;
    const dy = n.vy - r.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.001 && speed > 0) {
      const step = Math.min(speed * dt, d);
      n.x = r.x + (dx / d) * step;
      n.y = r.y + (dy / d) * step;
    }

    const tile = lavaTileAt(world, n.x, n.y);
    const state: TileState = tile < 0 ? 'lava' : lavaTileState(world, tile, t);
    if (state === 'lava' && !shielded) {
      n.alive = false;
      n.outAt = t;
    }
    return n;
  });
  const alive = racers.filter((r) => r.alive).length;
  return { racers, world, done: alive <= 1 || t >= prev.durationSec };
}

function orderLava(state: MatchState): Racer[] {
  return state.racers.slice().sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    if (a.alive) return b.agility - a.agility;
    return (b.outAt ?? 0) - (a.outAt ?? 0);
  });
}

/* ====================================================================== */
/* Batalha de empurrões                                                   */
/* ====================================================================== */

export function brawlRadius(world: Extract<World, { kind: 'brawl' }>, t: number, durationSec: number): number {
  return world.r0 + (world.r1 - world.r0) * clamp(t / (durationSec * 0.75), 0, 1);
}

function createBrawl(setup: ArenaSetup): Created {
  const rng = createRng(setup.seed);
  const r1 = setup.difficulty === 'facil' ? 3.2 : setup.difficulty === 'dificil' ? 1.9 : 2.5;
  const world: World = { kind: 'brawl', r0: 9, r1 };
  const n = setup.participantIds.length;
  const offset = rng() * Math.PI * 2;
  const racers = setup.participantIds.map((id, i) => {
    const r = baseRacer(id, i, setup.seed, i);
    const angle = offset + (i / n) * Math.PI * 2;
    const radius = 5.2 + (n > 14 ? (i % 2) * 1.6 : 0.8);
    r.x = Math.cos(angle) * radius;
    r.y = Math.sin(angle) * radius;
    r.cooldownUntil = 3 + rng() * 1.5;
    return r;
  });
  return { racers, world, trackLength: 18 };
}

function stepBrawl(prev: MatchState, dt: number): StepOut {
  const world = prev.world as Extract<World, { kind: 'brawl' }>;
  const t = prev.t + dt;
  const radius = brawlRadius(world, t, prev.durationSec);
  const rs = prev.racers.map((r) => ({ ...r }));
  const decay = Math.exp(-3.2 * dt);

  rs.forEach((r, i) => {
    if (!r.alive) return;
    let target: Racer | null = null;
    let best = Infinity;
    for (const o of rs) {
      if (o === r || !o.alive) continue;
      const d = dist(r.x, r.y, o.x, o.y);
      if (d < best) {
        best = d;
        target = o;
      }
    }
    const stunned = t < r.stunnedUntil;
    const speed = 2.7 * (0.9 + 0.2 * r.agility) * speedFactor(r, t, prev.turboUntil, 1.5);
    let dx = 0;
    let dy = 0;
    if (target) {
      dx = (target as Racer).x - r.x;
      dy = (target as Racer).y - r.y;
    }
    const d = Math.hypot(dx, dy) || 1;
    // Perto da borda, quem tem reflexo recua para o centro.
    const edge = Math.hypot(r.x, r.y);
    const careful = r.agility > 0.35 && edge > radius - 1.6;
    if (careful) {
      dx = -r.x;
      dy = -r.y;
    }
    const m = Math.hypot(dx, dy) || 1;
    const move = careful || d > 1.2 ? speed : 0;
    r.x += (dx / m) * move * dt + r.vx * dt;
    r.y += (dy / m) * move * dt + r.vy * dt;
    r.vx *= decay;
    r.vy *= decay;

    if (target && !stunned && best < 1.5 && t >= r.cooldownUntil) {
      const o = target as Racer;
      const ax = o.x - r.x;
      const ay = o.y - r.y;
      const al = Math.hypot(ax, ay) || 1;
      if (t >= o.shieldUntil) {
        const power = (6 + 4 * r.agility) * (t < r.boostUntil ? 1.8 : 1);
        o.vx += (ax / al) * power;
        o.vy += (ay / al) * power;
        r.score += 1;
      }
      r.vx -= (ax / al) * 1.5;
      r.vy -= (ay / al) * 1.5;
      r.cooldownUntil = t + 0.7 + hashNoise(prev.seed, i, Math.floor(t * 2)) * 0.6;
    }

    if (Math.hypot(r.x, r.y) > radius + 0.6) {
      r.alive = false;
      r.outAt = t;
    }
  });
  const alive = rs.filter((r) => r.alive).length;
  return { racers: rs, world, done: alive <= 1 || t >= prev.durationSec };
}

function orderBrawl(state: MatchState): Racer[] {
  return state.racers.slice().sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    if (a.alive) return b.score - a.score || Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y);
    return (b.outAt ?? 0) - (a.outAt ?? 0);
  });
}

/* ====================================================================== */
/* Batatinha frita 1, 2, 3                                                */
/* ====================================================================== */

const FREEZE_LENGTH = 100;

/** Índice da fase no instante t: par é verde, ímpar é vermelho. */
export function freezePhase(world: Extract<World, { kind: 'freeze' }>, t: number): number {
  let i = 0;
  while (i < world.phases.length && t >= (world.phases[i] as number)) i++;
  return i;
}

export function isRedLight(world: Extract<World, { kind: 'freeze' }>, t: number): boolean {
  return freezePhase(world, t) % 2 === 1;
}

function createFreeze(setup: ArenaSetup): Created {
  const rng = createRng(setup.seed);
  const phases: number[] = [];
  let at = 3.5;
  phases.push(at);
  while (at < setup.durationSec + 30) {
    at += 1.6 + rng() * 1.0; // vermelho
    phases.push(at);
    at += 2.4 + rng() * 2.0; // verde
    phases.push(at);
  }
  const world: World = { kind: 'freeze', length: FREEZE_LENGTH, phases };
  const n = setup.participantIds.length;
  const racers = setup.participantIds.map((id, i) => {
    const r = baseRacer(id, i, setup.seed, i);
    r.y = (i - (n - 1) / 2) * 1.5;
    r.speedBase = (FREEZE_LENGTH / (setup.durationSec * 0.5)) * (0.9 + 0.2 * r.agility);
    return r;
  });
  return { racers, world, trackLength: FREEZE_LENGTH };
}

function stepFreeze(prev: MatchState, dt: number): StepOut {
  const world = prev.world as Extract<World, { kind: 'freeze' }>;
  const t = prev.t + dt;
  const phase = freezePhase(world, prev.t);
  const red = phase % 2 === 1;
  const redStart = red ? (world.phases[phase - 1] as number) : 0;
  const since = prev.t - redStart;
  const grace = prev.difficulty === 'facil' ? 0.5 : prev.difficulty === 'dificil' ? 0.28 : 0.38;

  const racers = prev.racers.map((r, i) => {
    if (!r.alive || r.finishedAt !== null) return r;
    const n = { ...r };
    const reaction = 0.08 + 0.5 * (1 - r.agility * 0.8) * hashNoise(prev.seed, i * 7 + 3, phase);
    const shielded = t < r.shieldUntil;
    if (red && since >= grace && reaction > grace && !shielded) {
      n.alive = false;
      n.outAt = t;
      return n;
    }
    const moving = !red || since < reaction;
    const wobble = 1 + (hashNoise(prev.seed, i, Math.floor(t * 3)) - 0.5) * 0.2;
    const f = t < r.stunnedUntil ? 0.2 : (t < r.boostUntil ? 1.5 : 1) * (t < prev.turboUntil ? 1.25 : 1);
    if (moving) {
      const speed = r.speedBase * wobble * f;
      const nx = r.x + speed * dt;
      if (nx >= world.length) {
        n.x = world.length;
        n.finishedAt = t;
      } else {
        n.x = nx;
      }
    }
    return n;
  });
  const done = racers.every((r) => !r.alive || r.finishedAt !== null) || t >= prev.durationSec;
  return { racers, world, done };
}

function orderFreeze(state: MatchState): Racer[] {
  return state.racers.slice().sort((a, b) => {
    const af = a.finishedAt !== null;
    const bf = b.finishedAt !== null;
    if (af && bf) return (a.finishedAt as number) - (b.finishedAt as number);
    if (af !== bf) return af ? -1 : 1;
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    return b.x - a.x;
  });
}

/* ====================================================================== */
/* Futebol maluco                                                         */
/* ====================================================================== */

const FIELD_W = 36;
const FIELD_H = 20;
const GOAL_W = 6;

function homeSpot(team: 0 | 1, k: number, count: number): { x: number; y: number } {
  const dir = team === 0 ? 1 : -1;
  const rows = Math.ceil(count / 4);
  return { x: -dir * (3 + (k % 4) * 3.4), y: (Math.floor(k / 4) - (rows - 1) / 2) * 3.6 };
}

function createSoccer(setup: ArenaSetup): Created {
  const rng = createRng(setup.seed);
  const ids = shuffle(rng, setup.participantIds);
  const count = [0, 0];
  const slot = new Map<string, { team: 0 | 1; k: number }>();
  ids.forEach((id, i) => {
    const team = (i % 2) as 0 | 1;
    slot.set(id, { team, k: count[team] as number });
    count[team] = (count[team] as number) + 1;
  });
  const racers = setup.participantIds.map((id, i) => {
    const r = baseRacer(id, i, setup.seed, i);
    const s = slot.get(id) as { team: 0 | 1; k: number };
    const spot = homeSpot(s.team, s.k, count[s.team] as number);
    r.team = s.team;
    r.x = spot.x;
    r.y = spot.y;
    r.vx = s.k; // índice do jogador no time, usado como posição de formação
    return r;
  });
  const world: World = {
    kind: 'soccer',
    w: FIELD_W,
    h: FIELD_H,
    goal: GOAL_W,
    ball: { x: 0, y: 0, vx: 0, vy: 0 },
    goals: [0, 0],
    lastTouch: null,
    kickoffAt: 2,
  };
  return { racers, world, trackLength: FIELD_W };
}

function stepSoccer(prev: MatchState, dt: number): StepOut {
  const world = prev.world as Extract<World, { kind: 'soccer' }>;
  const t = prev.t + dt;
  const rs = prev.racers.map((r) => ({ ...r }));
  const ball = { ...world.ball };
  const goals: [number, number] = [world.goals[0], world.goals[1]];
  let lastTouch = world.lastTouch;
  let kickoffAt = world.kickoffAt;
  const counts: [number, number] = [rs.filter((r) => r.team === 0).length, rs.filter((r) => r.team === 1).length];

  if (t >= kickoffAt) {
    // Quem está mais perto da bola em cada time vai atrás dela.
    const chaser: [Racer | null, Racer | null] = [null, null];
    const chaserD: [number, number] = [Infinity, Infinity];
    for (const r of rs) {
      if (r.team === null || t < r.stunnedUntil) continue;
      const d = dist(r.x, r.y, ball.x, ball.y);
      if (d < chaserD[r.team]) {
        chaserD[r.team] = d;
        chaser[r.team] = r;
      }
    }
    rs.forEach((r, i) => {
      if (r.team === null) return;
      const dir = r.team === 0 ? 1 : -1;
      const speed = 4.4 * (0.9 + 0.2 * r.agility) * speedFactor(r, t, prev.turboUntil, 1.5);
      let tx: number;
      let ty: number;
      if (chaser[r.team] === r) {
        tx = ball.x - dir * 0.7;
        ty = ball.y;
      } else {
        const spot = homeSpot(r.team, r.vx, counts[r.team]);
        tx = spot.x * 0.45 + ball.x * 0.55;
        ty = spot.y * 0.8 + ball.y * 0.2;
      }
      tx = clamp(tx, -FIELD_W / 2 + 1, FIELD_W / 2 - 1);
      ty = clamp(ty, -FIELD_H / 2 + 1, FIELD_H / 2 - 1);
      const dx = tx - r.x;
      const dy = ty - r.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.05 && speed > 0) {
        const step = Math.min(speed * dt, d);
        r.x += (dx / d) * step;
        r.y += (dy / d) * step;
      }
      if (dist(r.x, r.y, ball.x, ball.y) < 1.15 && t >= r.cooldownUntil && t >= r.stunnedUntil) {
        const gx = dir * (FIELD_W / 2);
        const base = Math.atan2(0 - ball.y, gx - ball.x);
        const noise = (hashNoise(prev.seed, i, Math.floor(t * 5)) - 0.5) * (1.1 - 0.9 * r.agility);
        const power = (9 + 5 * r.agility) * (t < r.boostUntil ? 1.5 : 1) * (t < prev.turboUntil ? 1.2 : 1);
        ball.vx = Math.cos(base + noise) * power;
        ball.vy = Math.sin(base + noise) * power;
        lastTouch = r.participantId;
        r.cooldownUntil = t + 0.5;
      }
    });
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  const drag = Math.exp(-0.9 * dt);
  ball.vx *= drag;
  ball.vy *= drag;
  if (Math.abs(ball.y) > FIELD_H / 2) {
    ball.y = Math.sign(ball.y) * FIELD_H / 2;
    ball.vy *= -0.8;
  }
  if (Math.abs(ball.x) > FIELD_W / 2) {
    if (Math.abs(ball.y) <= GOAL_W / 2) {
      const scorer: 0 | 1 = ball.x > 0 ? 0 : 1;
      goals[scorer] += 1;
      const toucher = rs.find((r) => r.participantId === lastTouch);
      if (toucher && toucher.team === scorer) toucher.score += 1;
      ball.x = 0;
      ball.y = 0;
      ball.vx = 0;
      ball.vy = 0;
      lastTouch = null;
      kickoffAt = t + 1.4;
      const seen = [0, 0];
      for (const r of rs) {
        if (r.team === null) continue;
        const spot = homeSpot(r.team, seen[r.team] as number, counts[r.team]);
        seen[r.team] = (seen[r.team] as number) + 1;
        r.x = spot.x;
        r.y = spot.y;
      }
    } else {
      ball.x = Math.sign(ball.x) * FIELD_W / 2;
      ball.vx *= -0.8;
    }
  }

  const next: Extract<World, { kind: 'soccer' }> = { ...world, ball, goals, lastTouch, kickoffAt };
  return { racers: rs, world: next, done: t >= prev.durationSec };
}

/** Time vencedor, ou null no empate. */
export function soccerWinner(world: Extract<World, { kind: 'soccer' }>): 0 | 1 | null {
  if (world.goals[0] === world.goals[1]) return null;
  return world.goals[0] > world.goals[1] ? 0 : 1;
}

function orderSoccer(state: MatchState): Racer[] {
  const winner = state.world?.kind === 'soccer' ? soccerWinner(state.world) : null;
  return state.racers.slice().sort((a, b) => {
    if (winner !== null && a.team !== b.team) return a.team === winner ? -1 : 1;
    return b.score - a.score || a.lane - b.lane;
  });
}

/* ====================================================================== */
/* Plataformas desaparecendo                                              */
/* ====================================================================== */

export const BRIDGE_COLS = 3;

function createBridge(setup: ArenaSetup): Created {
  const rng = createRng(setup.seed);
  const rows = clamp(Math.round((setup.durationSec * 0.55) / 2.2), 10, 28);
  const fake = Array.from({ length: rows }, () => Math.floor(rng() * BRIDGE_COLS));
  const world: World = { kind: 'bridge', rows, cols: BRIDGE_COLS, fake, known: new Array<number>(rows).fill(-1), hop: 2.2 };
  const racers = setup.participantIds.map((id, i) => {
    const r = baseRacer(id, i, setup.seed, i);
    r.y = 1;
    r.cooldownUntil = 3.2 + hashNoise(setup.seed, i, 5) * 2;
    return r;
  });
  return { racers, world, trackLength: rows };
}

function stepBridge(prev: MatchState, dt: number): StepOut {
  const world = prev.world as Extract<World, { kind: 'bridge' }>;
  const t = prev.t + dt;
  const known = world.known.slice();
  const rs = prev.racers.map((r) => ({ ...r }));
  const pFakeBase = prev.difficulty === 'facil' ? 0.38 : prev.difficulty === 'dificil' ? 0.6 : 0.5;

  rs.forEach((r, i) => {
    if (!r.alive || r.finishedAt !== null || t < r.cooldownUntil || t < r.stunnedUntil) return;
    const row = r.x;
    let col: number;
    const fake = world.fake[row] as number;
    if (known[row] !== -1) {
      // Já viu qual é a falsa: vai para a casa segura mais perto.
      const safe = [...Array(world.cols).keys()].filter((c) => c !== fake);
      col = safe.reduce((best, c) => (Math.abs(c - r.y) < Math.abs(best - r.y) ? c : best), safe[0] as number);
    } else {
      const pFake = clamp(pFakeBase - 0.3 * r.agility, 0.12, 0.6);
      const roll = hashNoise(prev.seed, i * 53 + row, 5);
      if (roll < pFake) col = fake;
      else {
        const safe = [...Array(world.cols).keys()].filter((c) => c !== fake);
        col = safe[Math.floor(hashNoise(prev.seed, i * 31 + row, 9) * safe.length) % safe.length] as number;
      }
    }
    known[row] = fake;
    const hop = world.hop * (t < r.boostUntil ? 0.6 : 1) * (t < prev.turboUntil ? 0.8 : 1) * (0.85 + 0.3 * hashNoise(prev.seed, i, row));
    r.y = col;
    if (col === fake && t >= r.shieldUntil) {
      r.alive = false;
      r.outAt = t;
      return;
    }
    r.x = row + 1;
    r.cooldownUntil = t + hop;
    if (r.x >= world.rows) r.finishedAt = t;
  });

  const done = rs.every((r) => !r.alive || r.finishedAt !== null) || t >= prev.durationSec;
  return { racers: rs, world: { ...world, known }, done };
}

function orderBridge(state: MatchState): Racer[] {
  return state.racers.slice().sort((a, b) => {
    const af = a.finishedAt !== null;
    const bf = b.finishedAt !== null;
    if (af && bf) return (a.finishedAt as number) - (b.finishedAt as number);
    if (af !== bf) return af ? -1 : 1;
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    return b.x - a.x || (b.outAt ?? 0) - (a.outAt ?? 0);
  });
}

/* ====================================================================== */
/* Registro                                                               */
/* ====================================================================== */

export interface ArenaGame {
  create(setup: ArenaSetup): Created;
  step(state: MatchState, dt: number): StepOut;
  order(state: MatchState): Racer[];
}

export const ARENA_GAMES: Partial<Record<GameId, ArenaGame>> = {
  'chao-de-lava': { create: createLava, step: stepLava, order: orderLava },
  'batalha-empurroes': { create: createBrawl, step: stepBrawl, order: orderBrawl },
  batatinha: { create: createFreeze, step: stepFreeze, order: orderFreeze },
  futebol: { create: createSoccer, step: stepSoccer, order: orderSoccer },
  plataformas: { create: createBridge, step: stepBridge, order: orderBridge },
};
