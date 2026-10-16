import { Link } from 'react-router-dom'

function TutorialCard({ tutorial, result, progress, status, action, to }) {
  return (
    <article className="card tutorial-card">
      <div className={`tutorial-card-symbol tutorial-symbol-${tutorial.id}`} aria-hidden="true">
        {tutorial.symbol}
      </div>
      <div className="tutorial-card-content">
        <p className="tutorial-card-category">{tutorial.category}</p>
        <h2>{tutorial.title}</h2>
        <p className="tutorial-card-description">{tutorial.description}</p>
      </div>
      <div className="tutorial-card-progress">
        <div className="tutorial-card-status">
          <span>{status}</span>
          <strong>{progress}%</strong>
        </div>
        <progress value={progress} max="100" aria-label={`${tutorial.title} progress`}>
          {progress}%
        </progress>
        {result && (
          <p className="tutorial-card-result">
            Best score {result.bestScore}/{result.totalQuestions}
          </p>
        )}
      </div>
      <Link className="button tutorial-card-action" to={to}>
        {action}<span aria-hidden="true">→</span>
      </Link>
    </article>
  )
}

export default TutorialCard
