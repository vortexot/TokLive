import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useActions } from '../../state/AppProvider';
import { useAppState } from '../../state/store';
import { Button } from '../ui/Button';
import { Pill } from '../ui/Misc';
import { Logo } from './Logo';
import { MAIN_NAV, SETTINGS_NAV, type NavItem } from './nav';

function NavList({ items, collapsed, onNavigate }: { items: NavItem[]; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <ul className="rail__list">
      {items.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            className="rail__link"
            data-label={collapsed ? label : undefined}
            aria-label={collapsed ? label : undefined}
            onClick={onNavigate}
          >
            <Icon size={19} aria-hidden />
            <span className={collapsed ? 'sr-only' : undefined}>{label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const arenaName = useAppState((s) => s.settings.arenaName, Object.is);
  return (
    <>
      <div className="rail__brand">
        <NavLink to="/" aria-label="TokArena, ir para a visão geral" onClick={onNavigate}>
          <Logo collapsed={collapsed} />
        </NavLink>
      </div>

      <div className="rail__env" title={collapsed ? `Ambiente: ${arenaName}` : undefined}>
        {collapsed ? (
          <span className="rail__env-initial" aria-label={`Ambiente: ${arenaName}`}>
            {arenaName.slice(0, 1).toUpperCase()}
          </span>
        ) : (
          <>
            <span className="rail__env-name">{arenaName}</span>
            <Pill tone="outline">Ambiente de demonstração</Pill>
          </>
        )}
      </div>

      <nav aria-label="Principal" className="rail__nav">
        <NavList items={MAIN_NAV} collapsed={collapsed} onNavigate={onNavigate} />
      </nav>

      <nav aria-label="Configurações" className="rail__nav rail__nav--bottom">
        {collapsed ? null : <p className="rail__group">Configurações</p>}
        <NavList items={SETTINGS_NAV} collapsed={collapsed} onNavigate={onNavigate} />
      </nav>
    </>
  );
}

export function Sidebar() {
  const actions = useActions();
  const collapsed = useAppState((s) => s.settings.sidebarCollapsed, Object.is);
  return (
    <aside className="rail" aria-label="Barra lateral">
      <SidebarContent collapsed={collapsed} />
      <div className="rail__foot">
        <Button
          variant="ghost"
          size="sm"
          icon={collapsed ? PanelLeftOpen : PanelLeftClose}
          iconOnly={collapsed}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          aria-expanded={!collapsed}
          onClick={() => actions.updateSettings({ sidebarCollapsed: !collapsed })}
        >
          {collapsed ? null : 'Recolher'}
        </Button>
      </div>
    </aside>
  );
}
