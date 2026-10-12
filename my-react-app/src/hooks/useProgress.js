import { useCallback, useRef, useState } from 'react'

const STORAGE_KEY = 'bulbuli.progress'
const DEFAULT_PROGRESS = {
  unlockedLevels: ['html-1'],
  completedLevels: [],
  startedLevels: [],
  learnerName: '',
}

const LEGACY_LEVEL_IDS = {
  'html-tags-basics': 'html-1',
  'html-attributes': 'html-2',
  'html-text-headings': 'html-3',
}

function normalizeProgress(progress) {
  if (
    !progress ||
    !Array.isArray(progress.unlockedLevels) ||
    !Array.isArray(progress.completedLevels) ||
    (progress.startedLevels !== undefined && !Array.isArray(progress.startedLevels)) ||
    (progress.learnerName !== undefined && typeof progress.learnerName !== 'string') ||
    !progress.unlockedLevels.every((id) => typeof id === 'string') ||
    !progress.completedLevels.every((id) => typeof id === 'string') ||
    (progress.startedLevels !== undefined && !progress.startedLevels.every((id) => typeof id === 'string'))
  ) {
    throw new Error('Saved progress has an invalid format.')
  }

  const migrateIds = (ids) => ids.map((id) => LEGACY_LEVEL_IDS[id] ?? id)
  const completedLevels = [...new Set(migrateIds(progress.completedLevels))]
  const unlockedLevels = new Set([
    ...DEFAULT_PROGRESS.unlockedLevels,
    ...migrateIds(progress.unlockedLevels),
  ])
  const startedLevels = new Set(migrateIds(progress.startedLevels ?? []))

  for (let index = 0; index < 14; index += 1) {
    if (completedLevels.includes(`html-${index + 1}`)) {
      unlockedLevels.add(`html-${index + 2}`)
    } else {
      break
    }
  }

  return {
    unlockedLevels: [...unlockedLevels],
    completedLevels,
    startedLevels: [...startedLevels],
    learnerName: progress.learnerName?.trim() ?? '',
  }
}

function loadProgress() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return {
      progress: saved === null ? DEFAULT_PROGRESS : normalizeProgress(JSON.parse(saved)),
      storageError: '',
    }
  } catch (error) {
    console.error('Unable to load Bulbuli progress from localStorage.', error)
    return {
      progress: DEFAULT_PROGRESS,
      storageError: 'Progress could not be loaded from this browser.',
    }
  }
}

export function useProgress() {
  const [state, setState] = useState(loadProgress)
  const progressRef = useRef(state.progress)

  const saveProgress = useCallback((nextProgress) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProgress))
      progressRef.current = nextProgress
      setState({ progress: nextProgress, storageError: '' })
      return true
    } catch (error) {
      console.error('Unable to save Bulbuli progress to localStorage.', error)
      setState((current) => ({
        ...current,
        storageError: 'Progress could not be saved. Check your browser storage settings and try again.',
      }))
      return false
    }
  }, [])

  const unlockLevel = useCallback((id) => {
    if (progressRef.current.unlockedLevels.includes(id)) return true
    return saveProgress({
      ...progressRef.current,
      unlockedLevels: [...progressRef.current.unlockedLevels, id],
    })
  }, [saveProgress])

  const completeLevel = useCallback((id) => {
    const current = progressRef.current
    const unlockedLevels = current.unlockedLevels.includes(id)
      ? current.unlockedLevels
      : [...current.unlockedLevels, id]

    if (current.completedLevels.includes(id) && unlockedLevels === current.unlockedLevels) return true

    return saveProgress({
      ...current,
      unlockedLevels,
      completedLevels: current.completedLevels.includes(id)
        ? current.completedLevels
        : [...current.completedLevels, id],
    })
  }, [saveProgress])

  const markLevelStarted = useCallback((id) => {
    const current = progressRef.current
    if (current.startedLevels.includes(id)) return true

    return saveProgress({
      ...current,
      startedLevels: [...current.startedLevels, id],
    })
  }, [saveProgress])

  const resetProgress = useCallback(() => saveProgress(DEFAULT_PROGRESS), [saveProgress])
  const setLearnerName = useCallback((learnerName) => {
    if (typeof learnerName !== 'string') {
      throw new TypeError('Learner name must be a string.')
    }

    return saveProgress({
      ...progressRef.current,
      learnerName: learnerName.trim(),
    })
  }, [saveProgress])

  return {
    unlockedLevels: state.progress.unlockedLevels,
    completedLevels: state.progress.completedLevels,
    startedLevels: state.progress.startedLevels,
    storageError: state.storageError,
    learnerName: state.progress.learnerName,
    unlockLevel,
    completeLevel,
    markLevelStarted,
    setLearnerName,
    resetProgress,
  }
}
