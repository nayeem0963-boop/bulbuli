import { useCallback, useEffect, useRef, useState } from 'react'
import mathHeroMascot from '../assets/math-hero-mascot-cutout.webp'
import AnimatedAnswerOption from '../components/AnimatedAnswerOption.jsx'
import AnimatedQuizCard from '../components/AnimatedQuizCard.jsx'
import LifeCounter from '../components/LifeCounter.jsx'
import MathHeroMascot from '../components/MathHeroMascot.jsx'
import MilestoneBanner from '../components/MilestoneBanner.jsx'
import useSoundToggle from '../hooks/useSoundToggle.js'
import useQuizFeedback from '../hooks/useQuizFeedback.js'
import { useGameProgress } from '../hooks/useGameProgress.js'
import { FEEDBACK_TIMING, getFeedbackStyle } from '../utils/feedbackConfig.js'
import {
  applyMathHeroCorrectAnswer,
  applyMathHeroMiss,
  createInitialMathHeroProgress,
  createMathHeroGameOverProgress,
  createNextMathHeroProgress,
  MATH_HERO_QUESTIONS_PER_LEVEL,
} from '../utils/mathHero.js'
import { formatDigits, MATH_HERO_TEXT } from '../utils/mathHeroText.js'
import { useLanguage } from '../arcade/preferences.js'
import { GameFullscreenButton } from '../arcade/GameFullscreen.jsx'

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function getRemainingSeconds(deadline) {
  if (!deadline) return 0
  return Math.max(0, Math.ceil((Date.parse(deadline) - Date.now()) / 1000))
}

