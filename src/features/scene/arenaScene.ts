// Cena 3D dos jogos de arena (chão de lava, batalha, batatinha, futebol e plataformas).
// Lê um MatchState e desenha; não decide nenhuma regra. Cada jogo tem uma "visão" (mundo estático, animação do mundo,
// posição de cada personagem e câmera). Sem partida, a cena monta uma partida de prévia só para posicionar os personagens.

import * as THREE from 'three';
import { BRIDGE_COLS, brawlRadius, isRedLight, lavaTileCenter, lavaTileState } from '../../domain/arena';
import { createMatch, racerCondition } from '../../domain/match';
import type { GameId, MatchState, Racer } from '../../domain/types';
import { buildCharacter, makeNameSprite, type CharacterRig, type PoseMode } from './characterMesh';
import { Bag, basic, box, canvasTexture, crowd, lambert, mesh } from './sceneKit';
import type { GameScene, SceneInput, SceneOptions } from './sceneTypes';

const RACER_SCALE = 1.2;
const PREVIEW_MAX = 12;
const ROW_SP = 2.5;
const COL_SP = 2.1;

/* ---------- tipos da visão ---------- */

interface Place {
  x: number;
  y: number;
  z: number;
  /** Tombo (0 de pé, 1 deitado) para quem foi eliminado. */
  tilt?: number;
  mode?: PoseMode;
  /** Direção para onde olhar, em radianos em torno de Y. Sem valor, olha para onde anda. */
  heading?: number;
  scale?: number;
  snap?: boolean;
}

interface View {
  group: THREE.Group;
  background: number;
  fog: [number, number];
  update(match: MatchState, now: number, dt: number): void;
  place(r: Racer, match: MatchState): Place;
  camera(match: MatchState, ents: Ent[], aspect: number): { pos: THREE.Vector3; look: THREE.Vector3 };
  dispose(): void;
  /** Ponto que decide quais nomes aparecem quando há gente demais (os mais próximos dele). */
  focus?(match: MatchState): { x: number; z: number };
  maxNames?: number;
}

interface Ent {
  id: string;
  rig: CharacterRig;
  name: THREE.Sprite;
  ring: THREE.Mesh;
  bubble: THREE.Mesh;
  team: THREE.Mesh | null;
  px: number;
  py: number;
  pz: number;
  heading: number;
  phase: number;
  speed: number;
  racer: Racer | null;
}

const ringGeo = new THREE.RingGeometry(0.55, 0.78, 28);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xff5c68, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
const bubbleGeo = new THREE.SphereGeometry(1.2, 18, 12);
const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xcfe3ff, transparent: true, opacity: 0.2, depthWrite: false });
const teamGeo = new THREE.RingGeometry(0.72, 0.98, 26);
const teamMats = [
  new THREE.MeshBasicMaterial({ color: 0xe32636, side: THREE.DoubleSide, depthWrite: false }),
  new THREE.MeshBasicMaterial({ color: 0x4aa3ff, side: THREE.DoubleSide, depthWrite: false }),
];

/* ====================================================================== */
/* Chão de lava                                                           */
/* ====================================================================== */

