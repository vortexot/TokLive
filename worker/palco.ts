// Ponte do Palco: roda no computador do criador durante a LIVE.
//
//   npm run palco -- @seu_usuario      (na raiz do repositório)
//
// O que ela faz:
// 1. Conecta na LIVE do TikTok (biblioteca tiktok-live-connector, não oficial) e repassa os eventos ao painel.
// 2. Gera as falas dos bonecos com a IA, usando a chave guardada em worker/.env. A chave nunca vai para o navegador.
// 3. Serve o próprio painel em http://localhost:8787/TokLive/, para não depender do site publicado.
//
// Sem @, a ponte sobe só com a IA e o painel (bom para testar com o simulador).

import { readFileSync, existsSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { normalizeWebcast } from '../src/services/liveEvents';
import type { LiveConnection } from './core';
import { friendlyReason } from './core';
import {
  BASE_PATH,
  IaError,
  createEventBuffer,
  iaFailure,
  isAllowedOrigin,
  parseEnvFile,
  parseIaRequest,
  runIa,
  sseChunk,
  staticFile,
  type IaClient,
} from './palcoCore';
import { createTikTokConnect } from './tiktok';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

// Configuração: worker/.env (se existir) e variáveis de ambiente, que têm preferência.
const envPath = join(here, '.env');
const fileEnv = existsSync(envPath) ? parseEnvFile(readFileSync(envPath, 'utf8')) : {};
const env = (key: string): string | undefined => process.env[key] || fileEnv[key] || undefined;

const PORT = Number(env('PALCO_PORTA') ?? 8787);
const MODEL = env('PALCO_MODELO') ?? 'claude-opus-5-5';
const API_KEY = env('ANTHROPIC_API_KEY');
const handle = (process.argv[2] ?? env('PALCO_TIKTOK') ?? '').replace(/^@/, '').trim();

/* ---------- IA ---------- */

function createClaude(apiKey: string): IaClient {
  // baseURL fixo: uma variável ANTHROPIC_BASE_URL perdida no computador não pode desviar as chamadas.
  const client = new Anthropic({ apiKey, baseURL: 'https://api.anthropic.com', maxRetries: 1, timeout: 25_000 });
  // Se a API recusar a chamada com modelo reserva (erro 400), a ponte passa a usar a chamada simples.
  let simple = false;

  const textOf = (content: { type: string }[]) =>
    content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('');

  return {
    model: MODEL,
    async generate(request, schema) {
      // Falas curtas e rápidas: esforço baixo e resposta no formato { falas: [...] }.
      const output_config = { effort: 'low' as const, format: { type: 'json_schema' as const, schema } };
      const messages = [{ role: 'user' as const, content: request.user }];
      try {
        if (!simple) {
          try {
            // Se o modelo recusar o pedido, o servidor tenta o modelo reserva recomendado.
            const response = await client.beta.messages.create({
              model: MODEL,
              max_tokens: 4000,
              output_config,
              betas: ['server-side-fallback-2026-07-01'],
              fallbacks: 'default',
              system: request.system,
              messages,
            });
            return { text: textOf(response.content), stopReason: response.stop_reason };
          } catch (error) {
            if (!(error instanceof Anthropic.BadRequestError)) throw error;
            simple = true;
            console.log(`[palco] A API recusou a chamada com modelo reserva (${error.message}). Usando a chamada simples daqui em diante.`);
          }
        }
        const response = await client.messages.create({ model: MODEL, max_tokens: 4000, output_config, system: request.system, messages });
        return { text: textOf(response.content), stopReason: response.stop_reason };
      } catch (error) {
        if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) throw new IaError('chave', '');
        if (error instanceof Anthropic.RateLimitError) throw new IaError('limite', '');
        if (error instanceof Anthropic.APIConnectionError) throw new IaError('rede', '');
        if (error instanceof Anthropic.APIError) throw new IaError('api', `${error.status ?? ''} ${error.message}`.trim());
        throw error;
      }
    },
  };
}

const ia: IaClient | null = API_KEY ? createClaude(API_KEY) : null;

/* ---------- Eventos para o painel (Server-Sent Events) ---------- */

type TikTokStatus = 'desligado' | 'conectando' | 'ao-vivo' | 'reconectando' | 'erro' | 'encerrada';
const state = { tiktok: (handle ? 'conectando' : 'desligado') as TikTokStatus, mensagem: '' };
const clients = new Set<ServerResponse>();

function estado() {
  return {
    tiktok: state.tiktok,
    handle: handle || null,
    mensagem: state.mensagem || null,
    ia: { ligada: Boolean(ia), modelo: ia ? MODEL : null },
  };
}

