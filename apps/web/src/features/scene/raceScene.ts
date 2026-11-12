// Cena 3D da corrida de obstáculos (Three.js puro, sem React dentro do laço de desenho).
// Lê um MatchState e desenha; não decide nada de regra. Os obstáculos usam a mesma função
// isLaneBlocked da simulação, então o que se vê é o que de fato bloqueia.

import * as THREE from 'three';
import { isLaneBlocked, racerCondition } from '../../domain/race';
import type { CharacterSpec, MatchState } from '../../domain/types';
import { buildCharacter, makeNameSprite, type CharacterRig, type PoseMode } from './characterMesh';

export interface SceneRacer {
  id: string;
  username: string;
  spec: CharacterSpec;
}

export interface SceneInput {
  match: MatchState | null;
  /** Todos os personagens conhecidos, por id de participante. */
  racers: Map<string, SceneRacer>;
  /** Quem aparece no grid quando não há partida. */
  previewIds: string[];
  showNames: boolean;
}

export interface SceneOptions {
  transparent: boolean;
  pixelRatioCap?: number;
}

const LANE_W = 1.9;
const RACER_SCALE = 1.25;
const TRACK_PAD_BEHIND = 24;
const TRACK_PAD_AHEAD = 40;
const PREVIEW_MAX = 12;

interface Entity {
  id: string;
  rig: CharacterRig;
  name: THREE.Sprite;
  ring: THREE.Mesh;
  bubble: THREE.Mesh;
  x: number;
  lane: number;
  phase: number;
  lastX: number;
  speed: number;
}

const ringGeo = new THREE.RingGeometry(0.55, 0.78, 28);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xff5c68, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
const bubbleGeo = new THREE.SphereGeometry(1.2, 18, 12);
const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xcfe3ff, transparent: true, opacity: 0.2, depthWrite: false });

function checkerTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 32;
  const g = c.getContext('2d');
  if (g) {
    const cell = 16;
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 8; x++) {
        g.fillStyle = (x + y) % 2 === 0 ? '#f5f5f5' : '#0b0b0d';
        g.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

function bannerSprite(text: string): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#e32636';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#ffffff';
    g.font = '700 64px "Barlow Condensed", "Arial Narrow", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2 + 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(9, 1.7), new THREE.MeshBasicMaterial({ map: t }));
}

