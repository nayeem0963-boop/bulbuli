import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ModuleReadingMaterial from '../components/ModuleReadingMaterial.jsx'
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
  const navigate = useNavigate()
  const quizDurationSeconds = section
    ? MODULE_QUIZ_DURATION_SECONDS
    : TUTORIAL_QUIZ_DURATION_SECONDS
  const {
    gamification,
    markTutorialStarted,
    quizProgress,
    quizSessionStartedAt,
    recordQuizCompletion,
    resetModuleQuiz,
    saveQuizProgress,
    storageError,
    startQuizSession,
  } = useTutorialProgress(userId)
  const savedAttempt = quizProgress[tutorial.id]
  const sessionId = `${tutorial.id}:${section?.id ?? 'course'}`
  const quizQuestions = useMemo(
    () => section
      ? tutorial.questions.flatMap((question, originalIndex) => (
        question.sectionId === section.id ? [{ question, originalIndex }] : []
      ))
      : tutorial.questions.map((question, originalIndex) => ({ question, originalIndex })),
    [section, tutorial.questions],
  )
  const moduleQuestionIndices = useMemo(
    () => quizQuestions.map(({ originalIndex }) => originalIndex),
    [quizQuestions],
  )
  const [answers, setAnswers] = useState(
    () => quizQuestions.map(({ originalIndex }) => savedAttempt?.answers[originalIndex] ?? null),
  )
  const [validatedIndexes, setValidatedIndexes] = useState(
    () => new Set(quizQuestions.flatMap(({ originalIndex }, index) => (
      savedAttempt?.answers[originalIndex] !== null
      && savedAttempt?.answers[originalIndex] !== undefined
        ? [index]
        : []
    ))),
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
  const [sessionStartedAt, setSessionStartedAt] = useState(
    () => quizSessionStartedAt[sessionId] ?? (section ? null : new Date().toISOString()),
  )
  const completionRecorded = useRef(false)
  const [timeRemaining, setTimeRemaining] = useState(
    () => Math.max(
      0,
      sessionStartedAt
        ? Math.ceil((Date.parse(sessionStartedAt) + quizDurationSeconds * 1000 - Date.now()) / 1000)
        : quizDurationSeconds,
    ),
  )
  const totalQuestions = quizQuestions.length
  const question = quizQuestions[questionIndex].question
  const answeredCount = answers.reduce(
    (total, answer, index) => total + (answer !== null && validatedIndexes.has(index) ? 1 : 0),
    0,
  )
  const score = answers.reduce(
    (total, answer, index) => total + (
      validatedIndexes.has(index) && answer === quizQuestions[index].question.correctIndex ? 1 : 0
    ),
    0,
  )

  useEffect(() => {
    markTutorialStarted(tutorial.id)
  }, [markTutorialStarted, tutorial.id])

  useEffect(() => {
    if (!complete && sessionStartedAt) startQuizSession(sessionId, sessionStartedAt)
  }, [complete, sessionId, sessionStartedAt, startQuizSession])

  const beginModuleQuiz = () => {
    const startedAt = new Date().toISOString()
    const persistedStartedAt = startQuizSession(sessionId, startedAt)
    if (persistedStartedAt) setSessionStartedAt(persistedStartedAt)
  }

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
    const timedOut = timeRemaining === 0
    if (section && !passed) {
      resetModuleQuiz(tutorial.id, sessionId, moduleQuestionIndices)
    }
    setRewardSummary({
      xpEarned,
      passed,
      timedOut,
      score,
      answeredCount,
      ...completion,
    })
    setComplete(true)
  }, [
    answeredCount,
    moduleQuestionIndices,
    recordQuizCompletion,
    quizDurationSeconds,
    resetModuleQuiz,
    score,
    section,
    sessionId,
    timeRemaining,
    totalQuestions,
    tutorial.id,
  ])

  const retakeModuleQuiz = () => {
    const reset = resetModuleQuiz(tutorial.id, sessionId, moduleQuestionIndices)
    if (!reset) return

    completionRecorded.current = false
    setAnswers(quizQuestions.map(() => null))
    setValidatedIndexes(new Set())
    setQuestionIndex(0)
    setComplete(false)
    setRewardSummary(null)
    setSessionStartedAt(null)
    setTimeRemaining(quizDurationSeconds)
  }

  const exitModuleQuiz = () => {
    const reset = resetModuleQuiz(tutorial.id, sessionId, moduleQuestionIndices)
    if (reset) navigate(`/tutorials/${tutorial.id}`)
  }

  useEffect(() => {
    if (complete || !sessionStartedAt) return undefined
    const timerId = window.setInterval(() => {
      const deadline = Date.parse(sessionStartedAt) + quizDurationSeconds * 1000
      setTimeRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    }, 1000)
    return () => window.clearInterval(timerId)
  }, [complete, quizDurationSeconds, sessionStartedAt])

  useEffect(() => {
    if (!complete && sessionStartedAt && timeRemaining === 0) {
      finishQuiz()
    }
  }, [complete, finishQuiz, sessionStartedAt, timeRemaining])

  const timedOut = rewardSummary?.timedOut === true
  const passed = rewardSummary?.passed === true
  const resultScore = rewardSummary?.score ?? score
  const resultAnsweredCount = rewardSummary?.answeredCount ?? answeredCount
  const resultPercentage = Math.round((resultScore / totalQuestions) * 100)

  return (
    <main className="page tutorial-hub tutorial-quiz-page">
      {section ? (
        <button className="back-link text-button module-quiz-exit-link" type="button" onClick={exitModuleQuiz}>
          ← Quit module quiz
        </button>
      ) : (
        <Link className="back-link" to={`/tutorials/${tutorial.id}`}>← Tutorial overview</Link>
      )}
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
          {section && (
            <ModuleReadingMaterial
              material={section.readingMaterial}
              id={`module-reading-${section.id}`}
            />
          )}
          {section && !sessionStartedAt ? (
            <div className="module-quiz-start">
              <p>Take a moment to review the material, then begin the timed quiz.</p>
              <button className="button" type="button" onClick={beginModuleQuiz}>
                Start module quiz <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : (
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
                {section && (
                  <button
                    className="button-secondary module-quiz-exit-button"
                    type="button"
                    onClick={exitModuleQuiz}
                  >
                    Quit quiz
                  </button>
                )}
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
                        validatedIndexes.has(index) ? 'is-answered' : '',
                      ].filter(Boolean).join(' ')}
                      aria-label={`Question ${index + 1}${validatedIndexes.has(index) ? ', answered' : ''}`}
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
                isValidated={validatedIndexes.has(questionIndex)}
                onAnswer={(answerIndex) => {
                  const nextAnswers = answers.slice()
                  nextAnswers[questionIndex] = answerIndex
                  saveAnswers(nextAnswers)
                  setValidatedIndexes((current) => {
                    const nextValidated = new Set(current)
                    nextValidated.delete(questionIndex)
                    return nextValidated
                  })
                }}
                onValidate={() => setValidatedIndexes((current) => new Set(current).add(questionIndex))}
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
          )}
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
            <strong>{resultScore}<span>/{totalQuestions}</span></strong>
            <span>correct answers</span>
          </div>
          <div className="results-track" aria-label={`${resultPercentage}% score`}>
            <span style={{ width: `${resultPercentage}%` }} />
          </div>
          <p className="results-percentage">{resultPercentage}% score · {resultAnsweredCount}/{totalQuestions} answered</p>
          <div className="quiz-result-actions">
            {section && !passed && (
              <button className="button" type="button" onClick={retakeModuleQuiz}>
                Retake module
              </button>
            )}
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