function lavaView(match: MatchState): View {
  const world = match.world as Extract<NonNullable<MatchState['world']>, { kind: 'lava' }>;
  const bag = new Bag();
  const group = new THREE.Group();
  const n = world.n;
  const size = n * world.tile;

  const lavaTex = canvasTexture(
    bag,
    256,
    256,
    (g) => {
      g.fillStyle = '#c2310f';
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 140; i++) {
        const x = (i * 97) % 256;
        const y = (i * 61) % 256;
        const r = 10 + ((i * 13) % 26);
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, i % 3 ? 'rgba(255,190,60,0.95)' : 'rgba(255,120,30,0.9)');
        grad.addColorStop(1, 'rgba(255,90,20,0)');
        g.fillStyle = grad;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    },
    [6, 6],
  );
  const lava = mesh(bag.add(new THREE.PlaneGeometry(260, 260)), basic(bag, 0xffffff, { map: lavaTex }), 0, -1.3, 0);
  lava.rotation.x = -Math.PI / 2;
  group.add(lava);

  const glow = new THREE.PointLight(0xff6a22, 90, 40, 1.4);
  glow.position.set(0, 3, 0);
  group.add(glow);

  const tileGeo = box(bag, world.tile * 0.94, 0.8, world.tile * 0.94);
  const tiles = new THREE.InstancedMesh(tileGeo, lambert(bag, 0xffffff), n * n);
  tiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  tiles.frustumCulled = false;
  group.add(tiles);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const stone = [0x5b5b6c, 0x676779];
  const warn = [0xff7a2a, 0xffd24a];

  // Bordas escuras ao redor da arena.
  const rockMat = lambert(bag, 0x1d1b20);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const r = size * 0.78 + (i % 3) * 1.6;
    const rock = mesh(box(bag, 1.4 + (i % 4) * 0.5, 1.6 + (i % 3) * 0.8, 1.4 + (i % 2) * 0.6), rockMat, Math.cos(a) * r, -0.6, Math.sin(a) * r);
    rock.rotation.y = a * 3;
    group.add(rock);
  }

  group.add(new THREE.HemisphereLight(0xffb48a, 0x2a0d08, 1.1));
  const key = new THREE.DirectionalLight(0xffe6d0, 1.4);
  key.position.set(-8, 24, 12);
  group.add(key);

  const view: View = {
    group,
    background: 0x1a0807,
    fog: [40, 120],
    update(m, now) {
      const w = m.world as typeof world;
      lavaTex.offset.set(now / 22000, now / 31000);
      glow.intensity = 80 + Math.sin(now / 240) * 12;
      for (let i = 0; i < n * n; i++) {
        const state = lavaTileState(w, i, m.t);
        const c = lavaTileCenter(w, i);
        let y = 0;
        let scale = 1;
        if (state === 'lava') {
          const sunk = m.t - (w.sinkAt[i] ?? 0);
          y = -sunk * sunk * 7;
          scale = y < -3 ? 0.0001 : 1;
          color.setHex(0xff5a1f);
        } else if (state === 'aviso') {
          const flick = Math.sin(now / 70 + i) > 0 ? 1 : 0;
          color.setHex(warn[flick] as number);
          y = Math.sin(now / 45 + i * 3) * 0.04;
        } else {
          color.setHex(stone[(i + Math.floor(i / n)) % 2] as number);
        }
        dummy.position.set(c.x, y - 0.4, c.y);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        tiles.setMatrixAt(i, dummy.matrix);
        tiles.setColorAt(i, color);
      }
      tiles.instanceMatrix.needsUpdate = true;
      if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
    },
    place(r, m) {
      if (r.alive) return { x: r.x, y: 0, z: r.y, mode: undefined };
      const fall = Math.max(0, m.t - (r.outAt ?? m.t));
      return { x: r.x, y: -fall * fall * 9, z: r.y, mode: 'stun', snap: true };
    },
    camera() {
      return { pos: new THREE.Vector3(0, 23, 17), look: new THREE.Vector3(0, 0, 1.2) };
    },
    dispose() {
      bag.dispose();
    },
  };
  return view;
}

/* ====================================================================== */
/* Batalha de empurrões                                                   */
/* ====================================================================== */

