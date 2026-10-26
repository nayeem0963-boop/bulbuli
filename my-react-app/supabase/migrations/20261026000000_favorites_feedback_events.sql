-- =====================================================================
-- Bulbuli: favourite games, post-game feedback, first-party analytics
-- =====================================================================
-- Run in the Supabase SQL editor (paste the whole file), or `supabase db push`.
-- Safe to run more than once.
--
--   public.favorite_games  one row per (player, game). Players read / add / remove only their own.
--   public.game_feedback   😄 😐 😖 + optional tags. Anyone may ADD a row; nobody can read,
--                          change or delete rows from the app (read them in the dashboard).
--   public.game_events     analytics events. Same rules as game_feedback.
--
-- user_id is never sent by the app: it defaults to auth.uid(), so it is the signed-in
-- player's id, or NULL for guests. A row can't claim to be someone else (see the checks).
-- Nothing here stores names, emails, ad IDs or device IDs.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. favorite_games
-- ---------------------------------------------------------------------
create table if not exists public.favorite_games (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  game_id    text        not null check (game_id ~ '^[a-z0-9-]{1,40}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

alter table public.favorite_games enable row level security;

drop policy if exists "Players read their own favourites"   on public.favorite_games;
drop policy if exists "Players add their own favourites"    on public.favorite_games;
drop policy if exists "Players remove their own favourites" on public.favorite_games;

create policy "Players read their own favourites"
  on public.favorite_games for select to authenticated
  using (user_id = auth.uid());

create policy "Players add their own favourites"
  on public.favorite_games for insert to authenticated
  with check (user_id = auth.uid());

create policy "Players remove their own favourites"
  on public.favorite_games for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.favorite_games from anon, authenticated;
grant select, delete          on public.favorite_games to authenticated;
grant insert (game_id)        on public.favorite_games to authenticated;  -- user_id comes from the default

-- cap: a player can't fill the table with junk (there are ~15 games)
create or replace function public.limit_favorite_games()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.favorite_games where user_id = new.user_id) >= 100 then
    raise exception 'too many favourite games' using errcode = '22023';
  end if;
  return new;
end $$;

drop trigger if exists favorite_games_limit on public.favorite_games;
create trigger favorite_games_limit before insert on public.favorite_games
  for each row execute function public.limit_favorite_games();


-- ---------------------------------------------------------------------
-- 2. game_feedback
-- ---------------------------------------------------------------------
create table if not exists public.game_feedback (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id    uuid        default auth.uid() references auth.users (id) on delete set null,
  game_id    text        not null check (game_id ~ '^[a-z0-9-]{1,40}$'),
  reaction   text        not null check (reaction in ('fun', 'okay', 'dislike')),
  tags       text[]      not null default '{}'
             check (tags <@ array['too_hard', 'boring', 'glitchy', 'confusing']::text[]),
  trigger    text        not null check (trigger in ('completed', 'exit')),
  language   text        check (language in ('en', 'bn'))
);

create index if not exists game_feedback_game_time on public.game_feedback (game_id, created_at desc);

alter table public.game_feedback enable row level security;

drop policy if exists "Anyone can send feedback" on public.game_feedback;
create policy "Anyone can send feedback"
  on public.game_feedback for insert to anon, authenticated
  with check (user_id is not distinct from auth.uid());

revoke all on public.game_feedback from anon, authenticated;
grant insert (game_id, reaction, tags, trigger, language) on public.game_feedback to anon, authenticated;


-- ---------------------------------------------------------------------
-- 3. game_events (analytics)
-- ---------------------------------------------------------------------
create table if not exists public.game_events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id    uuid        default auth.uid() references auth.users (id) on delete set null,
  event      text        not null check (event in (
               'game_started', 'game_completed', 'game_exited_early', 'game_exited',
               'game_favorited', 'game_unfavorited', 'game_feedback_submitted')),
  game_id    text        check (game_id is null or game_id ~ '^[a-z0-9-]{1,40}$'),
  params     jsonb       not null default '{}'::jsonb
             check (jsonb_typeof(params) = 'object' and pg_column_size(params) < 2048)
);

create index if not exists game_events_event_time on public.game_events (event, created_at desc);
create index if not exists game_events_game_time  on public.game_events (game_id, created_at desc);

alter table public.game_events enable row level security;

drop policy if exists "Anyone can log game events" on public.game_events;
create policy "Anyone can log game events"
  on public.game_events for insert to anon, authenticated
  with check (user_id is not distinct from auth.uid());

revoke all on public.game_events from anon, authenticated;
grant insert (event, game_id, params) on public.game_events to anon, authenticated;


-- ---------------------------------------------------------------------
-- 4. Retention: analytics about children is kept only as long as it's useful.
--    With the pg_cron extension enabled (Database → Extensions), this deletes
--    events older than 13 months every night. Feedback is kept.
-- ---------------------------------------------------------------------
-- select cron.schedule('bulbuli-trim-game-events', '17 3 * * *',
--   $$delete from public.game_events where created_at < now() - interval '13 months'$$);


-- ---------------------------------------------------------------------
-- 5. Handy read-only views for you (dashboard / SQL editor only; not exposed to the app)
-- ---------------------------------------------------------------------
create or replace view public.game_feedback_summary
with (security_invoker = true) as
select
  game_id,
  count(*)                                              as answers,
  round(100.0 * count(*) filter (where reaction = 'fun')     / count(*), 1) as pct_fun,
  round(100.0 * count(*) filter (where reaction = 'okay')    / count(*), 1) as pct_okay,
  round(100.0 * count(*) filter (where reaction = 'dislike') / count(*), 1) as pct_dislike,
  count(*) filter (where 'too_hard'  = any (tags)) as too_hard,
  count(*) filter (where 'boring'    = any (tags)) as boring,
  count(*) filter (where 'glitchy'   = any (tags)) as glitchy,
  count(*) filter (where 'confusing' = any (tags)) as confusing
from public.game_feedback
group by game_id;

create or replace view public.game_funnel_30d
with (security_invoker = true) as
select
  game_id,
  count(*) filter (where event = 'game_started')      as starts,
  count(*) filter (where event = 'game_completed')    as rounds_completed,
  count(*) filter (where event = 'game_exited_early') as early_exits,
  round(100.0 * count(*) filter (where event = 'game_exited_early')
        / nullif(count(*) filter (where event = 'game_started'), 0), 1) as pct_early_exit
from public.game_events
where created_at > now() - interval '30 days'
group by game_id;

revoke all on public.game_feedback_summary, public.game_funnel_30d from anon, authenticated;
