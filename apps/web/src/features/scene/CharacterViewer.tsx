import { useEffect, useRef, useState } from 'react';
import type { CharacterSpec } from '../../domain/types';
import { AvatarSvg } from '../../components/avatar/AvatarSvg';
import { Segmented } from '../../components/ui/Controls';
import { SwitchRow } from '../../components/ui/Controls';
import type { PoseMode } from './characterMesh';
import { ViewerScene } from './viewerScene';
import { hasWebGL } from './webgl';
import './scene.css';

const POSES: { value: PoseMode; label: string }[] = [
  { value: 'idle', label: 'Parado' },
  { value: 'run', label: 'Correndo' },
  { value: 'cheer', label: 'Comemorando' },
];

/** Visualizador 3D giratório de um personagem. Arraste para girar. */
export function CharacterViewer({ spec }: { spec: CharacterSpec }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ViewerScene | null>(null);
  const [pose, setPose] = useState<PoseMode>('idle');
  const [auto, setAuto] = useState(true);
  const [failed, setFailed] = useState(false);
  const webgl = hasWebGL() && !failed;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !webgl) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'stage__canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Personagem em 3D. Arraste para girar.');
    host.appendChild(canvas);
    let scene: ViewerScene;
    try {
      scene = new ViewerScene(canvas);
    } catch {
      canvas.remove();
      setFailed(true);
      return;
    }
    sceneRef.current = scene;
    const fit = () => scene.resize(host.clientWidth, host.clientHeight);
    fit();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    observer?.observe(host);
    scene.start();
    return () => {
      observer?.disconnect();
      scene.dispose();
      canvas.remove();
      sceneRef.current = null;
    };
  }, [webgl]);

  useEffect(() => {
    sceneRef.current?.setSpec(spec);
  }, [spec, webgl]);
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.mode = pose;
  }, [pose, webgl]);
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.autoRotate = auto;
  }, [auto, webgl]);

  // Arrastar para girar.
  const drag = useRef<{ x: number; angle: number } | null>(null);
  const angle = useRef(0.5);

  return (
    <div className="viewer">
      <div
        className="viewer__stage"
        onPointerDown={(e) => {
          if (!webgl) return;
          drag.current = { x: e.clientX, angle: angle.current };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setAuto(false);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          angle.current = drag.current.angle + (e.clientX - drag.current.x) * 0.012;
          sceneRef.current?.setAngle(angle.current);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {webgl ? (
          <div ref={hostRef} className="stage__host" />
        ) : (
          <div className="viewer__fallback" role="img" aria-label="Personagem em 2D">
            <AvatarSvg spec={spec} variant="full" />
          </div>
        )}
      </div>
      <div className="viewer__controls">
        <Segmented<PoseMode> label="Animação" value={pose} options={POSES} onChange={setPose} />
        {webgl ? <SwitchRow label="Girar automaticamente" hint="Arraste o personagem para girar à mão." checked={auto} onChange={setAuto} /> : null}
      </div>
    </div>
  );
}
