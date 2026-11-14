// Ligação com o TikTok LIVE pela biblioteca tiktok-live-connector (não oficial; usa o serviço Euler Stream para assinar as requisições).
// É a única parte do projeto que depende dela, de propósito: se a biblioteca ou o serviço mudarem, só este arquivo muda.

import { ControlEvent, TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';
import type { ConnectFn } from './core';

export function createTikTokConnect(options: { signApiKey?: string } = {}): ConnectFn {
  return async (handle, callbacks) => {
    const conn = new TikTokLiveConnection(handle, options.signApiKey ? { signApiKey: options.signApiKey } : {});

    conn.on(WebcastEvent.CHAT, (d: unknown) => callbacks.onMessage('chat', d));
    conn.on(WebcastEvent.GIFT, (d: unknown) => callbacks.onMessage('gift', d));
    conn.on(WebcastEvent.LIKE, (d: unknown) => callbacks.onMessage('like', d));
    conn.on(WebcastEvent.FOLLOW, (d: unknown) => callbacks.onMessage('follow', d));
    conn.on(WebcastEvent.SHARE, (d: unknown) => callbacks.onMessage('share', d));
    conn.on(WebcastEvent.STREAM_END, () => callbacks.onClosed({ ended: true }));
    conn.on(ControlEvent.DISCONNECTED, () => callbacks.onClosed({ ended: false, reason: 'disconnected' }));
    conn.on(ControlEvent.ERROR, (e: unknown) => callbacks.onClosed({ ended: false, reason: e instanceof Error ? e.message : String(e) }));

    await conn.connect();
    callbacks.onConnected();
    return { close: () => void conn.disconnect() };
  };
}
