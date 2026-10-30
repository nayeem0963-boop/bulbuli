-- =====================================================================
-- Bulbuli: verifiable achievement certificates
-- =====================================================================
-- Run in the Supabase SQL editor (paste the whole file), or `supabase db push`.
-- Needs 20261025000000_profiles_and_xp.sql and 20261028000000_badges.sql first.
-- Safe to run more than once.
--
-- What it sets up
--   public.certificate_badges   the badges that come with a certificate, and what earns
--                               them. A server-side copy of the certificateEligible badges in
--                               src/data/badgesConfig.js (a test checks the two agree).
--   public.certificates         one row per player per badge: the issued certificate, with a
--                               public code (BLB-XXXX-XXXX) and a secret, unguessable
--                               verification token used in https://bulbuli.org/certificate/<token>
--   profiles.certificate_name_display
--                               how much of the player's name the public page shows:
--                               'full' | 'first_name' (default) | 'initials' | 'hidden'
--   issue_certificate()         the ONLY way a certificate is created. Checks the badge's
--                               requirement against profiles.xp / stats (which only award_xp()
--                               can change), so a certificate can't be issued by editing the
--                               browser. Idempotent: asking again returns the same certificate.
--   verify_certificate()        what the public verification page reads. Callable without an
--                               account. Returns only the certificate's public facts, never the
--                               email, account id or anything else about the player.
--   set_certificate_privacy()   the player (or their parent) picks the name display.
--   set_certificate_public()    turns one certificate's public link on or off.
--   revoke_certificate()        staff only (SQL editor / service role): marks a certificate revoked.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Which badges come with a certificate (mirrors src/data/badgesConfig.js)
-- ---------------------------------------------------------------------
create table if not exists public.certificate_badges (
  badge_id         text primary key check (badge_id ~ '^[a-z0-9-]{1,40}$'),
  title            text    not null,
  description      text    not null,
  icon             text    not null,
  requirement_type text    not null check (requirement_type in ('level', 'total_xp', 'game_xp', 'game_plays', 'games_played', 'activities')),
  game_id          text    check (game_id is null or game_id ~ '^[a-z0-9-]{1,40}$'),
  game_title       text,
  target           integer not null check (target > 0),
  active           boolean not null default true
);

insert into public.certificate_badges (badge_id, title, description, icon, requirement_type, game_id, game_title, target) values
  ('sky-explorer',                 'Sky Explorer',             'Reached level 5. Bulbuli is proud of you!',                       '🪽', 'level',        null,                 null,                5),
  ('high-flyer',                   'High Flyer',               'Reached level 8 with lots of practice.',                          '🚀', 'level',        null,                 null,                8),
  ('bulbuli-legend',               'Bulbuli Legend',           'Reached level 10. A true learning legend!',                       '👑', 'level',        null,                 null,                10),
  ('math-hero-master',             'Math Hero Master',         'Earned 1,000 XP in Math Hero. Amazing adding and taking away!',   '🦸', 'game_xp',      'math-hero',          'Math Hero',         1000),
  ('math-hero-pro-star',           'Math Hero Pro Star',       'Earned 300 XP in Math Hero Pro. A true maths hero!',              '🌟', 'game_xp',      'math-hero-pro',      'Math Hero Pro',     300),
  ('math-hero-pro-plus-tactician', 'Math Hero Pro+ Tactician', 'Earned all 350 XP in Math Hero Pro+: every star in every mission!', '⚡', 'game_xp',    'math-hero-pro-plus', 'Math Hero Pro+',    350),
  ('math-master-champion',         'Math Master Champion',     'Earned 1,000 XP in Math Master.',                                 '🏆', 'game_xp',      'math-master',        'Math Master',       1000),
  ('code-architect',               'Code Architect',           'Earned every star in HTML Architect: all 200 XP.',                '🏗️', 'game_xp',      'html-architect',     'HTML Architect',    200),
  ('typing-wizard',                'Typing Wizard',            'Earned 1,000 XP in Sky Typewriter.',                              '🪄', 'game_xp',      'sky-typewriter',     'Sky Typewriter',    1000),
  ('dedicated-learner',            'Dedicated Learner',        'Finished 100 rounds across Bulbuli games.',                       '📚', 'activities',   null,                 null,                100),
  ('arcade-all-star',              'Arcade All-Star',          'Played 8 different Bulbuli games.',                               '🌟', 'games_played', null,                 null,                8)
