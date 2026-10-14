import LevelCard from '../components/LevelCard.jsx'
import { htmlLevels } from '../data/htmlLevels.js'
import { useProgress } from '../hooks/useProgress.js'
import { Link } from 'react-router-dom'

function Home({ session }) {
  const {
    unlockedLevels,
    completedLevels,
    startedLevels,
    markLevelStarted,
    resetProgress,
    storageError,
  } = useProgress()
  const sections = [...new Set(htmlLevels.map((level) => level.section))]

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Learn by doing</p>
        <h1>Welcome to Bulbuli</h1>
        <p>Build your HTML skills one quick question at a time.</p>
      </header>
      {session ? (
        storageError && <p className="notice" role="alert">{storageError}</p>
      ) : (
        <aside className="card" aria-label="Sign up for member features">
          <h2>Explore lessons as a guest</h2>
          <p>
            Browse the HTML curriculum and lesson previews. Sign up or log in to
            take quizzes, save your progress, and earn certificates.
          </p>
          <Link className="button" to="/login">Sign up or log in</Link>
        </aside>
      )}
      <section aria-labelledby="levels-heading">
        <div className="section-heading">
          <h2 id="levels-heading">{session ? 'Your levels' : 'HTML lessons'}</h2>
          {session && (
            <button className="text-button" type="button" onClick={resetProgress}>
              Reset progress
            </button>
          )}
        </div>
        {sections.map((section) => (
          <section
            className="curriculum-section"
            key={section}
            aria-labelledby={`section-${section.toLowerCase().replaceAll(' ', '-')}`}
          >
            <h3 id={`section-${section.toLowerCase().replaceAll(' ', '-')}`}>{section}</h3>
            <div className="level-list">
              {htmlLevels.filter((level) => level.section === section).map((level) => (
                <LevelCard
                  key={level.id}
                  level={level}
                  unlocked={!session || unlockedLevels.includes(level.id)}
                  completed={session && completedLevels.includes(level.id)}
                  inProgress={session && startedLevels.includes(level.id)}
                  onStart={session ? () => markLevelStarted(level.id) : undefined}
                  isGuest={!session}
                />
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  )
}

export default Home
