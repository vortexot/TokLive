import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AppProvider } from './state/AppProvider';
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
import StatsPage from './pages/StatsPage';

// O overlay carrega separado: o OBS não precisa do painel inteiro.
const OverlayRoute = lazy(() => import('./pages/OverlayRoute'));

function PanelRoot() {
  return (
    <AppProvider role="panel">
      <AppShell />
    </AppProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/overlay/:token"
          element={
            <Suspense fallback={null}>
              <OverlayRoute />
            </Suspense>
          }
        />
        <Route element={<PanelRoot />}>
          <Route index element={<OverviewPage />} />
          <Route path="game-hub" element={<GameHubPage />} />
          <Route path="game-hub/:gameId" element={<GameConfigPage />} />
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
    </BrowserRouter>
  );
}
