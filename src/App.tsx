import { lazy, Suspense, useMemo } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AppProvider } from './state/AppProvider';
import { createApp } from './state/app';
import { AuthProvider, useAuth } from './state/AuthProvider';
import LoginPage from './pages/LoginPage';
import AccountPage from './pages/AccountPage';
import ArenaPage from './pages/ArenaPage';
import CharactersPage from './pages/CharactersPage';
import GameConfigPage from './pages/GameConfigPage';
import GameHubPage from './pages/GameHubPage';
import HelpPage from './pages/HelpPage';
import NotFoundPage from './pages/NotFoundPage';
import OverviewPage from './pages/OverviewPage';
import ParticipantsPage from './pages/ParticipantsPage';
import RankingPage from './pages/RankingPage';
import SettingsPage from './pages/SettingsPage';
import StagePage from './pages/StagePage';
import BonecosPage from './pages/BonecosPage';
import BonecoEditPage from './pages/BonecoEditPage';
import StatsPage from './pages/StatsPage';

// O overlay carrega separado: o OBS não precisa do painel inteiro.
const OverlayRoute = lazy(() => import('./pages/OverlayRoute'));
// Tela do palco para capturar no OBS: sem painel, só a cena.
const CenaPage = lazy(() => import('./pages/CenaPage'));

function Splash({ text, action }: { text: string; action?: { label: string; run: () => void } }) {
  return (
    <main className="login">
      <p role="status" style={{ color: 'var(--text-2)', textAlign: 'center' }}>
        {text}
        {action ? (
          <>
            <br />
            <button type="button" className="login__demo" onClick={action.run}>
              {action.label}
            </button>
          </>
        ) : null}
      </p>
    </main>
  );
}

/** Painel: com backend configurado exige login (ou a demonstração escolhida de propósito). */
function PanelRoot() {
  const auth = useAuth();
  const backend = auth.status === 'signed-in' ? auth.backend : null;
  // Um app novo por conta: trocar de usuário não pode herdar o estado do anterior.
  const app = useMemo(() => (backend ? createApp({ role: 'panel', backend }) : undefined), [backend]);

  if (auth.status === 'loading') return <Splash text="Carregando…" />;
  if (auth.status === 'signed-out') return <LoginPage />;
  if (auth.status === 'error') return <Splash text={auth.error ?? 'Não foi possível abrir a sua conta.'} action={{ label: 'Tentar de novo', run: auth.retry }} />;

  return (
    <AppProvider key={backend?.workspace.id ?? 'demo'} role="panel" app={app}>
      <AppShell />
    </AppProvider>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/overlay/:token"
        element={
          <Suspense fallback={null}>
            <OverlayRoute />
          </Suspense>
        }
      />
      <Route
        path="/palco-cena"
        element={
          <Suspense fallback={null}>
            <CenaPage />
          </Suspense>
        }
      />
      <Route element={<PanelRoot />}>
        <Route index element={<OverviewPage />} />
        <Route path="game-hub" element={<GameHubPage />} />
        <Route path="game-hub/:gameId" element={<GameConfigPage />} />
        <Route path="palco" element={<StagePage />} />
        <Route path="palco/bonecos" element={<BonecosPage />} />
        <Route path="palco/bonecos/:bonecoId" element={<BonecoEditPage />} />
        <Route path="arena" element={<ArenaPage />} />
        <Route path="participantes" element={<ParticipantsPage />} />
        <Route path="personagens" element={<CharactersPage />} />
        <Route path="ranking" element={<RankingPage />} />
        <Route path="estatisticas" element={<StatsPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
        <Route path="conta" element={<AccountPage />} />
        <Route path="ajuda" element={<HelpPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}
