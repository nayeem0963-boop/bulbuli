import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import mathHeroMascot from '../assets/math-hero-mascot.png'
import { useTutorialProgress } from '../hooks/useTutorialProgress.js'
import {
  createMathHeroDeadline,
  createMathHeroFeedback,
  createInitialMathHeroProgress,
  createMathHeroQuestion,
  createNextMathHeroProgress,
  MATH_HERO_QUESTIONS_PER_LEVEL,
} from '../utils/mathHero.js'

const ANSWER_REVEAL_MILLISECONDS = 2200

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
  const {
    gamification,
    mathHeroProgress: savedProgress,
    saveMathHeroProgress,
    storageError,
  } = useTutorialProgress(userId)
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
      && Date.now() - Date.parse(gameProgress.feedback.createdAt) < ANSWER_REVEAL_MILLISECONDS,
    ),
  )
  const [celebrating, setCelebrating] = useState(false)
  const transitionInProgress = useRef(false)
  const firstSavePending = useRef(!savedProgress)

  useEffect(() => {
    if (!firstSavePending.current) return
    firstSavePending.current = false
    saveMathHeroProgress(gameProgress)
  }, [gameProgress, saveMathHeroProgress])

  useEffect(() => {
    if (!gameProgress.deadline) return undefined

    const timerId = window.setInterval(() => {
      setTimeRemaining(getRemainingSeconds(gameProgress.deadline))
    }, 250)
    return () => window.clearInterval(timerId)
  }, [gameProgress.deadline])

  useEffect(() => {
    const feedback = gameProgress.feedback
    if (!feedback || feedback.ready) return undefined

    const wait = Math.max(
      0,
      ANSWER_REVEAL_MILLISECONDS - (Date.now() - Date.parse(feedback.createdAt)),
    )
    const timeoutId = window.setTimeout(() => {
      const updated = {
        ...gameProgress,
        feedback: { ...feedback, ready: true },
      }
      setGameProgress(updated)
      saveMathHeroProgress(updated)
      setAnswerRevealVisible(false)
      transitionInProgress.current = false
    }, wait)
    return () => window.clearTimeout(timeoutId)
  }, [gameProgress, saveMathHeroProgress])

  useEffect(() => {
    if (timeRemaining > 0 || !gameProgress.deadline || gameProgress.feedback) return
    if (transitionInProgress.current) return

    transitionInProgress.current = true
    const updated = {
      ...gameProgress,
      deadline: null,
      feedback: createMathHeroFeedback('timeout'),
    }
    setGameProgress(updated)
    saveMathHeroProgress(updated)
    setTimeRemaining(0)
    setAnswerRevealVisible(true)
  }, [gameProgress, saveMathHeroProgress, timeRemaining])

  useEffect(() => {
    if (!celebrating) return undefined
    const timeoutId = window.setTimeout(() => setCelebrating(false), 1400)
    return () => window.clearTimeout(timeoutId)
  }, [celebrating])

  const selectAnswer = (answer) => {
    if (gameProgress.feedback || transitionInProgress.current) return
    if (getRemainingSeconds(gameProgress.deadline) === 0) {
      setTimeRemaining(0)
      return
    }

    if (answer === gameProgress.question.answer) {
      transitionInProgress.current = true
      const updated = createNextMathHeroProgress({
        ...gameProgress,
        totalXp: gameProgress.totalXp + 5,
      })
      setGameProgress(updated)
      saveMathHeroProgress(updated, 5)
      setTimeRemaining(getRemainingSeconds(updated.deadline))
      setAnswerRevealVisible(false)
      setCelebrating(true)
      transitionInProgress.current = false
      return
    }

    transitionInProgress.current = true
    const updated = {
      ...gameProgress,
      deadline: null,
      feedback: createMathHeroFeedback('incorrect'),
    }
    setGameProgress(updated)
    saveMathHeroProgress(updated)
    setTimeRemaining(0)
    setAnswerRevealVisible(true)
  }

  const continueAfterFeedback = (retry) => {
    if (!gameProgress.feedback?.ready || transitionInProgress.current) return
    transitionInProgress.current = true
    const updated = retry
      ? {
        ...gameProgress,
        deadline: createMathHeroDeadline(),
        feedback: null,
      }
      : createNextMathHeroProgress(gameProgress)
    setGameProgress(updated)
    saveMathHeroProgress(updated)
    setTimeRemaining(getRemainingSeconds(updated.deadline))
    setAnswerRevealVisible(false)
    transitionInProgress.current = false
  }

  const restartLevel = () => {
    if (transitionInProgress.current) return
    transitionInProgress.current = true
    const updated = {
      ...gameProgress,
      questionNumber: 1,
      question: createMathHeroQuestion(level),
      deadline: createMathHeroDeadline(),
      feedback: null,
    }
    setGameProgress(updated)
    saveMathHeroProgress(updated)
    setTimeRemaining(getRemainingSeconds(updated.deadline))
    setAnswerRevealVisible(false)
    transitionInProgress.current = false
  }

  const { level, questionNumber, question, feedback } = gameProgress
  const showCorrectAnswer = feedback && !feedback.ready && answerRevealVisible
  const feedbackReady = feedback?.ready === true
  const progressPercent = (questionNumber / MATH_HERO_QUESTIONS_PER_LEVEL) * 100

  return (
    <main className="page tutorial-hub math-hero-page">
      <Link className="back-link" to="/">← Your learning space</Link>
      <header className="math-hero-heading">
        <img className="math-hero-mascot" src={mathHeroMascot} alt="" />
        <div>
          <p className="eyebrow">A little math adventure</p>
          <h1>Math Hero</h1>
          <p>Every question makes you stronger. You’ve got this!</p>
        </div>
      </header>

      {storageError && <p className="notice" role="alert">{storageError}</p>}

      <section className="math-hero-stats" aria-label="Math Hero progress">
        <div className="math-hero-xp" aria-label={`${gameProgress.totalXp} Math Hero XP`}>
          <span aria-hidden="true">⭐</span>
          <strong>{gameProgress.totalXp}</strong>
          <span>Math Hero XP</span>
        </div>
        <div className="math-hero-xp math-hero-total-xp">
          <span aria-hidden="true">🏆</span>
          <strong>{gamification.totalXp}</strong>
          <span>Total Bulbuli XP</span>
        </div>
      </section>

      <section className="card math-hero-game" aria-labelledby="math-hero-question">
        <div className="math-hero-game-top">
          <div>
            <p className="eyebrow">Level {level}</p>
            <h2 id="math-hero-question">Question {questionNumber} of {MATH_HERO_QUESTIONS_PER_LEVEL}</h2>
          </div>
          <div
            className={`math-hero-timer${timeRemaining <= 15 ? ' is-urgent' : ''}`}
            role="timer"
            aria-label={`${formatTime(timeRemaining)} remaining`}
          >
            <span aria-hidden="true">⏱</span>
            {formatTime(timeRemaining)}
          </div>
        </div>

        <div
          className="math-hero-progress"
          role="progressbar"
          aria-label={`Level ${level} progress`}
          aria-valuemin="1"
          aria-valuemax={MATH_HERO_QUESTIONS_PER_LEVEL}
          aria-valuenow={questionNumber}
        >
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="math-hero-progress-label">Level {level} · {questionNumber} of {MATH_HERO_QUESTIONS_PER_LEVEL}</p>

        <p className="math-hero-problem" aria-live="polite">
          {question.left} {question.operator} {question.right} <span>= ?</span>
        </p>

        {celebrating && !feedback && (
          <p className="math-hero-message is-correct" role="status">🌟 Great job! +5 XP — here comes the next one!</p>
        )}
        {feedback && (
          <div className={`math-hero-message ${feedback.type === 'timeout' ? 'is-timeout' : 'is-incorrect'}`} role="status">
            {showCorrectAnswer
              ? `${feedback.type === 'timeout' ? 'Time’s up!' : 'Almost!'} The answer is ${question.answer}.`
              : feedback.type === 'timeout' ? 'That’s okay — every hero gets another try!' : 'You’re learning — keep going!'}
          </div>
        )}

        <div className="math-hero-options" aria-label="Choose an answer">
          {question.options.map((option, index) => (
            <button
              className="math-hero-option"
              key={`${option}-${index}`}
              type="button"
              disabled={Boolean(feedback) || timeRemaining === 0}
              onClick={() => selectAnswer(option)}
            >
              {option}
            </button>
          ))}
        </div>

        {feedbackReady && (
          <div className="math-hero-feedback-actions">
            <button className="button math-hero-primary" type="button" onClick={() => continueAfterFeedback(true)}>
              Try this one again
            </button>
            <button className="button-secondary" type="button" onClick={() => continueAfterFeedback(false)}>
              Next question
            </button>
          </div>
        )}

        <div className="math-hero-footer">
          <span>Get it right to earn 5 XP!</span>
          <button className="text-button math-hero-restart" type="button" onClick={restartLevel}>
            ↻ Restart level
          </button>
        </div>
      </section>
      <p className="math-hero-save-note">Your adventure is saved automatically on this device.</p>
    </main>
  )
}

export default MathHero
