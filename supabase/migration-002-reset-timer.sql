-- Migration: creator "reset timer" support. Safe to run more than once.
-- Supabase: SQL Editor -> New query -> paste -> Run.

alter table public.sessions add column if not exists suggest_minutes int not null default 30;
alter table public.sessions add column if not exists rank_base_seconds int not null default 60;

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

-- Restarts the current timer from its original length (creator only).
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
  elsif v_phase = 'rank' then
    update sessions
      set rank_seconds = floor(extract(epoch from (now() - suggest_ends_at)))::int + rank_base_seconds
      where id = s.id;
  else
    raise exception 'Session has finished';
  end if;
end $$;

revoke all on function public.create_session(text, text, int, int) from public;
revoke all on function public.reset_phase_timer(text, text) from public;
grant execute on function public.create_session(text, text, int, int) to anon, authenticated;
grant execute on function public.reset_phase_timer(text, text) to anon, authenticated;

-- Lets a participant edit their own suggestion until the suggest timer ends.
create or replace function public.edit_option(
  p_option_id uuid, p_client_id text, p_name text, p_url text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  s sessions;
  o options;
begin
  select * into o from options where id = p_option_id;
  if not found then raise exception 'Option not found'; end if;
  select * into s from sessions where id = o.session_id;
  if session_phase(s) <> 'suggest' then raise exception 'Suggestions are closed'; end if;
  if not exists (select 1 from participants where id = o.participant_id and client_id = p_client_id) then
    raise exception 'You can only edit your own suggestions';
  end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 80 then
    raise exception 'Place name must be 1-80 characters';
  end if;
  update options
    set name = trim(p_name), url = nullif(trim(coalesce(p_url, '')), '')
    where id = p_option_id;
end $$;

revoke all on function public.edit_option(uuid, text, text, text) from public;
grant execute on function public.edit_option(uuid, text, text, text) to anon, authenticated;
