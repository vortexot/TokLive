// IA local do Palco: o mesmo caminho que a Mentiliza usa (Ollama no próprio computador, modelo qwen2.5:3b).
// Sem chave, sem custo por fala e sem mandar o chat da LIVE para fora do PC. Regras sem rede, testáveis:
// o `fetch` é injetado nos testes.

import { IaError, type IaClient } from './palcoCore';

export const OLLAMA_DEFAULT_URL = 'http://127.0.0.1:11434';
export const OLLAMA_DEFAULT_MODEL = 'qwen2.5:3b';
/** Mantém o modelo carregado durante a LIVE: carregar de novo leva dezenas de segundos. */
const KEEP_ALIVE = '30m';
/** O painel desiste em 30 s; a ponte desiste antes, para devolver um erro legível. */
const DEFAULT_TIMEOUT_MS = 25_000;
/**
 * Contexto de 8 mil tokens, como na Mentiliza: o padrão menor do Ollama cortaria o começo do roteiro.
 * O pré-carregamento usa o mesmo valor: com outro, a primeira fala obriga o Ollama a carregar o modelo
 * de novo (medido neste PC: 151 s na primeira fala, contra 0,9 s com o mesmo contexto).
 */
const NUM_CTX = 8192;

export type IaChoice = { kind: 'anthropic' } | { kind: 'nenhuma' } | { kind: 'ollama'; url: string; model: string };

/** Só o próprio computador: um OLLAMA_URL apontando para outra máquina mandaria o chat da LIVE para fora. */
export function parseOllamaUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error(`OLLAMA_URL inválido: ${raw}`);
  }
  const loopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]';
  if (url.protocol !== 'http:' || !loopback || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error(`OLLAMA_URL precisa ser o próprio computador, como ${OLLAMA_DEFAULT_URL}. Recebido: ${raw}`);
  }
  return `${url.protocol}//${url.host}`;
}

/** Qual IA a ponte usa. Sem PALCO_IA, fica como sempre foi: Anthropic se houver chave, senão só roteiro. */
export function chooseIa(env: Record<string, string | undefined>): IaChoice {
  const kind = (env.PALCO_IA ?? '').trim().toLowerCase();
  if (kind === 'ollama') {
    const model = (env.OLLAMA_MODELO ?? '').trim() || OLLAMA_DEFAULT_MODEL;
    if (!/^[\w.\-/:]+$/.test(model)) throw new Error(`OLLAMA_MODELO inválido: ${model}`);
    return { kind: 'ollama', url: parseOllamaUrl(env.OLLAMA_URL?.trim() || OLLAMA_DEFAULT_URL), model };
  }
  if (kind !== '' && kind !== 'anthropic') throw new Error(`PALCO_IA desconhecido: ${env.PALCO_IA}. Use "ollama" ou "anthropic".`);
  return env.ANTHROPIC_API_KEY ? { kind: 'anthropic' } : { kind: 'nenhuma' };
}

export interface OllamaOptions {
  url: string;
  model: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface OllamaClient extends IaClient {
  /** Carrega o modelo na memória antes da primeira fala. Nunca lança erro. */
  warm(): Promise<{ ok: true } | { ok: false; motivo: string }>;
}

export function createOllamaClient(options: OllamaOptions): OllamaClient {
  const base = parseOllamaUrl(options.url);
  const { model } = options;
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const offline = `O Ollama não respondeu em ${base}. Abra o Ollama no computador.`;

  async function post(path: string, body: unknown, ms: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await doFetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) throw new IaError('rede', `O Ollama demorou mais de ${Math.round(ms / 1000)} s.`);
      throw new IaError('rede', offline);
    } finally {
      clearTimeout(timer);
    }
  }

  async function failure(res: Response): Promise<IaError> {
    const text = await res.text().catch(() => '');
    if (res.status === 404 && /not found/i.test(text)) return new IaError('api', `O modelo ${model} não está instalado no Ollama. Rode: ollama pull ${model}`);
    return new IaError('api', `Ollama respondeu ${res.status}`);
  }

  return {
    model: `${model} (Ollama local)`,
    async generate(request) {
      const res = await post(
        '/api/chat',
        {
          model,
          stream: false,
          keep_alive: KEEP_ALIVE,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user },
          ],
          options: { num_ctx: NUM_CTX, num_predict: 400, temperature: 0.8 },
        },
        timeoutMs,
      );
      if (!res.ok) throw await failure(res);
      let data: { message?: { content?: unknown }; done_reason?: unknown };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        throw new IaError('formato', 'O Ollama respondeu algo que não é JSON.');
      }
      const text = data?.message?.content;
      if (typeof text !== 'string') throw new IaError('formato', 'O Ollama respondeu sem texto.');
      return { text, stopReason: typeof data.done_reason === 'string' ? data.done_reason : null };
    },
    async warm() {
      try {
        // Prompt vazio só carrega o modelo. Num PC com pouca memória livre, isso passou de dois minutos.
        const res = await post('/api/generate', { model, prompt: '', keep_alive: KEEP_ALIVE, options: { num_ctx: NUM_CTX } }, 300_000);
        if (!res.ok) return { ok: false, motivo: (await failure(res)).message };
        return { ok: true };
      } catch (error) {
        return { ok: false, motivo: error instanceof Error ? error.message : offline };
      }
    },
  };
}
