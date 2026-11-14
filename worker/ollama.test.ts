import { describe, expect, it } from 'vitest';
import { IaError, runIa } from './palcoCore';
import { chooseIa, createOllamaClient, OLLAMA_DEFAULT_MODEL, OLLAMA_DEFAULT_URL, parseOllamaUrl } from './ollama';

const request = { system: 'sistema', user: 'pedido', speakers: [0, 1], maxChars: 200 };

type Call = { url: string; body: Record<string, unknown> };

function fakeFetch(reply: (call: Call) => Response | Promise<Response> | Error) {
  const calls: Call[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(input), body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown> };
    calls.push(call);
    const out = await reply(call);
    if (out instanceof Error) throw out;
    return out;
  }) as typeof fetch;
  return { fn, calls };
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('ponte do palco: escolha da IA', () => {
  it('mantém a Anthropic como antes e só usa o Ollama quando pedido', () => {
    expect(chooseIa({ ANTHROPIC_API_KEY: 'abc' })).toEqual({ kind: 'anthropic' });
    expect(chooseIa({})).toEqual({ kind: 'nenhuma' });
    expect(chooseIa({ PALCO_IA: 'ollama' })).toEqual({ kind: 'ollama', url: OLLAMA_DEFAULT_URL, model: OLLAMA_DEFAULT_MODEL });
    expect(chooseIa({ PALCO_IA: ' Ollama ', ANTHROPIC_API_KEY: 'abc', OLLAMA_URL: 'http://localhost:11500/', OLLAMA_MODELO: 'llama3.2:3b' })).toEqual({
      kind: 'ollama',
      url: 'http://localhost:11500',
      model: 'llama3.2:3b',
    });
    expect(chooseIa({ PALCO_IA: 'anthropic' })).toEqual({ kind: 'nenhuma' });
  });

  it('recusa valores desconhecidos em vez de adivinhar', () => {
    expect(() => chooseIa({ PALCO_IA: 'gpt' })).toThrow(/PALCO_IA/);
    expect(() => chooseIa({ PALCO_IA: 'ollama', OLLAMA_MODELO: 'modelo com espaço' })).toThrow(/OLLAMA_MODELO/);
  });

  it('só aceita o Ollama no próprio computador: o chat da LIVE não sai do PC', () => {
    expect(parseOllamaUrl('http://127.0.0.1:11434')).toBe('http://127.0.0.1:11434');
    expect(parseOllamaUrl('http://localhost:11434/')).toBe('http://localhost:11434');
    expect(parseOllamaUrl('http://[::1]:11434')).toBe('http://[::1]:11434');
    for (const bad of ['http://192.168.0.10:11434', 'https://ollama.exemplo.com', 'http://user:senha@localhost:11434', 'http://localhost:11434/api', 'ftp://localhost', 'lixo']) {
      expect(() => parseOllamaUrl(bad), bad).toThrow(/OLLAMA_URL/);
    }
  });
});

describe('ponte do palco: cliente Ollama', () => {
  it('manda o pedido ao /api/chat local, sem streaming, com contexto e modelo mantido carregado', async () => {
    const { fn, calls } = fakeFetch(() => ok({ message: { role: 'assistant', content: '0: Oi, Lu!\n1: Bem-vinda à live!' }, done_reason: 'stop' }));
    const client = createOllamaClient({ url: OLLAMA_DEFAULT_URL, model: 'qwen2.5:3b', fetch: fn });
    const reply = await client.generate(request);
    expect(reply).toEqual({ text: '0: Oi, Lu!\n1: Bem-vinda à live!', stopReason: 'stop' });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('http://127.0.0.1:11434/api/chat');
    expect(calls[0]!.body).toMatchObject({
      model: 'qwen2.5:3b',
      stream: false,
      keep_alive: '30m',
      messages: [
        { role: 'system', content: 'sistema' },
        { role: 'user', content: 'pedido' },
      ],
      options: { num_ctx: 8192 },
    });
    expect(client.model).toContain('qwen2.5:3b');
  });

  it('funciona de ponta a ponta com o leitor de falas do palco', async () => {
    const { fn } = fakeFetch(() => ok({ message: { content: 'Vaga 0: Acuso!\n1 - Defendo!' }, done_reason: 'stop' }));
    const result = await runIa(request, createOllamaClient({ url: OLLAMA_DEFAULT_URL, model: 'qwen2.5:3b', fetch: fn }));
    expect(result).toMatchObject({ ok: true, falas: [{ vaga: 0, texto: 'Acuso!' }, { vaga: 1, texto: 'Defendo!' }] });
  });

  it('traduz as falhas do Ollama para os erros que o painel já conhece', async () => {
    const make = (reply: Parameters<typeof fakeFetch>[0]) => createOllamaClient({ url: OLLAMA_DEFAULT_URL, model: 'qwen2.5:3b', fetch: fakeFetch(reply).fn });
    const codeOf = async (reply: Parameters<typeof fakeFetch>[0]) => {
      try {
        await make(reply).generate(request);
        return 'sem erro';
      } catch (error) {
        return error instanceof IaError ? `${error.code}: ${error.message}` : 'erro cru';
      }
    };
    expect(await codeOf(() => new TypeError('fetch failed'))).toMatch(/^rede: .*Ollama/);
    expect(await codeOf(() => new Response(JSON.stringify({ error: "model 'qwen2.5:3b' not found" }), { status: 404 }))).toMatch(/^api: .*ollama pull qwen2\.5:3b/);
    expect(await codeOf(() => new Response('falhou', { status: 500 }))).toMatch(/^api: .*500/);
    expect(await codeOf(() => new Response('isto não é json', { status: 200 }))).toMatch(/^formato/);
    expect(await codeOf(() => ok({ message: { content: 7 } }))).toMatch(/^formato/);
  });

  it('desiste depois do tempo limite, antes do painel desistir', async () => {
    const hang = ((_: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      })) as typeof fetch;
    const client = createOllamaClient({ url: OLLAMA_DEFAULT_URL, model: 'qwen2.5:3b', fetch: hang, timeoutMs: 20 });
    await expect(client.generate(request)).rejects.toMatchObject({ code: 'rede' });
  });

  it('pré-carrega o modelo e diz se o Ollama respondeu', async () => {
    const good = fakeFetch(() => ok({ done: true }));
    expect(await createOllamaClient({ url: OLLAMA_DEFAULT_URL, model: 'qwen2.5:3b', fetch: good.fn }).warm()).toEqual({ ok: true });
    // Mesmo contexto da fala: com outro valor, a primeira fala recarregaria o modelo inteiro.
    expect(good.calls[0]).toEqual({ url: 'http://127.0.0.1:11434/api/generate', body: { model: 'qwen2.5:3b', prompt: '', keep_alive: '30m', options: { num_ctx: 8192 } } });

    const off = fakeFetch(() => new TypeError('fetch failed'));
    expect(await createOllamaClient({ url: OLLAMA_DEFAULT_URL, model: 'qwen2.5:3b', fetch: off.fn }).warm()).toMatchObject({ ok: false });
  });
});
