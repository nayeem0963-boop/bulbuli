import { DEFAULT_DIFFICULTY, difficultyConfig } from '../config/difficulty.js'

/**
 * Course identity. The track generator is deterministic for a given seed + difficulty, so:
 *   - DAILY: everyone gets the same course for the UTC day → fair global
 *     rankings, and ghosts line up with the terrain.
 *   - ENDLESS: a fresh random course every run (separate leaderboard; ghosts off).
 *
 * Every board is split by difficulty (`daily-2026-10-26-easy`, `endless-hard`, …):
 * each mode lays out a different track and scores with a different multiplier,
 * so scores and ghosts never mix across modes. Boards from before difficulty
 * modes existed (`daily-YYYY-MM-DD`, `endless`) are left untouched as an archive.
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

export const boardIdFor = (mode, difficulty, date = new Date()) =>
  mode === CourseMode.DAILY ? `daily-${utcDayKey(date)}-${difficulty}` : `endless-${difficulty}`

export function courseFor(mode, difficulty = DEFAULT_DIFFICULTY, date = new Date()) {
  const { id, short } = difficultyConfig(difficulty)
  if (mode === CourseMode.DAILY) {
    const day = utcDayKey(date)
    return {
      mode,
      difficulty: id,
      seed: hashSeed(`bulbuli-daily-${day}`),
      boardId: boardIdFor(mode, id, date),
      label: `Daily · ${day} · ${short}`,
    }
  }
  return {
    mode: CourseMode.ENDLESS,
    difficulty: id,
    seed: (Math.random() * 2 ** 31) | 0,
    boardId: boardIdFor(CourseMode.ENDLESS, id),
    label: `Endless · ${short}`,
  }
}
