import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { OverlayScreen } from '../features/overlay/OverlayScreen';
import { overlayOptionsFromSearch, resolveOverlayToken } from '../services/overlayAuth';
import { AppProvider } from '../state/AppProvider';

const ALL_ON = { showRanking: true, showFeed: true, showGoal: true, showNames: true };

/** Rota do overlay para o OBS: sem navegação, sem controles, fundo transparente. */
export default function OverlayRoute() {
  const { token } = useParams();
  const { search } = useLocation();
  const access = resolveOverlayToken(token);
  const debug = new URLSearchParams(search).get('debug') === '1';

  useEffect(() => {
    document.documentElement.classList.add('overlay-mode');
    document.title = 'Overlay · TokArena';
    return () => document.documentElement.classList.remove('overlay-mode');
  }, []);

  if (!access.valid) {
    // Transparente de propósito: no OBS, um token inválido não pode pintar a cena. O aviso é discreto.
    return (
      <p role="alert" style={{ position: 'fixed', left: 16, top: 12, margin: 0, padding: '4px 10px', background: 'rgb(11 11 13 / 0.85)', color: '#ff5c68', font: '600 14px Inter, sans-serif', borderRadius: 6 }}>
        Overlay: {access.reason}
      </p>
    );
  }

  return (
    <AppProvider role="overlay">
      <OverlayScreen options={overlayOptionsFromSearch(search, ALL_ON)} debug={debug} />
    </AppProvider>
  );
}
