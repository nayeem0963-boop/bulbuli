import { useCallback, useEffect, useRef, useState } from 'react'
import { MATH_HERO_QUESTIONS_PER_LEVEL } from '../utils/mathHero.js'
import { awardXp } from '../lib/xp.js'

/**
 * A player's game progress on this device: each game's own record, Math Hero's saved run,
 * and their total XP. Signed-in players' XP is also saved to their account (src/lib/xp.js).
 *
 *   const { games, saveGameResult, totalXp } = useGameProgress(playerId)
 */

/** Progress for players who are not signed in. Games are open to everyone and save on this device. */
export const GUEST_PLAYER_ID = 'guest'

const EMPTY_PROGRESS = {
  games: {},
  mathHeroProgress: null,
  gamification: { totalXp: 0 },
}

const PROGRESS_EVENT = 'bulbuli:game-progress'

// The key is unchanged from when this hook also tracked courses, so players keep their XP and
// game records. Older saves may still hold course fields; they are ignored and dropped on next save.
function getStorageKey(playerId) {
  if (typeof playerId !== 'string' || !playerId.trim()) {
    throw new TypeError('A player ID (a signed-in user ID or GUEST_PLAYER_ID) is required to track progress.')
  }
  return `bulbuli.tutorial-progress.v1.${encodeURIComponent(playerId)}`
}

function isMathHeroProgress(progress) {
  const question = progress?.question
  const expectedAnswer = question?.operator === '+'
    ? question.left + question.right
    : question?.operator === '-'
      ? question.left - question.right
      : question?.operator === '×'
        ? question.left * question.right
        : question?.operator === '÷' && question.right !== 0
          ? question.left / question.right
          : null

  return Boolean(
    progress
    && Number.isInteger(progress.level)
    && progress.level >= 1
    && Number.isInteger(progress.questionNumber)
    && progress.questionNumber >= 1
    && progress.questionNumber <= MATH_HERO_QUESTIONS_PER_LEVEL
    && Number.isSafeInteger(progress.totalXp)
    && progress.totalXp >= 0
    && Number.isInteger(progress.lives)
    && progress.lives >= 0
    && Number.isSafeInteger(progress.correctAnswers)
    && progress.correctAnswers >= 0
    && question
    && Number.isInteger(question.left)
    && question.left >= 0
    && Number.isInteger(question.right)
    && question.right >= 0
    && ['+', '-', '×', '÷'].includes(question.operator)
    && Number.isInteger(question.answer)
    && question.answer >= 0
    && question.answer === expectedAnswer
    && Array.isArray(question.options)
    && question.options.length === 4
    && question.options.every((option) => Number.isInteger(option) && option >= 0)
    && new Set(question.options).size === 4
    && question.options.includes(question.answer)
    && (progress.deadline === null || (
      typeof progress.deadline === 'string'
      && !Number.isNaN(Date.parse(progress.deadline))
    ))
    && (progress.feedback === null || (
      progress.feedback
      && ['incorrect', 'timeout'].includes(progress.feedback.type)
      && typeof progress.feedback.ready === 'boolean'
      && typeof progress.feedback.createdAt === 'string'
      && !Number.isNaN(Date.parse(progress.feedback.createdAt))
    ))
    && (progress.gameOver === null || (
      progress.gameOver
      && Number.isSafeInteger(progress.gameOver.finalScore)
      && progress.gameOver.finalScore >= 0
      && Number.isInteger(progress.gameOver.finalLevel)
      && progress.gameOver.finalLevel >= 1
      && Number.isSafeInteger(progress.gameOver.correctAnswers)
      && progress.gameOver.correctAnswers >= 0
      && progress.level === 1
      && progress.questionNumber === 1
      && progress.lives === 1
      && progress.totalXp === 0
      && progress.deadline === null
    ))
  )
}

function normalizeMathHeroProgress(progress) {
  const normalized = {
    ...progress,
    lives: progress.lives ?? 1,
    correctAnswers: progress.correctAnswers ?? Math.floor(progress.totalXp / 5),
    gameOver: progress.gameOver ?? null,
  }
  if (!isMathHeroProgress(normalized)) {
    throw new Error('Saved Math Hero progress has an invalid format.')
  }
  return normalized
}

// Per-game records for arcade games ({ [gameId]: plain object }). Anything malformed is dropped,
// so one broken game record never blocks the rest of a player's progress.
function normalizeGames(games) {
  if (!games || typeof games !== 'object' || Array.isArray(games)) return {}
  return Object.fromEntries(Object.entries(games).filter(([gameId, record]) => (
    /^[a-z0-9-]+$/.test(gameId) && record && typeof record === 'object' && !Array.isArray(record)
  )))
}

