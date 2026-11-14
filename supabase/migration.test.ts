// @vitest-environment node
// Executa a migração num Postgres de verdade (PGlite, em WebAssembly) com um stub mínimo do schema "auth" do Supabase,
// e confere as regras de segurança: dono lê o que é dele, ninguém lê o que é do outro, o token é gerado no servidor.

import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('./migrations/0001_init.sql', import.meta.url), 'utf8');

const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';

let db: PGlite;

async function as<T>(role: 'anon' | 'authenticated' | 'service_role', sub: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${sub ?? ''}', false), set_config('request.jwt.claim.role', '${role}', false)`);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;
    create publication supabase_realtime;
  `);
  await db.exec(migration);
  await db.exec(`
    insert into auth.users (id, email) values ('${ALICE}', 'alice@example.com'), ('${BOB}', 'bob@example.com');
    grant all on all tables in schema public to service_role;
  `);
});

afterAll(async () => {
  await db.close();
});

describe('migração do Supabase', () => {
  it('cria workspace, token e linha de conexão quando a conta nasce', async () => {
    const ws = await db.query<{ owner_id: string; name: string }>('select owner_id, name from public.workspaces order by name');
    expect(ws.rows.map((r) => r.name)).toEqual(['alice', 'bob']);
    const tokens = await db.query<{ token: string }>('select token from public.overlay_tokens');
    expect(tokens.rows).toHaveLength(2);
    for (const t of tokens.rows) expect(t.token).toMatch(/^[0-9a-f]{44}$/);
    expect(new Set(tokens.rows.map((t) => t.token)).size).toBe(2);
    const conn = await db.query('select * from public.live_connections');
    expect(conn.rows).toHaveLength(2);
  });

  it('cada criador enxerga só o próprio workspace e o próprio token', async () => {
    await as('authenticated', ALICE, async () => {
      const ws = await db.query<{ name: string }>('select name from public.workspaces');
      expect(ws.rows.map((r) => r.name)).toEqual(['alice']);
      const tokens = await db.query('select token from public.overlay_tokens');
      expect(tokens.rows).toHaveLength(1);
    });
    await as('authenticated', BOB, async () => {
      const ws = await db.query<{ name: string }>('select name from public.workspaces');
      expect(ws.rows.map((r) => r.name)).toEqual(['bob']);
    });
  });

  it('anônimo não lê nenhuma tabela', async () => {
    await as('anon', null, async () => {
      await expect(db.query('select * from public.workspaces')).rejects.toThrow(/permission denied/);
      await expect(db.query('select * from public.overlay_tokens')).rejects.toThrow(/permission denied/);
      await expect(db.query('select * from public.live_events')).rejects.toThrow(/permission denied/);
    });
  });

  it('o estado do workspace é do dono: grava e lê o seu, não o do outro', async () => {
    const wsAlice = (await db.query<{ id: string }>(`select id from public.workspaces where owner_id = '${ALICE}'`)).rows[0]!.id;
    const wsBob = (await db.query<{ id: string }>(`select id from public.workspaces where owner_id = '${BOB}'`)).rows[0]!.id;
    await as('authenticated', ALICE, async () => {
      await db.query('insert into public.workspace_state (workspace_id, dataset) values ($1, $2)', [wsAlice, JSON.stringify({ version: 1 })]);
      await expect(db.query('insert into public.workspace_state (workspace_id, dataset) values ($1, $2)', [wsBob, '{}'])).rejects.toThrow(/row-level security/);
      const mine = await db.query('select * from public.workspace_state');
      expect(mine.rows).toHaveLength(1);
    });
    await as('authenticated', BOB, async () => {
      const theirs = await db.query('select * from public.workspace_state');
      expect(theirs.rows).toHaveLength(0);
      const upd = await db.query('update public.workspace_state set dataset = $1 returning *', ['{"hack":true}']);
      expect(upd.rows).toHaveLength(0);
    });
  });

  it('resolve_overlay_token é público, mas só devolve tokens válidos', async () => {
    const token = (await db.query<{ token: string }>(`select t.token from public.overlay_tokens t join public.workspaces w on w.id = t.workspace_id where w.owner_id = '${ALICE}'`)).rows[0]!.token;
    await as('anon', null, async () => {
      const ok = await db.query<{ workspace_name: string }>('select * from public.resolve_overlay_token($1)', [token]);
      expect(ok.rows.map((r) => r.workspace_name)).toEqual(['alice']);
      const bad = await db.query('select * from public.resolve_overlay_token($1)', ['0'.repeat(44)]);
      expect(bad.rows).toHaveLength(0);
    });
  });

  it('rotate_overlay_token revoga o anterior e cria um novo; só o dono roda', async () => {
    const old = (await db.query<{ token: string }>(`select t.token from public.overlay_tokens t join public.workspaces w on w.id = t.workspace_id where w.owner_id = '${ALICE}' and t.revoked_at is null`)).rows[0]!.token;
    const fresh = await as('authenticated', ALICE, async () => (await db.query<{ rotate_overlay_token: string }>('select public.rotate_overlay_token()')).rows[0]!.rotate_overlay_token);
    expect(fresh).toMatch(/^[0-9a-f]{44}$/);
    expect(fresh).not.toBe(old);
    await as('anon', null, async () => {
      expect((await db.query('select * from public.resolve_overlay_token($1)', [old])).rows).toHaveLength(0);
      expect((await db.query('select * from public.resolve_overlay_token($1)', [fresh])).rows).toHaveLength(1);
      await expect(db.query('select public.rotate_overlay_token()')).rejects.toThrow(/permission denied/);
    });
  });

  it('o cliente não escolhe o token nem cria workspaces', async () => {
    await as('authenticated', ALICE, async () => {
      await expect(db.query(`insert into public.overlay_tokens (token, workspace_id) select 'abc', id from public.workspaces limit 1`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`insert into public.workspaces (owner_id) values ('${BOB}')`)).rejects.toThrow(/permission denied/);
    });
  });

  it('pedir conexão atualiza o andamento; o worker escreve o status sem ser sobrescrito', async () => {
    await as('authenticated', ALICE, async () => {
      await db.query(`update public.live_connections set handle = 'streamer.demo', desired = 'connected'`);
      const row = (await db.query<{ status: string }>('select status from public.live_connections')).rows[0]!;
      expect(row.status).toBe('conectando');
      await expect(db.query(`update public.live_connections set status = 'conectado'`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`update public.live_connections set handle = 'Nome Inválido!'`)).rejects.toThrow(/check constraint/);
    });
    await as('service_role', null, async () => {
      await db.query(`update public.live_connections set status = 'conectado', message = 'ok' where handle = 'streamer.demo'`);
      const row = (await db.query<{ status: string; message: string }>(`select status, message from public.live_connections where handle = 'streamer.demo'`)).rows[0]!;
      expect(row).toEqual({ status: 'conectado', message: 'ok' });
    });
  });

  it('eventos da LIVE: só o worker grava, só o dono lê', async () => {
    const wsAlice = (await db.query<{ id: string }>(`select id from public.workspaces where owner_id = '${ALICE}'`)).rows[0]!.id;
    await as('service_role', null, async () => {
      await db.query('insert into public.live_events (workspace_id, event) values ($1, $2)', [wsAlice, JSON.stringify({ type: 'follow', username: 'ana' })]);
    });
    await as('authenticated', ALICE, async () => {
      expect((await db.query('select * from public.live_events')).rows).toHaveLength(1);
      await expect(db.query('insert into public.live_events (workspace_id, event) values ($1, $2)', [wsAlice, '{}'])).rejects.toThrow(/permission denied/);
    });
    await as('authenticated', BOB, async () => {
      expect((await db.query('select * from public.live_events')).rows).toHaveLength(0);
    });
  });
});
