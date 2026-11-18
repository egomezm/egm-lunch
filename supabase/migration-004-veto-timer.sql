-- Migration: separate Veto timer (suggest -> veto -> rank -> results). Safe to run more than once.
-- Supabase: SQL Editor -> New query -> paste -> Run.
-- Requires migration-002 (suggest_minutes, rank_base_seconds). Existing sessions get a 0s veto window.

alter table public.sessions add column if not exists veto_seconds int not null default 0;
alter table public.sessions add column if not exists veto_base_seconds int not null default 60;

create or replace function public.session_phase(s public.sessions)
returns text language sql stable as $$
  select case
    when now() < s.suggest_ends_at then 'suggest'
    when now() < s.suggest_ends_at + make_interval(secs => s.veto_seconds) then 'veto'
    when now() < s.suggest_ends_at + make_interval(secs => s.veto_seconds + s.rank_seconds) then 'rank'
    else 'results'
  end
$$;

drop function if exists public.create_session(text, text, int, int);
create or replace function public.create_session(
  p_name text, p_creator_id text, p_suggest_minutes int, p_veto_seconds int, p_rank_seconds int
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
  if p_veto_seconds not between 30 and 3600 then
    raise exception 'Veto timer must be 30-3600 seconds';
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
                            suggest_minutes, rank_base_seconds, veto_seconds, veto_base_seconds)
      values (v_code, trim(p_name), p_creator_id,
              now() + make_interval(mins => p_suggest_minutes), p_rank_seconds,
              p_suggest_minutes, p_rank_seconds, p_veto_seconds, p_veto_seconds);
      return v_code;
    exception when unique_violation then
      -- try another code
    end;
  end loop;
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
  if session_phase(s) <> 'veto' then raise exception 'Vetoing is not open'; end if;

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
  elsif v_phase = 'veto' then
    update sessions set veto_seconds = least(86400, veto_seconds + p_seconds) where id = s.id;
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
  elsif v_phase = 'veto' then
    update sessions
      set veto_seconds = floor(extract(epoch from (now() - suggest_ends_at)))::int
      where id = s.id;
  elsif v_phase = 'rank' then
    update sessions
      set rank_seconds = floor(extract(epoch from (now() - suggest_ends_at)))::int - veto_seconds
      where id = s.id;
  end if;
end $$;

create or replace function public.reset_phase_timer(p_code text, p_client_id text)
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
    update sessions
      set suggest_ends_at = now() + make_interval(mins => suggest_minutes)
      where id = s.id;
  elsif v_phase = 'veto' then
    update sessions
      set veto_seconds = floor(extract(epoch from (now() - suggest_ends_at)))::int + veto_base_seconds
      where id = s.id;
  elsif v_phase = 'rank' then
    update sessions
      set rank_seconds = floor(extract(epoch from (now() - suggest_ends_at)))::int
                         - veto_seconds + rank_base_seconds
      where id = s.id;
  else
    raise exception 'Session has finished';
  end if;
end $$;

revoke all on function public.create_session(text, text, int, int, int) from public;
grant execute on function public.create_session(text, text, int, int, int) to anon, authenticated;
