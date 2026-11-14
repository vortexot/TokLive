-- TokArena: esquema inicial.
-- Cada criador tem um workspace. Todos os dados pertencem a um workspace e só o dono lê e altera,
-- exceto o que o worker da LIVE grava (service_role ignora RLS) e a consulta pública do token do overlay.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references auth.users (id) on delete cascade,
  name        text not null default 'Minha arena' check (char_length(name) between 1 and 60),
  created_at  timestamptz not null default now()
);

-- O token é o "segredo" da URL do overlay no OBS. 44 caracteres hexadecimais aleatórios.
-- Só se cria token por rotate_overlay_token(): o cliente não escolhe o valor.
create table public.overlay_tokens (
  token         text primary key default (replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  created_at    timestamptz not null default now(),
  revoked_at    timestamptz
);
create unique index overlay_tokens_one_active on public.overlay_tokens (workspace_id) where revoked_at is null;

-- Participantes, ranking, histórico e configurações dos jogos de um criador.
-- Guardado como um documento por workspace: simples e suficiente para esta fase.
create table public.workspace_state (
  workspace_id  uuid primary key references public.workspaces (id) on delete cascade,
  dataset       jsonb not null,
  prefs         jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now(),
  constraint workspace_state_size check (pg_column_size(dataset) < 4000000 and pg_column_size(prefs) < 100000)
);

-- Pedido de conexão com a LIVE (feito pelo criador) e andamento (escrito pelo worker).
create table public.live_connections (
  workspace_id  uuid primary key references public.workspaces (id) on delete cascade,
  handle        text check (handle is null or handle ~ '^[a-z0-9._]{2,24}$'),
  desired       text not null default 'disconnected' check (desired in ('connected', 'disconnected')),
  status        text not null default 'desconectado',
  message       text,
  updated_at    timestamptz not null default now()
);

-- Eventos normalizados da LIVE, gravados só pelo worker.
create table public.live_events (
  id            bigint generated always as identity primary key,
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  event         jsonb not null,
  created_at    timestamptz not null default now(),
  constraint live_events_size check (pg_column_size(event) < 4000)
);
create index live_events_ws_id on public.live_events (workspace_id, id);

-- ---------------------------------------------------------------------------
-- Funções
-- ---------------------------------------------------------------------------

create function public.owns_workspace(ws uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.workspaces w where w.id = ws and w.owner_id = auth.uid());
$$;

-- Cria o workspace, o token inicial e a linha de conexão quando uma conta nasce.
create function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  ws uuid;
begin
  insert into public.workspaces (owner_id, name)
  values (new.id, left(coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Minha arena'), 60))
  returning id into ws;
  insert into public.overlay_tokens (workspace_id) values (ws);
  insert into public.live_connections (workspace_id) values (ws);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Gera um token novo e revoga o anterior (use quando a URL do overlay vazar).
create function public.rotate_overlay_token()
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  ws uuid;
  fresh text;
begin
  select id into ws from public.workspaces where owner_id = auth.uid();
  if ws is null then
    raise exception 'workspace_not_found' using errcode = 'P0002';
  end if;
  update public.overlay_tokens set revoked_at = now() where workspace_id = ws and revoked_at is null;
  insert into public.overlay_tokens (workspace_id) values (ws) returning token into fresh;
  return fresh;
end;
$$;

-- Consulta pública (o OBS não tem login): diz se o token vale e de qual workspace é.
create function public.resolve_overlay_token(p_token text)
returns table (workspace_id uuid, workspace_name text)
language sql stable security definer
set search_path = public
as $$
  select w.id, w.name
  from public.overlay_tokens t
  join public.workspaces w on w.id = t.workspace_id
  where t.token = p_token and t.revoked_at is null;
$$;

-- Quem muda o desejo de conexão reinicia o andamento; o worker (service_role) escreve o andamento sem isso.
create function public.live_connections_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if coalesce(auth.role(), '') <> 'service_role'
     and (new.desired is distinct from old.desired or new.handle is distinct from old.handle) then
    new.status := case when new.desired = 'connected' then 'conectando' else 'desconectado' end;
    new.message := null;
  end if;
  return new;
end;
$$;

create trigger live_connections_touch
  before update on public.live_connections
  for each row execute function public.live_connections_touch();

-- Apaga eventos com mais de um dia. Agende com pg_cron ou rode de vez em quando.
create function public.prune_live_events()
returns void
language sql security definer
set search_path = public
as $$
  delete from public.live_events where created_at < now() - interval '1 day';
$$;

-- ---------------------------------------------------------------------------
-- Segurança por linha
-- ---------------------------------------------------------------------------

alter table public.workspaces       enable row level security;
alter table public.overlay_tokens   enable row level security;
alter table public.workspace_state  enable row level security;
alter table public.live_connections enable row level security;
alter table public.live_events      enable row level security;

create policy workspaces_select on public.workspaces for select to authenticated using (owner_id = auth.uid());
create policy workspaces_update on public.workspaces for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy overlay_tokens_select on public.overlay_tokens for select to authenticated using (public.owns_workspace(workspace_id));

create policy state_select on public.workspace_state for select to authenticated using (public.owns_workspace(workspace_id));
create policy state_insert on public.workspace_state for insert to authenticated with check (public.owns_workspace(workspace_id));
create policy state_update on public.workspace_state for update to authenticated using (public.owns_workspace(workspace_id)) with check (public.owns_workspace(workspace_id));

create policy live_conn_select on public.live_connections for select to authenticated using (public.owns_workspace(workspace_id));
create policy live_conn_update on public.live_connections for update to authenticated using (public.owns_workspace(workspace_id)) with check (public.owns_workspace(workspace_id));

create policy live_events_select on public.live_events for select to authenticated using (public.owns_workspace(workspace_id));

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public;

grant select on public.workspaces, public.overlay_tokens, public.live_events to authenticated;
grant update (name) on public.workspaces to authenticated;
grant select, insert, update on public.workspace_state to authenticated;
grant select on public.live_connections to authenticated;
grant update (handle, desired) on public.live_connections to authenticated;

grant execute on function public.owns_workspace(uuid) to authenticated;
grant execute on function public.rotate_overlay_token() to authenticated;
grant execute on function public.resolve_overlay_token(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tempo real (publicação do Supabase)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.live_events, public.live_connections;
  end if;
end;
$$;
