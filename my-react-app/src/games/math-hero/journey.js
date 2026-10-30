/**
 * Math Hero's dashboard data: the stages of its level ladder and the player's personal records.
 * No React, so it runs in `node --test` (journey.test.js).
 *
 * Math Hero is a survival run: every run starts at Level 1, five questions make a level, one wrong
 * answer (or time out) costs a life, and every 10 correct answers earn a bonus life. Nothing here
 * changes that. The stages below only describe the ladder (they follow generateMathQuestion's
 * difficulty steps in utils/mathHero.js), and the records only remember how far runs have gone, so
 * the dashboard can show progress and stars. They live under their own key, next to (never inside)
 * the saved run in useGameProgress.
 */

/** The ladder, in generateMathQuestion's difficulty steps. `to: null` = endless top stage. */
export const STAGES = [
  { id: 1, from: 1, to: 1, icon: '🌱', color: '#4fc3f7', sample: '3 + 4' },
  { id: 2, from: 2, to: 10, icon: '🚀', color: '#7c8cff', sample: '47 − 18' },
  { id: 3, from: 11, to: 20, icon: '⛰️', color: '#2fc58a', sample: '128 + 96' },
  { id: 4, from: 21, to: 30, icon: '🏰', color: '#ff8a65', sample: '612 − 347' },
  { id: 5, from: 31, to: 40, icon: '✖️', color: '#c77dff', sample: '7 × 8' },
  { id: 6, from: 41, to: null, icon: '👑', color: '#ffb020', sample: '14 × 13' },
]

/** Levels counted towards the endless top stage's stars. */
const TOP_STAGE_SPAN = 10

const span = (stage) => (stage.to ?? stage.from + TOP_STAGE_SPAN - 1) - stage.from + 1

/** How many of a stage's levels have been cleared, given the highest level ever reached. */
export function clearedInStage(stage, bestLevel) {
  return Math.max(0, Math.min(span(stage), (bestLevel ?? 1) - stage.from))
}

/** 0–3 stars for a stage: any level cleared → 1, half → 2, all → 3. */
export function stageStars(stage, bestLevel) {
  const cleared = clearedInStage(stage, bestLevel)
  const size = span(stage)
  if (cleared >= size) return 3
  if (cleared * 2 >= size && cleared > 0) return 2
  return cleared > 0 ? 1 : 0
}

/**
 * Where a stage stands: 'cleared' (every level passed), 'current' (reached, not finished),
 * or 'locked' (no run has reached it yet).
 */
export function stageStatus(stage, bestLevel) {
  const best = bestLevel ?? 1
  if (best < stage.from) return 'locked'
  if (stage.to !== null && best > stage.to) return 'cleared'
  return 'current'
}

export const stageForLevel = (level) => STAGES.find((s) => level >= s.from && (s.to === null || level <= s.to)) ?? STAGES[0]

export const MAX_JOURNEY_STARS = STAGES.length * 3

export function journeySummary(bestLevel) {
  return {
    stars: STAGES.reduce((sum, stage) => sum + stageStars(stage, bestLevel), 0),
    cleared: STAGES.filter((stage) => stageStatus(stage, bestLevel) === 'cleared').length,
  }
}

// ---------- one finished run ----------

/**
 * The numbers for a finished run, from the game-over record Math Hero already keeps.
 * Lives start at 1 and one is earned per 10 correct answers, and the run ends when they're gone,
 * so the misses are exactly 1 + floor(correct / 10).
 */
export function runSummary(gameOver) {
  const correct = gameOver?.correctAnswers ?? 0
  const missed = 1 + Math.floor(correct / 10)
  const answered = correct + missed
  const levelsCleared = Math.max(0, (gameOver?.finalLevel ?? 1) - 1)
  return {
    correct,
    missed,
    accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
    xp: gameOver?.finalScore ?? 0,
    level: gameOver?.finalLevel ?? 1,
    levelsCleared,
    stars: runStars(levelsCleared),
  }
}

/** A run's stars, by levels cleared: 1 → ★, 3 → ★★, 6 → ★★★. */
export function runStars(levelsCleared) {
  if (levelsCleared >= 6) return 3
  if (levelsCleared >= 3) return 2
  return levelsCleared >= 1 ? 1 : 0
}

// ---------- personal records (this device) ----------

const EMPTY = { bestLevel: 1, bestScore: 0, bestCorrect: 0, runs: 0 }

export const recordsKey = (playerId) => `bulbuli.math-hero.records.v1.${encodeURIComponent(playerId ?? 'guest')}`

export function normalizeRecords(value) {
  const safe = (n, min) => (Number.isSafeInteger(n) && n >= min ? n : null)
  return {
    bestLevel: safe(value?.bestLevel, 1) ?? EMPTY.bestLevel,
    bestScore: safe(value?.bestScore, 0) ?? EMPTY.bestScore,
    bestCorrect: safe(value?.bestCorrect, 0) ?? EMPTY.bestCorrect,
    runs: safe(value?.runs, 0) ?? EMPTY.runs,
  }
}

/** Notes a level reached during a run. Returns the same object when nothing changed. */
export function withLevelReached(records, level) {
  return level > records.bestLevel ? { ...records, bestLevel: level } : records
}

/** Notes a finished run. */
export function withRun(records, gameOver) {
  return {
    bestLevel: Math.max(records.bestLevel, gameOver.finalLevel ?? 1),
    bestScore: Math.max(records.bestScore, gameOver.finalScore ?? 0),
    bestCorrect: Math.max(records.bestCorrect, gameOver.correctAnswers ?? 0),
    runs: records.runs + 1,
  }
}

export function loadRecords(playerId) {
  try {
    const raw = window.localStorage.getItem(recordsKey(playerId))
    return normalizeRecords(raw ? JSON.parse(raw) : null)
  } catch {
    return { ...EMPTY }
  }
}

export function saveRecords(playerId, records) {
  try {
    window.localStorage.setItem(recordsKey(playerId), JSON.stringify(records))
  } catch {
    // storage blocked (private mode): the records last for this visit
  }
}
