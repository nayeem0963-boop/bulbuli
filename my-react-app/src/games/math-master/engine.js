/**
 * Math Master's rules, with no React in them (tested in engine.test.js).
 *
 * A round is one level's questions played in curriculum order (easiest first). The round state is a
 * plain object; every function returns a new one. `answer()` only accepts a response while the
 * current question is still open, so a double tap, a second key press or a late timer can never
 * score twice.
 */
import { getLevel, LEVELS, TIER_ORDER } from './curriculum/index.js'

export const GAME_ID = 'math-master'
export const MODES = ['practice', 'challenge']

/** Accuracy needed to clear a level (and unlock the next one): half the questions right. */
export const CLEAR_ACCURACY = 0.5

export const POINTS = {
  correct: 100,      // a correct answer
  withHint: 50,      // a correct answer after opening the hint
  streakStep: 10,    // +10 for every answer in a row after the first …
  streakCap: 50,     // … up to +50
  timeBonusMax: 50,  // Challenge only: up to +50 for answering quickly
}

export const XP = {
  perCorrectPractice: 1,
  perCorrectChallenge: 2,
  firstClear: 20,
  perNewStar: 10,
}

/** Seconds per question in Challenge mode: more time as the maths gets harder (60 s … 120 s). */
export function timeLimitFor(level) {
  return 45 + (level?.difficulty ?? 1) * 15
}

/** Fisher–Yates shuffle with an injectable random source (tests pass a seeded one). */
export function shuffle(list, random = Math.random) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Small seeded generator, so a test (or a shared link) can replay the same choice order. */
export function createRng(seed = Date.now()) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Reads what a player typed into a number box: "5", " x = 5 ", "−3.5", "3,5", "7/2".
 * Returns NaN for anything else.
 */
export function parseNumericInput(text) {
  const cleaned = String(text ?? '')
    .trim()
    .replace(/^[a-z]\s*=\s*/i, '')
    .replace(/[−–]/g, '-')
    .replace(/\s+/g, '')
    .replace(/^(-?\d+),(\d+)$/, '$1.$2')
  if (/^-?\d+(\.\d+)?$/.test(cleaned) || /^-?\.\d+$/.test(cleaned)) return Number(cleaned)
  const fraction = cleaned.match(/^(-?\d+)\/(\d+)$/)
  if (fraction && Number(fraction[2]) !== 0) return Number(fraction[1]) / Number(fraction[2])
  return Number.NaN
}

const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))

/** Is this response right? `response` is { choice }, { value } or { timeout: true }. */
export function isCorrect(question, response) {
  if (!question || !response || response.timeout) return false
  if (question.format === 'input') {
    const value = typeof response.value === 'number' ? response.value : parseNumericInput(response.value)
    return Number.isFinite(value) && close(value, question.answer)
  }
  return response.choice === question.answer
}

export function pointsFor({ correct, hintUsed, streak, mode, timeLeft, timeLimit }) {
  if (!correct) return 0
  const base = hintUsed ? POINTS.withHint : POINTS.correct
  const streakBonus = Math.min(POINTS.streakCap, Math.max(0, streak - 1) * POINTS.streakStep)
  const share = timeLimit > 0 ? Math.max(0, Math.min(1, (timeLeft ?? 0) / timeLimit)) : 0
  const timeBonus = mode === 'challenge' ? Math.round(POINTS.timeBonusMax * share) : 0
  return base + streakBonus + timeBonus
}

/** A fresh round for one level. Choices are shuffled (except the A–D labels of tap-the-point questions). */
export function createRound(level, mode = 'practice', random = Math.random, now = Date.now()) {
  if (!level?.questions?.length) throw new TypeError('createRound needs a level with questions.')
  return {
    levelId: level.id,
    mode: MODES.includes(mode) ? mode : 'practice',
    timeLimit: mode === 'challenge' ? timeLimitFor(level) : null,
    questions: level.questions.map((question) => (
      question.format === 'choice' ? { ...question, choices: shuffle(question.choices, random) } : question
    )),
    index: 0,
    phase: 'asking', // asking → answered → asking … → done
    hintUsed: false,
    responses: [],
    score: 0,
    streak: 0,
    bestStreak: 0,
    startedAt: now,
    finishedAt: null,
  }
}

export const currentQuestion = (round) => round?.questions[round.index] ?? null

/** Opens the hint for the current question (it halves the points for that question). */
export function revealHint(round) {
  if (!round || round.phase !== 'asking' || round.hintUsed) return round
  return { ...round, hintUsed: true }
}

/**
 * Answers the current question once. Anything after the first answer is ignored.
 * @returns {{ round, outcome: 'ignored' | { correct, points, timedOut, response } }}
 */
