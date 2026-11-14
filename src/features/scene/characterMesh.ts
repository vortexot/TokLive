// Malha 3D procedural de um personagem, construída da mesma CharacterSpec do avatar 2D.
// Geometrias e materiais são compartilhados entre personagens: com dezenas na tela,
// o custo é de objetos, não de memória de modelo. Não há asset externo: tudo é primitiva.

import * as THREE from 'three';
import type { CharacterSpec } from '../../domain/types';

const G = {
  torso: new THREE.BoxGeometry(0.52, 0.6, 0.3),
  head: new THREE.SphereGeometry(0.26, 20, 14),
  arm: new THREE.CapsuleGeometry(0.09, 0.4, 4, 10),
  sleeve: new THREE.CapsuleGeometry(0.102, 0.14, 4, 10),
  leg: new THREE.CapsuleGeometry(0.112, 0.44, 4, 10),
  shoe: new THREE.BoxGeometry(0.2, 0.11, 0.34),
  eye: new THREE.SphereGeometry(0.03, 8, 6),
  hairCap: new THREE.SphereGeometry(0.285, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
  hairLong: new THREE.BoxGeometry(0.58, 0.74, 0.16),
  bun: new THREE.SphereGeometry(0.13, 12, 10),
  crest: new THREE.BoxGeometry(0.08, 0.3, 0.38),
  curl: new THREE.SphereGeometry(0.12, 10, 8),
  tuft: new THREE.ConeGeometry(0.13, 0.26, 10),
  brim: new THREE.BoxGeometry(0.4, 0.04, 0.26),
  band: new THREE.CylinderGeometry(0.29, 0.29, 0.07, 20, 1, true),
  crown: new THREE.CylinderGeometry(0.2, 0.25, 0.15, 6),
  phoneArc: new THREE.TorusGeometry(0.3, 0.028, 8, 20, Math.PI),
  phoneCup: new THREE.CylinderGeometry(0.08, 0.08, 0.07, 12),
  lens: new THREE.TorusGeometry(0.06, 0.012, 6, 14),
  pack: new THREE.BoxGeometry(0.42, 0.46, 0.18),
  stripe: new THREE.BoxGeometry(0.53, 0.05, 0.31),
  shadow: new THREE.CircleGeometry(0.5, 20),
};

const materials = new Map<string, THREE.MeshLambertMaterial>();
function mat(hex: string): THREE.MeshLambertMaterial {
  let m = materials.get(hex);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: hex });
    materials.set(hex, m);
  }
  return m;
}

const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false });

export type PoseMode = 'idle' | 'run' | 'stun' | 'cheer';

export interface CharacterRig {
  /** Posicione e gire este grupo. O personagem olha para +Z localmente. */
  root: THREE.Group;
  pose(phase: number, intensity: number, mode: PoseMode): void;
  setShadowVisible(visible: boolean): void;
}

function mesh(geo: THREE.BufferGeometry, hex: string, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(hex));
  m.position.set(x, y, z);
  return m;
}

function scaled<T extends THREE.Object3D>(obj: T, x: number, y: number, z: number): T {
  obj.scale.set(x, y, z);
  return obj;
}

function addHair(head: THREE.Group, spec: CharacterSpec) {
  const c = spec.hairColor;
  switch (spec.hairStyle) {
    case 'careca':
      return;
    case 'longo': {
      head.add(mesh(G.hairCap, c, 0, 0.01, 0));
      head.add(mesh(G.hairLong, c, 0, -0.2, -0.17));
      return;
    }
    case 'moicano': {
      head.add(scaled(mesh(G.hairCap, c, 0, -0.01, 0), 0.92, 0.7, 0.92));
      const m = mesh(G.crest, c, 0, 0.27, 0);
      head.add(m);
      return;
    }
    case 'cacheado': {
      for (const [x, y, z] of [[0, 0.24, 0], [-0.2, 0.15, 0], [0.2, 0.15, 0], [-0.14, 0.2, -0.12], [0.14, 0.2, -0.12], [0, 0.18, -0.2], [-0.22, 0.02, -0.05], [0.22, 0.02, -0.05]] as const) {
        head.add(mesh(G.curl, c, x, y, z));
      }
      return;
    }
    default: {
      head.add(mesh(G.hairCap, c, 0, 0.01, 0));
      if (spec.hairStyle === 'topete') {
        const t = mesh(G.tuft, c, 0.02, 0.36, 0.1);
        t.rotation.x = 0.5;
        head.add(t);
      }
      if (spec.hairStyle === 'coque') head.add(mesh(G.bun, c, 0, 0.34, -0.08));
    }
  }
}

function addHeadAccessory(head: THREE.Group, spec: CharacterSpec) {
  const c = spec.accessoryColor;
  switch (spec.accessory) {
    case 'bone': {
      head.add(scaled(mesh(G.hairCap, c, 0, 0.04, 0), 1.04, 1.05, 1.04));
      head.add(mesh(G.brim, c, 0, 0.1, 0.27));
      return;
    }
    case 'faixa':
      head.add(mesh(G.band, c, 0, 0.12, 0));
      return;
    case 'coroa':
      head.add(mesh(G.crown, '#e2b33c', 0, 0.35, 0));
      return;
    case 'fone': {
      const arc = mesh(G.phoneArc, c, 0, 0, 0);
      head.add(arc);
      const l = mesh(G.phoneCup, c, -0.3, 0, 0);
      const r = mesh(G.phoneCup, c, 0.3, 0, 0);
      l.rotation.z = r.rotation.z = Math.PI / 2;
      head.add(l, r);
      return;
    }
    case 'oculos': {
      for (const x of [-0.09, 0.09]) {
        const lens = mesh(G.lens, c, x, 0.02, 0.245);
        head.add(lens);
      }
      return;
    }
    default:
  }
}

