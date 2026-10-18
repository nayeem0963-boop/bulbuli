import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useComprehensiveExam } from '../hooks/useComprehensiveExam.js'
import { tutorialCatalog } from '../data/tutorialCatalog.js'
import {
  EXAM_CONFIGS,
  createExamAttempt,
  sampleUniqueExamQuestions,
  scoreExam,
} from '../utils/comprehensiveExam.js'

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function getCurrentTime() {
  return Date.now()
}

function ExamConfetti() {
  return (
    <div className="exam-confetti" aria-hidden="true">
      {Array.from({ length: 36 }, (_, index) => (
        <span
          key={index}
          style={{
            '--confetti-index': index,
            '--confetti-hue': `${(index * 47) % 360}deg`,
            '--confetti-left': `${(index * 17 + 5) % 100}%`,
            '--confetti-drift': `${(index % 5 - 2) * 1.5}rem`,
          }}
        />
      ))}
    </div>
  )
}

function ExamResults({ result, onRetake, examConfig }) {
  const isPerfect = result.perfect
  const passed = result.passed

  return (
    <section className={`card comprehensive-result${isPerfect ? ' is-perfect' : passed ? ' is-passed' : ' is-failed'}`}>
      {isPerfect && <ExamConfetti />}
      <div className="exam-result-badge" aria-hidden="true">
        {isPerfect ? '🏆' : passed ? '✦' : '↗'}
      </div>
      {isPerfect ? (
        <div className="exam-perfect-banner">🏆 Perfect Score! Mastery Achieved!</div>
      ) : (
        <p className="eyebrow">{passed ? `${examConfig.title} passed` : `${examConfig.title} result`}</p>
      )}
      <h1>{isPerfect ? 'Excellence!' : passed ? 'You passed!' : 'Not quite yet'}</h1>
      <p className="exam-result-message">
        {isPerfect
          ? `Every answer was correct. You’ve mastered ${examConfig.title.replace(/ Exam$/, '')}.`
          : passed
            ? `Strong work. Your ${examConfig.title} achievement and XP are saved.`
            : 'A little more practice will get you there. Review your topics and take the exam again when you’re ready.'}
      </p>
      <div className="exam-score-summary" aria-label={`${result.percentage}% score`}>
        <strong>{result.score}<span>/{result.totalQuestions}</span></strong>
        <span>{result.percentage}% score · {passed ? 'Pass' : `${Math.ceil((examConfig.passPercent * result.totalQuestions / 100) - result.score)} more correct to pass`}</span>
      </div>
      <div className="exam-category-breakdown" aria-label="Score by topic">
        {Object.entries(result.categoryScores).map(([category, score]) => (
          <div key={category}>
            <span>{category}</span>
            <strong>{score.correct}/{score.total}</strong>
          </div>
        ))}
      </div>
      {passed && (
        <div className={`exam-certificate${isPerfect ? ' is-gold' : ''}`} role="status">
          <span aria-hidden="true">{isPerfect ? '🏆' : '🎖️'}</span>
          <div>
            <strong>{isPerfect ? `${examConfig.title.replace(/ Exam$/, '')} Excellence` : `${examConfig.title} Certified`}</strong>
            <span>{result.xpEarned} XP earned · saved to your learning record</span>
          </div>
        </div>
      )}
      {result.timedOut && <p className="exam-timeout-note">Time expired; your answers were submitted automatically.</p>}
      <div className="exam-result-actions">
        <button className="button" type="button" onClick={onRetake}>Retake exam <span aria-hidden="true">↻</span></button>
        <Link className="button-secondary" to="/dashboard">View dashboard</Link>
        <Link className="button-secondary" to="/tutorials">Review tutorials</Link>
      </div>
    </section>
  )
}

