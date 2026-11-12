import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AppProvider } from './state/AppProvider';
import NotFoundPage from './pages/NotFoundPage';
import OverviewPage from './pages/OverviewPage';
import GameConfigPage from './pages/GameConfigPage';
import GameHubPage from './pages/GameHubPage';
import ArenaPage from './pages/ArenaPage';
import ParticipantsPage from './pages/ParticipantsPage';
import CharactersPage from './pages/CharactersPage';
import RankingPage from './pages/RankingPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="game-hub" element={<GameHubPage />} />
            <Route path="game-hub/:gameId" element={<GameConfigPage />} />
            <Route path="arena" element={<ArenaPage />} />
            <Route path="participantes" element={<ParticipantsPage />} />
            <Route path="personagens" element={<CharactersPage />} />
            <Route path="ranking" element={<RankingPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