export function buildCharacter(spec: CharacterSpec): CharacterRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const shadow = new THREE.Mesh(G.shadow, shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  // Tronco
  const torso = mesh(G.torso, spec.topStyle === 'regata' ? spec.skin : spec.topColor, 0, 1.08, 0);
  body.add(torso);
  if (spec.topStyle === 'regata') body.add(scaled(mesh(G.torso, spec.topColor, 0, 1.08, 0.001), 0.7, 1, 1.02));
  if (spec.topStyle === 'camisa-time') body.add(mesh(G.stripe, '#ffffff', 0, 1.0, 0));
  body.add(scaled(mesh(G.torso, spec.bottomColor, 0, 0.8, 0), 1, 0.22, 1));
  if (spec.accessory === 'mochila') body.add(mesh(G.pack, spec.accessoryColor, 0, 1.1, -0.24));

  // Cabeça
  const head = new THREE.Group();
  head.position.set(0, 1.68, 0);
  head.add(mesh(G.head, spec.skin));
  head.add(mesh(G.eye, '#1a1412', -0.09, 0.02, 0.245));
  head.add(mesh(G.eye, '#1a1412', 0.09, 0.02, 0.245));
  addHair(head, spec);
  addHeadAccessory(head, spec);
  body.add(head);

  // Braços (pivô no ombro)
  const armColor = spec.topStyle === 'moletom' ? spec.topColor : spec.skin;
  const makeArm = (side: 1 | -1) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.35 * side, 1.34, 0);
    pivot.add(mesh(G.arm, armColor, 0, -0.27, 0));
    if (spec.topStyle === 'camiseta' || spec.topStyle === 'camisa-time') pivot.add(mesh(G.sleeve, spec.topColor, 0, -0.07, 0));
    body.add(pivot);
    return pivot;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // Pernas (pivô no quadril)
  const makeLeg = (side: 1 | -1) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.14 * side, 0.78, 0);
    pivot.add(mesh(G.leg, spec.bottomColor, 0, -0.34, 0));
    pivot.add(mesh(G.shoe, spec.shoeColor, 0, -0.69, 0.05));
    body.add(pivot);
    return pivot;
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  return {
    root,
    setShadowVisible(visible) {
      shadow.visible = visible;
    },
    pose(phase, intensity, mode) {
      body.position.set(0, 0, 0);
      body.rotation.set(0, 0, 0);
      head.rotation.set(0, 0, 0);
      switch (mode) {
        case 'run': {
          const swing = Math.sin(phase) * 0.95 * intensity;
          legL.rotation.x = swing;
          legR.rotation.x = -swing;
          armL.rotation.x = -swing * 0.9;
          armR.rotation.x = swing * 0.9;
          armL.rotation.z = -0.12;
          armR.rotation.z = 0.12;
          body.position.y = Math.abs(Math.sin(phase)) * 0.09 * intensity;
          body.rotation.x = 0.16 * intensity;
          break;
        }
        case 'stun': {
          const wob = Math.sin(phase * 0.8);
          legL.rotation.x = wob * 0.25;
          legR.rotation.x = -wob * 0.25;
          armL.rotation.x = -0.4 + wob * 0.2;
          armR.rotation.x = -0.4 - wob * 0.2;
          armL.rotation.z = -0.5;
          armR.rotation.z = 0.5;
          body.rotation.x = 0.5;
          body.rotation.z = wob * 0.14;
          head.rotation.z = wob * 0.2;
          break;
        }
        case 'cheer': {
          const hop = Math.abs(Math.sin(phase * 0.7));
          legL.rotation.x = legR.rotation.x = 0;
          armL.rotation.x = armR.rotation.x = Math.PI * 0.92 + Math.sin(phase * 1.4) * 0.25;
          armL.rotation.z = -0.25;
          armR.rotation.z = 0.25;
          body.position.y = hop * 0.28;
          break;
        }
        default: {
          const breathe = Math.sin(phase * 0.5);
          legL.rotation.x = legR.rotation.x = 0;
          armL.rotation.x = armR.rotation.x = 0;
          armL.rotation.z = -0.08 - breathe * 0.02;
          armR.rotation.z = 0.08 + breathe * 0.02;
          body.position.y = breathe * 0.012;
        }
      }
    },
  };
}

/* ---------- Nome sobre a cabeça ---------- */

const nameMaterials = new Map<string, THREE.SpriteMaterial>();

export function makeNameSprite(text: string): THREE.Sprite {
  let material = nameMaterials.get(text);
  if (!material) {
    // Em sessões longas passam centenas de nomes: o cache tem teto para não acumular texturas.
    if (nameMaterials.size >= 300) {
      nameMaterials.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
      nameMaterials.clear();
    }
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = '600 34px "Inter Variable", Inter, system-ui, sans-serif';
      const label = `@${text}`;
      const w = Math.min(canvas.width - 8, ctx.measureText(label).width + 40);
      const x = (canvas.width - w) / 2;
      ctx.fillStyle = 'rgba(11,11,13,0.82)';
      ctx.beginPath();
      ctx.roundRect(x, 10, w, 58, 8);
      ctx.fill();
      ctx.fillStyle = '#f5f5f5';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, canvas.width / 2, 40, canvas.width - 24);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false });
    nameMaterials.set(text, material);
  }
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.5, 0.52, 1);
  sprite.renderOrder = 10;
  return sprite;
}