on conflict (badge_id) do update set
  title            = excluded.title,
  description      = excluded.description,
  icon             = excluded.icon,
  requirement_type = excluded.requirement_type,
  game_id          = excluded.game_id,
  game_title       = excluded.game_title,
  target           = excluded.target;

alter table public.certificate_badges enable row level security;
revoke all on public.certificate_badges from anon, authenticated;
-- (read only through the functions below)


-- ---------------------------------------------------------------------
-- 2. Name display on the public page (per player; a parent can change it from the dashboard)
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists certificate_name_display text not null default 'first_name';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_certificate_name_display_valid') then
    alter table public.profiles add constraint profiles_certificate_name_display_valid
      check (certificate_name_display in ('full', 'first_name', 'initials', 'hidden'));
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 3. Issued certificates
-- ---------------------------------------------------------------------
create table if not exists public.certificates (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  badge_id           text not null references public.certificate_badges (badge_id),
  certificate_code   text not null unique check (certificate_code ~ '^BLB-[0-9A-F]{4}-[0-9A-F]{4}$'),
  verification_token text not null unique check (verification_token ~ '^[0-9a-f]{32}$'),
  student_name       text not null check (char_length(student_name) between 1 and 40),
  badge_title        text not null,
  badge_description  text not null,
  badge_icon         text not null,
  xp_earned          integer not null check (xp_earned >= 0),
  xp_label           text not null,
  awarded_at         timestamptz not null,
  issued_at          timestamptz not null default now(),
  is_public          boolean not null default true,
  revoked_at         timestamptz,
  revoked_reason     text,
  constraint certificates_one_per_badge unique (user_id, badge_id)
);

create index if not exists certificates_user_idx on public.certificates (user_id, awarded_at desc);

alter table public.certificates enable row level security;

drop policy if exists "Players read their own certificates" on public.certificates;
create policy "Players read their own certificates"
  on public.certificates for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Rows are only ever written by the security-definer functions below.
revoke all on public.certificates from anon, authenticated;
grant select on public.certificates to authenticated;


-- A random lowercase-hex string, from gen_random_uuid() (cryptographically strong, built in
-- since PostgreSQL 13, so no extension is needed). 32 chars = 122 random bits.
create or replace function public.random_hex32()
returns text
language sql
volatile
as $$
  select replace(gen_random_uuid()::text, '-', '')
$$;


