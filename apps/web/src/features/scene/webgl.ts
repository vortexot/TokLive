let cached: boolean | null = null;

/** O navegador consegue criar um contexto WebGL? (computadores sem aceleração, modo de economia etc.) */
export function hasWebGL(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement('canvas');
    cached = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    cached = false;
  }
  return cached;
}
