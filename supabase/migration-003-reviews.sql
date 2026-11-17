-- Post-lunch reviews: 1-5 stars in five categories plus a short comment (max 100 chars).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.reviews (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  option_id uuid references public.options(id) on delete set null,
  food_quality int not null check (food_quality between 1 and 5),
  ambience int not null check (ambience between 1 and 5),
  price int not null check (price between 1 and 5),
  location_parking int not null check (location_parking between 1 and 5),
  repeatable int not null check (repeatable between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 100),
  updated_at timestamptz not null default now()
);

create index if not exists reviews_session_idx on public.reviews(session_id);

alter table public.reviews enable row level security;
drop policy if exists "public read" on public.reviews;
create policy "public read" on public.reviews for select to anon, authenticated using (true);
revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to anon, authenticated;

-- One review per participant; they can update it. Only open once results are out.
create or replace function public.submit_review(
  p_code text, p_client_id text, p_option_id uuid,
  p_food_quality int, p_ambience int, p_price int, p_location_parking int, p_repeatable int,
  p_comment text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  s sessions;
  p participants;
  v_option uuid;
begin
  select * into s from sessions where code = lower(p_code);
  if not found then raise exception 'Session not found'; end if;
  select * into p from participants where session_id = s.id and client_id = p_client_id;
  if not found then raise exception 'Join the session first'; end if;
  if session_phase(s) <> 'results' then raise exception 'Reviews open when results are out'; end if;
  if least(p_food_quality, p_ambience, p_price, p_location_parking, p_repeatable) < 1
     or greatest(p_food_quality, p_ambience, p_price, p_location_parking, p_repeatable) > 5 then
    raise exception 'Ratings must be between 1 and 5 stars';
  end if;
  if char_length(coalesce(p_comment, '')) > 100 then
    raise exception 'Comments are limited to 100 characters';
  end if;
  select id into v_option from options where id = p_option_id and session_id = s.id;

  insert into reviews (participant_id, session_id, option_id, food_quality, ambience, price,
                       location_parking, repeatable, comment)
  values (p.id, s.id, v_option, p_food_quality, p_ambience, p_price, p_location_parking,
          p_repeatable, trim(coalesce(p_comment, '')))
  on conflict (participant_id)
  do update set option_id = excluded.option_id,
                food_quality = excluded.food_quality,
                ambience = excluded.ambience,
                price = excluded.price,
                location_parking = excluded.location_parking,
                repeatable = excluded.repeatable,
                comment = excluded.comment,
                updated_at = now();
end $$;

revoke all on function public.submit_review(text, text, uuid, int, int, int, int, int, text) from public;
grant execute on function public.submit_review(text, text, uuid, int, int, int, int, int, text)
  to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.reviews;
exception when duplicate_object then null;
end $$;
