import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar.jsx'
import QuizCard from '../components/QuizCard.jsx'
import { tutorialCatalog } from '../data/tutorialCatalog.js'
import { useTutorialProgress } from '../hooks/useTutorialProgress.js'

function TutorialQuizSession({ tutorial, userId }) {
  const {
    markTutorialStarted,
    quizProgress,
    recordTutorialResult,
    saveQuizProgress,
    storageError,
  } = useTutorialProgress(userId)
  const savedAttempt = quizProgress[tutorial.id]
  const [answers, setAnswers] = useState(
    () => savedAttempt?.answers ?? Array(tutorial.questions.length).fill(null),
  )
  const [questionIndex, setQuestionIndex] = useState(() => savedAttempt?.currentIndex ?? 0)
  const [complete, setComplete] = useState(false)
  const totalQuestions = tutorial.questions.length
  const question = tutorial.questions[questionIndex]
  const answeredCount = answers.filter((answer) => answer !== null).length
  const score = answers.reduce(
    (total, answer, index) => total + (answer === tutorial.questions[index].correctIndex ? 1 : 0),
    0,
  )
  const percentage = Math.round((score / totalQuestions) * 100)

  useEffect(() => {
    markTutorialStarted(tutorial.id)
  }, [markTutorialStarted, tutorial.id])

  const saveAnswers = (nextAnswers, nextIndex = questionIndex) => {
    setAnswers(nextAnswers)
    saveQuizProgress(tutorial.id, nextAnswers, nextIndex)
  }

  const goToQuestion = (nextIndex) => {
    setQuestionIndex(nextIndex)
    saveQuizProgress(tutorial.id, answers, nextIndex)
  }

  const finishQuiz = () => {
    recordTutorialResult(tutorial.id, score, totalQuestions)
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
          <h1>{tutorial.title}</h1>
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
          <nav className="quiz-question-nav" aria-label="Jump to a question">
            {tutorial.questions.map((item, index) => (
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
            <span className="quiz-answered-count">{answeredCount} answered</span>
          </nav>
          <QuizCard
            key={questionIndex}
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
          <h2>{percentage >= 70 ? 'A little wiser already.' : 'Every try is progress.'}</h2>
          <p className="results-description">
            {percentage >= 70
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
  const tutorial = tutorialCatalog.find((item) => item.id === tutorialId)

  if (!tutorial) {
    return (
      <main className="page tutorial-hub">
        <h1>Tutorial not found</h1>
        <Link to="/tutorials">Back to tutorials</Link>
      </main>
    )
  }

  return <TutorialQuizSession key={tutorial.id} tutorial={tutorial} userId={userId} />
}

export default TutorialQuiz