function ComprehensiveExam({ userId, examConfig = EXAM_CONFIGS.preparation }) {
  const {
    activeAttempt,
    attempts,
    completed,
    highScore,
    latestAttempt,
    saveActiveAttempt,
    completeAttempt,
    storageError,
  } = useComprehensiveExam(userId, examConfig)
  const [questionIndex, setQuestionIndex] = useState(
    () => activeAttempt?.currentIndex ?? 0,
  )
  const [timeNow, setTimeNow] = useState(getCurrentTime)
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false)
  const [examError, setExamError] = useState('')
  const submittedAttemptId = useRef(null)

  const submitExam = useCallback(() => {
    if (!activeAttempt || submittedAttemptId.current === activeAttempt.id) return
    submittedAttemptId.current = activeAttempt.id
    const result = scoreExam(activeAttempt, new Date().toISOString(), examConfig)
    const saved = completeAttempt(result)
    if (!saved) {
      setExamError('Your result is shown, but could not be saved. Check your browser storage settings.')
    } else {
      setExamError('')
    }
    setShowSubmitConfirmation(false)
  }, [activeAttempt, completeAttempt, examConfig])

  useEffect(() => {
    if (!activeAttempt) return undefined
    const updateTimer = () => {
      const now = Date.now()
      setTimeNow(now)
      if (now >= Date.parse(activeAttempt.expiresAt)) submitExam()
    }

    updateTimer()
    const timerId = window.setInterval(updateTimer, 250)
    return () => window.clearInterval(timerId)
  }, [activeAttempt, submitExam])

  const startExam = () => {
    try {
      const questionCatalog = examConfig.tutorialId
        ? tutorialCatalog.filter((tutorial) => tutorial.id === examConfig.tutorialId)
        : tutorialCatalog
      const attempt = createExamAttempt(sampleUniqueExamQuestions(
        questionCatalog,
        attempts.map((record) => record.questionIds),
        examConfig.questionCount,
      ), Date.now(), examConfig)
      const saved = saveActiveAttempt(attempt)
      submittedAttemptId.current = null
      setQuestionIndex(0)
      setExamError(saved ? '' : 'Your exam could not be saved. Progress is only temporary until browser storage is available.')
    } catch (error) {
      console.error(`Unable to start the Bulbuli ${examConfig.title}.`, error)
      setExamError('The exam could not be started. Please try again.')
    }
  }

  const updateAnswers = (answerIndex) => {
    if (!activeAttempt) return
    if (getCurrentTime() >= Date.parse(activeAttempt.expiresAt)) {
      submitExam()
      return
    }

    const answers = activeAttempt.answers.slice()
    answers[questionIndex] = answerIndex
    saveActiveAttempt({ ...activeAttempt, answers })
  }

  const navigateQuestion = (index) => {
    if (!activeAttempt) return
    const currentIndex = Math.max(0, Math.min(index, activeAttempt.questions.length - 1))
    setQuestionIndex(currentIndex)
    saveActiveAttempt({ ...activeAttempt, currentIndex })
  }

  if (activeAttempt) {
    const secondsRemaining = Math.max(
      0,
      Math.ceil((Date.parse(activeAttempt.expiresAt) - timeNow) / 1000),
    )
    const question = activeAttempt.questions[questionIndex]
    const answeredCount = activeAttempt.answers.filter((answer) => answer !== null).length

    return (
      <main className="page tutorial-hub comprehensive-exam-page">
        <header className={`exam-sticky-header${secondsRemaining <= 60 ? ' is-urgent' : ''}`}>
          <div className="exam-sticky-header-inner">
            <div>
              <p className="eyebrow">Bulbuli · Timed assessment</p>
              <h1>{examConfig.title}</h1>
            </div>
            <div className="exam-timer" role="timer" aria-label={`${Math.floor(secondsRemaining / 60)} minutes ${secondsRemaining % 60} seconds remaining`}>
              <span aria-hidden="true">◷</span>
              <strong>{formatTime(secondsRemaining)}</strong>
              <span className="exam-timer-caption">remaining</span>
            </div>
          </div>
          <div className="exam-timer-track" aria-hidden="true">
            <span style={{ width: `${(secondsRemaining / examConfig.durationSeconds) * 100}%` }} />
          </div>
        </header>

        {storageError && <p className="notice" role="alert">{storageError}</p>}
        {examError && <p className="notice" role="alert">{examError}</p>}
        <div className="exam-progress-row">
          <p>{examConfig.questionCount} questions · {Math.round(examConfig.durationSeconds / 60)} minutes · pass at {examConfig.passPercent}%</p>
          <strong>{answeredCount}/{examConfig.questionCount} answered</strong>
        </div>
        <nav className="exam-question-nav" aria-label="Jump to an exam question">
          {activeAttempt.questions.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={[
                'exam-question-step',
                index === questionIndex ? 'is-current' : '',
                activeAttempt.answers[index] !== null ? 'is-answered' : '',
              ].filter(Boolean).join(' ')}
              aria-label={`Question ${index + 1}${activeAttempt.answers[index] !== null ? ', answered' : ''}`}
              aria-current={index === questionIndex ? 'step' : undefined}
              onClick={() => navigateQuestion(index)}
            >
              {String(index + 1).padStart(2, '0')}
            </button>
          ))}
        </nav>

        <section className="card exam-question-card" aria-labelledby="exam-question-title">
          <div className="exam-question-meta">
            <p className="eyebrow">{question.category}</p>
            <span>Question {questionIndex + 1} of {examConfig.questionCount}</span>
          </div>
          <h2 id="exam-question-title">{question.question}</h2>
          <div className="exam-answer-options" role="group" aria-label="Answer choices">
            {question.options.map((option, index) => (
              <button
                key={`${question.id}-${index}`}
                type="button"
                className={activeAttempt.answers[questionIndex] === index ? 'is-selected' : ''}
                aria-pressed={activeAttempt.answers[questionIndex] === index}
                onClick={() => updateAnswers(index)}
              >
                <span>{String.fromCharCode(65 + index)}</span>
                {option}
              </button>
            ))}
          </div>
          <div className="exam-question-actions">
            <button
              className="button-secondary"
              type="button"
              disabled={questionIndex === 0}
              onClick={() => navigateQuestion(questionIndex - 1)}
            >
              <span aria-hidden="true">←</span> Previous
            </button>
            {questionIndex < examConfig.questionCount - 1 ? (
              <button className="button" type="button" onClick={() => navigateQuestion(questionIndex + 1)}>
                Next question <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button className="button" type="button" onClick={() => setShowSubmitConfirmation(true)}>
                Submit exam <span aria-hidden="true">✓</span>
              </button>
            )}
          </div>
        </section>
        <div className="exam-submit-footer">
          <span>Your answers are saved automatically on this device.</span>
          <button className="button-secondary" type="button" onClick={() => setShowSubmitConfirmation(true)}>
            Submit exam
          </button>
        </div>
        {showSubmitConfirmation && (
          <div className="exam-confirm-backdrop">
            <section className="card exam-submit-dialog" role="dialog" aria-modal="true" aria-labelledby="exam-submit-title">
              <p className="eyebrow">Ready to finish?</p>
              <h2 id="exam-submit-title">Submit your exam?</h2>
              <p>{examConfig.questionCount - answeredCount} unanswered {examConfig.questionCount - answeredCount === 1 ? 'question will' : 'questions will'} count as incorrect. You can’t change answers after submitting.</p>
              <div>
                <button className="button-secondary" type="button" onClick={() => setShowSubmitConfirmation(false)}>Keep going</button>
                <button className="button" type="button" onClick={submitExam}>Submit now</button>
              </div>
            </section>
          </div>
        )}
      </main>
    )
  }

  if (latestAttempt) {
    return (
      <main className="page tutorial-hub comprehensive-exam-page">
        {storageError && <p className="notice" role="alert">{storageError}</p>}
        {examError && <p className="notice" role="alert">{examError}</p>}
        <ExamResults result={latestAttempt} onRetake={startExam} examConfig={examConfig} />
      </main>
    )
  }

  return (
    <main className="page tutorial-hub comprehensive-exam-page">
      <Link className="back-link" to="/dashboard">← Your dashboard</Link>
      {storageError && <p className="notice" role="alert">{storageError}</p>}
      {examError && <p className="notice" role="alert">{examError}</p>}
      <section className="card comprehensive-exam-intro">
        <div className="exam-intro-icon" aria-hidden="true">{examConfig.symbol || '✦'}</div>
        <p className="eyebrow">{examConfig.eyebrow}</p>
        <h1>{examConfig.title}</h1>
        <p>{examConfig.description}</p>
        <ul>
          <li><strong>{examConfig.questionCount}</strong> randomly selected questions{examConfig.tutorialId ? ' from this subject' : ' from all five subjects'}</li>
          <li><strong>{Math.round(examConfig.durationSeconds / 60)} minutes</strong> with automatic submission when time runs out</li>
          <li><strong>{examConfig.passPercent}%</strong> to pass and earn your completion badge</li>
        </ul>
        {attempts.length > 0 && (
          <div className="exam-record-summary">
            <span>{attempts.length} {attempts.length === 1 ? 'attempt' : 'attempts'}</span>
            <span>High score <strong>{highScore}/{examConfig.questionCount}</strong></span>
            {completed && <span className="exam-record-complete">✓ Passed</span>}
          </div>
        )}
        <button className="button" type="button" onClick={startExam}>
          {attempts.length ? 'Start a new attempt' : 'Start the exam'} <span aria-hidden="true">→</span>
        </button>
      </section>
    </main>
  )
}

export default ComprehensiveExam
