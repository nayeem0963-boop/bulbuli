/**
 * Course identity. The track generator is deterministic for a given seed, so:
 *   - DAILY: everyone gets the same course for the UTC day → fair global
 *     rankings, and ghosts line up with the terrain.
 *   - ENDLESS: a fresh random course every run (separate leaderboard; ghosts off).
 */
export const CourseMode = Object.freeze({ DAILY: 'daily', ENDLESS: 'endless' })

export const utcDayKey = (date = new Date()) => date.toISOString().slice(0, 10) // YYYY-MM-DD

/** FNV-1a → 31-bit seed */
export function hashSeed(text) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0) & 0x7fffffff
}

export function courseFor(mode, date = new Date()) {
  if (mode === CourseMode.DAILY) {
    const day = utcDayKey(date)
    return { mode, seed: hashSeed(`bulbuli-daily-${day}`), boardId: `daily-${day}`, label: `Daily · ${day}` }
  }
  return {
    mode: CourseMode.ENDLESS,
    seed: (Math.random() * 2 ** 31) | 0,
    boardId: 'endless',
    label: 'Endless',
  }
}
