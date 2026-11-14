// Núcleo da ponte do Palco: regras sem rede, testáveis. O programa em palco.ts liga isto ao TikTok, à IA e ao HTTP.

import type { LiveEvent } from '../src/domain/types';

/* ---------- Pedido de fala para a IA ---------- */

export interface IaRequest {
  system: string;
  user: string;
  /** Vagas que devem falar, na ordem. */
  speakers: number[];
  maxChars: number;
}

export type IaErrorCode = 'sem-chave' | 'chave' | 'limite' | 'rede' | 'recusa' | 'formato' | 'api' | 'pedido';

export type IaResult =
  | { ok: true; falas: { vaga: number; texto: string }[]; ms: number; modelo: string }
  | { ok: false; erro: IaErrorCode; mensagem: string };

export class IaError extends Error {
  constructor(
    readonly code: IaErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** O que a ponte precisa de um cliente de IA. Em palco.ts é o SDK da Anthropic; nos testes, um falso. */
export interface IaClient {
  model: string;
  generate(request: IaRequest, schema: Record<string, unknown>): Promise<{ text: string; stopReason: string | null }>;
}

const MESSAGES: Record<IaErrorCode, string> = {
  'sem-chave': 'A IA está desligada: defina ANTHROPIC_API_KEY no arquivo worker/.env e reinicie a ponte.',
  chave: 'A chave da IA foi recusada. Confira ANTHROPIC_API_KEY em worker/.env.',
  limite: 'A IA atingiu o limite de uso por agora. As falas seguem com o roteiro.',
  rede: 'Sem resposta da IA a tempo. As falas seguem com o roteiro.',
  recusa: 'A IA recusou este pedido. O palco usou uma fala de roteiro.',
  formato: 'A IA respondeu fora do formato esperado.',
  api: 'A IA devolveu um erro.',
  pedido: 'Pedido inválido.',
};

export function iaFailure(code: IaErrorCode, detail?: string): IaResult {
  return { ok: false, erro: code, mensagem: detail ? `${MESSAGES[code]} (${detail})` : MESSAGES[code] };
}

/** Confere o corpo do pedido vindo do navegador. Tudo com limite: é dinheiro do criador. */
export function parseIaRequest(body: unknown): IaRequest | null {
  const b = body as Partial<IaRequest> | null;
  if (!b || typeof b !== 'object') return null;
  if (typeof b.system !== 'string' || typeof b.user !== 'string') return null;
  if (!b.system.trim() || !b.user.trim() || b.system.length > 8000 || b.user.length > 8000) return null;
  if (!Array.isArray(b.speakers) || b.speakers.length < 1 || b.speakers.length > 2) return null;
  if (!b.speakers.every((s) => s === 0 || s === 1)) return null;
  const maxChars = Number(b.maxChars);
  if (!Number.isInteger(maxChars) || maxChars < 20 || maxChars > 400) return null;
  return { system: b.system, user: b.user, speakers: [...b.speakers], maxChars };
}

/** Formato da resposta: uma lista de falas, cada uma com a vaga e o texto. */
export function falasSchema(speakers: readonly number[]): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      falas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            vaga: { type: 'integer', enum: [...new Set(speakers)] },
            texto: { type: 'string' },
          },
          required: ['vaga', 'texto'],
          additionalProperties: false,
        },
      },
    },
    required: ['falas'],
    additionalProperties: false,
  };
}

export async function runIa(request: IaRequest, client: IaClient | null, now: () => number = Date.now): Promise<IaResult> {
  if (!client) return iaFailure('sem-chave');
  const started = now();
  let reply: { text: string; stopReason: string | null };
  try {
    reply = await client.generate(request, falasSchema(request.speakers));
  } catch (error) {
    if (error instanceof IaError) return iaFailure(error.code, error.message || undefined);
    return iaFailure('api', error instanceof Error ? error.message : undefined);
  }
  if (reply.stopReason === 'refusal') return iaFailure('recusa');
  let parsed: unknown;
  try {
    parsed = JSON.parse(reply.text);
  } catch {
    return iaFailure('formato');
  }
  const falas = (parsed as { falas?: unknown })?.falas;
  if (!Array.isArray(falas)) return iaFailure('formato');
  const clean = falas
    .map((f) => ({ vaga: Number((f as { vaga?: unknown }).vaga), texto: String((f as { texto?: unknown }).texto ?? '') }))
    .filter((f) => request.speakers.includes(f.vaga) && f.texto.trim());
  if (!clean.length) return iaFailure('formato');
  return { ok: true, falas: clean, ms: now() - started, modelo: client.model };
}

/* ---------- Quem pode usar a ponte ---------- */

/**
 * A ponte só atende o próprio painel: páginas abertas no próprio computador ou o site publicado do TokArena.
 * Sem esta checagem, qualquer site aberto no navegador poderia gastar a chave da IA chamando localhost.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // mesma origem (navegação direta, curl)
  try {
    const url = new URL(origin);
    if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return true;
    return url.protocol === 'https:' && url.hostname === 'vortexot.github.io';
  } catch {
    return false;
  }
}

/* ---------- Arquivos do site ---------- */

export const BASE_PATH = '/TokLive/';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.json': 'application/json',
};

/**
 * Caminho relativo à raiz do repositório para um endereço do site publicado, ou null se não for um arquivo do site.
 * Só entrega o que o build gera (index.html, assets, favicon e config.js): nada do código nem do .env.
 */
export function staticFile(urlPath: string): { file: string; type: string } | null {
  const clean = decodeURIComponent(urlPath.split('?')[0] ?? '');
  if (!clean.startsWith(BASE_PATH)) return null;
  let rest = clean.slice(BASE_PATH.length);
  if (rest === '' || rest === 'index.html') rest = 'index.html';
  if (rest.includes('..') || rest.includes('\\') || rest.startsWith('/')) return null;
  const allowed = rest === 'index.html' || rest === 'favicon.svg' || rest === 'config.js' || /^assets\/[\w.-]+$/.test(rest);
  if (!allowed) return null;
  const ext = rest.slice(rest.lastIndexOf('.'));
  const type = TYPES[ext];
  return type ? { file: rest, type } : null;
}

/* ---------- Eventos para o painel ---------- */

export function sseChunk(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Junta curtidas da mesma pessoa numa janela curta, como o worker faz: mil curtidas não viram mil mensagens. */
export function createEventBuffer(emit: (event: LiveEvent) => void) {
  let pending: LiveEvent[] = [];
  return {
    push(event: LiveEvent) {
      if (event.type === 'like') {
        const same = pending.find((e) => e.type === 'like' && e.username === event.username);
        if (same && same.type === 'like') {
          same.count += event.count;
          return;
        }
        pending.push({ ...event });
        return;
      }
      pending.push(event);
    },
    flush() {
      const batch = pending;
      pending = [];
      batch.forEach(emit);
      return batch.length;
    },
  };
}

/** Lê um arquivo KEY=VALOR simples (worker/.env). Linhas vazias e comentários com # são ignorados. */
export function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}
