import { useCallback, useMemo, useReducer } from 'react'
import { QuizContext } from './quizContext.js'

const HIGH_SCORES_KEY = 'bulbuli.highScores'

function loadHighScores() {
  try {
    const saved = window.localStorage.getItem(HIGH_SCORES_KEY)
    if (saved === null) return { highScores: {}, storageError: '' }

    const parsed = JSON.parse(saved)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Saved high scores have an invalid format.')
    }

    const highScores = {}
    for (const [levelId, score] of Object.entries(parsed)) {
      if (
        typeof score?.score !== 'number' ||
        typeof score?.total !== 'number' ||
        score.total <= 0 ||
        score.score < 0 ||
        score.score > score.total ||
        typeof score.elapsedMs !== 'number' ||
        score.elapsedMs < 0
      ) {
        throw new Error('Saved high scores have an invalid format.')
      }

      highScores[levelId] = {
        score: score.score,
        total: score.total,
        percentage: Math.round((score.score / score.total) * 100),
        elapsedMs: score.elapsedMs,
      }
    }

    return { highScores, storageError: '' }
  } catch (error) {
    console.error('Unable to load Bulbuli high scores from localStorage.', error)
    return {
      highScores: {},
      storageError: 'High scores could not be loaded from this browser.',
    }
  }
}

function createInitialState() {
  const { highScores, storageError } = loadHighScores()
  return {
    highScores,
    storageError,
    activeLevelId: null,
    attemptStartedAt: null,
    elapsedMs: 0,
    activeQuestionId: null,
    questionStartedAt: null,
    questionTimes: [],
    currentStreak: 0,
  }
}

function quizReducer(state, action) {
  switch (action.type) {
    case 'START_ATTEMPT':
      return {
        ...state,
        activeLevelId: action.levelId,
        attemptStartedAt: action.now,
        elapsedMs: 0,
        activeQuestionId: null,
        questionStartedAt: null,
        questionTimes: [],
        currentStreak: 0,
      }
    case 'START_QUESTION':
      if (state.activeQuestionId === action.questionId && state.questionStartedAt !== null) {
        return state
      }

      return {
        ...state,
        activeQuestionId: action.questionId,
        questionStartedAt: action.now,
      }
    case 'RECORD_ANSWER':
      if (
        state.activeQuestionId !== action.questionId ||
        state.questionStartedAt === null ||
        state.questionTimes.some((entry) => entry.questionId === action.questionId)
      ) {
        return state
      }

      return {
        ...state,
        questionTimes: [
          ...state.questionTimes,
          {
            questionId: action.questionId,
            label: action.label,
            correct: action.correct,
            elapsedMs: Math.max(0, Math.round(action.now - state.questionStartedAt)),
          },
        ],
        currentStreak: action.correct ? state.currentStreak + 1 : 0,
      }
    case 'FINISH_ATTEMPT':
      return {
        ...state,
        attemptStartedAt: null,
        activeQuestionId: null,
        questionStartedAt: null,
        elapsedMs: action.elapsedMs,
        highScores: action.highScores,
        storageError: action.storageError,
      }
    default:
      return state
  }
}

export function QuizProvider({ children }) {
  const [state, dispatch] = useReducer(quizReducer, undefined, createInitialState)

  const startAttempt = useCallback((levelId) => {
    dispatch({ type: 'START_ATTEMPT', levelId, now: performance.now() })
  }, [])

  const startQuestion = useCallback((questionId, label) => {
    dispatch({
      type: 'START_QUESTION',
      questionId,
      label,
      now: performance.now(),
    })
  }, [])

  const recordAnswer = useCallback((questionId, label, correct) => {
    dispatch({
      type: 'RECORD_ANSWER',
      questionId,
      label,
      correct,
      now: performance.now(),
    })
  }, [])

  const finishAttempt = useCallback((score, total) => {
    if (state.attemptStartedAt === null) return state.elapsedMs

    const elapsedMs = Math.max(0, Math.round(performance.now() - state.attemptStartedAt))
    const previous = state.highScores[state.activeLevelId]
    const hasHigherScore = previous && score * previous.total > previous.score * total
    const tiesScore = previous && score * previous.total === previous.score * total
    const isBetterTime = tiesScore && elapsedMs < previous.elapsedMs
    const isNewHighScore = !previous || hasHigherScore || isBetterTime
    const nextHighScores = isNewHighScore
      ? {
        ...state.highScores,
        [state.activeLevelId]: {
          score,
          total,
          percentage: Math.round((score / total) * 100),
          elapsedMs,
        },
      }
      : state.highScores
    let storageError = ''

    if (isNewHighScore) {
      try {
        window.localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(nextHighScores))
      } catch (error) {
        console.error('Unable to save Bulbuli high scores to localStorage.', error)
        storageError = 'High score could not be saved. Check your browser storage settings.'
      }
    }

    dispatch({
      type: 'FINISH_ATTEMPT',
      elapsedMs,
      highScores: nextHighScores,
      storageError,
    })
    return elapsedMs
  }, [state])

  const value = useMemo(() => ({
    ...state,
    startAttempt,
    startQuestion,
    recordAnswer,
    finishAttempt,
  }), [state, startAttempt, startQuestion, recordAnswer, finishAttempt])

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>
}
