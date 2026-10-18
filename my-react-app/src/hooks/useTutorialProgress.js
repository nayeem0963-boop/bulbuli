import { useCallback, useEffect, useRef, useState } from 'react'

const EMPTY_PROGRESS = {
  startedTutorialIds: [],
  completedTutorials: {},
  moduleResults: {},
  quizProgress: {},
  quizSessionStartedAt: {},
  userActivity: false,
  gamification: {
    totalXp: 0,
    currentStreak: 0,
    lastActivityDate: '',
    completedQuizCount: 0,
  },
}

function getStorageKey(userId) {
  if (typeof userId !== 'string' || !userId.trim()) {
    throw new TypeError('A signed-in user ID is required to track tutorial progress.')
  }

  return `bulbuli.tutorial-progress.v1.${encodeURIComponent(userId)}`
}

function normalizeProgress(progress) {
  if (
    !progress
    || !Array.isArray(progress.startedTutorialIds)
    || !progress.startedTutorialIds.every((id) => typeof id === 'string')
    || !progress.completedTutorials
    || typeof progress.completedTutorials !== 'object'
    || Array.isArray(progress.completedTutorials)
    || (progress.quizProgress !== undefined && (
      !progress.quizProgress
      || typeof progress.quizProgress !== 'object'
      || Array.isArray(progress.quizProgress)
    ))
    || (progress.moduleResults !== undefined && (
      !progress.moduleResults
      || typeof progress.moduleResults !== 'object'
      || Array.isArray(progress.moduleResults)
    ))
    || (progress.userActivity !== undefined && typeof progress.userActivity !== 'boolean')
    || (progress.gamification !== undefined && (
      !progress.gamification
      || typeof progress.gamification !== 'object'
      || Array.isArray(progress.gamification)
    ))
  ) {
    throw new Error('Saved tutorial progress has an invalid format.')
  }

  const completedTutorials = {}
  Object.entries(progress.completedTutorials).forEach(([id, result]) => {
    if (
      typeof id !== 'string'
      || !result
      || !Number.isInteger(result.bestScore)
      || !Number.isInteger(result.totalQuestions)
      || result.totalQuestions < 1
      || result.bestScore < 0
      || result.bestScore > result.totalQuestions
      || !Number.isInteger(result.attempts)
      || result.attempts < 1
      || typeof result.completedAt !== 'string'
    ) {
      throw new Error('Saved tutorial progress has an invalid result.')
    }

    if (result.bestScore === result.totalQuestions) {
      completedTutorials[id] = result
    }
  })

  const quizProgress = {}
  Object.entries(progress.quizProgress ?? {}).forEach(([id, attempt]) => {
    if (
      typeof id !== 'string'
      || !attempt
      || !Array.isArray(attempt.answers)
      || !Number.isInteger(attempt.currentIndex)
      || attempt.currentIndex < 0
      || attempt.currentIndex >= attempt.answers.length
      || !attempt.answers.every((answer) => answer === null || (
        Number.isInteger(answer) && answer >= 0 && answer <= 3
      ))
    ) {
      throw new Error('Saved tutorial quiz progress has an invalid format.')
    }

    quizProgress[id] = attempt
  })

  const moduleResults = {}
  Object.entries(progress.moduleResults ?? {}).forEach(([id, result]) => {
    if (
      typeof id !== 'string'
      || !result
      || !['completed', 'failed'].includes(result.status)
      || !Number.isInteger(result.score)
      || result.score < 0
      || result.score > result.totalQuestions
      || !Number.isInteger(result.bestScore)
      || !Number.isInteger(result.totalQuestions)
      || result.totalQuestions < 1
      || result.bestScore < 0
      || result.bestScore > result.totalQuestions
      || (result.status === 'completed' && result.score !== result.totalQuestions)
      || (result.status === 'failed' && result.score === result.totalQuestions)
      || !Number.isInteger(result.attempts)
      || result.attempts < 1
      || typeof result.completedAt !== 'string'
      || Number.isNaN(Date.parse(result.completedAt))
    ) {
      throw new Error('Saved module progress has an invalid result.')
    }

    moduleResults[id] = result
  })

  const quizSessionStartedAt = progress.quizSessionStartedAt === undefined
    ? {}
    : progress.quizSessionStartedAt
  if (
    !quizSessionStartedAt
    || typeof quizSessionStartedAt !== 'object'
    || Array.isArray(quizSessionStartedAt)
    || Object.entries(quizSessionStartedAt).some(([id, startedAt]) => (
      typeof id !== 'string'
      || typeof startedAt !== 'string'
      || Number.isNaN(Date.parse(startedAt))
    ))
  ) {
    throw new Error('Saved quiz timer data has an invalid format.')
  }

  const savedGamification = progress.gamification ?? {}
  const savedTotalXp = Number(savedGamification.totalXp)
  const gamification = {
    totalXp: Number.isSafeInteger(savedTotalXp) && savedTotalXp >= 0 ? savedTotalXp : 0,
    currentStreak: savedGamification.currentStreak ?? 0,
    lastActivityDate: savedGamification.lastActivityDate ?? '',
    completedQuizCount: savedGamification.completedQuizCount
      ?? Object.keys(completedTutorials).length,
  }
  if (
    !Number.isInteger(gamification.currentStreak)
    || gamification.currentStreak < 0
    || !Number.isInteger(gamification.completedQuizCount)
    || gamification.completedQuizCount < 0
    || typeof gamification.lastActivityDate !== 'string'
    || (gamification.lastActivityDate !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(gamification.lastActivityDate))
  ) {
    throw new Error('Saved gamification progress has an invalid format.')
  }

  return {
    startedTutorialIds: [...new Set(progress.startedTutorialIds)],
    completedTutorials,
    moduleResults,
    quizProgress,
    quizSessionStartedAt,
    gamification,
    userActivity: progress.userActivity === true,
  }
}

