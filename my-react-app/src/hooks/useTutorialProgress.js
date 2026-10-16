import { useCallback, useState } from 'react'

const EMPTY_PROGRESS = {
  startedTutorialIds: [],
  completedTutorials: {},
  quizProgress: {},
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

    completedTutorials[id] = result
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

  return {
    startedTutorialIds: [...new Set(progress.startedTutorialIds)],
    completedTutorials,
    quizProgress,
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

  const saveProgress = useCallback((update) => {
    const nextProgress = update(state.progress)

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextProgress))
      setState({ progress: nextProgress, storageError: '' })
      return true
    } catch (error) {
      console.error('Unable to save Bulbuli tutorial progress to localStorage.', error)
      setState((current) => ({
        ...current,
        storageError: 'Tutorial progress could not be saved. Check your browser storage settings and try again.',
      }))
      return false
    }
  }, [state.progress, storageKey])

  const markTutorialStarted = useCallback((tutorialId) => {
    if (state.progress.startedTutorialIds.includes(tutorialId)) return true

    return saveProgress((current) => ({
      ...current,
      startedTutorialIds: [...current.startedTutorialIds, tutorialId],
    }))
  }, [saveProgress, state.progress.startedTutorialIds])

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

  const recordTutorialResult = useCallback((tutorialId, score, totalQuestions) => {
    if (
      !Number.isInteger(score)
      || !Number.isInteger(totalQuestions)
      || totalQuestions < 1
      || score < 0
      || score > totalQuestions
    ) {
      throw new RangeError('Tutorial result must contain a valid score and question count.')
    }

    return saveProgress((current) => {
      const previous = current.completedTutorials[tutorialId]
      return {
        ...current,
        startedTutorialIds: current.startedTutorialIds.includes(tutorialId)
          ? current.startedTutorialIds
          : [...current.startedTutorialIds, tutorialId],
        completedTutorials: {
          ...current.completedTutorials,
          [tutorialId]: {
            bestScore: previous?.totalQuestions === totalQuestions
              ? Math.max(previous.bestScore, score)
              : score,
            totalQuestions,
            attempts: (previous?.attempts ?? 0) + 1,
            completedAt: new Date().toISOString(),
          },
        },
        quizProgress: Object.fromEntries(
          Object.entries(current.quizProgress).filter(([id]) => id !== tutorialId),
        ),
      }
    })
  }, [saveProgress])

  return {
    startedTutorialIds: state.progress.startedTutorialIds,
    completedTutorials: state.progress.completedTutorials,
    quizProgress: state.progress.quizProgress,
    storageError: state.storageError,
    markTutorialStarted,
    saveQuizProgress,
    recordTutorialResult,
  }
}
