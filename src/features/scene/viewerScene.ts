// Visualizador de um único personagem (plataforma giratória). Usado na galeria de personagens.

import * as THREE from 'three';
import type { CharacterSpec } from '../../domain/types';
import { buildCharacter, type CharacterRig, type PoseMode } from './characterMesh';

export class ViewerScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(27, 3 / 4, 0.1, 50);
  private pivot = new THREE.Group();
  private rig: CharacterRig | null = null;
  private pad: THREE.Mesh;
  private raf = 0;
  private last = 0;
  private phase = 0;
  private angle = 0.5;
  private disposed = false;
  mode: PoseMode = 'idle';
  autoRotate = true;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.scene.add(new THREE.HemisphereLight(0xdfe3ff, 0x1a1a22, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(3, 5, 4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xff5c68, 0.9);
    rim.position.set(-4, 2, -3);
    this.scene.add(rim);

    this.pad = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.12, 40), new THREE.MeshLambertMaterial({ color: 0x202026 }));
    this.pad.position.y = -0.06;
    this.scene.add(this.pad);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.018, 8, 60), new THREE.MeshBasicMaterial({ color: 0xe32636 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.005;
    this.scene.add(ring);
    this.scene.add(this.pivot);
    this.camera.position.set(0, 1.25, 5.0);
    this.camera.lookAt(0, 0.98, 0);
  }

  setSpec(spec: CharacterSpec): void {
    if (this.rig) this.pivot.remove(this.rig.root);
    this.rig = buildCharacter(spec);
    this.rig.setShadowVisible(false);
    this.pivot.add(this.rig.root);
  }

  setAngle(angle: number): void {
    this.angle = angle;
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
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      if (this.autoRotate) this.angle += dt * 0.7;
      this.phase += dt * (this.mode === 'run' ? 10 : this.mode === 'cheer' ? 7 : 2.4);
      this.pivot.rotation.y = this.angle;
      this.pad.rotation.y = this.angle;
      this.rig?.pose(this.phase, 0.9, this.mode);
      this.renderer.render(this.scene, this.camera);
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
