import { Link } from 'react-router-dom'
import TutorialCard from '../components/TutorialCard.jsx'
import { tutorialCatalog } from '../data/tutorialCatalog.js'
import { useTutorialProgress } from '../hooks/useTutorialProgress.js'
import { getTutorialCardAction } from '../utils/tutorialCardAction.js'

function TutorialCatalog({ userId }) {
  const { quizProgress, completedTutorials, storageError, startedTutorialIds } = useTutorialProgress(userId)
  const completedCount = Object.keys(completedTutorials).length

  return (
    <main className="page tutorial-hub tutorial-list-page">
      <Link className="back-link" to="/">← Your learning space</Link>
      <header className="tutorial-list-heading">
        <div>
          <p className="eyebrow">The Bulbuli collection</p>
          <h1>Learn something new.</h1>
          <p>Five friendly guides to the tools and languages behind the web.</p>
        </div>
        <div className="tutorial-list-counter">
          <strong>{completedCount}<span>/{tutorialCatalog.length}</span></strong>
          <span>tutorials complete</span>
        </div>
      </header>

      {storageError && <p className="notice" role="alert">{storageError}</p>}

      <section className="tutorial-card-grid" aria-label="Available tutorials">
        {tutorialCatalog.map((tutorial) => {
          const result = completedTutorials[tutorial.id]
          const attempt = quizProgress[tutorial.id]
          const started = startedTutorialIds.includes(tutorial.id)
          const answered = attempt?.answers.filter((answer) => answer !== null).length ?? 0
          const progress = result
            ? 100
            : attempt ? Math.round((answered / attempt.answers.length) * 100) : 0
          const status = result
            ? 'Completed'
            : started ? answered ? `${answered} of ${attempt.answers.length} answered` : 'In progress'
              : 'Ready to start'

          return (
            <TutorialCard
              key={tutorial.id}
              tutorial={tutorial}
              result={result}
              progress={progress}
              status={status}
              action={getTutorialCardAction(tutorial, result, started, attempt?.currentIndex)}
              to={`/tutorials/${tutorial.id}`}
            />
          )
        })}
      </section>
    </main>
  )
}

export default TutorialCatalog
