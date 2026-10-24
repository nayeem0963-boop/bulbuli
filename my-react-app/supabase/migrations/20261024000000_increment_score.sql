-- Atomic, per-user score increment for the Bulbuli tap game.
-- Run in the Supabase SQL editor, or `supabase db push` if you use the CLI.
--
-- Assumes: public.profiles (id uuid primary key references auth.users, ...)
-- Rename `total_score` here AND in useScoreSync.js if your column differs.

alter table public.profiles
  add column if not exists total_score integer not null default 0;

create or replace function public.increment_score(delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- Basic anti-cheat: one batch covers ≤ 3s of tapping (maxWait), so a
  -- legit delta is small. Raise this cap if you award bonus points.
  if delta is null or delta < 1 or delta > 200 then
    raise exception 'invalid delta: %', delta;
  end if;

  update public.profiles
     set total_score = total_score + delta
   where id = auth.uid()                -- users can only bump their own row
  returning total_score into new_total;

  if new_total is null then
    raise exception 'profile not found';
  end if;

  return new_total;
end;
$$;

revoke all on function public.increment_score(integer) from public, anon;
grant execute on function public.increment_score(integer) to authenticated;