function MathHero({ userId }) {
  // Language and sound are switched from the arcade's game bar, which is shared by every game.
  const { muted } = useSoundToggle()
  const [language] = useLanguage()
  const text = MATH_HERO_TEXT[language]
  const n = (value) => formatDigits(value, language)
  // The level-up banner is created inside a memoised callback, so it reads the language from a ref.
  const languageRef = useRef(language)
  useEffect(() => {
    languageRef.current = language
  }, [language])
  const {
    feedback,
    milestone,
    triggerClick,
    triggerCorrect,
    triggerWrong,
    triggerBonus,
    triggerLevelUp,
    triggerGameOver,
    clearFeedback,
    clearMilestone,
  } = useQuizFeedback()
  const {
    gamification,
    mathHeroProgress: savedProgress,
    saveMathHeroProgress,
    storageError,
  } = useGameProgress(userId)
  const [gameProgress, setGameProgress] = useState(
    () => savedProgress ?? createInitialMathHeroProgress(),
  )
  const [timeRemaining, setTimeRemaining] = useState(
    () => getRemainingSeconds(gameProgress.deadline),
  )
  const [answerRevealVisible, setAnswerRevealVisible] = useState(
    () => Boolean(
      gameProgress.feedback
      && !gameProgress.feedback.ready
      && Date.now() - Date.parse(gameProgress.feedback.createdAt) < FEEDBACK_TIMING.answerTransition,
    ),
  )
  const [celebrating, setCelebrating] = useState(false)
  const [bonusLifeAwarded, setBonusLifeAwarded] = useState(false)
  const [levelUp, setLevelUp] = useState(0)
  const transitionInProgress = useRef(false)
  const firstSavePending = useRef(!savedProgress)
  const pendingExitReset = useRef(null)
  const answerTransitionTimer = useRef(null)
  const animationTimers = useRef([])
  const previousLevel = useRef(gameProgress.level)
  const scheduleAnimation = useCallback((callback, delay) => {
    const timerId = window.setTimeout(() => {
      animationTimers.current = animationTimers.current.filter((activeId) => activeId !== timerId)
      callback()
    }, delay)
    animationTimers.current.push(timerId)
    return timerId
  }, [])
  const animateLevelChange = useCallback((nextLevel) => {
    if (nextLevel === previousLevel.current) return
    previousLevel.current = nextLevel
    setLevelUp(nextLevel)
    scheduleAnimation(() => setLevelUp(0), FEEDBACK_TIMING.fast)

    if (nextLevel > 10 && nextLevel % 10 === 1) {
      const lang = languageRef.current
      triggerLevelUp(MATH_HERO_TEXT[lang].complexity(formatDigits(nextLevel, lang)))
    } else {
      triggerLevelUp()
    }
  }, [scheduleAnimation, triggerLevelUp])

  useEffect(() => {
    if (!firstSavePending.current) return
    firstSavePending.current = false
    saveMathHeroProgress(gameProgress)
  }, [gameProgress, saveMathHeroProgress])

  useEffect(() => {
    if (pendingExitReset.current !== null) {
      window.clearTimeout(pendingExitReset.current)
      pendingExitReset.current = null
    }

    const resetOnExit = () => {
      const initialProgress = createInitialMathHeroProgress()
      previousLevel.current = initialProgress.level
      saveMathHeroProgress(initialProgress)
      setGameProgress(initialProgress)
      setTimeRemaining(getRemainingSeconds(initialProgress.deadline))
      setAnswerRevealVisible(false)
      setCelebrating(false)
      setBonusLifeAwarded(false)
      setLevelUp(0)
      clearFeedback()
      clearMilestone()
      transitionInProgress.current = false
    }
    const handlePageHide = () => resetOnExit()
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      pendingExitReset.current = window.setTimeout(() => {
        pendingExitReset.current = null
        resetOnExit()
      }, 0)
    }
  }, [clearFeedback, clearMilestone, saveMathHeroProgress])

  useEffect(() => () => {
    if (answerTransitionTimer.current !== null) {
      window.clearTimeout(answerTransitionTimer.current)
    }
    animationTimers.current.forEach((timerId) => window.clearTimeout(timerId))
  }, [])

  useEffect(() => {
    if (!gameProgress.deadline) return undefined

    const timerId = window.setInterval(() => {
      setTimeRemaining(getRemainingSeconds(gameProgress.deadline))
    }, 250)
    return () => window.clearInterval(timerId)
  }, [gameProgress.deadline])

  useEffect(() => {
    const feedback = gameProgress.feedback
    if (!feedback) return undefined

    const wait = feedback.ready
      ? 0
      : Math.max(0, FEEDBACK_TIMING.answerTransition - (Date.now() - Date.parse(feedback.createdAt)))
    const timeoutId = window.setTimeout(() => {
      const updated = gameProgress.lives > 0
        ? createNextMathHeroProgress(gameProgress)
        : createMathHeroGameOverProgress(gameProgress)

      if (updated.gameOver) triggerGameOver()
      animateLevelChange(updated.level)
      setGameProgress(updated)
      saveMathHeroProgress(updated)
      setTimeRemaining(getRemainingSeconds(updated.deadline))
      setAnswerRevealVisible(false)
      setCelebrating(false)
      setBonusLifeAwarded(false)
      clearFeedback()
      transitionInProgress.current = false
    }, wait)
    return () => window.clearTimeout(timeoutId)
  }, [animateLevelChange, clearFeedback, gameProgress, saveMathHeroProgress, triggerGameOver])

  const handleMiss = useCallback((type, target = null) => {
    if (transitionInProgress.current) return
    transitionInProgress.current = true
    triggerWrong(target)
    const missedProgress = applyMathHeroMiss(gameProgress, type)
    const updated = missedProgress.lives === 0
      ? createMathHeroGameOverProgress(missedProgress)
      : missedProgress

    if (updated.gameOver) triggerGameOver()
    setGameProgress(updated)
    saveMathHeroProgress(updated)
    setTimeRemaining(0)
    setAnswerRevealVisible(Boolean(updated.feedback))
    if (updated.gameOver) transitionInProgress.current = false
  }, [gameProgress, saveMathHeroProgress, triggerGameOver, triggerWrong])

  useEffect(() => {
    if (timeRemaining > 0 || !gameProgress.deadline || gameProgress.feedback || gameProgress.gameOver) return
    handleMiss('timeout')
  }, [gameProgress.deadline, gameProgress.feedback, gameProgress.gameOver, handleMiss, timeRemaining])

  useEffect(() => {
    if (!celebrating) return undefined
    const timeoutId = window.setTimeout(() => setCelebrating(false), 1400)
    return () => window.clearTimeout(timeoutId)
  }, [celebrating])

  const selectAnswer = (answer) => {
    if (gameProgress.feedback || gameProgress.gameOver || transitionInProgress.current) return
    triggerClick()
    if (getRemainingSeconds(gameProgress.deadline) === 0) {
      setTimeRemaining(0)
      return
    }

    if (answer === gameProgress.question.answer) {
      transitionInProgress.current = true
      triggerCorrect(answer)
      answerTransitionTimer.current = window.setTimeout(() => {
        const { progress: updated, bonusLifeAwarded } = applyMathHeroCorrectAnswer(gameProgress)
        animateLevelChange(updated.level)
        setGameProgress(updated)
        saveMathHeroProgress(updated, 5)
        setTimeRemaining(getRemainingSeconds(updated.deadline))
        setAnswerRevealVisible(false)
        setCelebrating(true)
        setBonusLifeAwarded(bonusLifeAwarded)
        if (bonusLifeAwarded) triggerBonus()
        transitionInProgress.current = false
        answerTransitionTimer.current = null
      }, FEEDBACK_TIMING.answerTransition)
      return
    }

    handleMiss('incorrect', answer)
  }

  const startNewRun = () => {
    if (transitionInProgress.current) return
    transitionInProgress.current = true
    triggerClick()
    const updated = createInitialMathHeroProgress()
    previousLevel.current = updated.level
    setGameProgress(updated)
    saveMathHeroProgress(updated)
    setTimeRemaining(getRemainingSeconds(updated.deadline))
    setAnswerRevealVisible(false)
    setCelebrating(false)
    setBonusLifeAwarded(false)
    setLevelUp(0)
    clearFeedback()
    clearMilestone()
    transitionInProgress.current = false
  }

  const {
    level,
    questionNumber,
    question,
    feedback: gameFeedback,
    gameOver,
    lives,
  } = gameProgress
  const showCorrectAnswer = Boolean(gameFeedback && !gameFeedback.ready && answerRevealVisible)
  const progressPercent = (questionNumber / MATH_HERO_QUESTIONS_PER_LEVEL) * 100

  return (
    <div className="page tutorial-hub math-hero-page" lang={language}>
      <header className="math-hero-heading">
        <MathHeroMascot
          src={mathHeroMascot}
          question={question}
          gameOver={gameOver}
          muted={muted}
          language={language}
        />
        <div className="math-hero-heading-copy">
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
        {/* full screen: only inside the arcade's game frame (renders nothing elsewhere) */}
        <GameFullscreenButton />
      </header>

      {storageError && <p className="notice" role="alert">{storageError}</p>}

      <section className="math-hero-stats" aria-label={text.statsLabel}>
        <div className="math-hero-xp" aria-label={text.mathHeroXpLabel(n(gameProgress.totalXp))}>
          <span aria-hidden="true">⭐</span>
          <strong>{n(gameProgress.totalXp)}</strong>
          <span>{text.mathHeroXp}</span>
        </div>
        <LifeCounter
          lives={lives}
          event={gameOver
            ? null
            : milestone?.type === 'bonus' ? milestone : feedback?.type === 'wrong' ? feedback : null}
          className="math-hero-xp math-hero-lives"
          labels={{ ...text, formatNumber: n }}
        />
        <div className="math-hero-xp math-hero-total-xp">
          <span aria-hidden="true">🏆</span>
          <strong>{n(gamification.totalXp)}</strong>
          <span>{text.totalXp}</span>
        </div>
      </section>

      <AnimatedQuizCard
        className="card math-hero-game"
        feedback={feedback}
        aria-labelledby="math-hero-question"
      >
        <div className="math-hero-game-top">
          <div>
            <p
              key={level}
              className={`eyebrow feedback-level-badge${levelUp === level ? ' is-leveling-up' : ''}`}
              style={getFeedbackStyle()}
            >
              {text.level(n(level))}
            </p>
            <h2 id="math-hero-question">{text.question(n(questionNumber), n(MATH_HERO_QUESTIONS_PER_LEVEL))}</h2>
          </div>
          <div
            className={`math-hero-timer${timeRemaining <= 15 ? ' is-urgent' : ''}`}
            role="timer"
            aria-label={text.timeRemaining(n(formatTime(timeRemaining)))}
          >
            <span aria-hidden="true">⏱</span>
            {n(formatTime(timeRemaining))}
          </div>
        </div>

        <MilestoneBanner
          event={milestone?.type === 'level-up' ? milestone : null}
          className="math-hero-complexity-notice"
        />

        <div
          className="math-hero-progress"
          role="progressbar"
          aria-label={text.levelProgressLabel(n(level))}
          aria-valuemin="1"
          aria-valuemax={MATH_HERO_QUESTIONS_PER_LEVEL}
          aria-valuenow={questionNumber}
        >
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="math-hero-progress-label">
          {text.levelProgress(n(level), n(questionNumber), n(MATH_HERO_QUESTIONS_PER_LEVEL))}
        </p>

        <p className="math-hero-problem" aria-live="polite">
          {n(question.left)} {question.operator} {n(question.right)} <span>= ?</span>
        </p>

        {celebrating && !gameFeedback && (
          <p className="math-hero-message is-correct" role="status">
            {bonusLifeAwarded ? text.greatWithBonus : text.great}
          </p>
        )}
        {gameFeedback && (
          <div className={`math-hero-message ${gameFeedback.type === 'timeout' ? 'is-timeout' : 'is-incorrect'}`} role="status">
            {showCorrectAnswer
              ? `${gameFeedback.type === 'timeout' ? text.timeUp : text.almost} ${text.theAnswerIs(n(question.answer))}`
              : text.nextReady}
          </div>
        )}

        <div className="math-hero-options" aria-label={text.chooseAnswer}>
          {question.options.map((option, index) => (
            <AnimatedAnswerOption
              key={`${option}-${index}`}
              className="math-hero-option"
              feedback={feedback}
              option={option}
              type="button"
              disabled={Boolean(gameFeedback || gameOver) || timeRemaining === 0}
              onClick={() => selectAnswer(option)}
            >
              {n(option)}
              {feedback?.target === option && feedback.type === 'correct' && (
                <span key={feedback.id} className="math-hero-answer-particle" aria-hidden="true">
                  {text.answerXp}
                </span>
              )}
            </AnimatedAnswerOption>
          ))}
        </div>

        <div className="math-hero-footer">
          <span>{text.earnXp}</span>
          <span>{text.bonusRule}</span>
        </div>
      </AnimatedQuizCard>
      <p className="math-hero-save-note">{text.saveNote}</p>

      {gameOver && (
        <div
          className="math-hero-game-over-backdrop feedback-modal-backdrop"
          style={getFeedbackStyle()}
        >
          <section
            className="math-hero-game-over feedback-modal-enter"
            style={getFeedbackStyle()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="math-hero-game-over-title"
          >
            <span className="math-hero-game-over-icon" aria-hidden="true">💫</span>
            <p className="eyebrow">{text.gameOverEyebrow}</p>
            <h2 id="math-hero-game-over-title">{text.gameOverTitle}</h2>
            <p className="math-hero-game-over-message">{text.gameOverMessage}</p>
            <div className="math-hero-final-stats">
              <span>{text.finalScore} <strong>{n(gameOver.finalScore)} XP</strong></span>
              <span>{text.levelReached} <strong>{n(gameOver.finalLevel)}</strong></span>
              <span>{text.correctAnswers} <strong>{n(gameOver.correctAnswers)}</strong></span>
            </div>
            <button className="button math-hero-primary" type="button" onClick={startNewRun}>
              {text.newRun}
            </button>
          </section>
        </div>
      )}
    </div>
  )
}

export default MathHero
