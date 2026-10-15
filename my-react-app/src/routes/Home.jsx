import LevelCard from '../components/LevelCard.jsx'
import { htmlLevels } from '../data/htmlLevels.js'
import { tutorials } from '../data/tutorials.js'
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
    <main className="page home-page">
      <header className="page-header home-hero">
        <p className="eyebrow">A little progress, every day</p>
        <h1>Welcome to Bulbuli</h1>
        <p>Explore HTML and CSS with clear introductions and hands-on lessons.</p>
      </header>
      {session ? (
        storageError && <p className="notice" role="alert">{storageError}</p>
      ) : (
        <aside className="card home-guest-card" aria-label="Sign up for member features">
          <div>
            <p className="eyebrow">Your learning journey</p>
            <h2>Learn at your own pace</h2>
            <p>
              Explore lessons for free. Create an account to take quizzes, save
              your progress, and earn certificates.
            </p>
          </div>
          <Link className="button" to="/login">Create your account</Link>
        </aside>
      )}
      <section className="home-section" aria-labelledby="tutorials-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Quick starts</p>
            <h2 id="tutorials-heading">Start with the fundamentals</h2>
            <p className="home-section-description">Choose a topic and build a strong foundation.</p>
          </div>
        </div>
        <div className="home-tutorial-grid">
          {tutorials.map((tutorial) => (
            <article className="card home-tutorial-card" key={tutorial.id}>
              <div className="home-tutorial-mark" aria-hidden="true">
                {tutorial.title.split(' ').at(-1)}
              </div>
              <div className="home-tutorial-copy">
                <p className="home-card-kicker">Introduction</p>
                <h3>{tutorial.title}</h3>
                <p>{tutorial.description}</p>
              </div>
              <Link className="button home-action-button" to={`/tutorial/${tutorial.id}`}>
                Open tutorial
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="home-section home-levels" aria-labelledby="levels-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Learn by doing</p>
            <h2 id="levels-heading">{session ? 'Your learning path' : 'Explore HTML lessons'}</h2>
            <p className="home-section-description">
              Short, hands-on lessons that turn concepts into skills.
            </p>
          </div>
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
