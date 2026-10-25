// Level maths, shared by the Play page, the dashboard and the tests.
// Mirrors public.level_for_xp() in supabase/migrations/20261025000000_profiles_and_xp.sql:
//   level = floor(sqrt(xp / 100)) + 1   →   L1 = 0 XP, L2 = 100, L3 = 400, L4 = 900 ...

export const XP_PER_LEVEL_STEP = 100

/** Largest XP a single award_xp() call accepts (the server enforces it too). */
export const MAX_XP_PER_AWARD = 500

export function levelForXp(xp) {
  const safe = Number.isFinite(xp) && xp > 0 ? xp : 0
  return Math.floor(Math.sqrt(safe / XP_PER_LEVEL_STEP)) + 1
}

/** XP needed to *reach* a level. */
export function xpForLevel(level) {
  const l = Math.max(1, Math.floor(level))
  return XP_PER_LEVEL_STEP * (l - 1) ** 2
}

/** Everything a progress bar needs. */
export function levelProgress(xp) {
  const total = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0
  const level = levelForXp(total)
  const start = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return {
    level,
    xp: total,
    levelStartXp: start,
    nextLevelXp: next,
    xpIntoLevel: total - start,
    xpToNextLevel: next - total,
    percent: Math.round(((total - start) / (next - start)) * 100),
  }
}

/** Splits an award into pieces the server accepts: 1200 → [500, 500, 200]. */
export function splitAward(amount, max = MAX_XP_PER_AWARD) {
  const whole = Number.isSafeInteger(amount) && amount > 0 ? amount : 0
  const parts = []
  for (let left = whole; left > 0; left -= max) parts.push(Math.min(left, max))
  return parts
}
