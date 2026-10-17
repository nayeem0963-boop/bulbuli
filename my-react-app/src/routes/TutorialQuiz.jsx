import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar.jsx'
import QuizCard from '../components/QuizCard.jsx'
import { tutorialCatalog } from '../data/tutorialCatalog.js'
import { useTutorialProgress } from '../hooks/useTutorialProgress.js'

const MODULE_QUIZ_DURATION_SECONDS = 5 * 60
const TUTORIAL_QUIZ_DURATION_SECONDS = 15 * 60

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function TutorialQuizSession({ tutorial, userId, section }) {
  const quizDurationSeconds = section
    ? MODULE_QUIZ_DURATION_SECONDS
    : TUTORIAL_QUIZ_DURATION_SECONDS
  const {
    gamification,
    markTutorialStarted,
    quizProgress,
    quizSessionStartedAt,
    recordQuizCompletion,
    saveQuizProgress,
    storageError,
    startQuizSession,
  } = useTutorialProgress(userId)
  const savedAttempt = quizProgress[tutorial.id]
  const sessionId = `${tutorial.id}:${section?.id ?? 'course'}`
  const quizQuestions = section
    ? tutorial.questions.flatMap((question, originalIndex) => (
      question.sectionId === section.id ? [{ question, originalIndex }] : []
    ))
    : tutorial.questions.map((question, originalIndex) => ({ question, originalIndex }))
  const [answers, setAnswers] = useState(
    () => quizQuestions.map(({ originalIndex }) => savedAttempt?.answers[originalIndex] ?? null),
  )
  const [questionIndex, setQuestionIndex] = useState(
    () => {
      if (!section) return Math.min(savedAttempt?.currentIndex ?? 0, quizQuestions.length - 1)

      const savedIndex = quizQuestions.findIndex(({ originalIndex }) => (
        originalIndex === savedAttempt?.currentIndex
      ))
      if (savedIndex >= 0) return savedIndex

      const firstUnanswered = quizQuestions.findIndex(({ originalIndex }) => (
        savedAttempt?.answers[originalIndex] === null || savedAttempt?.answers[originalIndex] === undefined
      ))
      return firstUnanswered >= 0 ? firstUnanswered : 0
    },
  )
  const [complete, setComplete] = useState(false)
  const [rewardSummary, setRewardSummary] = useState(null)
  const [sessionStartedAt] = useState(
    () => quizSessionStartedAt[sessionId] ?? new Date().toISOString(),
  )
  const completionRecorded = useRef(false)
  const [timeRemaining, setTimeRemaining] = useState(
    () => Math.max(
      0,
      Math.ceil((Date.parse(sessionStartedAt) + quizDurationSeconds * 1000 - Date.now()) / 1000),
    ),
  )
  const totalQuestions = quizQuestions.length
  const question = quizQuestions[questionIndex].question
  const answeredCount = answers.filter((answer) => answer !== null).length
  const score = answers.reduce(
    (total, answer, index) => total + (answer === quizQuestions[index].question.correctIndex ? 1 : 0),
    0,
  )
  const percentage = Math.round((score / totalQuestions) * 100)

  useEffect(() => {
    markTutorialStarted(tutorial.id)
  }, [markTutorialStarted, tutorial.id])

  useEffect(() => {
    if (!complete) startQuizSession(sessionId, sessionStartedAt)
  }, [complete, sessionId, sessionStartedAt, startQuizSession])

  const saveAnswers = (nextAnswers, nextIndex = questionIndex) => {
    setAnswers(nextAnswers)
    const fullAnswers = Array.from(
      { length: tutorial.questions.length },
      (_, index) => savedAttempt?.answers[index] ?? null,
    )
    quizQuestions.forEach(({ originalIndex }, index) => {
      fullAnswers[originalIndex] = nextAnswers[index]
    })
    saveQuizProgress(tutorial.id, fullAnswers, quizQuestions[nextIndex].originalIndex)
  }

  const goToQuestion = (nextIndex) => {
    setQuestionIndex(nextIndex)
    saveAnswers(answers, nextIndex)
  }

  const finishQuiz = useCallback(() => {
    if (completionRecorded.current) return
    completionRecorded.current = true

    const speedBonus = timeRemaining >= quizDurationSeconds / 2 ? 5 : 0
    const xpEarned = 10 + score * 5 + speedBonus
    const passed = answeredCount === totalQuestions && score === totalQuestions
    const completion = recordQuizCompletion(
      tutorial.id,
      sessionId,
      score,
      totalQuestions,
      xpEarned,
      !section && passed,
      section?.id ?? null,
    )
    setRewardSummary({ xpEarned, passed, ...completion })
    setComplete(true)
  }, [
    answeredCount,
    recordQuizCompletion,
    quizDurationSeconds,
    score,
    section,
    sessionId,
    timeRemaining,
    totalQuestions,
    tutorial.id,
  ])

  useEffect(() => {
    if (complete) return undefined
    const timerId = window.setInterval(() => {
      const deadline = Date.parse(sessionStartedAt) + quizDurationSeconds * 1000
      setTimeRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    }, 1000)
    return () => window.clearInterval(timerId)
  }, [complete, quizDurationSeconds, sessionStartedAt])

  useEffect(() => {
    if (!complete && timeRemaining === 0) {
      finishQuiz()
    }
  }, [complete, finishQuiz, timeRemaining])

  const timedOut = complete && timeRemaining === 0
  const passed = rewardSummary?.passed === true

  return (
    <main className="page tutorial-hub tutorial-quiz-page">
      <Link className="back-link" to={`/tutorials/${tutorial.id}`}>← Tutorial overview</Link>
      <header className="quiz-page-heading">
        <div className={`tutorial-card-symbol tutorial-symbol-${tutorial.id}`} aria-hidden="true">
          {tutorial.symbol}
        </div>
        <div>
          <p className="eyebrow">{tutorial.category} · Quick quiz</p>
          <h1>{section ? section.title : tutorial.title}</h1>
        </div>
      </header>

      {storageError && <p className="notice" role="alert">{storageError}</p>}

      {!complete ? (
        <>
          <div className="quiz-session-toolbar">
            <ProgressBar
              value={questionIndex + 1}
              max={totalQuestions}
              label={`${answeredCount} of ${totalQuestions} answered`}
            />
            <div
              className={`quiz-timer${timeRemaining <= 60 ? ' is-urgent' : ''}`}
              role="timer"
              aria-label={`${Math.floor(timeRemaining / 60)} minutes ${timeRemaining % 60} seconds remaining`}
            >
              <span className="quiz-timer-icon" aria-hidden="true">◷</span>
              <span>{formatTime(timeRemaining)}</span>
            </div>
          </div>
          <div className="quiz-question-navigation">
            <nav
              id="quiz-question-list"
              className="quiz-question-nav"
              aria-label="Jump to a question"
            >
              {quizQuestions.map(({ question: item }, index) => (
                <button
                  key={item.question}
                  type="button"
                  className={[
                    'quiz-question-dot',
                    index === questionIndex ? 'is-current' : '',
                    answers[index] !== null ? 'is-answered' : '',
                  ].filter(Boolean).join(' ')}
                  aria-label={`Question ${index + 1}${answers[index] !== null ? ', answered' : ''}`}
                  aria-current={index === questionIndex ? 'step' : undefined}
                  onClick={() => goToQuestion(index)}
                >
                  {String(index + 1).padStart(2, '0')}
                </button>
              ))}
            </nav>
            <div className="quiz-question-nav-footer">
              <span className="quiz-answered-count">{answeredCount} answered</span>
            </div>
          </div>
          <QuizCard
            key={question.question}
            question={question}
            questionNumber={questionIndex + 1}
            totalQuestions={totalQuestions}
            selectedIndex={answers[questionIndex]}
            onAnswer={(answerIndex) => {
              const nextAnswers = answers.slice()
              nextAnswers[questionIndex] = answerIndex
              saveAnswers(nextAnswers)
            }}
            onPrevious={questionIndex > 0 ? () => goToQuestion(questionIndex - 1) : null}
            onNext={() => {
              if (questionIndex + 1 < totalQuestions) {
                goToQuestion(questionIndex + 1)
              } else if (answeredCount === totalQuestions) {
                finishQuiz()
              }
            }}
            isLastQuestion={questionIndex === totalQuestions - 1}
            canFinish={answeredCount === totalQuestions}
          />
          <p className="quiz-save-note">Your answers are saved automatically on this device.</p>
        </>
      ) : (
        <section className="card tutorial-results" aria-live="polite">
          {rewardSummary?.saved && (
            <div className="quiz-reward-toast" role="status">
              <span aria-hidden="true">✦</span>
              <div>
                <strong>+{rewardSummary.xpEarned} XP earned</strong>
                <span>
                  {rewardSummary.streakIncreased
                    ? `Your ${rewardSummary.currentStreak}-day streak is growing!`
                    : `${gamification.currentStreak || rewardSummary.currentStreak}-day streak. Keep it going!`}
                </span>
              </div>
            </div>
          )}
          <div className={`results-medallion${passed ? ' is-passing' : ''}`} aria-hidden="true">
            {passed ? '✦' : '↻'}
          </div>
          <p className="eyebrow">
            {timedOut
              ? 'Time is up'
              : passed ? section ? 'Module completed' : 'Tutorial completed'
                : section ? 'Module failed / incomplete' : 'Quiz complete'}
          </p>
          <h2>{section
            ? passed ? `${section.title} completed` : `Retry ${section.title} after a review`
            : passed ? 'Every question correct. Lovely work.' : 'Review the lesson, then try again.'}</h2>
          <p className="results-description">
            {timedOut && !passed
              ? 'Your answers so far were submitted when the timer ran out.'
              : section
              ? passed
                ? 'You answered every question correctly. This module is complete.'
                : 'A module is complete only when every question is answered correctly. Review the material and retry.'
              : passed
                ? 'You answered every question correctly and completed this tutorial.'
                : 'A tutorial is complete only when every question is answered correctly. Review your answers and retry.'}
          </p>
          <div className="results-score">
            <strong>{score}<span>/{totalQuestions}</span></strong>
            <span>correct answers</span>
          </div>
          <div className="results-track" aria-label={`${percentage}% score`}>
            <span style={{ width: `${percentage}%` }} />
          </div>
          <p className="results-percentage">{percentage}% score</p>
          <div className="quiz-result-actions">
            <Link className="button" to={`/tutorials/${tutorial.id}`}>Review tutorial</Link>
            <Link className="button-secondary" to="/tutorials">All tutorials</Link>
          </div>
        </section>
      )}
    </main>
  )
}

function TutorialQuiz({ userId }) {
  const { tutorialId } = useParams()
  const [searchParams] = useSearchParams()
  const sectionId = searchParams.get('section')
  const tutorial = tutorialCatalog.find((item) => item.id === tutorialId)

  if (!tutorial) {
    return (
      <main className="page tutorial-hub">
        <h1>Tutorial not found</h1>
        <Link to="/tutorials">Back to tutorials</Link>
      </main>
    )
  }

  const section = sectionId
    ? tutorial.sections?.find((item) => item.id === sectionId)
    : null

  if (sectionId && !section) {
    return (
      <main className="page tutorial-hub">
        <h1>Course module not found</h1>
        <Link to={`/tutorials/${tutorial.id}`}>Back to tutorial overview</Link>
      </main>
    )
  }

  return (
    <TutorialQuizSession
      key={`${tutorial.id}-${section?.id ?? 'course'}`}
      tutorial={tutorial}
      userId={userId}
      section={section}
    />
  )
}

export default TutorialQuiz
