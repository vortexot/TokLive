import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { OverlayScreen } from '../features/overlay/OverlayScreen';
import { joinOverlay, lookupOverlayToken, type OverlayLookup } from '../services/backend';
import { overlayOptionsFromSearch, resolveOverlayToken } from '../services/overlayAuth';
import { createApp } from '../state/app';
import { AppProvider } from '../state/AppProvider';
import { useAuth } from '../state/AuthProvider';

const ALL_ON = { showRanking: true, showFeed: true, showGoal: true, showNames: true };

function Notice({ text, tone = 'erro' }: { text: string; tone?: 'erro' | 'info' }) {
  // Transparente de propósito: no OBS, um token inválido não pode pintar a cena. O aviso é discreto.
  return (
    <p role={tone === 'erro' ? 'alert' : 'status'} style={{ position: 'fixed', left: 16, top: 12, margin: 0, padding: '4px 10px', background: 'rgb(11 11 13 / 0.85)', color: tone === 'erro' ? '#ff5c68' : '#d4d4d8', font: '600 14px Inter, sans-serif', borderRadius: 6 }}>
      {text}
    </p>
  );
}

/** Overlay com token real: confere o token no servidor e recebe o estado que o painel publica. */
function RemoteOverlay({ token, search, debug }: { token: string; search: string; debug: boolean }) {
  const auth = useAuth();
  const client = auth.client;
  const [access, setAccess] = useState<OverlayLookup | null>(null);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    void lookupOverlayToken(client, token).then((result) => !cancelled && setAccess(result));
    return () => {
      cancelled = true;
    };
  }, [client, token]);

  const app = useMemo(
    () => (client && access?.valid ? createApp({ role: 'overlay', overlayFeed: (onSnapshot) => joinOverlay(client, token, onSnapshot) }) : null),
    [client, access, token],
  );

  if (!client) return <Notice text={auth.status === 'error' ? 'Overlay: não foi possível falar com o servidor.' : 'Conectando…'} tone={auth.status === 'error' ? 'erro' : 'info'} />;
  if (!access) return <Notice text="Verificando o link…" tone="info" />;
  if (!access.valid || !app) return <Notice text={`Overlay: ${access.reason ?? 'token inválido.'}`} />;
  return (
    <AppProvider role="overlay" app={app}>
      <OverlayScreen options={overlayOptionsFromSearch(search, ALL_ON)} debug={debug} />
    </AppProvider>
  );
}

/** Rota do overlay para o OBS: sem navegação, sem controles, fundo transparente. */
export default function OverlayRoute() {
  const { token } = useParams();
  const { search } = useLocation();
  const debug = new URLSearchParams(search).get('debug') === '1';
  const demo = resolveOverlayToken(token);
  const auth = useAuth();

  useEffect(() => {
    document.documentElement.classList.add('overlay-mode');
    document.title = 'Overlay · TokArena';
    return () => document.documentElement.classList.remove('overlay-mode');
  }, []);

  // Tokens "demo-..." são a demonstração local; qualquer outro é consultado no servidor.
  if (token && !token.startsWith('demo-') && auth.status !== 'disabled') return <RemoteOverlay token={token} search={search} debug={debug} />;
  if (!demo.valid) return <Notice text={`Overlay: ${demo.reason}`} />;

  return (
    <AppProvider role="overlay">
      <OverlayScreen options={overlayOptionsFromSearch(search, ALL_ON)} debug={debug} />
    </AppProvider>
  );
}
