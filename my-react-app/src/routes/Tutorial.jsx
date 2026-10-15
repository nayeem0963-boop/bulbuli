import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar.jsx'
import QuestionCard from '../components/QuestionCard.jsx'
import QuizCard from '../components/QuizCard.jsx'
import { tutorials } from '../data/tutorials.js'

function TutorialExperience({ tutorial }) {
  const [phase, setPhase] = useState('qa')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [quizIndex, setQuizIndex] = useState(0)
  const [score, setScore] = useState(0)
  const totalQuestions = tutorial.qa.length + tutorial.quiz.length
  const progress = phase === 'qa'
    ? questionIndex
    : phase === 'quiz'
      ? tutorial.qa.length + quizIndex
      : totalQuestions

  const recordAnswer = (correct) => {
    if (correct) setScore((current) => current + 1)
  }

  const startQuiz = () => {
    setPhase('quiz')
  }

  const nextQuizQuestion = () => {
    if (quizIndex + 1 < tutorial.quiz.length) {
      setQuizIndex((current) => current + 1)
    } else {
      setPhase('results')
    }
  }

  const restartTutorial = () => {
    setPhase('qa')
    setQuestionIndex(0)
    setQuizIndex(0)
    setScore(0)
  }

  return (
    <main className="page">
      <Link className="back-link" to="/">Back to tutorials</Link>
      <header className="page-header">
        <p className="eyebrow">{tutorial.section} · Interactive tutorial</p>
        <h1>{tutorial.title}</h1>
        <p>{tutorial.description}</p>
      </header>

      {phase !== 'results' && <ProgressBar value={progress} max={totalQuestions} />}

      <details className="card tutorial-notes">
        <summary>Review the lesson notes and example</summary>
        <p>{tutorial.intro}</p>
        {tutorial.codeExample && (
          <pre className="code-example"><code>{tutorial.codeExample}</code></pre>
        )}
      </details>

      {phase === 'qa' && (
        <QuestionCard
          key={`${tutorial.id}-qa-${questionIndex}`}
          question={tutorial.qa[questionIndex]}
          questionNumber={questionIndex + 1}
          totalQuestions={tutorial.qa.length}
          onAnswer={recordAnswer}
          onNext={() => {
            if (questionIndex + 1 < tutorial.qa.length) {
              setQuestionIndex((current) => current + 1)
            } else {
              startQuiz()
            }
          }}
        />
      )}

      {phase === 'quiz' && (
        <QuizCard
          key={`${tutorial.id}-quiz-${quizIndex}`}
          question={tutorial.quiz[quizIndex]}
          questionNumber={quizIndex + 1}
          totalQuestions={tutorial.quiz.length}
          onAnswer={recordAnswer}
          onNext={nextQuizQuestion}
        />
      )}

      {phase === 'results' && (
        <section className="card tutorial-results" aria-live="polite">
          <p className="eyebrow">Tutorial complete</p>
          <h2>Nice work!</h2>
          <p>Your score: {score}/{totalQuestions}</p>
          <button className="button" type="button" onClick={restartTutorial}>Try again</button>
        </section>
      )}
    </main>
  )
}

function Tutorial() {
  const { tutorialId } = useParams()
  const tutorial = tutorials.find((item) => item.id === tutorialId)

  if (!tutorial) {
    return (
      <main className="page">
        <h1>Tutorial not found</h1>
        <Link to="/">Back to tutorials</Link>
      </main>
    )
  }

  return <TutorialExperience key={tutorial.id} tutorial={tutorial} />
}

export default Tutorial
