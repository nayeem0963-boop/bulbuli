/**
 * XP for clearing an HTML Architect chapter.
 *
 *   first clear      20 XP
 *   each new star    10 XP  (only stars better than the player's previous best)
 *
 * So a first-try 3-star clear is 50 XP, and replaying a 1-star chapter for 3 stars
 * pays the 20 XP difference. Replays that don't beat the best pay nothing, so XP
 * can't be farmed by clearing the same chapter over and over.
 */
export const XP_FIRST_CLEAR = 20
export const XP_PER_STAR = 10

export function xpForClear(previousBest, stars) {
  const before = Math.max(0, Math.min(3, Math.floor(Number(previousBest) || 0)))
  const now = Math.max(0, Math.min(3, Math.floor(Number(stars) || 0)))
  if (now === 0) return 0
  const firstClear = before === 0 ? XP_FIRST_CLEAR : 0
  return firstClear + Math.max(0, now - before) * XP_PER_STAR
}