function loadProgress(storageKey) {
  try {
    const saved = window.localStorage.getItem(storageKey)
    return {
      progress: saved === null ? EMPTY_PROGRESS : normalizeProgress(JSON.parse(saved)),
      storageError: '',
    }
  } catch (error) {
    console.error('Unable to load Bulbuli tutorial progress from localStorage.', error)
    return {
      progress: EMPTY_PROGRESS,
      storageError: 'Tutorial progress could not be loaded from this browser.',
    }
  }
}

export function useTutorialProgress(userId) {
  const [storageKey] = useState(() => getStorageKey(userId))
  const [state, setState] = useState(() => loadProgress(storageKey))
  const progressRef = useRef(state.progress)

  useEffect(() => {
    const handleProgressUpdate = (event) => {
      if (event.detail?.storageKey !== storageKey) return

      const progress = normalizeProgress(event.detail.progress)
      progressRef.current = progress
      setState({ progress, storageError: '' })
    }

    window.addEventListener('bulbuli:tutorial-progress', handleProgressUpdate)
    return () => window.removeEventListener('bulbuli:tutorial-progress', handleProgressUpdate)
  }, [storageKey])

  const saveProgress = useCallback((update) => {
    const nextProgress = update(progressRef.current)

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextProgress))
      progressRef.current = nextProgress
      setState({ progress: nextProgress, storageError: '' })
      window.dispatchEvent(new CustomEvent('bulbuli:tutorial-progress', {
        detail: { storageKey, progress: nextProgress },
      }))
      return true
    } catch (error) {
      console.error('Unable to save Bulbuli tutorial progress to localStorage.', error)
      setState((current) => ({
        ...current,
        storageError: 'Tutorial progress could not be saved. Check your browser storage settings and try again.',
      }))
      return false
    }
  }, [storageKey])

  const markTutorialStarted = useCallback((tutorialId) => {
    if (state.progress.startedTutorialIds.includes(tutorialId)) return true

    return saveProgress((current) => ({
      ...current,
      startedTutorialIds: [...current.startedTutorialIds, tutorialId],
    }))
  }, [saveProgress, state.progress.startedTutorialIds])

  const markUserActivity = useCallback(() => {
    if (progressRef.current.userActivity) return true

    return saveProgress((current) => ({ ...current, userActivity: true }))
  }, [saveProgress])

  const saveQuizProgress = useCallback((tutorialId, answers, currentIndex) => {
    if (
      typeof tutorialId !== 'string'
      || !Array.isArray(answers)
      || answers.length < 1
      || !Number.isInteger(currentIndex)
      || currentIndex < 0
      || currentIndex >= answers.length
      || !answers.every((answer) => answer === null || (
        Number.isInteger(answer) && answer >= 0 && answer <= 3
      ))
    ) {
      throw new TypeError('Tutorial quiz progress must contain valid answers and a question index.')
    }

    return saveProgress((current) => ({
      ...current,
      startedTutorialIds: current.startedTutorialIds.includes(tutorialId)
        ? current.startedTutorialIds
        : [...current.startedTutorialIds, tutorialId],
      quizProgress: {
        ...current.quizProgress,
        [tutorialId]: { answers, currentIndex },
      },
    }))
  }, [saveProgress])

  const resetModuleQuiz = useCallback((tutorialId, sessionId, questionIndices) => {
    if (
      typeof tutorialId !== 'string'
      || !tutorialId
      || typeof sessionId !== 'string'
      || !sessionId
      || !Array.isArray(questionIndices)
      || questionIndices.length < 1
      || !questionIndices.every((index) => Number.isInteger(index) && index >= 0)
      || new Set(questionIndices).size !== questionIndices.length
    ) {
      throw new TypeError('Resetting a module quiz requires its tutorial, session, and question indexes.')
    }

    return saveProgress((current) => {
      const attempt = current.quizProgress[tutorialId]
      const answers = attempt?.answers.slice()
        ?? Array.from({ length: Math.max(...questionIndices) + 1 }, () => null)

      questionIndices.forEach((index) => {
        if (index >= answers.length) {
          throw new RangeError('A module quiz question index is outside the saved answers.')
        }
        answers[index] = null
      })

      return {
        ...current,
        quizProgress: {
          ...current.quizProgress,
          [tutorialId]: {
            answers,
            currentIndex: questionIndices[0],
          },
        },
        quizSessionStartedAt: Object.fromEntries(
          Object.entries(current.quizSessionStartedAt).filter(([id]) => id !== sessionId),
        ),
      }
    })
  }, [saveProgress])

  const startQuizSession = useCallback((sessionId, startedAt) => {
    if (
      typeof sessionId !== 'string'
      || !sessionId
      || typeof startedAt !== 'string'
      || Number.isNaN(Date.parse(startedAt))
    ) {
      throw new TypeError('A quiz session requires a valid ID and start time.')
    }

    if (state.progress.quizSessionStartedAt[sessionId]) {
      return state.progress.quizSessionStartedAt[sessionId]
    }

    const saved = saveProgress((current) => ({
      ...current,
      quizSessionStartedAt: {
        ...current.quizSessionStartedAt,
        [sessionId]: startedAt,
      },
    }))
    return saved ? startedAt : null
  }, [saveProgress, state.progress.quizSessionStartedAt])

  const recordQuizCompletion = useCallback((
    tutorialId,
    sessionId,
    score,
    totalQuestions,
    xpEarned,
    recordTutorial,
    moduleId = null,
  ) => {
    if (
      typeof tutorialId !== 'string'
      || typeof sessionId !== 'string'
      || !Number.isInteger(score)
      || !Number.isInteger(totalQuestions)
      || totalQuestions < 1
      || score < 0
      || score > totalQuestions
      || !Number.isInteger(xpEarned)
      || xpEarned < 0
      || typeof recordTutorial !== 'boolean'
      || (recordTutorial && score !== totalQuestions)
      || (moduleId !== null && (typeof moduleId !== 'string' || !moduleId))
    ) {
      throw new RangeError('Quiz completion must contain valid results and rewards.')
    }

    const today = new Date()
    const todayKey = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-')
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = [
      yesterday.getFullYear(),
      String(yesterday.getMonth() + 1).padStart(2, '0'),
      String(yesterday.getDate()).padStart(2, '0'),
    ].join('-')
    let completionStats = {
      currentStreak: state.progress.gamification.currentStreak,
      streakIncreased: false,
    }

    const saved = saveProgress((current) => {
      const previous = current.completedTutorials[tutorialId]
      const moduleKey = moduleId === null ? null : `${tutorialId}:${moduleId}`
      const previousModule = moduleKey ? current.moduleResults[moduleKey] : null
      const previousGamification = current.gamification
      const streakIncreased = previousGamification.lastActivityDate !== todayKey
      const currentStreak = !streakIncreased
        ? previousGamification.currentStreak
        : previousGamification.lastActivityDate === yesterdayKey
          ? previousGamification.currentStreak + 1
          : 1
      completionStats = { currentStreak, streakIncreased }

      return {
        ...current,
        startedTutorialIds: current.startedTutorialIds.includes(tutorialId)
          ? current.startedTutorialIds
          : [...current.startedTutorialIds, tutorialId],
        completedTutorials: recordTutorial
          ? {
            ...current.completedTutorials,
            [tutorialId]: {
              bestScore: previous?.totalQuestions === totalQuestions
                ? Math.max(previous.bestScore, score)
                : score,
              totalQuestions,
              attempts: (previous?.attempts ?? 0) + 1,
              completedAt: today.toISOString(),
            },
          }
          : current.completedTutorials,
        moduleResults: moduleKey
          ? {
            ...current.moduleResults,
            [moduleKey]: {
              status: score === totalQuestions ? 'completed' : 'failed',
              score,
              bestScore: Math.max(previousModule?.bestScore ?? 0, score),
              totalQuestions,
              attempts: (previousModule?.attempts ?? 0) + 1,
              completedAt: today.toISOString(),
            },
          }
          : current.moduleResults,
        quizProgress: recordTutorial
          ? Object.fromEntries(
            Object.entries(current.quizProgress).filter(([id]) => id !== tutorialId),
          )
          : current.quizProgress,
        quizSessionStartedAt: Object.fromEntries(
          Object.entries(current.quizSessionStartedAt).filter(([id]) => id !== sessionId),
        ),
        gamification: {
          totalXp: (Number(previousGamification.totalXp) || 0) + (Number(xpEarned) || 0),
          currentStreak,
          lastActivityDate: todayKey,
          completedQuizCount: previousGamification.completedQuizCount + 1,
        },
      }
    })
    return { saved, ...completionStats }
  }, [saveProgress, state.progress.gamification])

  return {
    startedTutorialIds: state.progress.startedTutorialIds,
    completedTutorials: state.progress.completedTutorials,
    moduleResults: state.progress.moduleResults,
    quizProgress: state.progress.quizProgress,
    quizSessionStartedAt: state.progress.quizSessionStartedAt,
    gamification: state.progress.gamification,
    storageError: state.storageError,
    userActivity: state.progress.userActivity,
    markUserActivity,
    markTutorialStarted,
    saveQuizProgress,
    resetModuleQuiz,
    startQuizSession,
    recordQuizCompletion,
  }
}
