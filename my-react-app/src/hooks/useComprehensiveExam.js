import { useCallback, useEffect, useRef, useState } from 'react'
import { EXAM_CONFIGS } from '../utils/comprehensiveExam.js'

const EMPTY_EXAM_PROGRESS = {
  attempts: [],
  highScore: 0,
  totalXp: 0,
  completed: false,
  latestAttempt: null,
  activeAttempt: null,
}

function getStorageKey(userId, examConfig) {
  if (typeof userId !== 'string' || !userId.trim()) {
    throw new TypeError('A signed-in user ID is required to track exam progress.')
  }

  const userKey = encodeURIComponent(userId)
  return examConfig.id === EXAM_CONFIGS.preparation.id
    ? `bulbuli.comprehensive-exam.v1.${userKey}`
    : `bulbuli.subject-exam.v1.${userKey}.${examConfig.id}`
}

function isValidAttempt(attempt, examConfig) {
  return Boolean(
    attempt
    && typeof attempt.id === 'string'
    && Array.isArray(attempt.questions)
    && attempt.questions.length === examConfig.questionCount
    && Array.isArray(attempt.answers)
    && attempt.answers.length === examConfig.questionCount
    && attempt.answers.every((answer) => answer === null || (
      Number.isInteger(answer) && answer >= 0 && answer <= 3
    ))
    && Number.isInteger(attempt.currentIndex)
    && attempt.currentIndex >= 0
    && attempt.currentIndex < examConfig.questionCount
    && !Number.isNaN(Date.parse(attempt.startedAt))
    && !Number.isNaN(Date.parse(attempt.expiresAt))
    && Date.parse(attempt.expiresAt) - Date.parse(attempt.startedAt)
      === examConfig.durationSeconds * 1000
    && attempt.questions.every((question) => (
      typeof question.id === 'string'
      && Array.isArray(question.options)
      && question.options.length === 4
      && Number.isInteger(question.correctIndex)
      && question.correctIndex >= 0
      && question.correctIndex < question.options.length
    )),
  )
}

function isValidResult(result, examConfig) {
  return Boolean(
    result
    && typeof result.id === 'string'
    && Number.isInteger(result.score)
    && result.score >= 0
    && result.score <= examConfig.questionCount
    && result.totalQuestions === examConfig.questionCount
    && Array.isArray(result.questionIds)
    && result.questionIds.length === examConfig.questionCount
    && result.questionIds.every((id) => typeof id === 'string')
    && Number.isInteger(result.percentage)
    && result.percentage >= 0
    && result.percentage <= 100
    && result.percentage === Math.round((result.score / examConfig.questionCount) * 100)
    && typeof result.passed === 'boolean'
    && result.passed === (result.percentage >= examConfig.passPercent)
    && typeof result.perfect === 'boolean'
    && result.perfect === (result.percentage === 100)
    && Number.isInteger(result.xpEarned)
    && result.xpEarned >= 0
    && !Number.isNaN(Date.parse(result.submittedAt)),
  )
}

function normalizeProgress(progress, examConfig) {
  if (
    !progress
    || !Array.isArray(progress.attempts)
    || !progress.attempts.every((attempt) => isValidResult(attempt, examConfig))
    || (progress.latestAttempt !== null && !isValidResult(progress.latestAttempt, examConfig))
    || (progress.activeAttempt !== null && !isValidAttempt(progress.activeAttempt, examConfig))
  ) {
    throw new Error('Saved comprehensive exam progress has an invalid format.')
  }

  const highScore = progress.attempts.reduce((highest, attempt) => Math.max(highest, attempt.score), 0)
  const totalXp = progress.attempts.reduce((total, attempt) => total + (Number(attempt.xpEarned) || 0), 0)
  return {
    attempts: progress.attempts,
    highScore,
    totalXp,
    completed: progress.attempts.some((attempt) => attempt.passed),
    latestAttempt: progress.latestAttempt ?? progress.attempts.at(-1) ?? null,
    activeAttempt: progress.activeAttempt ?? null,
  }
}

function loadProgress(storageKey, examConfig) {
  try {
    const saved = window.localStorage.getItem(storageKey)
    return {
      progress: saved === null ? EMPTY_EXAM_PROGRESS : normalizeProgress(JSON.parse(saved), examConfig),
      storageError: '',
    }
  } catch (error) {
    console.error('Unable to load Bulbuli comprehensive exam progress from localStorage.', error)
    return {
      progress: EMPTY_EXAM_PROGRESS,
      storageError: 'Comprehensive exam progress could not be loaded from this browser.',
    }
  }
}

export function useComprehensiveExam(userId, examConfig = EXAM_CONFIGS.preparation) {
  const [storageKey] = useState(() => getStorageKey(userId, examConfig))
  const [state, setState] = useState(() => loadProgress(storageKey, examConfig))
  const progressRef = useRef(state.progress)

  useEffect(() => {
    const syncProgress = (progress) => {
      const normalized = normalizeProgress(progress, examConfig)
      progressRef.current = normalized
      setState({ progress: normalized, storageError: '' })
    }
    const handleStorage = (event) => {
      if (event.key !== storageKey || event.newValue === null) return
      try {
        syncProgress(JSON.parse(event.newValue))
      } catch (error) {
        console.error('Unable to synchronize comprehensive exam progress.', error)
        setState((current) => ({
          ...current,
          storageError: 'Comprehensive exam progress could not be synchronized between tabs.',
        }))
      }
    }
    const handleLocalProgress = (event) => {
      if (event.detail?.storageKey === storageKey) syncProgress(event.detail.progress)
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('bulbuli:comprehensive-exam-progress', handleLocalProgress)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('bulbuli:comprehensive-exam-progress', handleLocalProgress)
    }
  }, [examConfig, storageKey])

  const saveProgress = useCallback((update) => {
    const nextProgress = normalizeProgress(update(progressRef.current), examConfig)
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextProgress))
      progressRef.current = nextProgress
      setState({ progress: nextProgress, storageError: '' })
      window.dispatchEvent(new CustomEvent('bulbuli:comprehensive-exam-progress', {
        detail: { storageKey, progress: nextProgress },
      }))
      return true
    } catch (error) {
      console.error('Unable to save Bulbuli comprehensive exam progress.', error)
      progressRef.current = nextProgress
      setState((current) => ({
        ...current,
        progress: nextProgress,
        storageError: 'Comprehensive exam progress could not be saved. Check browser storage settings and try again.',
      }))
      return false
    }
  }, [examConfig, storageKey])

  const saveActiveAttempt = useCallback((attempt) => {
    if (attempt !== null && !isValidAttempt(attempt, examConfig)) {
      throw new TypeError(`An ${examConfig.title} attempt must contain ${examConfig.questionCount} valid questions and answers.`)
    }
    return saveProgress((current) => ({ ...current, activeAttempt: attempt }))
  }, [examConfig, saveProgress])

  const completeAttempt = useCallback((result) => {
    if (!isValidResult(result, examConfig)) {
      throw new TypeError(`An ${examConfig.title} result must contain a valid score and submission time.`)
    }

    return saveProgress((current) => ({
      ...current,
      attempts: [...current.attempts, result],
      highScore: Math.max(current.highScore, result.score),
      completed: current.completed || result.passed,
      latestAttempt: result,
      activeAttempt: null,
    }))
  }, [examConfig, saveProgress])

  return {
    ...state.progress,
    storageError: state.storageError,
    saveActiveAttempt,
    completeAttempt,
  }
}
