-- =====================================================================
-- Bulbuli: badges (achievements) on the player's profile
-- =====================================================================
-- Run in the Supabase SQL editor (paste the whole file), or `supabase db push`.
-- Needs 20261025000000_profiles_and_xp.sql first. Safe to run more than once.
--
--   profiles.unlocked_badges  jsonb array: [{ "badgeId": "sky-explorer", "unlockedAt": "2026-10-28T09:45:00Z" }]
--   record_badges(jsonb)      the only way to add to it. Adds badges, never removes any,
--                             and keeps the earliest date when a badge is sent twice.
--
-- Which badges exist, and what earns them, lives in src/data/badgesConfig.js. The app
-- checks requirements against profiles.xp / profiles.stats (which only award_xp() can
-- change) and then records the unlock here. Until this file is run, badges still work
-- in the app and are kept on each device; nothing breaks.
-- =====================================================================

alter table public.profiles
  add column if not exists unlocked_badges jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_unlocked_badges_is_array') then
    alter table public.profiles add constraint profiles_unlocked_badges_is_array
      check (jsonb_typeof(unlocked_badges) = 'array');
  end if;
end $$;

-- A timestamp from text, or null if it isn't one (so a bad date can't make the call fail).
create or replace function public.try_timestamptz(p_text text)
returns timestamptz
language plpgsql
immutable
as $$
begin
  return p_text::timestamptz;
exception when others then
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- record_badges(): add unlocked badges for the signed-in player
--
--   select record_badges('[{"badgeId":"hatchling","unlockedAt":"2026-10-28T09:45:00Z"}]');
--
--   returns the player's whole unlocked list afterwards (oldest first).
--   Dates are kept between the player's sign-up and now, so none are in the future.
-- ---------------------------------------------------------------------
create or replace function public.record_badges(p_badges jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_created timestamptz;
  v_current jsonb;
  v_merged  jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_badges is null or jsonb_typeof(p_badges) <> 'array' then
    raise exception 'badges must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_badges) > 100 then
    raise exception 'too many badges in one call' using errcode = '22023';
  end if;

  insert into public.profiles (id) values (v_uid) on conflict (id) do nothing;

  select p.created_at, p.unlocked_badges
    into v_created, v_current
    from public.profiles as p
   where p.id = v_uid
     for update;

  with incoming as (
    select e ->> 'badgeId' as badge_id,
           least(greatest(coalesce(public.try_timestamptz(e ->> 'unlockedAt'), now()), v_created), now()) as unlocked_at
      from jsonb_array_elements(p_badges) as e
     where jsonb_typeof(e) = 'object'
       and (e ->> 'badgeId') ~ '^[a-z0-9-]{1,40}$'
  ),
  existing as (
    select e ->> 'badgeId' as badge_id,
           coalesce(public.try_timestamptz(e ->> 'unlockedAt'), now()) as unlocked_at
      from jsonb_array_elements(coalesce(v_current, '[]'::jsonb)) as e
     where jsonb_typeof(e) = 'object'
       and (e ->> 'badgeId') ~ '^[a-z0-9-]{1,40}$'
  ),
  merged as (
    select badge_id, min(unlocked_at) as unlocked_at
      from (select * from existing union all select * from incoming) as all_badges
     group by badge_id
     order by min(unlocked_at)
     limit 200
  )
  select coalesce(
           jsonb_agg(jsonb_build_object('badgeId', badge_id, 'unlockedAt', unlocked_at) order by unlocked_at),
           '[]'::jsonb)
    into v_merged
    from merged;

  update public.profiles set unlocked_badges = v_merged where id = v_uid;
  return v_merged;
end;
$$;

revoke all     on function public.record_badges(jsonb) from public, anon;
grant  execute on function public.record_badges(jsonb) to authenticated;
-- profiles already has `grant select ... to authenticated` (table-wide), so players
-- can read their own unlocked_badges through the existing RLS policy.
