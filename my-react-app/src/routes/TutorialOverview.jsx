import { Link, useParams } from 'react-router-dom'
import { tutorialCatalog } from '../data/tutorialCatalog.js'
import { useTutorialProgress } from '../hooks/useTutorialProgress.js'

function TutorialOverview({ userId }) {
  const { tutorialId } = useParams()
  const tutorial = tutorialCatalog.find((item) => item.id === tutorialId)
  const { completedTutorials, quizProgress, storageError, startedTutorialIds } = useTutorialProgress(userId)

  if (!tutorial) {
    return (
      <main className="page">
        <h1>Tutorial not found</h1>
        <Link to="/tutorials">Back to tutorials</Link>
      </main>
    )
  }

  const result = completedTutorials[tutorial.id]
  const attempt = quizProgress[tutorial.id]
  const started = startedTutorialIds.includes(tutorial.id)
  const answered = attempt?.answers.filter((answer) => answer !== null).length ?? 0
  const progress = result
    ? 100
    : attempt ? Math.round((answered / attempt.answers.length) * 100) : 0

  return (
    <main className="page tutorial-hub tutorial-overview-page">
      <Link className="back-link" to="/tutorials">Back to tutorials</Link>
      <header className="tutorial-overview-hero">
        <div className={`tutorial-card-symbol tutorial-symbol-${tutorial.id}`} aria-hidden="true">
          {tutorial.symbol}
        </div>
        <div>
          <p className="eyebrow">{tutorial.category} · Tutorial overview</p>
          <h1>{tutorial.title}</h1>
          <p>{tutorial.description}</p>
        </div>
      </header>

      {storageError && <p className="notice" role="alert">{storageError}</p>}

      <section className="card tutorial-notes">
        <div className="tutorial-notes-heading">
          <div>
            <p className="eyebrow">The essentials</p>
            <h2>What you’ll learn</h2>
          </div>
          <span className="tutorial-duration">{tutorial.questions.length} quick questions</span>
        </div>
        <p className="tutorial-intro">{tutorial.intro}</p>
        <pre className="code-example"><code>{tutorial.codeExample}</code></pre>
        {result && (
          <div className="tutorial-result-callout">
            <span className="tutorial-result-check" aria-hidden="true">✓</span>
            <span>Best score <strong>{result.bestScore}/{result.totalQuestions}</strong> · {result.attempts} {result.attempts === 1 ? 'attempt' : 'attempts'}</span>
          </div>
        )}
      </section>

      <section className="tutorial-start-panel" aria-label="Quiz progress">
        <div>
          <p className="eyebrow">{result ? 'Ready for another round?' : started ? 'Pick up where you left off' : 'Ready when you are'}</p>
          <h2>{result ? 'Try for a new personal best.' : 'Make it stick with a quick quiz.'}</h2>
          <div className="tutorial-inline-progress">
            <span>{result ? 'Completed' : `${answered} of ${tutorial.questions.length} answered`}</span>
            <progress value={progress} max="100" aria-label="Tutorial completion">{progress}%</progress>
          </div>
        </div>
        <Link className="button tutorial-start-button" to={`/tutorials/${tutorial.id}/quiz`}>
          {result ? 'Take quiz again' : started ? 'Continue quiz' : 'Start quiz'}
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  )
}

export default TutorialOverview
