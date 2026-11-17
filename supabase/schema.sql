-- egm-lunch schema. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Tables are read-only for the public anon key; all writes go through the
-- security-definer functions below, which enforce phases, limits and ownership.

create extension if not exists pgcrypto;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null check (char_length(name) between 1 and 80),
  creator_id text not null,
  suggest_ends_at timestamptz not null,
  rank_seconds int not null check (rank_seconds between 0 and 86400),
  suggest_minutes int not null default 30,
  rank_base_seconds int not null default 60,
  created_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  client_id text not null,
  name text not null check (char_length(name) between 1 and 40),
  joined_at timestamptz not null default now(),
  unique (session_id, client_id)
);

create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  url text check (url is null or (char_length(url) <= 300 and url ~* '^https?://')),
  created_at timestamptz not null default now()
);

create table if not exists public.vetoes (
  option_id uuid not null references public.options(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  primary key (option_id, participant_id)
);

create table if not exists public.ballots (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  ranking uuid[] not null,
  locked boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists participants_session_idx on public.participants(session_id);
create index if not exists options_session_idx on public.options(session_id);
create index if not exists vetoes_session_idx on public.vetoes(session_id);
create index if not exists ballots_session_idx on public.ballots(session_id);

-- Read-only access for anon; no direct writes.
alter table public.sessions enable row level security;
alter table public.participants enable row level security;
alter table public.options enable row level security;
alter table public.vetoes enable row level security;
alter table public.ballots enable row level security;

drop policy if exists "public read" on public.sessions;
drop policy if exists "public read" on public.participants;
drop policy if exists "public read" on public.options;
drop policy if exists "public read" on public.vetoes;
drop policy if exists "public read" on public.ballots;
create policy "public read" on public.sessions for select to anon, authenticated using (true);
create policy "public read" on public.participants for select to anon, authenticated using (true);
create policy "public read" on public.options for select to anon, authenticated using (true);
create policy "public read" on public.vetoes for select to anon, authenticated using (true);
create policy "public read" on public.ballots for select to anon, authenticated using (true);

revoke all on public.sessions, public.participants, public.options, public.vetoes, public.ballots
  from anon, authenticated;
grant select on public.sessions, public.participants, public.options, public.vetoes, public.ballots
  to anon, authenticated;

-- Phase is derived from time: suggest -> rank -> results.
create or replace function public.session_phase(s public.sessions)
returns text language sql stable as $$
  select case
    when now() < s.suggest_ends_at then 'suggest'
    when now() < s.suggest_ends_at + make_interval(secs => s.rank_seconds) then 'rank'
    else 'results'
  end
$$;

create or replace function public.server_now()
returns timestamptz language sql stable as $$ select now() $$;

create or replace function public.create_session(
  p_name text, p_creator_id text, p_suggest_minutes int, p_rank_seconds int
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
begin
  if p_name is null or char_length(trim(p_name)) not between 1 and 80 then
    raise exception 'Session name must be 1-80 characters';
  end if;
  if p_creator_id is null or char_length(p_creator_id) < 8 then
    raise exception 'Invalid client id';
  end if;
  if p_suggest_minutes not between 1 and 720 then
    raise exception 'Suggestion timer must be 1-720 minutes';
  end if;
  if p_rank_seconds not between 30 and 3600 then
    raise exception 'Ranking timer must be 30-3600 seconds';
  end if;
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    begin
      insert into sessions (code, name, creator_id, suggest_ends_at, rank_seconds,
                            suggest_minutes, rank_base_seconds)
      values (v_code, trim(p_name), p_creator_id,
              now() + make_interval(mins => p_suggest_minutes), p_rank_seconds,
              p_suggest_minutes, p_rank_seconds);
      return v_code;
    exception when unique_violation then
      -- try another code
    end;
  end loop;
end $$;

create or replace function public.join_session(p_code text, p_client_id text, p_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s sessions;
  v_id uuid;
begin
  select * into s from sessions where code = lower(p_code);
  if not found then raise exception 'Session not found'; end if;
  if p_client_id is null or char_length(p_client_id) < 8 then raise exception 'Invalid client id'; end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 40 then
    raise exception 'Name must be 1-40 characters';
  end if;

  select id into v_id from participants where session_id = s.id and client_id = p_client_id;
  if found then
    update participants set name = trim(p_name) where id = v_id;
    return v_id;
  end if;
  if session_phase(s) <> 'suggest' then
    raise exception 'This session is no longer accepting new people';
  end if;
  insert into participants (session_id, client_id, name)
  values (s.id, p_client_id, trim(p_name)) returning id into v_id;
  return v_id;
end $$;

create or replace function public.add_option(
  p_code text, p_client_id text, p_name text, p_url text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s sessions;
  p participants;
  v_id uuid;
begin
  select * into s from sessions where code = lower(p_code);
  if not found then raise exception 'Session not found'; end if;
  select * into p from participants where session_id = s.id and client_id = p_client_id;
  if not found then raise exception 'Join the session first'; end if;
  if session_phase(s) <> 'suggest' then raise exception 'Suggestions are closed'; end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 80 then
    raise exception 'Place name must be 1-80 characters';
  end if;
  if (select count(*) from options where participant_id = p.id) >= 3 then
    raise exception 'You can suggest up to 3 places';
  end if;
  insert into options (session_id, participant_id, name, url)
  values (s.id, p.id, trim(p_name), nullif(trim(coalesce(p_url, '')), ''))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.remove_option(p_option_id uuid, p_client_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  s sessions;
  o options;
begin
  select * into o from options where id = p_option_id;
  if not found then return; end if;
  select * into s from sessions where id = o.session_id;
  if session_phase(s) <> 'suggest' then raise exception 'Suggestions are closed'; end if;
  if not exists (select 1 from participants where id = o.participant_id and client_id = p_client_id) then
    raise exception 'You can only remove your own suggestions';
  end if;
  delete from options where id = p_option_id;
end $$;

create or replace function public.toggle_veto(p_option_id uuid, p_client_id text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  s sessions;
  o options;
  p participants;
  v_limit int;
  v_used int;
begin
  select * into o from options where id = p_option_id;
  if not found then raise exception 'Option not found'; end if;
  select * into s from sessions where id = o.session_id;
  select * into p from participants where session_id = s.id and client_id = p_client_id;
  if not found then raise exception 'Join the session first'; end if;
  if session_phase(s) <> 'suggest' then raise exception 'Vetoing is closed'; end if;

  if exists (select 1 from vetoes where option_id = o.id and participant_id = p.id) then
    delete from vetoes where option_id = o.id and participant_id = p.id;
    return false;
  end if;
  select count(*) - 1 into v_limit from participants where session_id = s.id;
  select count(*) into v_used from vetoes where session_id = s.id and participant_id = p.id;
  if v_used >= v_limit then raise exception 'No vetoes left'; end if;
  insert into vetoes (option_id, participant_id, session_id) values (o.id, p.id, s.id);
  return true;
end $$;

create or replace function public.save_ballot(
  p_code text, p_client_id text, p_ranking uuid[], p_locked boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare
  s sessions;
  p participants;
begin
  select * into s from sessions where code = lower(p_code);
  if not found then raise exception 'Session not found'; end if;
  select * into p from participants where session_id = s.id and client_id = p_client_id;
  if not found then raise exception 'Join the session first'; end if;
  if session_phase(s) <> 'rank' then raise exception 'Ranking is not open'; end if;
  if exists (select 1 from ballots where participant_id = p.id and locked) then
    raise exception 'Your ranking is already locked';
  end if;
  insert into ballots (participant_id, session_id, ranking, locked)
  values (p.id, s.id, p_ranking, coalesce(p_locked, false))
  on conflict (participant_id)
  do update set ranking = excluded.ranking, locked = excluded.locked, updated_at = now();
end $$;

create or replace function public.extend_phase(p_code text, p_client_id text, p_seconds int)
returns void
language plpgsql security definer set search_path = public as $$
declare
  s sessions;
  v_phase text;
begin
  select * into s from sessions where code = lower(p_code);
  if not found then raise exception 'Session not found'; end if;
  if s.creator_id <> p_client_id then raise exception 'Only the creator can change timers'; end if;
  if p_seconds not between 30 and 10800 then raise exception 'Invalid extension'; end if;
  v_phase := session_phase(s);
  if v_phase = 'suggest' then
    update sessions set suggest_ends_at = suggest_ends_at + make_interval(secs => p_seconds) where id = s.id;
  elsif v_phase = 'rank' then
    update sessions set rank_seconds = least(86400, rank_seconds + p_seconds) where id = s.id;
  else
    raise exception 'Session has finished';
  end if;
end $$;

create or replace function public.end_phase_early(p_code text, p_client_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  s sessions;
  v_phase text;
begin
  select * into s from sessions where code = lower(p_code);
  if not found then raise exception 'Session not found'; end if;
  if s.creator_id <> p_client_id then raise exception 'Only the creator can change timers'; end if;
  v_phase := session_phase(s);
  if v_phase = 'suggest' then
    update sessions set suggest_ends_at = now() where id = s.id;
  elsif v_phase = 'rank' then
    update sessions
      set rank_seconds = floor(extract(epoch from (now() - suggest_ends_at)))::int
      where id = s.id;
  end if;
end $$;

revoke all on function
  public.create_session(text, text, int, int),
  public.join_session(text, text, text),
  public.add_option(text, text, text, text),
  public.remove_option(uuid, text),
  public.toggle_veto(uuid, text),
  public.save_ballot(text, text, uuid[], boolean),
  public.extend_phase(text, text, int),
  public.end_phase_early(text, text)
  from public;
grant execute on function
  public.server_now(),
  public.create_session(text, text, int, int),
  public.join_session(text, text, text),
  public.add_option(text, text, text, text),
  public.remove_option(uuid, text),
  public.toggle_veto(uuid, text),
  public.save_ballot(text, text, uuid[], boolean),
  public.extend_phase(text, text, int),
  public.end_phase_early(text, text)
  to anon, authenticated;

-- Creator timer reset (also available as supabase/migration-002-reset-timer.sql for existing projects).
-- Fresh installs: run migration-002-reset-timer.sql after this file.

-- Realtime updates for the browser.
alter publication supabase_realtime add table
  public.sessions, public.participants, public.options, public.vetoes, public.ballots;

-- Also run supabase/migration-002-reset-timer.sql (reset timer + edit option).