export function answer(round, response, { timeLeft = null } = {}) {
  if (!round || round.phase !== 'asking' || !response) return { round, outcome: 'ignored' }
  const question = currentQuestion(round)
  if (!response.timeout) {
    if (question.format === 'input') {
      const value = typeof response.value === 'number' ? response.value : parseNumericInput(response.value)
      if (!Number.isFinite(value)) return { round, outcome: 'ignored' }
    } else if (!question.choices.includes(response.choice)) {
      return { round, outcome: 'ignored' }
    }
  }
  const correct = isCorrect(question, response)
  const streak = correct ? round.streak + 1 : 0
  const points = pointsFor({
    correct, hintUsed: round.hintUsed, streak, mode: round.mode, timeLeft, timeLimit: round.timeLimit,
  })
  const outcome = { correct, points, timedOut: Boolean(response.timeout), response }
  const record = {
    id: question.id,
    topic: question.topic,
    correct,
    points,
    hintUsed: round.hintUsed,
    timedOut: outcome.timedOut,
    response: response.timeout ? null : (response.choice ?? response.value),
  }
  return {
    outcome,
    round: {
      ...round,
      phase: 'answered',
      responses: [...round.responses, record],
      score: round.score + points,
      streak,
      bestStreak: Math.max(round.bestStreak, streak),
    },
  }
}

/** Moves on after an answer: the next question, or the end of the round. */
export function next(round, now = Date.now()) {
  if (!round || round.phase !== 'answered') return round
  if (round.index + 1 >= round.questions.length) return { ...round, phase: 'done', finishedAt: now }
  return { ...round, index: round.index + 1, phase: 'asking', hintUsed: false }
}

export function starsFor(accuracy) {
  if (accuracy >= 0.9) return 3
  if (accuracy >= 0.75) return 2
  if (accuracy >= CLEAR_ACCURACY) return 1
  return 0
}

/** Everything the results screen shows. */
export function summarize(round) {
  const total = round.questions.length
  const correct = round.responses.filter((r) => r.correct).length
  const accuracy = total ? correct / total : 0
  const topics = new Map()
  for (const response of round.responses) {
    const entry = topics.get(response.topic) ?? { topic: response.topic, correct: 0, total: 0 }
    entry.total += 1
    if (response.correct) entry.correct += 1
    topics.set(response.topic, entry)
  }
  const byTopic = [...topics.values()]
  return {
    levelId: round.levelId,
    mode: round.mode,
    total,
    answered: round.responses.length,
    correct,
    incorrect: round.responses.length - correct,
    accuracy,
    stars: starsFor(accuracy),
    score: round.score,
    bestStreak: round.bestStreak,
    hintsUsed: round.responses.filter((r) => r.hintUsed).length,
    timeouts: round.responses.filter((r) => r.timedOut).length,
    durationMs: Math.max(0, (round.finishedAt ?? Date.now()) - round.startedAt),
    byTopic,
    practise: byTopic.filter((t) => t.correct < t.total).map((t) => t.topic),
    missed: round.responses.filter((r) => !r.correct).map((r) => r.id),
  }
}

/** XP for a finished round. Replays pay only for correct answers and stars better than before. */
export function xpForRound({ previousBestStars = 0, stars, correct, mode }) {
  const perCorrect = mode === 'challenge' ? XP.perCorrectChallenge : XP.perCorrectPractice
  const before = Math.max(0, Math.min(3, previousBestStars))
  const firstClear = stars >= 1 && before === 0 ? XP.firstClear : 0
  return correct * perCorrect + firstClear + Math.max(0, stars - before) * XP.perNewStar
}

/** Level 1 is always open; every other level opens once the one before it is cleared (1 star). */
export function isUnlocked(levelId, record = {}) {
  if (levelId <= 1) return true
  return (record.levels?.[levelId - 1]?.bestStars ?? 0) >= 1
}

export const isCleared = (levelId, record = {}) => (record.levels?.[levelId]?.bestStars ?? 0) >= 1

/** The saved record after a round. `previous` is the game's record from useGameProgress ({} at first). */
export function mergeRecord(previous = {}, summary, now = new Date()) {
  const levels = { ...(previous.levels ?? {}) }
  const before = levels[summary.levelId] ?? {}
  const cleared = summary.stars >= 1
  levels[summary.levelId] = {
    bestStars: Math.max(before.bestStars ?? 0, summary.stars),
    bestScore: Math.max(before.bestScore ?? 0, summary.score),
    bestAccuracy: Math.max(before.bestAccuracy ?? 0, Math.round(summary.accuracy * 100)),
    plays: (before.plays ?? 0) + 1,
    firstClearedAt: before.firstClearedAt ?? (cleared ? now.toISOString() : null),
    lastPlayedAt: now.toISOString(),
    lastMode: summary.mode,
  }
  return {
    ...previous,
    version: 1,
    levels,
    lastLevel: summary.levelId,
    roundsPlayed: (previous.roundsPlayed ?? 0) + 1,
    questionsAnswered: (previous.questionsAnswered ?? 0) + summary.answered,
    correctAnswers: (previous.correctAnswers ?? 0) + summary.correct,
    totalStars: Object.values(levels).reduce((sum, level) => sum + (level.bestStars ?? 0), 0),
  }
}

/** The player's rank: the tier of the hardest level they have cleared (Novice to start). */
export function rankFor(record = {}) {
  let best = 0
  for (const level of LEVELS) if (isCleared(level.id, record)) best = Math.max(best, TIER_ORDER.indexOf(level.tier))
  return TIER_ORDER[best]
}

/** The level a returning player should see first: the first unlocked level not yet cleared. */
export function suggestedLevel(record = {}) {
  const open = LEVELS.find((level) => isUnlocked(level.id, record) && !isCleared(level.id, record))
  return open?.id ?? getLevel(record.lastLevel)?.id ?? 1
}
