import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import IntroCard from '../components/IntroCard.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import QuestionCard from '../components/QuestionCard.jsx'
import QuizCard from '../components/QuizCard.jsx'
import { htmlLevels } from '../data/htmlLevels.js'
import { useProgress } from '../hooks/useProgress.js'

function Level() {
  const { levelId } = useParams()
  const navigate = useNavigate()
  const level = htmlLevels.find((item) => item.id === levelId)
  const [step, setStep] = useState('intro')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [quizIndex, setQuizIndex] = useState(0)
  const [score, setScore] = useState(0)
  const { unlockedLevels, unlockLevel, completeLevel, markLevelStarted, storageError } = useProgress()

  useEffect(() => {
    if (level && unlockedLevels.includes(level.id)) {
      markLevelStarted(level.id)
    }
  }, [level, unlockedLevels, markLevelStarted])

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
        <IntroCard level={level} onStart={() => setStep('qa')} />
      )}
      {step === 'qa' && (
        <QuestionCard
          key={`${level.id}-qa-${questionIndex}`}
          question={level.qa[questionIndex]}
          questionNumber={questionIndex + 1}
          totalQuestions={level.qa.length}
          onAnswer={(correct) => {
            if (correct) setScore((current) => current + 1)
          }}
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
          onAnswer={(correct) => {
            if (correct) setScore((current) => current + 1)
          }}
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
    </main>
  )
}

export default Level
