import {
  ChartColumn,
  CircleHelp,
  CircleUser,
  Gamepad2,
  LayoutDashboard,
  MicVocal,
  PersonStanding,
  Settings,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/game-hub', label: 'Game Hub', icon: Gamepad2 },
  { to: '/palco', label: 'Palco', icon: MicVocal },
  { to: '/arena', label: 'Minha arena', icon: Swords },
  { to: '/participantes', label: 'Participantes', icon: Users },
  { to: '/personagens', label: 'Personagens', icon: PersonStanding },
  { to: '/ranking', label: 'Ranking', icon: Trophy },
  { to: '/estatisticas', label: 'Estatísticas', icon: ChartColumn },
];

export const SETTINGS_NAV: NavItem[] = [
  { to: '/configuracoes', label: 'Configurações gerais', icon: Settings },
  { to: '/conta', label: 'Conta', icon: CircleUser },
  { to: '/ajuda', label: 'Ajuda', icon: CircleHelp },
];

export interface Crumb {
  label: string;
  to?: string;
}

export interface PageMeta {
  title: string;
  crumbs: Crumb[];
}

const TITLES: Record<string, string> = {
  '/': 'Visão geral',
  '/game-hub': 'Game Hub',
  '/palco': 'Palco',
  '/arena': 'Minha arena',
  '/participantes': 'Participantes',
  '/personagens': 'Personagens',
  '/ranking': 'Ranking',
  '/estatisticas': 'Estatísticas',
  '/configuracoes': 'Configurações gerais',
  '/conta': 'Conta',
  '/ajuda': 'Ajuda',
};

/** Título e breadcrumb da rota atual. `gameName` resolve a página de configuração de um jogo. */
export function getPageMeta(pathname: string, gameName?: string): PageMeta {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean.startsWith('/game-hub/') && gameName) {
    return { title: 'Configurar jogo', crumbs: [{ label: 'Game Hub', to: '/game-hub' }, { label: gameName }] };
  }
  const title = TITLES[clean] ?? 'Página não encontrada';
  return { title, crumbs: [] };
}