export class RaceScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.5, 600);
  private input: SceneInput = { match: null, racers: new Map(), previewIds: [], showNames: true };
  private track = new THREE.Group();
  private entities = new Map<string, Entity>();
  private obstacles: THREE.InstancedMesh | null = null;
  private builtFor = '';
  private laneCount = 12;
  private trackLength = 420;
  private focusX = 6;
  private fov = 42;
  private raf = 0;
  private last = 0;
  private disposed = false;
  private obstacleDummy = new THREE.Object3D();
  private ownGeometries: THREE.BufferGeometry[] = [];
  private ownMaterials: THREE.Material[] = [];

  constructor(canvas: HTMLCanvasElement, private options: SceneOptions) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: options.transparent, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.pixelRatioCap ?? 1.5));
    this.renderer.setClearColor(0x000000, options.transparent ? 0 : 1);
    if (!options.transparent) {
      this.scene.background = new THREE.Color(0x0b0b0d);
      this.scene.fog = new THREE.Fog(0x0b0b0d, 90, 260);
    }
    this.scene.add(new THREE.HemisphereLight(0xdfe3ff, 0x1a1a22, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(-20, 40, 18);
    this.scene.add(sun);
    this.scene.add(this.track);
    this.build(12, 420);
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
    this.clearTrack();
    this.entities.forEach((e) => this.scene.remove(e.rig.root));
    this.entities.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  /* ---------- construção ---------- */

  private own<G extends THREE.BufferGeometry>(g: G): G {
    this.ownGeometries.push(g);
    return g;
  }
  private ownMat<M extends THREE.Material>(m: M): M {
    this.ownMaterials.push(m);
    return m;
  }

  private clearTrack(): void {
    this.track.clear();
    this.ownGeometries.forEach((g) => g.dispose());
    this.ownMaterials.forEach((m) => m.dispose());
    this.ownGeometries = [];
    this.ownMaterials = [];
    this.obstacles = null;
  }

  private laneZ(lane: number): number {
    return (lane - (this.laneCount - 1) / 2) * LANE_W;
  }

  private build(laneCount: number, trackLength: number, match: MatchState | null = null): void {
    this.clearTrack();
    this.laneCount = laneCount;
    this.trackLength = trackLength;
    const width = laneCount * LANE_W;
    const length = trackLength + TRACK_PAD_BEHIND + TRACK_PAD_AHEAD;
    const centerX = trackLength / 2 + (TRACK_PAD_AHEAD - TRACK_PAD_BEHIND) / 2;

    // Faixas das raias, em dois tons alternados.
    const laneGeo = this.own(new THREE.PlaneGeometry(length, LANE_W));
    const shades = [this.ownMat(new THREE.MeshLambertMaterial({ color: 0x1b1b21 })), this.ownMat(new THREE.MeshLambertMaterial({ color: 0x212129 }))];
    for (let i = 0; i < laneCount; i++) {
      const lane = new THREE.Mesh(laneGeo, shades[i % 2]);
      lane.rotation.x = -Math.PI / 2;
      lane.position.set(centerX, 0, this.laneZ(i));
      this.track.add(lane);
    }

    // Chão ao redor (só fora do modo transparente).
    if (!this.options.transparent) {
      const ground = new THREE.Mesh(this.own(new THREE.PlaneGeometry(length + 400, width + 400)), this.ownMat(new THREE.MeshLambertMaterial({ color: 0x0e0e11 })));
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(centerX, -0.05, 0);
      this.track.add(ground);
    }

    // Divisórias e bordas.
    const lineGeo = this.own(new THREE.BoxGeometry(length, 0.05, 0.07));
    const lineMat = this.ownMat(new THREE.MeshBasicMaterial({ color: 0x4a4a56 }));
    for (let i = 0; i <= laneCount; i++) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(centerX, 0.03, (i - laneCount / 2) * LANE_W);
      this.track.add(line);
    }

    // Largada.
    const startMat = this.ownMat(new THREE.MeshBasicMaterial({ color: 0xf5f5f5 }));
    const start = new THREE.Mesh(this.own(new THREE.BoxGeometry(0.35, 0.05, width)), startMat);
    start.position.set(0, 0.04, 0);
    this.track.add(start);

    // Chegada: faixa quadriculada e pórtico.
    const checker = checkerTexture();
    const finish = new THREE.Mesh(this.own(new THREE.PlaneGeometry(2.4, width)), this.ownMat(new THREE.MeshBasicMaterial({ map: checker })));
    finish.rotation.x = -Math.PI / 2;
    const tex = (finish.material as THREE.MeshBasicMaterial).map;
    if (tex) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, Math.max(2, laneCount));
    }
    finish.position.set(trackLength, 0.04, 0);
    this.track.add(finish);

    const postGeo = this.own(new THREE.BoxGeometry(0.5, 8, 0.5));
    const postMat = this.ownMat(new THREE.MeshLambertMaterial({ color: 0x2b2b33 }));
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(trackLength, 4, s * (width / 2 + 0.8));
      this.track.add(post);
    }
    const beam = new THREE.Mesh(this.own(new THREE.BoxGeometry(1, 1.8, width + 2.2)), this.ownMat(new THREE.MeshLambertMaterial({ color: 0xe32636 })));
    beam.position.set(trackLength, 7.4, 0);
    this.track.add(beam);
    const banner = bannerSprite('CHEGADA');
    this.ownGeometries.push(banner.geometry);
    this.ownMaterials.push(banner.material as THREE.Material);
    banner.rotation.y = -Math.PI / 2;
    banner.position.set(trackLength - 0.52, 7.4, 0);
    banner.scale.set(Math.max(1, (width + 2) / 9), 1, 1);
    this.track.add(banner);

    // Obstáculos: uma peça por raia, mostrada ou escondida a cada quadro.
    const obstacleList = match?.obstacles ?? [];
    if (obstacleList.length) {
      const geo = this.own(new THREE.BoxGeometry(0.8, 2.5, LANE_W * 0.94));
      const m = this.ownMat(new THREE.MeshLambertMaterial({ color: 0xffffff }));
      const inst = new THREE.InstancedMesh(geo, m, obstacleList.length * laneCount);
      inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const color = new THREE.Color();
      obstacleList.forEach((o, oi) => {
        const hex = o.kind === 'portao' ? 0xe32636 : o.kind === 'pendulo' ? 0xb51224 : 0xe6e6ea;
        for (let l = 0; l < laneCount; l++) inst.setColorAt(oi * laneCount + l, color.setHex(hex));
      });
      inst.frustumCulled = false;
      this.obstacles = inst;
      this.track.add(inst);

      // Marca no chão da zona de cada obstáculo.
      const markGeo = this.own(new THREE.BoxGeometry(1.4, 0.03, width));
      const markMat = this.ownMat(new THREE.MeshBasicMaterial({ color: 0x5a1119 }));
      for (const o of obstacleList) {
        const mark = new THREE.Mesh(markGeo, markMat);
        mark.position.set(o.x, 0.035, 0);
        this.track.add(mark);
      }
    }
  }

  /* ---------- quadro ---------- */

  private syncRoster(ids: string[]): void {
    for (const [id, e] of this.entities) {
      if (!ids.includes(id)) {
        this.scene.remove(e.rig.root);
        this.entities.delete(id);
      }
    }
    ids.forEach((id, i) => {
      if (this.entities.has(id)) return;
      const info = this.input.racers.get(id);
      if (!info) return;
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
      rig.root.rotation.y = Math.PI / 2;
      this.scene.add(rig.root);
      this.entities.set(id, { id, rig, name, ring, bubble, x: 0, lane: i, phase: Math.random() * 6, lastX: 0, speed: 0 });
    });
  }

  private frame(now: number): void {
    const dt = Math.min(0.1, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    const { match, previewIds } = this.input;

    const ids = match ? match.racers.map((r) => r.participantId) : previewIds.slice(0, PREVIEW_MAX);
    const lanes = Math.max(1, match ? match.laneCount : ids.length);
    const length = match ? match.trackLength : 420;
    const key = `${match?.id ?? 'preview'}:${lanes}:${length}`;
    if (key !== this.builtFor) {
      this.builtFor = key;
      this.build(lanes, length, match);
      this.entities.forEach((e) => this.scene.remove(e.rig.root));
      this.entities.clear();
      this.focusX = 6;
    }
    this.syncRoster(ids);

    const t = match?.t ?? 0;
    const order: { id: string; x: number }[] = [];
    const smooth = 1 - Math.exp(-dt * 14);

    ids.forEach((id, i) => {
      const e = this.entities.get(id);
      if (!e) return;
      const racer = match?.racers.find((r) => r.participantId === id);
      const lane = racer ? racer.lane : i;
      e.lane = lane;
      let target = racer ? racer.x : 0;
      const finished = !!racer && racer.finishedAt !== null;
      if (finished) target = this.trackLength + 5 + (lane % 4) * 1.4;
      e.x += (target - e.x) * smooth;
      const vx = (e.x - e.lastX) / dt;
      e.lastX = e.x;
      e.speed += (vx - e.speed) * Math.min(1, dt * 8);

      const condition = racer && match ? racerCondition(match, racer) : 'correndo';
      let mode: PoseMode = 'idle';
      if (match && (match.status === 'em-andamento' || match.status === 'encerrada')) {
        mode = condition === 'chegou' ? 'cheer' : condition === 'atordoado' ? 'stun' : e.speed > 1 ? 'run' : 'idle';
      }
      e.phase += dt * (mode === 'run' ? Math.max(6, e.speed * 1.35) : mode === 'stun' ? 8 : mode === 'cheer' ? 9 : 2.4);
      e.rig.pose(e.phase, Math.min(1.2, Math.max(0.55, e.speed / 9)), mode);
      e.rig.root.position.set(e.x, 0, this.laneZ(lane));
      e.name.position.y = 2.45 + (lane % 2) * 0.55;
      e.ring.visible = condition === 'impulso';
      if (e.ring.visible) {
        e.ring.rotation.z += dt * 5;
        e.ring.scale.setScalar(1 + Math.sin(now / 120) * 0.08);
      }
      e.bubble.visible = condition === 'escudo';
      order.push({ id, x: e.x });
    });

    // Nomes: no grid, todos (até 12); correndo, só os 6 primeiros.
    order.sort((a, b) => b.x - a.x);
    const rank = new Map(order.map((o, i) => [o.id, i]));
    this.entities.forEach((e) => {
      const r = rank.get(e.id) ?? 99;
      e.name.visible = this.input.showNames && (match ? r < 6 : ids.length <= PREVIEW_MAX);
    });

    // Obstáculos do instante t.
    if (this.obstacles && match) {
      const d = this.obstacleDummy;
      let n = 0;
      match.obstacles.forEach((o) => {
        for (let l = 0; l < match.laneCount; l++) {
          const blocked = isLaneBlocked(o, l, match.laneCount, match.t);
          d.position.set(o.x, blocked ? 1.25 : -5, this.laneZ(l));
          d.scale.setScalar(blocked ? 1 : 0.0001);
          d.updateMatrix();
          this.obstacles!.setMatrixAt(n++, d.matrix);
        }
      });
      this.obstacles.instanceMatrix.needsUpdate = true;
      if (this.obstacles.instanceColor) this.obstacles.instanceColor.needsUpdate = true;
    }

    this.moveCamera(order, dt, match, t);
    this.renderer.render(this.scene, this.camera);
  }

  private moveCamera(order: { id: string; x: number }[], dt: number, match: MatchState | null, t: number): void {
    const width = this.laneCount * LANE_W;
    const aspect = Math.max(0.6, this.camera.aspect);
    const distance = Math.max(20, (width * 0.78) / Math.min(1.6, aspect) + 6);
    let targetX = -1;
    if (match && order.length) {
      const leader = order[0]!.x;
      const avg = order.reduce((a, b) => a + b.x, 0) / order.length;
      targetX = leader * 0.55 + avg * 0.45 - 2;
      if (match.status === 'encerrada') targetX = this.trackLength - 6;
    }
    this.focusX += (targetX - this.focusX) * (1 - Math.exp(-dt * 3.2));
    const turbo = !!match && t < match.turboUntil;
    this.fov += ((turbo ? 52 : 42) - this.fov) * (1 - Math.exp(-dt * 4));
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.position.set(this.focusX - distance * 0.85, distance * 0.5, 0);
    this.camera.lookAt(this.focusX + distance * 0.22, 0.8, 0);
  }
}
