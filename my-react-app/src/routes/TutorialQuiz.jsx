import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar.jsx'
import QuizCard from '../components/QuizCard.jsx'
import { tutorialCatalog } from '../data/tutorialCatalog.js'
import { useTutorialProgress } from '../hooks/useTutorialProgress.js'

function TutorialQuizSession({ tutorial, userId, section }) {
  const {
    markTutorialStarted,
    quizProgress,
    recordTutorialResult,
    saveQuizProgress,
    storageError,
  } = useTutorialProgress(userId)
  const savedAttempt = quizProgress[tutorial.id]
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

  const finishQuiz = () => {
    if (!section) recordTutorialResult(tutorial.id, score, totalQuestions)
    setComplete(true)
  }

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
          <ProgressBar
            value={questionIndex + 1}
            max={totalQuestions}
            label={`${answeredCount} of ${totalQuestions} answered`}
          />
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
          <div className={`results-medallion${percentage >= 70 ? ' is-passing' : ''}`} aria-hidden="true">
            {percentage >= 70 ? '✦' : '↻'}
          </div>
          <p className="eyebrow">Quiz complete</p>
          <h2>{section
            ? `${section.title} quiz complete`
            : percentage >= 70 ? 'A little wiser already.' : 'Every try is progress.'}</h2>
          <p className="results-description">
            {section
              ? 'Your answers are saved with your course progress.'
              : percentage >= 70
              ? 'You have a lovely grasp of the essentials.'
              : 'Review the lesson, then give it another go.'}
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
