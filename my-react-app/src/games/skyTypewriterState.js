/**
 * SkyTypewriter3D rules with no React in them, so they can be tested (skyTypewriterState.test.js).
 * useSkyTypewriterGame.js wraps each of these in a setState updater.
 *
 *   IDLE ──start──▶ PLAYING ──lives hit 0──▶ GAME_OVER
 *                      │
 *                      └──score ≥ targetScore──▶ VICTORY
 *
 * Every transition into PLAYING bumps runId. WordSpawner, the XP saver and the canvas
 * key off runId, so "Play Again" is one state change that resets everything at once.
 */

export const SKY_TYPEWRITER_STATUS = Object.freeze({
  IDLE: 'IDLE',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER',
  VICTORY: 'VICTORY',
})

export const INITIAL_LIVES = 3
/** Score that ends a flight in VICTORY. 500 = difficulty level 5, the top of skyTypewriterDifficulty.js. */
export const DEFAULT_TARGET_SCORE = 500
/** Points for one finished word before the combo multiplier. */
export const BASE_WORD_POINTS = 10
/** The combo multiplier stops growing here (×2.0 at a 6-word streak). */
const MAX_COMBO_STEPS = 5

export const isFinished = (status) => (
  status === SKY_TYPEWRITER_STATUS.GAME_OVER || status === SKY_TYPEWRITER_STATUS.VICTORY
)

export function createInitialState(runId = 0) {
  return {
    status: SKY_TYPEWRITER_STATUS.IDLE,
    paused: false,
    score: 0,
    lives: INITIAL_LIVES,
    combo: 0,
    bestCombo: 0,
    wordsTyped: 0,
    wordsMissed: 0,
    accuracy: 100,
    correctKeystrokes: 0,
    totalKeystrokes: 0,
    runId,
  }
}

/** A fresh flight, already PLAYING: full hearts, no score, new runId. Used by Start and Play Again. */
export const startRun = (state) => ({
  ...createInitialState(state.runId + 1),
  status: SKY_TYPEWRITER_STATUS.PLAYING,
})

/** Back to the start screen (Exit to Menu inside the game). Also bumps runId so the sky is cleared. */
export const resetRun = (state) => createInitialState(state.runId + 1)

const isLive = (state) => state.status === SKY_TYPEWRITER_STATUS.PLAYING && !state.paused

/** ×1.0 for the first word, +0.2 per word in a streak, capped at ×2.0. */
export function comboMultiplier(combo) {
  const steps = Math.min(MAX_COMBO_STEPS, Math.max(0, Math.floor(combo) - 1))
  return 1 + steps * 0.2
}

export function applyKeystroke(state, isCorrect) {
  if (!isLive(state)) return state
  const totalKeystrokes = state.totalKeystrokes + 1
  const correctKeystrokes = state.correctKeystrokes + (isCorrect ? 1 : 0)
  return {
    ...state,
    totalKeystrokes,
    correctKeystrokes,
    accuracy: Math.round((correctKeystrokes / totalKeystrokes) * 100),
  }
}

export function applyWord(state, { basePoints = BASE_WORD_POINTS, targetScore = DEFAULT_TARGET_SCORE } = {}) {
  if (!isLive(state)) return state
  const combo = state.combo + 1
  const safeBase = Number.isFinite(basePoints) ? Math.max(0, basePoints) : 0
  const score = state.score + Math.round(safeBase * comboMultiplier(combo))
  return {
    ...state,
    score,
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    wordsTyped: state.wordsTyped + 1,
    status: score >= targetScore ? SKY_TYPEWRITER_STATUS.VICTORY : state.status,
  }
}

/** A word flew past the bird: lose a heart, break the combo, end the flight on the last heart. */
export function applyMiss(state) {
  if (!isLive(state)) return state
  const lives = Math.max(0, state.lives - 1)
  return {
    ...state,
    lives,
    combo: 0,
    wordsMissed: state.wordsMissed + 1,
    status: lives === 0 ? SKY_TYPEWRITER_STATUS.GAME_OVER : state.status,
  }
}

export const applyPause = (state, paused) => (
  state.status === SKY_TYPEWRITER_STATUS.PLAYING && state.paused !== paused ? { ...state, paused } : state
)

export const finishRun = (state, status) => (
  state.status === SKY_TYPEWRITER_STATUS.PLAYING ? { ...state, status, paused: false } : state
)
