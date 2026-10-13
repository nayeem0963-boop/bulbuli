import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import IntroCard from '../components/IntroCard.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import QuestionCard from '../components/QuestionCard.jsx'
import QuizCard from '../components/QuizCard.jsx'
import { htmlLevels } from '../data/htmlLevels.js'
import { useQuiz } from '../hooks/useQuiz.js'
import { formatDuration } from '../utils/formatDuration.js'
import { useProgress } from '../hooks/useProgress.js'

function Level() {
  const { levelId } = useParams()
  const navigate = useNavigate()
  const level = htmlLevels.find((item) => item.id === levelId)
  const [step, setStep] = useState('intro')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [quizIndex, setQuizIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [clockNow, setClockNow] = useState(() => performance.now())
  const { unlockedLevels, unlockLevel, completeLevel, markLevelStarted, storageError } = useProgress()
  const {
    activeLevelId,
    attemptStartedAt,
    currentStreak,
    elapsedMs,
    finishAttempt,
    highScores,
    questionTimes,
    recordAnswer,
    startAttempt,
    startQuestion,
    storageError: quizStorageError,
  } = useQuiz()

  useEffect(() => {
    if (level && unlockedLevels.includes(level.id)) {
      markLevelStarted(level.id)
    }
  }, [level, unlockedLevels, markLevelStarted])

  useEffect(() => {
    if (step === 'intro' || step === 'results') return undefined

    const interval = window.setInterval(() => setClockNow(performance.now()), 1000)
    return () => window.clearInterval(interval)
  }, [step])

  const activeQuestionIndex = step === 'qa' ? questionIndex : quizIndex
  const activeQuestionType = step === 'qa' ? 'qa' : 'quiz'
  const activeQuestionId = `${levelId}:${activeQuestionType}:${activeQuestionIndex}`
  const activeQuestionLabel = `${step === 'qa' ? 'Question' : 'Quiz'} ${activeQuestionIndex + 1}`

  useEffect(() => {
    if (step === 'qa' || step === 'quiz') {
      startQuestion(activeQuestionId, activeQuestionLabel)
    }
  }, [step, activeQuestionId, activeQuestionLabel, startQuestion])

  if (!level) {
    return (
      <main className="page">
        <h1>Level not found</h1>
        <Link to="/">Back to levels</Link>
      </main>
    )
  }

  if (!unlockedLevels.includes(level.id)) {
    return (
      <main className="page">
        <h1>Level locked</h1>
        <p>Complete the previous level to unlock this one.</p>
        <Link to="/">Back to levels</Link>
      </main>
    )
  }

  const totalQuestions = level.qa.length + level.quiz.length
  const percentage = Math.round((score / totalQuestions) * 100)
  const passed = percentage >= 70
  const progress = step === 'quiz'
    ? level.qa.length + quizIndex
    : step === 'results'
      ? totalQuestions
      : questionIndex

  const finishLevel = () => {
    finishAttempt(score, totalQuestions)
    setStep('results')
    if (!passed) return

    if (!completeLevel(level.id)) return
    const nextLevel = htmlLevels[htmlLevels.indexOf(level) + 1]
    if (nextLevel) unlockLevel(nextLevel.id)
  }

  const retryLevel = () => {
    setQuestionIndex(0)
    setQuizIndex(0)
    setScore(0)
    setStep('intro')
  }

  const beginLevel = () => {
    startAttempt(level.id)
    setStep('qa')
  }

  const handleAnswer = (questionId, label) => (correct) => {
    recordAnswer(questionId, label, correct)
    if (correct) setScore((current) => current + 1)
  }

  const highScore = highScores[level.id]
  const activeElapsedMs = activeLevelId === level.id && attemptStartedAt !== null
    ? clockNow - attemptStartedAt
    : elapsedMs

  return (
    <main className="page">
      <Link className="back-link" to="/">Back to levels</Link>
      <header className="page-header">
        <p className="eyebrow">HTML · {level.title}</p>
        <h1>{level.title}</h1>
        <p>{level.description}</p>
      </header>
      {step !== 'results' && <ProgressBar value={progress} max={totalQuestions} />}
      {step === 'intro' && (
        <IntroCard level={level} highScore={highScore} onStart={beginLevel} />
      )}
      {(step === 'qa' || step === 'quiz') && (
        <div className="quiz-session-stats">
          <span>Current streak <strong>🔥 {currentStreak}</strong></span>
          <span>Time <strong>{formatDuration(activeElapsedMs)}</strong></span>
        </div>
      )}
      {step === 'qa' && (
        <QuestionCard
          key={`${level.id}-qa-${questionIndex}`}
          question={level.qa[questionIndex]}
          questionNumber={questionIndex + 1}
          totalQuestions={level.qa.length}
          onAnswer={handleAnswer(activeQuestionId, activeQuestionLabel)}
          onNext={() => {
            if (questionIndex + 1 < level.qa.length) {
              setQuestionIndex((current) => current + 1)
            } else {
              setStep('quiz')
            }
          }}
        />
      )}
      {step === 'quiz' && (
        <QuizCard
          key={`${level.id}-quiz-${quizIndex}`}
          question={level.quiz[quizIndex]}
          questionNumber={quizIndex + 1}
          totalQuestions={level.quiz.length}
          onAnswer={handleAnswer(activeQuestionId, activeQuestionLabel)}
          onNext={() => {
            if (quizIndex + 1 < level.quiz.length) {
              setQuizIndex((current) => current + 1)
            } else {
              finishLevel()
            }
          }}
        />
      )}
      {step === 'results' && (
        <>
          <section className="card">
            <p className="eyebrow">Level results</p>
            <h2>{passed ? 'Level complete!' : 'Keep practicing'}</h2>
            <p>Your score: {score}/{totalQuestions} ({percentage}%)</p>
            <p>Total time: <strong>{formatDuration(elapsedMs)}</strong></p>
            <p>Current streak: <strong>🔥 {currentStreak}</strong></p>
            {highScore && (
              <p>
                Personal best: <strong>{highScore.score}/{highScore.total} ({highScore.percentage}%)</strong>
                {' · '}{formatDuration(highScore.elapsedMs)}
              </p>
            )}
            {questionTimes.length > 0 && (
              <section className="question-time-summary" aria-labelledby="question-times-heading">
                <h3 id="question-times-heading">Question times</h3>
                <ol>
                  {questionTimes.map((entry) => (
                    <li key={entry.questionId}>
                      <span>{entry.label}</span>
                      <span>{formatDuration(entry.elapsedMs)} · {entry.correct ? 'Correct' : 'Incorrect'}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {passed ? (
              <>
                <p>Great work! You passed this level.</p>
                <button
                  className="button"
                  type="button"
                  onClick={() => navigate(`/certificate/${level.id}`)}
                >
                  Claim your certificate
                </button>
              </>
            ) : (
              <>
                <p>You need at least 70% to complete this level.</p>
                <button className="button" type="button" onClick={retryLevel}>Try again</button>
              </>
            )}
          </section>
          {storageError && <p className="notice" role="alert">{storageError}</p>}
        </>
      )}
      {quizStorageError && <p className="notice" role="alert">{quizStorageError}</p>}
    </main>
  )
}

export default Level
