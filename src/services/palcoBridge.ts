// Conversa do painel com a ponte do Palco (worker/palco.ts), que roda no computador do criador.
// Eventos da LIVE chegam por Server-Sent Events; as falas da IA, por um POST. A chave da IA fica na ponte.

import { useEffect, useState } from 'react';
import type { LiveEvent } from '../domain/types';
import type { IaReply } from '../features/stage/director';

export const DEFAULT_BRIDGE_URL = 'http://localhost:8787';

/** A página foi aberta pela própria ponte (http://localhost:8787/TokLive/)? */
export function isServedByBridge(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname, pathname } = window.location;
  return (hostname === 'localhost' || hostname === '127.0.0.1') && pathname.startsWith('/TokLive/');
}

/** Endereço da ponte: a própria página quando ela foi aberta pela ponte; senão, o padrão no computador. */
export function bridgeUrlForPage(): string {
  return isServedByBridge() ? window.location.origin : DEFAULT_BRIDGE_URL;
}

export function cleanBridgeUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export type BridgeStatus = 'desligada' | 'conectando' | 'conectada' | 'erro';

export interface BridgeInfo {
  tiktok: 'desligado' | 'conectando' | 'ao-vivo' | 'reconectando' | 'erro' | 'encerrada';
  handle: string | null;
  mensagem: string | null;
  ia: { ligada: boolean; modelo: string | null };
}

const EVENT_TYPES = new Set(['follow', 'comment', 'like', 'gift', 'share', 'enter', 'live-end']);

/** Só repassa eventos com formato conhecido: a ponte é local, mas o painel não confia em nada que chega pela rede. */
export function parseBridgeEvent(raw: string): LiveEvent | null {
  try {
    const e = JSON.parse(raw) as Record<string, unknown>;
    if (!e || typeof e.type !== 'string' || !EVENT_TYPES.has(e.type)) return null;
    if (e.type === 'comment' && typeof e.text !== 'string') return null;
    if (e.type === 'like' && typeof e.count !== 'number') return null;
    if (e.type === 'gift' && typeof e.gift !== 'string') return null;
    if ('username' in e && e.username !== undefined && typeof e.username !== 'string') return null;
    return e as unknown as LiveEvent;
  } catch {
    return null;
  }
}

export interface BridgeConnection {
  status: BridgeStatus;
  info: BridgeInfo | null;
  error: string | null;
}

/** Mantém a conexão com a ponte enquanto `url` estiver definido. Cada evento da LIVE vai para `onEvent`. */
export function useBridge(url: string | null, onEvent: (event: LiveEvent) => void): BridgeConnection {
  const [state, setState] = useState<BridgeConnection>({ status: 'desligada', info: null, error: null });
  const [handler] = useState(() => ({ current: onEvent }));
  handler.current = onEvent;

  useEffect(() => {
    if (!url) {
      setState({ status: 'desligada', info: null, error: null });
      return;
    }
    if (typeof EventSource === 'undefined') {
      setState({ status: 'erro', info: null, error: 'Este navegador não recebe eventos da ponte.' });
      return;
    }
    setState({ status: 'conectando', info: null, error: null });
    const source = new EventSource(`${url}/palco/eventos`);
    source.onopen = () => setState((s) => ({ ...s, status: 'conectada', error: null }));
    source.addEventListener('estado', (msg) => {
      try {
        const info = JSON.parse((msg as MessageEvent<string>).data) as BridgeInfo;
        setState({ status: 'conectada', info, error: null });
      } catch {
        /* estado malformado: ignora */
      }
    });
    source.addEventListener('live', (msg) => {
      const event = parseBridgeEvent((msg as MessageEvent<string>).data);
      if (event) handler.current(event);
    });
    source.onerror = () => {
      // O EventSource tenta de novo sozinho; fechado de vez, só com um novo clique.
      if (source.readyState === EventSource.CLOSED) setState({ status: 'erro', info: null, error: 'Não foi possível falar com a ponte.' });
      else setState((s) => ({ ...s, status: 'conectando', error: 'A ponte não está respondendo. Ela está aberta no seu computador?' }));
    };
    return () => source.close();
  }, [url, handler]);

  return state;
}

/** Pede as falas à IA pela ponte. Falha de rede vira uma resposta de erro: o palco segue com o roteiro. */
export async function askBridgeIa(
  url: string,
  prompt: { system: string; user: string; speakers: number[]; maxChars: number },
  timeoutMs = 30_000,
): Promise<IaReply> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}/palco/ia`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(prompt),
      signal: controller?.signal,
    });
    const body = (await res.json()) as IaReply;
    if (body && typeof body === 'object' && 'ok' in body) return body;
    return { ok: false, erro: 'formato', mensagem: 'A ponte respondeu fora do formato esperado.' };
  } catch {
    return { ok: false, erro: 'rede', mensagem: 'A ponte não respondeu a tempo. As falas seguem com o roteiro.' };
  } finally {
    clearTimeout(timer);
  }
}
