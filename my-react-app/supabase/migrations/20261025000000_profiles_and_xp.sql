-- =====================================================================
-- Bulbuli: player profiles + server-side XP
-- =====================================================================
-- Run in the Supabase SQL editor (paste the whole file), or `supabase db push`.
-- Safe to run more than once, and safe on a project that already has a
-- `profiles` table: it only adds what is missing.
--
-- What it sets up
--   public.profiles      one row per auth user, created by a trigger on sign-up
--   public.xp_events     an append-only log of every XP award (also makes retries safe)
--   public.award_xp()    the ONLY way XP goes up: atomic, capped, idempotent
--   RLS                  each player can read their own row and edit only
--                        username / avatar_url; XP and stats are server-owned
--
-- Levels: level = floor(sqrt(xp / 100)) + 1
--   L1 = 0 XP, L2 = 100, L3 = 400, L4 = 900, L5 = 1600 ...
--   Mirrored in src/lib/levels.js. Change both together.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Level formula (immutable so it can drive a generated column)
-- ---------------------------------------------------------------------
create or replace function public.level_for_xp(p_xp integer)
returns integer
language sql
immutable
parallel safe
as $$
  select floor(sqrt(greatest(coalesce(p_xp, 0), 0) / 100.0))::integer + 1
$$;


-- ---------------------------------------------------------------------
-- 2. profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists created_at            timestamptz not null default now(),
  add column if not exists username              text,
  add column if not exists avatar_url            text,
  add column if not exists xp                    integer     not null default 0,
  add column if not exists activities_completed  integer     not null default 0,
  add column if not exists stats                 jsonb       not null default '{}'::jsonb,
  add column if not exists last_played_at        timestamptz,
  add column if not exists updated_at            timestamptz not null default now();

-- `level` is derived from xp, so it can never drift out of sync.
-- (If your table already had a plain `level` column, this line is skipped;
--  drop that column first if you want the generated one.)
alter table public.profiles
  add column if not exists level integer generated always as (public.level_for_xp(xp)) stored;

-- Constraints (added only if missing, so re-running is harmless)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_xp_nonnegative') then
    alter table public.profiles add constraint profiles_xp_nonnegative check (xp >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_length') then
    alter table public.profiles add constraint profiles_username_length
      check (username is null or char_length(btrim(username)) between 2 and 32);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_stats_is_object') then
    alter table public.profiles add constraint profiles_stats_is_object
      check (jsonb_typeof(stats) = 'object');
  end if;
end $$;

-- keep updated_at fresh on any edit
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------
-- 3. Create a profile automatically for every new auth user
--    (email/password and Google alike). Written so it can never fail
--    and block a sign-up.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name   text;
  v_avatar text;
begin
  v_name := btrim(coalesce(
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1)
  ));
  v_name := left(v_name, 32);
  if char_length(v_name) < 2 then
    v_name := null;
  end if;

  v_avatar := coalesce(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture'
  );

  insert into public.profiles (id, username, avatar_url)
  values (new.id, v_name, v_avatar)
  on conflict (id) do nothing;

  return new;
exception when others then
  -- Never block sign-up over a profile row; award_xp() creates it later if needed.
  raise warning 'handle_new_user: could not create profile for %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: give every existing user a profile row.
insert into public.profiles (id, username, avatar_url)
select
  u.id,
  nullif(left(btrim(coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, ''), '@', 1)
  )), 32), ''),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
on conflict (id) do nothing;

-- tidy any backfilled names that are too short for the constraint
update public.profiles set username = null
where username is not null and char_length(btrim(username)) < 2;


-- ---------------------------------------------------------------------
-- 4. xp_events: one row per award. The client sends its own UUID per
--    award, so a retried request can never be counted twice.
-- ---------------------------------------------------------------------
create table if not exists public.xp_events (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  game_id    text not null check (game_id ~ '^[a-z0-9-]{1,40}$'),
  amount     integer not null check (amount between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists xp_events_user_created_idx
  on public.xp_events (user_id, created_at desc);


-- ---------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.xp_events enable row level security;

drop policy if exists "Players read their own profile"   on public.profiles;
drop policy if exists "Players update their own profile" on public.profiles;
drop policy if exists "Players read their own xp events" on public.xp_events;

create policy "Players read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Players update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Players read their own xp events"
  on public.xp_events for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Column-level lock-down: RLS decides WHICH row, these grants decide WHICH
-- columns. Players may rename themselves or change their avatar, but xp,
-- level, stats and counters only change through award_xp().
revoke insert, update, delete on public.profiles  from anon, authenticated;
revoke insert, update, delete on public.xp_events from anon, authenticated;
revoke select on public.profiles  from anon;
revoke select on public.xp_events from anon;
grant  select on public.profiles  to authenticated;
grant  select on public.xp_events to authenticated;
grant  update (username, avatar_url) on public.profiles to authenticated;

-- The earlier tap-game migration (20261024000000_increment_score.sql) has a
-- fallback that writes total_score directly; keep that working if the column exists.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'total_score'
  ) then
    grant update (total_score) on public.profiles to authenticated;
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 6. award_xp(): atomic XP increment for the signed-in player
--
--   select * from award_xp('memory-match', 25, gen_random_uuid());
--
--   p_game_id   which game/activity earned it (lowercase, digits, dashes)
--   p_amount    1..500 per call (basic anti-cheat; the client splits bigger awards)
--   p_event_id  client-generated UUID; sending the same one twice awards once
--
--   returns the player's new totals and how much was actually added
--   (awarded = 0 means that event id had already been counted).
-- ---------------------------------------------------------------------
drop function if exists public.award_xp(text, integer, uuid);

create function public.award_xp(
  p_game_id  text,
  p_amount   integer,
  p_event_id uuid default null
)
returns table (
  new_xp                   integer,
  new_level                integer,
  new_activities_completed integer,
  awarded                  integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_event_id uuid := coalesce(p_event_id, gen_random_uuid());
  v_inserted integer := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_game_id is null or p_game_id !~ '^[a-z0-9-]{1,40}$' then
    raise exception 'invalid game id: %', p_game_id using errcode = '22023';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 500 then
    raise exception 'invalid xp amount: %', p_amount using errcode = '22023';
  end if;

  -- In case the sign-up trigger was added after this user signed up.
  insert into public.profiles (id) values (v_uid) on conflict (id) do nothing;

  insert into public.xp_events (id, user_id, game_id, amount)
  values (v_event_id, v_uid, p_game_id, p_amount)
  on conflict (id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    update public.profiles as p
       set xp                   = p.xp + p_amount,
           activities_completed = p.activities_completed + 1,
           last_played_at       = now(),
           stats = jsonb_set(
             p.stats,
             array[p_game_id],
             jsonb_build_object(
               'xp',             coalesce((p.stats -> p_game_id ->> 'xp')::integer, 0) + p_amount,
               'plays',          coalesce((p.stats -> p_game_id ->> 'plays')::integer, 0) + 1,
               'last_played_at', now()
             ),
             true
           )
     where p.id = v_uid;
  end if;

  return query
    select p.xp, p.level, p.activities_completed,
           case when v_inserted = 1 then p_amount else 0 end
      from public.profiles as p
     where p.id = v_uid;
end;
$$;

revoke all     on function public.award_xp(text, integer, uuid) from public, anon;
grant  execute on function public.award_xp(text, integer, uuid) to authenticated;
grant  execute on function public.level_for_xp(integer) to anon, authenticated;