-- ---------------------------------------------------------------------
-- 4. issue_certificate(): create (or fetch) the signed-in player's certificate for a badge
--
--   select issue_certificate('sky-explorer', 'Nayeem');
--
--   p_display_name  used only when the profile has no username (the name the dashboard shows).
--   returns the certificate row as JSON. Raises 'requirement_not_met' if the player's
--   server-side XP / stats don't qualify for the badge.
-- ---------------------------------------------------------------------
create or replace function public.issue_certificate(p_badge_id text, p_display_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_badge    public.certificate_badges%rowtype;
  v_profile  public.profiles%rowtype;
  v_cert     public.certificates%rowtype;
  v_current  integer := 0;
  v_goal     integer;
  v_awarded  timestamptz;
  v_name     text;
  v_code     text;
  v_xp       integer;
  v_xp_label text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_badge_id is null or p_badge_id !~ '^[a-z0-9-]{1,40}$' then
    raise exception 'invalid badge id' using errcode = '22023';
  end if;

  select * into v_badge from public.certificate_badges where badge_id = p_badge_id and active;
  if not found then
    raise exception 'no certificate for this badge' using errcode = '22023';
  end if;

  -- already issued: always the same certificate (no duplicates, ever)
  select * into v_cert from public.certificates where user_id = v_uid and badge_id = p_badge_id;
  if found then
    return to_jsonb(v_cert);
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'requirement_not_met' using errcode = 'P0001';
  end if;

  v_goal := v_badge.target;
  case v_badge.requirement_type
    when 'level' then
      v_current := v_profile.xp;
      v_goal := power(v_badge.target - 1, 2)::integer * 100;   -- XP needed for that level (src/lib/levels.js)
    when 'total_xp' then
      v_current := v_profile.xp;
    when 'game_xp' then
      v_current := coalesce((v_profile.stats -> v_badge.game_id ->> 'xp')::integer, 0);
    when 'game_plays' then
      v_current := coalesce((v_profile.stats -> v_badge.game_id ->> 'plays')::integer, 0);
    when 'games_played' then
      select count(*) into v_current
        from jsonb_each(v_profile.stats) as s(key, value)
       where s.key <> 'guest-play'
         and jsonb_typeof(s.value) = 'object'
         and coalesce((s.value ->> 'plays')::integer, 0) > 0;
    when 'activities' then
      v_current := v_profile.activities_completed;
  end case;

  if coalesce(v_current, 0) < v_goal then
    raise exception 'requirement_not_met' using errcode = 'P0001';
  end if;

  -- award date: when the badge was unlocked (kept between sign-up and now), else today
  select least(greatest(coalesce(public.try_timestamptz(e ->> 'unlockedAt'), now()), v_profile.created_at), now())
    into v_awarded
    from jsonb_array_elements(coalesce(v_profile.unlocked_badges, '[]'::jsonb)) as e
   where e ->> 'badgeId' = p_badge_id
   limit 1;
  v_awarded := coalesce(v_awarded, now());

  v_name := nullif(btrim(regexp_replace(coalesce(v_profile.username, ''), '[[:cntrl:]]', '', 'g')), '');
  if v_name is null then
    v_name := nullif(btrim(regexp_replace(coalesce(p_display_name, ''), '[[:cntrl:]]', '', 'g')), '');
  end if;
  v_name := left(coalesce(v_name, 'Bulbuli Learner'), 40);

  if v_badge.requirement_type in ('game_xp', 'game_plays') then
    v_xp := coalesce((v_profile.stats -> v_badge.game_id ->> 'xp')::integer, 0);
    v_xp_label := coalesce(v_badge.game_title, 'Game') || ' XP';
  else
    v_xp := v_profile.xp;
    v_xp_label := 'Total XP';
  end if;

  -- a public code that isn't already taken
  loop
    v_code := upper('BLB-' || substr(public.random_hex32(), 1, 4) || '-' || substr(public.random_hex32(), 1, 4));
    exit when not exists (select 1 from public.certificates where certificate_code = v_code);
  end loop;

  insert into public.certificates (
    user_id, badge_id, certificate_code, verification_token, student_name,
    badge_title, badge_description, badge_icon, xp_earned, xp_label, awarded_at
  ) values (
    v_uid, p_badge_id, v_code, public.random_hex32(), v_name,
    v_badge.title, v_badge.description, v_badge.icon, greatest(v_xp, 0), v_xp_label, v_awarded
  )
  on conflict (user_id, badge_id) do nothing;   -- two tabs at once: the first one wins

  select * into v_cert from public.certificates where user_id = v_uid and badge_id = p_badge_id;
  return to_jsonb(v_cert);
end;
$$;

revoke all     on function public.issue_certificate(text, text) from public, anon;
grant  execute on function public.issue_certificate(text, text) to authenticated;


-- ---------------------------------------------------------------------
-- 5. verify_certificate(): the public verification page
--
--   select verify_certificate('3f2c…');   -- the 32-character token from the link
--
--   { "status": "valid" | "revoked" | "private" | "not_found", ...public facts }
--   Never returns the email, the account id, the token, or any other badge / profile data.
-- ---------------------------------------------------------------------
create or replace function public.verify_certificate(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cert    public.certificates%rowtype;
  v_display text;
  v_name    text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into v_cert from public.certificates where verification_token = p_token;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_cert.revoked_at is not null then
    return jsonb_build_object(
      'status', 'revoked',
      'certificate_code', v_cert.certificate_code,
      'badge_title', v_cert.badge_title,
      'revoked_at', v_cert.revoked_at
    );
  end if;

  if not v_cert.is_public then
    return jsonb_build_object('status', 'private');
  end if;

  select certificate_name_display into v_display from public.profiles where id = v_cert.user_id;
  v_name := case coalesce(v_display, 'first_name')
    when 'full' then v_cert.student_name
    when 'first_name' then split_part(btrim(v_cert.student_name), ' ', 1)
    when 'initials' then (
      select string_agg(upper(left(word, 1)) || '.', ' ')
        from regexp_split_to_table(btrim(v_cert.student_name), '\s+') as word
       where word <> ''
    )
    else null
  end;

  return jsonb_build_object(
    'status', 'valid',
    'certificate_code', v_cert.certificate_code,
    'student_name', v_name,
    'badge_id', v_cert.badge_id,
    'badge_title', v_cert.badge_title,
    'badge_description', v_cert.badge_description,
    'badge_icon', v_cert.badge_icon,
    'xp_earned', v_cert.xp_earned,
    'xp_label', v_cert.xp_label,
    'awarded_at', v_cert.awarded_at
  );
end;
$$;

revoke all     on function public.verify_certificate(text) from public;
grant  execute on function public.verify_certificate(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 6. Privacy controls (signed-in player / parent on the dashboard)
-- ---------------------------------------------------------------------
create or replace function public.set_certificate_privacy(p_name_display text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_name_display is null or p_name_display not in ('full', 'first_name', 'initials', 'hidden') then
    raise exception 'invalid name display' using errcode = '22023';
  end if;
  insert into public.profiles (id) values (v_uid) on conflict (id) do nothing;
  update public.profiles set certificate_name_display = p_name_display where id = v_uid;
  return p_name_display;
end;
$$;

revoke all     on function public.set_certificate_privacy(text) from public, anon;
grant  execute on function public.set_certificate_privacy(text) to authenticated;

create or replace function public.set_certificate_public(p_certificate_id uuid, p_public boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  update public.certificates
     set is_public = coalesce(p_public, false)
   where id = p_certificate_id and user_id = v_uid;
  if not found then
    raise exception 'certificate not found' using errcode = '22023';
  end if;
  return coalesce(p_public, false);
end;
$$;

revoke all     on function public.set_certificate_public(uuid, boolean) from public, anon;
grant  execute on function public.set_certificate_public(uuid, boolean) to authenticated;

-- certificate_name_display is read by the dashboard through the existing table-wide select grant.


-- ---------------------------------------------------------------------
-- 7. Staff only: revoke (or restore) a certificate. Run in the SQL editor:
--
--   select revoke_certificate('BLB-4F2A-9C17', 'Issued by mistake');
--   select revoke_certificate('BLB-4F2A-9C17', null, true);   -- restore
-- ---------------------------------------------------------------------
create or replace function public.revoke_certificate(p_code text, p_reason text default null, p_restore boolean default false)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.certificates
     set revoked_at     = case when p_restore then null else now() end,
         revoked_reason = case when p_restore then null else p_reason end
   where certificate_code = upper(btrim(p_code));
  return found;
end;
$$;

revoke all on function public.revoke_certificate(text, text, boolean) from public, anon, authenticated;
