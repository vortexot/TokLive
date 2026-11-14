import { describe, expect, it } from 'vitest';
import { IaError, createEventBuffer, isAllowedOrigin, parseEnvFile, parseIaRequest, runIa, sseChunk, staticFile, type IaClient } from './palcoCore';

const request = { system: 'sistema', user: 'pedido', speakers: [0, 1], maxChars: 200 };

function fake(reply: { text: string; stopReason: string | null } | Error): IaClient {
  return {
    model: 'modelo-teste',
    generate: async () => {
      if (reply instanceof Error) throw reply;
      return reply;
    },
  };
}

describe('ponte do palco: pedido para a IA', () => {
  it('aceita só pedidos completos e dentro dos limites', () => {
    expect(parseIaRequest(request)).toEqual(request);
    expect(parseIaRequest({ ...request, speakers: [2] })).toBeNull();
    expect(parseIaRequest({ ...request, speakers: [] })).toBeNull();
    expect(parseIaRequest({ ...request, maxChars: 5000 })).toBeNull();
    expect(parseIaRequest({ ...request, user: 'x'.repeat(9000) })).toBeNull();
    expect(parseIaRequest({ ...request, system: '  ' })).toBeNull();
    expect(parseIaRequest(null)).toBeNull();
  });

  it('lê as falas do texto puro, uma por linha, ignorando o que não está no formato', async () => {
    let t = 1000;
    const result = await runIa(
      request,
      fake({ text: 'Claro, aqui vai:\n0: Acuso!\n1 - Defendo!\nvaga 7: intrusa\n[0]: Acuso de novo', stopReason: 'end_turn' }),
      () => (t += 250),
    );
    expect(result).toEqual({
      ok: true,
      falas: [
        { vaga: 0, texto: 'Acuso!' },
        { vaga: 1, texto: 'Defendo!' },
        { vaga: 0, texto: 'Acuso de novo' },
      ],
      ms: 250,
      modelo: 'modelo-teste',
    });
  });

  it('explica cada falha sem expor detalhes internos', async () => {
    expect(await runIa(request, null)).toMatchObject({ ok: false, erro: 'sem-chave' });
    expect(await runIa(request, fake({ text: '', stopReason: 'refusal' }))).toMatchObject({ ok: false, erro: 'recusa' });
    expect(await runIa(request, fake({ text: 'resposta sem formato nenhum', stopReason: 'end_turn' }))).toMatchObject({ ok: false, erro: 'formato' });
    expect(await runIa(request, fake({ text: '{"falas":[]}', stopReason: 'end_turn' }))).toMatchObject({ ok: false, erro: 'formato' });
    expect(await runIa(request, fake(new IaError('limite', '')))).toMatchObject({ ok: false, erro: 'limite' });
    expect(await runIa(request, fake(new Error('boom')))).toMatchObject({ ok: false, erro: 'api' });
  });
});

describe('ponte do palco: segurança e arquivos', () => {
  it('só atende o próprio computador e o site publicado', () => {
    expect(isAllowedOrigin(undefined)).toBe(true);
    expect(isAllowedOrigin('http://localhost:8787')).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:5173')).toBe(true);
    expect(isAllowedOrigin('https://vortexot.github.io')).toBe(true);
    expect(isAllowedOrigin('https://site-qualquer.com')).toBe(false);
    expect(isAllowedOrigin('http://vortexot.github.io')).toBe(false);
    expect(isAllowedOrigin('lixo')).toBe(false);
  });

  it('entrega só os arquivos do site gerado pelo build', () => {
    expect(staticFile('/TokLive/')).toEqual({ file: 'index.html', type: 'text/html; charset=utf-8' });
    expect(staticFile('/TokLive/assets/app-x1.js?v=2')).toEqual({ file: 'assets/app-x1.js', type: 'text/javascript; charset=utf-8' });
    expect(staticFile('/TokLive/config.js')?.file).toBe('config.js');
    expect(staticFile('/TokLive/worker/.env')).toBeNull();
    expect(staticFile('/TokLive/../worker/.env')).toBeNull();
    expect(staticFile('/TokLive/%2e%2e/package.json')).toBeNull();
    expect(staticFile('/TokLive/src/main.tsx')).toBeNull();
    expect(staticFile('/outra/coisa')).toBeNull();
  });

  it('lê o arquivo .env simples', () => {
    expect(parseEnvFile('# comentário\nANTHROPIC_API_KEY=abc\nPALCO_MODELO = "claude-haiku-5-5"\n\nVAZIO=\nlinha ruim')).toEqual({
      ANTHROPIC_API_KEY: 'abc',
      PALCO_MODELO: 'claude-haiku-5-5',
      VAZIO: '',
    });
  });
});

describe('ponte do palco: eventos', () => {
  it('junta curtidas da mesma pessoa e mantém a ordem do resto', () => {
    const out: unknown[] = [];
    const buffer = createEventBuffer((e) => out.push(e));
    buffer.push({ type: 'like', username: 'lu', count: 2 });
    buffer.push({ type: 'follow', username: 'caio' });
    buffer.push({ type: 'like', username: 'lu', count: 3 });
    buffer.push({ type: 'like', username: 'bia', count: 1 });
    expect(buffer.flush()).toBe(3);
    expect(out).toEqual([{ type: 'like', username: 'lu', count: 5 }, { type: 'follow', username: 'caio' }, { type: 'like', username: 'bia', count: 1 }]);
    expect(buffer.flush()).toBe(0);
  });

  it('formata mensagens de eventos para o navegador', () => {
    expect(sseChunk('live', { type: 'follow' })).toBe('event: live\ndata: {"type":"follow"}\n\n');
  });
});
