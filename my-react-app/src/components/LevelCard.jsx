import { Link } from 'react-router-dom'

function LevelCard({ level, unlocked, completed, inProgress, onStart, isGuest = false }) {
  const status = completed ? 'Completed ✅' : inProgress ? 'In progress' : 'Not started'

  return (
    <article className="card level-card">
      <div>
        <h3>{level.title}</h3>
        <p>{level.description}</p>
        {!isGuest && (
          <p className={`level-status${completed ? ' status-completed' : inProgress ? ' status-in-progress' : ''}`}>
            {status}
          </p>
        )}
        {!isGuest && !unlocked && <p className="level-lock">🔒 Locked</p>}
      </div>
      {unlocked ? (
        <div className="level-card-actions">
          <Link className="button" to={`/level/${level.id}`} onClick={onStart}>
            {isGuest ? 'Preview lesson' : completed ? 'Review level' : 'Start'}
          </Link>
          {!isGuest && completed && (
            <Link className="certificate-link" to={`/certificate/${level.id}`}>
              View certificate
            </Link>
          )}
        </div>
      ) : (
        <button className="button" type="button" disabled>🔒 Locked</button>
      )}
    </article>
  )
}

export default LevelCard