function normalizeProgress(progress) {
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
    throw new Error('Saved game progress has an invalid format.')
  }
  const totalXp = Number(progress.gamification?.totalXp)
  let mathHeroProgress = null
  if (progress.mathHeroProgress) {
    try {
      mathHeroProgress = normalizeMathHeroProgress(progress.mathHeroProgress)
    } catch (error) {
      // a broken Math Hero save just starts a fresh run; it never costs the player their XP
      console.warn('Ignoring an invalid saved Math Hero run.', error)
    }
  }
  return {
    games: normalizeGames(progress.games),
    mathHeroProgress,
    gamification: { totalXp: Number.isSafeInteger(totalXp) && totalXp >= 0 ? totalXp : 0 },
  }
}

const addXp = (current, xpEarned) => ({ totalXp: current.gamification.totalXp + xpEarned })

function loadProgress(storageKey) {
  try {
    const saved = window.localStorage.getItem(storageKey)
    return {
      progress: saved === null ? EMPTY_PROGRESS : normalizeProgress(JSON.parse(saved)),
      storageError: '',
    }
  } catch (error) {
    console.error('Unable to load Bulbuli game progress from localStorage.', error)
    return { progress: EMPTY_PROGRESS, storageError: 'Your game progress could not be loaded from this browser.' }
  }
}

export function useGameProgress(playerId) {
  const [storageKey] = useState(() => getStorageKey(playerId))
  const [state, setState] = useState(() => loadProgress(storageKey))
  const progressRef = useRef(state.progress)

  // keep every hook instance for this player in step (e.g. the Play page XP badge and a game)
  useEffect(() => {
    const onUpdate = (event) => {
      if (event.detail?.storageKey !== storageKey) return
      progressRef.current = event.detail.progress
      setState({ progress: event.detail.progress, storageError: '' })
    }
    window.addEventListener(PROGRESS_EVENT, onUpdate)
    return () => window.removeEventListener(PROGRESS_EVENT, onUpdate)
  }, [storageKey])

  const saveProgress = useCallback((update) => {
    const nextProgress = update(progressRef.current)
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextProgress))
      progressRef.current = nextProgress
      setState({ progress: nextProgress, storageError: '' })
      window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: { storageKey, progress: nextProgress } }))
      return true
    } catch (error) {
      console.error('Unable to save Bulbuli game progress to localStorage.', error)
      setState((current) => ({
        ...current,
        storageError: 'Your game progress could not be saved. Check your browser storage settings and try again.',
      }))
      return false
    }
  }, [storageKey])

  /** Saves Math Hero's current run and adds any XP it earned. */
  const saveMathHeroProgress = useCallback((mathHeroProgress, xpEarned = 0) => {
    if (!isMathHeroProgress(mathHeroProgress) || !Number.isSafeInteger(xpEarned) || xpEarned < 0) {
      throw new TypeError('Math Hero progress and XP must contain valid game data.')
    }
    // Signed-in players also get it on their account; for guests this does nothing.
    if (xpEarned > 0) awardXp(playerId, 'math-hero', xpEarned)
    return saveProgress((current) => ({
      ...current,
      mathHeroProgress,
      gamification: addXp(current, xpEarned),
    }))
  }, [saveProgress, playerId])

  /**
   * Saves an arcade game's own record and adds the XP it earned to the player's total.
   * `update` receives the game's previous record ({} the first time) and returns the new one.
   */
  const saveGameResult = useCallback((gameId, update, xpEarned = 0) => {
    if (!/^[a-z0-9-]+$/.test(gameId) || !Number.isSafeInteger(xpEarned) || xpEarned < 0) {
      throw new TypeError('A game result needs a valid game ID and a whole, non-negative XP amount.')
    }
    if (xpEarned > 0) awardXp(playerId, gameId, xpEarned)
    return saveProgress((current) => ({
      ...current,
      games: { ...current.games, [gameId]: update(current.games?.[gameId] ?? {}) },
      gamification: addXp(current, xpEarned),
    }))
  }, [saveProgress, playerId])

  return {
    games: state.progress.games,
    saveGameResult,
    mathHeroProgress: state.progress.mathHeroProgress,
    saveMathHeroProgress,
    totalXp: state.progress.gamification.totalXp,
    gamification: state.progress.gamification,
    storageError: state.storageError,
  }
}