function brawlView(match: MatchState): View {
  const world = match.world as Extract<NonNullable<MatchState['world']>, { kind: 'brawl' }>;
  const bag = new Bag();
  const group = new THREE.Group();

  const topTex = canvasTexture(bag, 512, 512, (g) => {
    g.fillStyle = '#25252d';
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = '#3c3c48';
    g.lineWidth = 6;
    for (let r = 40; r < 256; r += 48) {
      g.beginPath();
      g.arc(256, 256, r, 0, Math.PI * 2);
      g.stroke();
    }
    g.strokeStyle = '#5a1119';
    g.lineWidth = 10;
    g.beginPath();
    g.arc(256, 256, 244, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#e32636';
    g.beginPath();
    g.arc(256, 256, 14, 0, Math.PI * 2);
    g.fill();
  });
  const platGeo = bag.add(new THREE.CylinderGeometry(1, 1, 1.2, 64));
  const plat = new THREE.Mesh(platGeo, [lambert(bag, 0x1c1c22), lambert(bag, 0xffffff, { map: topTex }), lambert(bag, 0x15151a)]);
  plat.position.y = -0.6;
  group.add(plat);
  const rim = mesh(bag.add(new THREE.TorusGeometry(1, 0.06, 8, 72)), basic(bag, 0xe32636), 0, 0.02, 0);
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  const voidMat = basic(bag, 0x07070a);
  const floor = mesh(bag.add(new THREE.PlaneGeometry(300, 300)), voidMat, 0, -14, 0);
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // Pilares ao redor, com luz vermelha no topo.
  const pillarMat = lambert(bag, 0x2b2b33);
  const lampMat = basic(bag, 0xff5c68);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = world.r0 + 7;
    const p = mesh(box(bag, 1.4, 12, 1.4), pillarMat, Math.cos(a) * r, -4, Math.sin(a) * r);
    group.add(p);
    group.add(mesh(box(bag, 0.9, 0.5, 0.9), lampMat, Math.cos(a) * r, 2.2, Math.sin(a) * r));
  }
  group.add(new THREE.HemisphereLight(0xdfe3ff, 0x1a1a22, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-10, 28, 16);
  group.add(key);

  const view: View = {
    group,
    background: 0x0b0b0d,
    fog: [45, 130],
    update(m, now) {
      const w = m.world as typeof world;
      const r = brawlRadius(w, m.t, m.durationSec);
      plat.scale.set(r, 1, r);
      rim.scale.set(r, r, 1);
      (rim.material as THREE.MeshBasicMaterial).color.setHex(r < w.r0 * 0.6 && Math.sin(now / 160) > 0 ? 0xffd2d6 : 0xe32636);
    },
    place(r, m) {
      if (r.alive) return { x: r.x, y: 0, z: r.y };
      const fall = Math.max(0, m.t - (r.outAt ?? m.t));
      const len = Math.hypot(r.x, r.y) || 1;
      const out = fall * 3;
      return { x: r.x + (r.x / len) * out, y: -fall * fall * 10, z: r.y + (r.y / len) * out, mode: 'stun', snap: true };
    },
    camera() {
      return { pos: new THREE.Vector3(0, 20, 16), look: new THREE.Vector3(0, 0, 1.4) };
    },
    dispose() {
      bag.dispose();
    },
  };
  return view;
}

/* ====================================================================== */
/* Batatinha frita 1, 2, 3                                                */
/* ====================================================================== */

function freezeView(match: MatchState): View {
  const world = match.world as Extract<NonNullable<MatchState['world']>, { kind: 'freeze' }>;
  const bag = new Bag();
  const group = new THREE.Group();
  const n = match.racers.length;
  const width = Math.max(16, n * 1.05 + 6);
  const zScale = Math.min(0.85, Math.max(0.5, 26 / (n * 1.5)));
  const L = world.length;

  const grass = canvasTexture(
    bag,
    128,
    128,
    (g) => {
      g.fillStyle = '#245233';
      g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#2a603c';
      g.fillRect(0, 0, 64, 128);
    },
    [L / 8, 1],
  );
  const field = mesh(bag.add(new THREE.PlaneGeometry(L + 40, width)), lambert(bag, 0xffffff, { map: grass }), L / 2 + 4, 0, 0);
  field.rotation.x = -Math.PI / 2;
  group.add(field);
  const outside = mesh(bag.add(new THREE.PlaneGeometry(L + 260, 260)), lambert(bag, 0x0e0e11), L / 2, -0.05, 0);
  outside.rotation.x = -Math.PI / 2;
  group.add(outside);

  // Marcas de distância a cada 10 m.
  const markMat = basic(bag, 0x4a4a56);
  for (let x = 10; x < L; x += 10) group.add(mesh(box(bag, 0.18, 0.03, width), markMat, x, 0.03, 0));
  group.add(mesh(box(bag, 0.4, 0.04, width), basic(bag, 0xf5f5f5), 0, 0.04, 0));

  // Tinta do campo muda com o sinal.
  const tint = mesh(bag.add(new THREE.PlaneGeometry(L + 40, width)), basic(bag, 0x1fa05a, { transparent: true, opacity: 0.12, depthWrite: false }), L / 2 + 4, 0.06, 0);
  tint.rotation.x = -Math.PI / 2;
  group.add(tint);

  // Chegada quadriculada e pórtico com o semáforo.
  const checker = canvasTexture(
    bag,
    128,
    32,
    (g) => {
      for (let y = 0; y < 2; y++) for (let x = 0; x < 8; x++) {
        g.fillStyle = (x + y) % 2 ? '#f5f5f5' : '#0b0b0d';
        g.fillRect(x * 16, y * 16, 16, 16);
      }
    },
    [1, Math.max(2, Math.round(width / 2))],
  );
  const finish = mesh(bag.add(new THREE.PlaneGeometry(2.4, width)), basic(bag, 0xffffff, { map: checker }), L, 0.05, 0);
  finish.rotation.x = -Math.PI / 2;
  group.add(finish);
  const postMat = lambert(bag, 0x2b2b33);
  for (const s of [-1, 1]) group.add(mesh(box(bag, 0.7, 10, 0.7), postMat, L + 3, 5, s * (width / 2 + 0.6)));
  group.add(mesh(box(bag, 1.2, 1.4, width + 2), lambert(bag, 0xe32636), L + 3, 10, 0));
  const lampGeo = bag.add(new THREE.SphereGeometry(2.1, 24, 16));
  const lampMat = basic(bag, 0x37e08a);
  const lamp = mesh(lampGeo, lampMat, L + 2.2, 10, 0);
  group.add(lamp);
  const lampLight = new THREE.PointLight(0x37e08a, 120, 50, 1.4);
  lampLight.position.set(L + 1, 10, 0);
  group.add(lampLight);

  const crowdInst = crowd(bag, 7, 260, { x0: 4, x1: L + 10, z0: -width / 2 - 6, z1: -width / 2 - 2, y0: 0.6, y1: 3.4 });
  group.add(crowdInst);
  group.add(new THREE.HemisphereLight(0xdfe3ff, 0x1a2a1d, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(-10, 30, 20);
  group.add(key);

  let focus = 0;
  const view: View = {
    group,
    background: 0x0b0b0d,
    fog: [70, 190],
    update(m) {
      const w = m.world as typeof world;
      const red = isRedLight(w, m.t) && m.status !== 'encerrada';
      lampMat.color.setHex(red ? 0xff3a48 : 0x37e08a);
      lampLight.color.setHex(red ? 0xff3a48 : 0x37e08a);
      (tint.material as THREE.MeshBasicMaterial).color.setHex(red ? 0xe32636 : 0x1fa05a);
      (tint.material as THREE.MeshBasicMaterial).opacity = red ? 0.32 : 0.06;
    },
    place(r) {
      const z = r.y * zScale;
      if (r.alive) return { x: r.x, y: 0, z, heading: Math.PI / 2, scale: 0.95 };
      return { x: r.x, y: 0.12, z, tilt: 1, mode: 'stun', heading: Math.PI / 2, scale: 0.95 };
    },
    camera(m, ents) {
      const xs = ents.map((e) => e.px).sort((a, b) => b - a);
      const lead = xs.length ? ((xs[0] as number) * 0.5 + (xs[Math.min(3, xs.length - 1)] as number) * 0.5) : 0;
      const target = m.status === 'encerrada' ? L - 6 : lead;
      focus += (target - focus) * 0.08;
      return { pos: new THREE.Vector3(focus - 17, 11, 0), look: new THREE.Vector3(focus + 12, 1.5, 0) };
    },
    dispose() {
      bag.dispose();
    },
  };
  return view;
}

/* ====================================================================== */
/* Futebol maluco                                                         */
/* ====================================================================== */

function soccerView(match: MatchState): View {
  const world = match.world as Extract<NonNullable<MatchState['world']>, { kind: 'soccer' }>;
  const bag = new Bag();
  const group = new THREE.Group();
  const W = world.w;
  const H = world.h;

  const pitchTex = canvasTexture(bag, 512, 256, (g) => {
    for (let i = 0; i < 12; i++) {
      g.fillStyle = i % 2 ? '#1f6b3a' : '#237a42';
      g.fillRect(i * (512 / 12), 0, 512 / 12 + 1, 256);
    }
  });
  const pitch = mesh(bag.add(new THREE.PlaneGeometry(W, H)), lambert(bag, 0xffffff, { map: pitchTex }), 0, 0, 0);
  pitch.rotation.x = -Math.PI / 2;
  group.add(pitch);
  const outside = mesh(bag.add(new THREE.PlaneGeometry(200, 200)), lambert(bag, 0x14141a), 0, -0.04, 0);
  outside.rotation.x = -Math.PI / 2;
  group.add(outside);

  // Linhas.
  const line = basic(bag, 0xf5f5f5);
  group.add(mesh(box(bag, 0.12, 0.03, H), line, 0, 0.03, 0));
  const side = box(bag, W, 0.03, 0.12);
  group.add(mesh(side, line, 0, 0.03, H / 2), mesh(side, line, 0, 0.03, -H / 2));
  const circle = mesh(bag.add(new THREE.RingGeometry(3, 3.12, 48)), basic(bag, 0xf5f5f5, { side: THREE.DoubleSide }), 0, 0.035, 0);
  circle.rotation.x = -Math.PI / 2;
  group.add(circle);
  for (const s of [-1, 1]) {
    group.add(mesh(box(bag, 0.12, 0.03, 10), line, s * (W / 2 - 4), 0.03, 0));
    group.add(mesh(box(bag, 4, 0.03, 0.12), line, s * (W / 2 - 2), 0.03, 5));
    group.add(mesh(box(bag, 4, 0.03, 0.12), line, s * (W / 2 - 2), 0.03, -5));
  }

  // Gols com rede.
  const frame = lambert(bag, 0xf5f5f5);
  const net = basic(bag, 0xcfd2dc, { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  for (const s of [-1, 1] as const) {
    const gx = s * (W / 2 + 1);
    group.add(mesh(box(bag, 0.18, 2.8, 0.18), frame, gx, 1.4, world.goal / 2));
    group.add(mesh(box(bag, 0.18, 2.8, 0.18), frame, gx, 1.4, -world.goal / 2));
    group.add(mesh(box(bag, 2.2, 0.18, world.goal + 0.18), frame, gx, 2.8, 0));
    const back = mesh(bag.add(new THREE.PlaneGeometry(world.goal, 2.8)), net, s * (W / 2 + 2.1), 1.4, 0);
    back.rotation.y = Math.PI / 2;
    group.add(back);
    for (const sz of [-1, 1]) {
      const wall = mesh(bag.add(new THREE.PlaneGeometry(2.2, 2.8)), net, gx, 1.4, sz * (world.goal / 2));
      group.add(wall);
    }
  }

  // Murinhos de publicidade e arquibancada.
  const wallMat = lambert(bag, 0x1d1d24);
  const wallStripe = lambert(bag, 0xe32636);
  group.add(mesh(box(bag, W + 6, 1, 0.5), wallMat, 0, 0.5, -H / 2 - 1.2), mesh(box(bag, W + 6, 0.25, 0.52), wallStripe, 0, 0.75, -H / 2 - 1.2));
  group.add(mesh(box(bag, W + 6, 1, 0.5), wallMat, 0, 0.5, H / 2 + 1.2), mesh(box(bag, W + 6, 0.25, 0.52), wallStripe, 0, 0.75, H / 2 + 1.2));
  group.add(crowd(bag, 21, 420, { x0: -W / 2 - 3, x1: W / 2 + 3, z0: -H / 2 - 7, z1: -H / 2 - 2.4, y0: 1, y1: 5 }));
  group.add(crowd(bag, 5, 200, { x0: -W / 2 - 3, x1: W / 2 + 3, z0: H / 2 + 2.4, z1: H / 2 + 7, y0: 1, y1: 5 }));

  // Bola.
  const ballGeo = bag.add(new THREE.IcosahedronGeometry(0.6, 1).toNonIndexed());
  const colorAttr = new Float32Array(ballGeo.attributes.position!.count * 3);
  for (let f = 0; f < colorAttr.length / 9; f++) {
    const dark = f % 3 === 0 ? 0.15 : 0.96;
    for (let v = 0; v < 3; v++) colorAttr.set([dark, dark, dark], f * 9 + v * 3);
  }
  ballGeo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
  const ball = mesh(ballGeo, lambert(bag, 0xffffff, { vertexColors: true, flatShading: true }), 0, 0.6, 0);
  group.add(ball);
  const ballShadow = mesh(bag.add(new THREE.CircleGeometry(0.6, 16)), basic(bag, 0x000000, { transparent: true, opacity: 0.35 }), 0, 0.04, 0);
  ballShadow.rotation.x = -Math.PI / 2;
  group.add(ballShadow);

  // Placar suspenso.
  let lastScore = '';
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 512;
  boardCanvas.height = 128;
  const boardTex = bag.add(new THREE.CanvasTexture(boardCanvas));
  boardTex.colorSpace = THREE.SRGBColorSpace;
  const board = mesh(bag.add(new THREE.PlaneGeometry(9, 2.25)), basic(bag, 0xffffff, { map: boardTex }), 0, 8.5, -H / 2 - 9);
  group.add(board);
  const drawBoard = (a: number, b: number) => {
    const g = boardCanvas.getContext('2d');
    if (!g) return;
    g.fillStyle = '#0b0b0d';
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = '#e32636';
    g.fillRect(0, 0, 14, 128);
    g.fillStyle = '#4aa3ff';
    g.fillRect(498, 0, 14, 128);
    g.fillStyle = '#f5f5f5';
    g.font = '700 84px "Barlow Condensed", "Arial Narrow", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(`${a}  –  ${b}`, 256, 68);
    boardTex.needsUpdate = true;
  };
  drawBoard(0, 0);

  group.add(new THREE.HemisphereLight(0xe8eeff, 0x1a2a1d, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-12, 30, 14);
  group.add(key);

  const view: View = {
    group,
    background: 0x0b0b0d,
    fog: [60, 160],
    update(m) {
      const w = m.world as typeof world;
      ball.position.set(w.ball.x, 0.6 + Math.min(0.5, Math.hypot(w.ball.vx, w.ball.vy) * 0.03), w.ball.y);
      ball.rotation.z -= w.ball.vx * 0.02;
      ball.rotation.x += w.ball.vy * 0.02;
      ballShadow.position.set(w.ball.x, 0.04, w.ball.y);
      const key2 = `${w.goals[0]}-${w.goals[1]}`;
      if (key2 !== lastScore) {
        lastScore = key2;
        drawBoard(w.goals[0], w.goals[1]);
      }
    },
    maxNames: 6,
    focus(m) {
      const w = m.world as typeof world;
      return { x: w.ball.x, z: w.ball.y };
    },
    place(r, m) {
      const w = m.world as typeof world;
      return { x: r.x, y: 0, z: r.y, heading: Math.atan2(w.ball.x - r.x, w.ball.y - r.y), scale: 1.05 };
    },
    camera() {
      return { pos: new THREE.Vector3(0, 26, 20), look: new THREE.Vector3(0, 0, 2) };
    },
    dispose() {
      bag.dispose();
    },
  };
  return view;
}

/* ====================================================================== */
/* Plataformas desaparecendo                                              */
/* ====================================================================== */

function bridgeView(match: MatchState): View {
  const world = match.world as Extract<NonNullable<MatchState['world']>, { kind: 'bridge' }>;
  const bag = new Bag();
  const group = new THREE.Group();
  const rows = world.rows;
  const startX = -ROW_SP * 1.6;
  const endX = rows * ROW_SP + ROW_SP * 0.2;

  const glassGeo = box(bag, ROW_SP * 0.86, 0.22, COL_SP * 0.9);
  const glass = new THREE.InstancedMesh(glassGeo, bag.add(new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.78 })), rows * BRIDGE_COLS);
  glass.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  glass.frustumCulled = false;
  group.add(glass);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const brokenAt = new Map<number, number>();

  const platMat = lambert(bag, 0x2b2b33);
  const startPlat = mesh(box(bag, 5, 0.6, 9), platMat, startX - 0.5, -0.3, 0);
  const endPlat = mesh(box(bag, 7, 0.6, 9), platMat, endX + 2.4, -0.3, 0);
  group.add(startPlat, endPlat);
  group.add(mesh(box(bag, 0.4, 0.04, 9), basic(bag, 0xf5f5f5), startX + 1.8, 0.02, 0));

  // Pórtico de chegada.
  const postMat = lambert(bag, 0x2b2b33);
  for (const s of [-1, 1]) group.add(mesh(box(bag, 0.5, 7, 0.5), postMat, endX + 0.4, 3.5, s * 4.4));
  group.add(mesh(box(bag, 0.9, 1.5, 9.4), lambert(bag, 0xe32636), endX + 0.4, 7, 0));

  // Abismo.
  const abyss = mesh(bag.add(new THREE.PlaneGeometry(400, 120)), basic(bag, 0x070709), rows * ROW_SP * 0.5, -22, 0);
  abyss.rotation.x = -Math.PI / 2;
  group.add(abyss);
  const pillarMat = lambert(bag, 0x1d1d24);
  for (let i = 0; i < rows; i += 3) {
    for (const s of [-1, 1]) group.add(mesh(box(bag, 0.9, 24, 0.9), pillarMat, i * ROW_SP, -12.4, s * 5.4));
  }
  for (let i = 0; i < rows; i += 3) {
    for (const s of [-1, 1]) group.add(mesh(box(bag, 0.5, 0.4, 0.5), basic(bag, 0x4aa3ff), i * ROW_SP, -0.1, s * 5.4));
  }

  group.add(new THREE.HemisphereLight(0xcfe3ff, 0x15151c, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-6, 26, 14);
  group.add(key);

  let focus = 0;
  const view: View = {
    group,
    background: 0x07070b,
    fog: [40, 120],
    update(m, now) {
      const w = m.world as typeof world;
      let k = 0;
      for (let row = 0; row < rows; row++) {
        const fake = w.fake[row] as number;
        const known = (w.known[row] ?? -1) !== -1;
        if (known && !brokenAt.has(row)) brokenAt.set(row, now);
        for (let col = 0; col < BRIDGE_COLS; col++) {
          let y = -0.11;
          let scale = 1;
          let tilt = 0;
          if (known && col === fake) {
            const since = Math.max(0, (now - (brokenAt.get(row) ?? now)) / 1000);
            y -= since * since * 14;
            tilt = since * 2.2;
            scale = y < -9 ? 0.0001 : 1;
            color.setHex(0xff8a94);
          } else {
            color.setHex(known ? 0x7fe3b0 : 0x8cc0ff);
          }
          dummy.position.set(row * ROW_SP, y, (col - 1) * COL_SP);
          dummy.rotation.set(tilt, 0, tilt * 0.6);
          dummy.scale.setScalar(scale);
          dummy.updateMatrix();
          glass.setMatrixAt(k, dummy.matrix);
          glass.setColorAt(k, color);
          k++;
        }
      }
      dummy.rotation.set(0, 0, 0);
      glass.instanceMatrix.needsUpdate = true;
      if (glass.instanceColor) glass.instanceColor.needsUpdate = true;
    },
    place(r, m) {
      const z = (r.y - 1) * COL_SP;
      if (r.alive) {
        const x = r.x === 0 ? startX + (r.lane % 3) * 0.9 - 0.9 : r.x >= rows ? endX + 1.2 + (r.lane % 4) * 1.1 : (r.x - 1) * ROW_SP;
        const zz = r.x === 0 ? ((r.lane % 5) - 2) * 1.5 : r.x >= rows ? ((r.lane % 5) - 2) * 1.4 : z;
        return { x, y: 0, z: zz, heading: Math.PI / 2, mode: r.finishedAt !== null ? 'cheer' : undefined };
      }
      // Quem caiu atravessa a casa falsa.
      const fall = Math.max(0, m.t - (r.outAt ?? m.t));
      return { x: r.x * ROW_SP, y: -fall * fall * 9, z, mode: 'stun', heading: Math.PI / 2, snap: true };
    },
    camera(m, ents) {
      let lead = 0;
      for (const e of ents) if (e.racer?.alive) lead = Math.max(lead, e.px);
      const target = m.status === 'encerrada' ? endX - 4 : lead;
      focus += (target - focus) * 0.07;
      return { pos: new THREE.Vector3(focus - 7, 13, 10), look: new THREE.Vector3(focus + 3.5, 0, 0) };
    },
    dispose() {
      bag.dispose();
    },
  };
  return view;
}

/* ====================================================================== */
/* Cena                                                                   */
/* ====================================================================== */

function makeView(gameId: GameId, match: MatchState): View | null {
  switch (gameId) {
    case 'chao-de-lava':
      return lavaView(match);
    case 'batalha-empurroes':
      return brawlView(match);
    case 'batatinha':
      return freezeView(match);
    case 'futebol':
      return soccerView(match);
    case 'plataformas':
      return bridgeView(match);
    default:
      return null;
  }
}

export class ArenaScene implements GameScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.5, 600);
  private input: SceneInput = { match: null, racers: new Map(), previewIds: [], showNames: true };
  private view: View | null = null;
  private viewKey = '';
  private preview: MatchState | null = null;
  private previewKey = '';
  private ents = new Map<string, Ent>();
  private camPos = new THREE.Vector3(0, 20, 16);
  private camLook = new THREE.Vector3();
  private camReady = false;
  private raf = 0;
  private last = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, private options: SceneOptions) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: options.transparent, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.pixelRatioCap ?? 1.5));
    this.renderer.setClearColor(0x000000, options.transparent ? 0 : 1);
  }

  setInput(input: SceneInput): void {
    this.input = input;
  }

  resize(width: number, height: number): void {
    if (width < 2 || height < 2) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  start(): void {
    if (this.raf || this.disposed) return;
    this.last = performance.now();
    const loop = (now: number) => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(loop);
      this.frame(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.clearEntities();
    this.dropView();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private dropView(): void {
    if (this.view) {
      this.scene.remove(this.view.group);
      this.view.dispose();
      this.view = null;
    }
  }

  private clearEntities(): void {
    this.ents.forEach((e) => this.scene.remove(e.rig.root));
    this.ents.clear();
  }

  private matchFor(): MatchState | null {
    const { match, previewIds, gameId } = this.input;
    if (match) return match;
    const ids = previewIds.slice(0, PREVIEW_MAX);
    const game = gameId ?? 'chao-de-lava';
    const key = `${game}:${ids.join(',')}`;
    if (key !== this.previewKey) {
      this.previewKey = key;
      this.preview = ids.length ? createMatch({ id: 'preview', gameId: game, participantIds: ids, durationSec: 90, difficulty: 'normal', seed: 5 }) : null;
    }
    return this.preview;
  }

  private ensureEntities(match: MatchState): void {
    const ids = match.racers.map((r) => r.participantId);
    for (const [id, e] of this.ents) {
      if (!ids.includes(id)) {
        this.scene.remove(e.rig.root);
        this.ents.delete(id);
      }
    }
    for (const r of match.racers) {
      if (this.ents.has(r.participantId)) continue;
      const info = this.input.racers.get(r.participantId);
      if (!info) continue;
      const rig = buildCharacter(info.spec);
      rig.root.scale.setScalar(RACER_SCALE);
      const name = makeNameSprite(info.username);
      name.position.set(0, 2.55, 0);
      rig.root.add(name);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      ring.visible = false;
      rig.root.add(ring);
      const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
      bubble.position.y = 1.05;
      bubble.visible = false;
      rig.root.add(bubble);
      let team: THREE.Mesh | null = null;
      if (r.team !== null) {
        team = new THREE.Mesh(teamGeo, teamMats[r.team]);
        team.rotation.x = -Math.PI / 2;
        team.position.y = 0.06;
        rig.root.add(team);
      }
      this.scene.add(rig.root);
      this.ents.set(r.participantId, { id: r.participantId, rig, name, ring, bubble, team, px: Number.NaN, py: 0, pz: 0, heading: 0, phase: Math.random() * 6, speed: 0, racer: r });
    }
  }

  private frame(now: number): void {
    const dt = Math.min(0.1, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    const match = this.matchFor();
    const gameId = match?.gameId ?? this.input.gameId ?? 'chao-de-lava';

    const key = `${gameId}:${match?.id ?? 'none'}`;
    if (key !== this.viewKey) {
      this.viewKey = key;
      this.dropView();
      this.clearEntities();
      this.camReady = false;
      if (match) {
        this.view = makeView(gameId, match);
        if (this.view) {
          this.scene.add(this.view.group);
          if (!this.options.transparent) {
            this.scene.background = new THREE.Color(this.view.background);
            this.scene.fog = new THREE.Fog(this.view.background, this.view.fog[0], this.view.fog[1]);
          } else {
            this.scene.background = null;
            this.scene.fog = null;
          }
        }
      }
    }
    if (!match || !this.view) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.ensureEntities(match);
    this.view.update(match, now, dt);
    const smooth = 1 - Math.exp(-dt * 14);
    const running = match.status === 'em-andamento' || match.status === 'encerrada';
    const winners = new Set((match.results ?? []).filter((r) => r.won).map((r) => r.participantId));
    const list: Ent[] = [];

    for (const r of match.racers) {
      const e = this.ents.get(r.participantId);
      if (!e) continue;
      e.racer = r;
      const p = this.view.place(r, match);
      if (Number.isNaN(e.px)) {
        e.px = p.x;
        e.pz = p.z;
        e.py = p.y;
        e.heading = p.heading ?? Math.PI / 2;
      }
      const ox = e.px;
      const oz = e.pz;
      e.px += (p.x - e.px) * (p.snap ? 1 : smooth);
      e.pz += (p.z - e.pz) * (p.snap ? 1 : smooth);
      e.py += (p.y - e.py) * (p.snap ? 1 : Math.min(1, dt * 10));
      const vx = (e.px - ox) / dt;
      const vz = (e.pz - oz) / dt;
      const speed = Math.hypot(vx, vz);
      e.speed += (speed - e.speed) * Math.min(1, dt * 8);

      let wanted = p.heading;
      if (wanted === undefined && speed > 0.5) wanted = Math.atan2(vx, vz);
      if (wanted !== undefined) {
        let d = wanted - e.heading;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        e.heading += d * Math.min(1, dt * 10);
      }

      const condition = racerCondition(match, r);
      let mode: PoseMode = p.mode ?? 'idle';
      if (!p.mode) {
        if (condition === 'atordoado') mode = 'stun';
        else if (running && e.speed > 0.9) mode = 'run';
      }
      if (match.status === 'encerrada' && r.alive && winners.has(r.participantId) && !p.mode) mode = 'cheer';
      e.phase += dt * (mode === 'run' ? Math.max(6, e.speed * 1.5) : mode === 'stun' ? 8 : mode === 'cheer' ? 9 : 2.4);
      e.rig.pose(e.phase, Math.min(1.2, Math.max(0.55, e.speed / 6)), mode);

      const scale = (p.scale ?? 1) * RACER_SCALE;
      e.rig.root.scale.setScalar(scale);
      e.rig.root.position.set(e.px, e.py, e.pz);
      e.rig.root.rotation.set(p.tilt ? -Math.PI / 2 * p.tilt : 0, e.heading, 0);
      e.name.position.y = (2.45 + (r.lane % 2) * 0.5) / (p.tilt ? 3 : 1);
      e.name.visible = this.input.showNames && (r.alive || p.tilt !== undefined) && (match.racers.length <= 14 || r.alive);
      e.ring.visible = condition === 'impulso';
      if (e.ring.visible) {
        e.ring.rotation.z += dt * 5;
        e.ring.scale.setScalar(1 + Math.sin(now / 120) * 0.08);
      }
      e.bubble.visible = condition === 'escudo';
      list.push(e);
    }

    // Quando a partida é cheia, só os nomes de quem está em jogo e perto do ponto de interesse.
    const maxNames = this.view.maxNames ?? 12;
    if (match.racers.length > Math.min(14, maxNames)) {
      const f = this.view.focus?.(match) ?? { x: 0, z: 0 };
      const ranked = list
        .filter((e) => e.racer?.alive)
        .sort((a, b) => Math.hypot(a.px - f.x, a.pz - f.z) - Math.hypot(b.px - f.x, b.pz - f.z));
      const shown = new Set(ranked.slice(0, maxNames));
      for (const e of list) e.name.visible = this.input.showNames && shown.has(e);
    }

    const cam = this.view.camera(match, list, this.camera.aspect);
    const k = this.camReady ? 1 - Math.exp(-dt * 4) : 1;
    this.camReady = true;
    this.camPos.lerp(cam.pos, k);
    this.camLook.lerp(cam.look, k);
    const aspect = Math.max(0.6, this.camera.aspect);
    // Telas estreitas afastam a câmera para enquadrar a largura inteira.
    const back = aspect < 1.4 ? 1 + (1.4 - aspect) * 0.55 : 1;
    this.camera.position.copy(this.camLook).add(this.camPos.clone().sub(this.camLook).multiplyScalar(back));
    this.camera.lookAt(this.camLook);
    this.renderer.render(this.scene, this.camera);
  }
}
