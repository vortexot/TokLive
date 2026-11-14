// Resolução do token do overlay.
// DEMONSTRAÇÃO: qualquer token no formato "demo-..." é aceito. Em produção, esta função
// será substituída por uma consulta ao servidor, que valida o token, descobre o ambiente
// do criador e permite revogação. A rota do overlay já chama esta interface.

export const DEMO_OVERLAY_TOKEN = 'demo-arena-7k2f9x';

export interface OverlayAccess {
  valid: boolean;
  workspace: string | null;
  reason?: string;
}

const DEMO_TOKEN = /^demo-[a-z0-9-]{4,40}$/;

export function resolveOverlayToken(token: string | undefined): OverlayAccess {
  if (!token) return { valid: false, workspace: null, reason: 'Token ausente.' };
  if (!DEMO_TOKEN.test(token)) {
    return { valid: false, workspace: null, reason: 'Token inválido ou revogado.' };
  }
  return { valid: true, workspace: 'ambiente-demo' };
}

export function buildOverlayUrl(
  origin: string,
  token: string,
  options: { showRanking: boolean; showFeed: boolean; showGoal: boolean; showNames: boolean },
): string {
  const params = new URLSearchParams();
  // Só grava o que difere do padrão (tudo ligado), para manter a URL curta.
  if (!options.showRanking) params.set('ranking', '0');
  if (!options.showFeed) params.set('feed', '0');
  if (!options.showGoal) params.set('meta', '0');
  if (!options.showNames) params.set('nomes', '0');
  const query = params.toString();
  return `${origin}/overlay/${token}${query ? `?${query}` : ''}`;
}

export function overlayOptionsFromSearch(search: string, base: {
  showRanking: boolean;
  showFeed: boolean;
  showGoal: boolean;
  showNames: boolean;
}) {
  const params = new URLSearchParams(search);
  const flag = (key: string, fallback: boolean) => {
    const value = params.get(key);
    if (value === '0') return false;
    if (value === '1') return true;
    return fallback;
  };
  return {
    showRanking: flag('ranking', base.showRanking),
    showFeed: flag('feed', base.showFeed),
    showGoal: flag('meta', base.showGoal),
    showNames: flag('nomes', base.showNames),
  };
}
