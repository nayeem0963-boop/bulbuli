-- =====================================================================
-- Bulbuli: Neon Velocity — global leaderboards + ghosts
-- =====================================================================
-- Run in the Supabase SQL editor (paste the whole file), or `supabase db push`.
-- Safe to run more than once, and safe on a project that already has a
-- `leaderboards` table: it only adds the columns, keys and policies the game's
-- client (src/games/neon-velocity/services/supabaseLeaderboard.js) relies on.
--
--   one row per (board_id, user_id) = that player's best run on that board
--   board_id is split by difficulty: daily-YYYY-MM-DD-{easy|medium|hard}, endless-{…}
--   ghost    packed replay { v, hz, count, data } for "race the world #1"
--
-- RLS: anyone can read; a signed-in player can only write their own row,
-- and a write can never lower their best score.
-- =====================================================================

create table if not exists public.leaderboards (
  board_id text not null,
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade
);

alter table public.leaderboards
  add column if not exists name          text,
  add column if not exists score         integer     not null default 0,
  add column if not exists distance      integer     not null default 0,
  add column if not exists time_ms       integer     not null default 0,
  add column if not exists crystals      integer     not null default 0,
  add column if not exists max_speed_kmh integer     not null default 0,
  add column if not exists surges        integer     not null default 0,
  add column if not exists difficulty    text,
  add column if not exists skin          text,
  add column if not exists trail         text,
  add column if not exists wings         text,
  add column if not exists ghost         jsonb,
  add column if not exists created_at    timestamptz not null default now(),
  add column if not exists updated_at    timestamptz not null default now();

alter table public.leaderboards
  add column if not exists has_ghost boolean generated always as (ghost is not null) stored;

-- upsert target (onConflict: 'board_id,user_id') + fast "top N of a board"
create unique index if not exists leaderboards_board_user_key on public.leaderboards (board_id, user_id);
create index if not exists leaderboards_board_score_idx on public.leaderboards (board_id, score desc, updated_at);

-- Plausibility (mirrors the old Firestore rules; not anti-cheat)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'leaderboards_plausible') then
    alter table public.leaderboards add constraint leaderboards_plausible check (
      name is not null and char_length(name) between 1 and 16
      and score >= 0 and distance >= 0 and crystals >= 0 and time_ms >= 1000
      and distance <= time_ms / 1000.0 * 70                      -- ≈ 64 m/s top speed
      and score <= (distance + crystals * 100) * 2               -- 2× = Velocity Overdrive
      and max_speed_kmh <= 260
      and (difficulty is null or difficulty in ('easy', 'medium', 'hard'))
      and (difficulty is null or board_id like '%-' || difficulty)
      and (ghost is null or pg_column_size(ghost) < 400000)
    ) not valid;
  end if;
end $$;

-- A write never lowers a best: a worse run leaves the row untouched.
create or replace function public.leaderboards_keep_best()
returns trigger
language plpgsql
as $$
begin
  if new.score <= old.score then
    return old;
  end if;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists leaderboards_keep_best on public.leaderboards;
create trigger leaderboards_keep_best
  before update on public.leaderboards
  for each row execute function public.leaderboards_keep_best();

-- RLS
alter table public.leaderboards enable row level security;

drop policy if exists "leaderboards are public" on public.leaderboards;
create policy "leaderboards are public" on public.leaderboards
  for select to anon, authenticated using (true);

drop policy if exists "players insert their own runs" on public.leaderboards;
create policy "players insert their own runs" on public.leaderboards
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "players update their own runs" on public.leaderboards;
create policy "players update their own runs" on public.leaderboards
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.leaderboards to anon, authenticated;
grant insert, update on public.leaderboards to authenticated;
