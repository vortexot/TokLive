import { Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { SimulatorDrawer } from '../../features/simulator/SimulatorDrawer';
import { useActions } from '../../state/AppProvider';
import { useAppState } from '../../state/store';
import { Button } from '../ui/Button';
import { ErrorState, Skeleton } from '../ui/States';
import { Toasts } from '../ui/Toasts';
import { Header } from './Header';
import { Sidebar, SidebarContent } from './Sidebar';
import './layout.css';

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) (typeof d.showModal === 'function' ? d.showModal() : d.setAttribute('open', ''));
    if (!open && d.open) (typeof d.close === 'function' ? d.close() : d.removeAttribute('open'));
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-label="Menu de navegação"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open ? (
        <div className="drawer__inner">
          <Button className="drawer__close" variant="ghost" size="sm" iconOnly icon={X} aria-label="Fechar menu" onClick={onClose} />
          <SidebarContent collapsed={false} onNavigate={onClose} />
        </div>
      ) : null}
    </dialog>
  );
}

function PageSkeleton() {
  return (
    <div className="page-skeleton" aria-busy="true" aria-label="Carregando">
      <Skeleton height="4.5rem" />
      <div className="page-skeleton__cols">
        <Skeleton height="22rem" />
        <Skeleton height="22rem" />
      </div>
    </div>
  );
}

export function AppShell() {
  const actions = useActions();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { ready, loadError, collapsed, simOpen, demoTools } = useAppState((s) => ({
    ready: s.ready,
    loadError: s.loadError,
    collapsed: s.settings.sidebarCollapsed,
    simOpen: s.simulator.open,
    demoTools: s.settings.showDemoTools,
  }));
  const main = useRef<HTMLElement>(null);

  // Fecha o menu móvel e leva o foco ao conteúdo a cada navegação.
  useEffect(() => {
    setMenuOpen(false);
    main.current?.scrollTo?.({ top: 0 });
    window.scrollTo?.({ top: 0 });
  }, [location.pathname]);

  return (
    <div className={`shell${collapsed ? ' shell--collapsed' : ''}${simOpen && demoTools ? ' shell--sim' : ''}`}>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <Sidebar />
      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="shell__main">
        <Header onOpenMenu={() => setMenuOpen(true)} />
        <main id="conteudo" ref={main} className="page" tabIndex={-1}>
          {loadError ? (
            <ErrorState title="Não foi possível carregar a demonstração" text={loadError} onRetry={() => void actions.bootstrap()} />
          ) : !ready ? (
            <PageSkeleton />
          ) : (
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          )}
        </main>
      </div>
      <SimulatorDrawer />
      <Toasts />
    </div>
  );
}