function broadcast(event: string, data: unknown) {
  const chunk = sseChunk(event, data);
  for (const res of clients) res.write(chunk);
}

function setTikTok(status: TikTokStatus, mensagem = '') {
  state.tiktok = status;
  state.mensagem = mensagem;
  broadcast('estado', estado());
  console.log(`[palco] TikTok: ${status}${mensagem ? ` (${mensagem})` : ''}`);
}

const buffer = createEventBuffer((event) => broadcast('live', event));
setInterval(() => buffer.flush(), 300);
// Mantém a conexão aberta em proxies e navegadores.
setInterval(() => {
  for (const res of clients) res.write(': ping\n\n');
}, 15_000);

/* ---------- LIVE do TikTok ---------- */

async function connectTikTok() {
  if (!handle) return;
  const connect = createTikTokConnect({ signApiKey: env('EULER_SIGN_API_KEY'), members: true });
  let retries = 0;
  let connection: LiveConnection | null = null;
  const attempt = async (): Promise<void> => {
    try {
      connection = await connect(handle, {
        onMessage: (kind, data) => normalizeWebcast(kind, data as Record<string, unknown>).forEach((e) => buffer.push(e)),
        onConnected: () => {
          retries = 0;
          setTikTok('ao-vivo');
        },
        onClosed: ({ ended, reason }) => {
          connection = null;
          if (ended) {
            buffer.push({ type: 'live-end' });
            setTikTok('encerrada', 'A LIVE foi encerrada.');
            return;
          }
          retry(reason);
        },
      });
    } catch (error) {
      retry(error instanceof Error ? error.message : String(error));
    }
  };
  const retry = (reason?: string) => {
    if (reason) console.log(`[palco] motivo: ${reason}`);
    if (retries >= 6) {
      setTikTok('erro', friendlyReason(reason));
      return;
    }
    retries += 1;
    setTikTok('reconectando', `tentativa ${retries} de 6`);
    setTimeout(() => void attempt(), 3000 * 2 ** (retries - 1));
  };
  process.on('SIGINT', () => connection?.close());
  await attempt();
}

/* ---------- HTTP ---------- */

function cors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' }).end('Origem não permitida.');
    return false;
  }
  if (origin) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('vary', 'origin');
    res.setHeader('access-control-allow-private-network', 'true');
  }
  return true;
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }).end(JSON.stringify(body));
}

function readBody(req: IncomingMessage, limit = 32_000): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('grande demais'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  const url = req.url ?? '/';
  if (!cors(req, res)) return;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '600',
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && (url === '/' || url === '/TokLive')) {
    res.writeHead(302, { location: `${BASE_PATH}#/palco` }).end();
    return;
  }

  if (req.method === 'GET' && url === '/palco/estado') return json(res, 200, estado());

  if (req.method === 'GET' && url === '/palco/eventos') {
    res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write(sseChunk('estado', estado()));
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (req.method === 'POST' && url === '/palco/ia') {
    if (!(req.headers['content-type'] ?? '').includes('application/json')) return json(res, 415, iaFailure('pedido'));
    let body: unknown;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      return json(res, 400, iaFailure('pedido'));
    }
    const request = parseIaRequest(body);
    if (!request) return json(res, 400, iaFailure('pedido'));
    const result = await runIa(request, ia);
    if (!result.ok) console.log(`[palco] IA: ${result.mensagem}`);
    return json(res, 200, result);
  }

  if (req.method === 'GET') {
    const target = staticFile(url);
    if (target) {
      const path = join(repoRoot, target.file);
      if (existsSync(path)) {
        res.writeHead(200, { 'content-type': target.type, 'cache-control': target.file === 'index.html' ? 'no-cache' : 'public, max-age=3600' });
        res.end(readFileSync(path));
        return;
      }
    }
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Não encontrado.');
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') console.error(`[palco] A porta ${PORT} já está em uso. Feche a outra ponte ou defina PALCO_PORTA em worker/.env.`);
  else console.error(`[palco] ${error.message}`);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log(`[palco] Ponte no ar. Abra no Chrome: http://localhost:${PORT}${BASE_PATH}#/palco`);
  console.log(`[palco] IA: ${ia ? `ligada (${MODEL})` : 'desligada (defina ANTHROPIC_API_KEY em worker/.env)'}`);
  console.log(`[palco] TikTok: ${handle ? `@${handle}` : 'sem @ (só simulador). Use: npm run palco -- @seu_usuario'}`);
  console.log('');
  void connectTikTok();
});

process.on('SIGINT', () => {
  console.log('\n[palco] Encerrando.');
  server.close();
  process.exit(0);
});
