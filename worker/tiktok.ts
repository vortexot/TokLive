// Ligação com o TikTok LIVE pela biblioteca tiktok-live-connector (não oficial; usa o serviço Euler Stream para assinar as requisições).
// É a única parte do projeto que depende dela, de propósito: se a biblioteca ou o serviço mudarem, só este arquivo muda.

import { ControlEvent, TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';
import type { ConnectFn } from './core';

/**
 * `members` também repassa quem entra na sala. O worker do Supabase deixa desligado (cada entrada viraria uma linha
 * no banco); a ponte do Palco liga, para poder cumprimentar quem chega.
 */
export function createTikTokConnect(options: { signApiKey?: string; members?: boolean } = {}): ConnectFn {
  return async (handle, callbacks) => {
    const conn = new TikTokLiveConnection(handle, options.signApiKey ? { signApiKey: options.signApiKey } : {});
    if (options.members) conn.on(WebcastEvent.MEMBER, (d: unknown) => callbacks.onMessage('member', d));

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
