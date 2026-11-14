// Utilitários compartilhados pelas cenas 3D: descarte de recursos, texturas desenhadas em canvas e arquibancada.

import * as THREE from 'three';

export class Bag {
  private items: { dispose(): void }[] = [];
  add<T extends { dispose(): void }>(item: T): T {
    this.items.push(item);
    return item;
  }
  dispose(): void {
    this.items.forEach((i) => i.dispose());
    this.items = [];
  }
}

export function canvasTexture(bag: Bag, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (g) draw(g);
  const t = bag.add(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

export function lambert(bag: Bag, color: number, extra: THREE.MeshLambertMaterialParameters = {}): THREE.MeshLambertMaterial {
  return bag.add(new THREE.MeshLambertMaterial({ color, ...extra }));
}

export function basic(bag: Bag, color: number, extra: THREE.MeshBasicMaterialParameters = {}): THREE.MeshBasicMaterial {
  return bag.add(new THREE.MeshBasicMaterial({ color, ...extra }));
}

export function box(bag: Bag, w: number, h: number, d: number): THREE.BoxGeometry {
  return bag.add(new THREE.BoxGeometry(w, h, d));
}

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

/** Plateia: blocos coloridos em arquibancada, só para dar escala e vida ao fundo. */
export function crowd(bag: Bag, seed: number, count: number, area: { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number }): THREE.InstancedMesh {
  const geo = box(bag, 0.55, 0.9, 0.55);
  const inst = new THREE.InstancedMesh(geo, lambert(bag, 0xffffff), count);
  const colors = [0xe32636, 0xf5f5f5, 0x4aa3ff, 0xffd24a, 0x7a7a88, 0x2b2b33, 0xb51224];
  const d = new THREE.Object3D();
  const c = new THREE.Color();
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    const u = rnd();
    const v = rnd();
    d.position.set(area.x0 + (area.x1 - area.x0) * u, area.y0 + (area.y1 - area.y0) * v, area.z0 + (area.z1 - area.z0) * v);
    d.scale.setScalar(0.8 + rnd() * 0.5);
    d.updateMatrix();
    inst.setMatrixAt(i, d.matrix);
    inst.setColorAt(i, c.setHex(colors[Math.floor(rnd() * colors.length)] as number));
  }
  return inst;
}

