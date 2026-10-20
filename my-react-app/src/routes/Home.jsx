import { useState } from 'react'
import { Link } from 'react-router-dom'
import mathHeroMascot from '../assets/math-hero-mascot.png'
import TutorialCard from '../components/TutorialCard.jsx'
import { tutorialCatalog } from '../data/tutorialCatalog.js'
import { useTutorialProgress } from '../hooks/useTutorialProgress.js'
import { getCurrentStreak } from '../utils/gamification.js'
import { getTutorialCardAction } from '../utils/tutorialCardAction.js'

function getProgress(tutorial, quizProgress, completedTutorials, startedTutorialIds) {
  const result = completedTutorials[tutorial.id]
  if (result) return { progress: 100, status: 'Completed', action: 'Completed 🎉' }

  const attempt = quizProgress[tutorial.id]
  if (!attempt) {
    const started = startedTutorialIds.includes(tutorial.id)
    return {
      progress: 0,
      status: started ? 'In progress' : 'Ready to start',
      action: getTutorialCardAction(tutorial, result, started),
    }
  }

  const answered = attempt.answers.filter((answer) => answer !== null).length
  return {
    progress: Math.round((answered / attempt.answers.length) * 100),
    status: answered ? `${answered} of ${attempt.answers.length} answered` : 'In progress',
    action: getTutorialCardAction(tutorial, result, true, attempt.currentIndex),
  }
}

function Home({ session }) {
  const [activeTechTip, setActiveTechTip] = useState(null)
  const {
    completedTutorials,
    gamification,
    quizProgress,
    storageError,
    startedTutorialIds,
  } = useTutorialProgress(session.user.id)
  const completedCount = Object.keys(completedTutorials).length
  const inProgressCount = startedTutorialIds.filter((id) => !completedTutorials[id]).length
  const currentStreak = getCurrentStreak(gamification)
  const learnerName = session.user.user_metadata?.first_name
    || session.user.user_metadata?.name?.split(' ')[0]
    || session.user.email?.split('@')[0]
    || 'learner'

  return (
    <main className="page tutorial-hub">
      <nav className="tutorial-home-nav" aria-label="Main navigation">
        <Link className="dashboard-brand" to="/" aria-label="Bulbuli home">
          bulbuli<span>.</span>
        </Link>
        <Link className="button button-secondary tutorial-dashboard-link" to="/dashboard">
          Your dashboard <span aria-hidden="true">↗</span>
        </Link>
      </nav>
      <header className="tutorial-hero">
        <div className="tutorial-hero-copy">
          <p className="eyebrow">Your learning space</p>
          <h1>Small steps, {learnerName}.</h1>
          <p>{currentStreak
            ? `🔥 ${currentStreak}-day streak active! Keep going, ${learnerName}.`
            : 'Pick up a new skill with five focused tutorials. Your progress stays saved on this device.'}</p>
          <Link className="button tutorial-hero-action" to="/tutorials">
            Explore all tutorials <span aria-hidden="true">→</span>
          </Link>
          <Link className="button-secondary home-exam-link" to="/exam">
            Frontend Developer Preparation <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="tutorial-hero-art" role="group" aria-label="Interactive web technology badges">
          <span className="hero-art-orbit orbit-one" />
          <span className="hero-art-orbit orbit-two" />
          <span className="hero-art-star" aria-hidden="true">✦</span>
          {[
            { id: 'html', label: 'HTML', text: '</>', className: 'tag-markup' },
            { id: 'css', label: 'CSS', text: 'CSS', className: 'tag-style' },
            { id: 'javascript', label: 'JavaScript', text: 'JS', className: 'tag-script' },
            { id: 'react', label: 'React', text: '⚛', className: 'tag-react' },
          ].map((tech) => (
            <button
              key={tech.id}
              className={`hero-art-tag ${tech.className}${activeTechTip === tech.id ? ' is-active is-bursting' : ''}`}
              type="button"
              aria-label={`${tech.label} badge`}
              aria-expanded={activeTechTip === tech.id}
              aria-describedby={activeTechTip === tech.id ? `hero-tip-${tech.id}` : undefined}
              onClick={() => setActiveTechTip((current) => current === tech.id ? null : tech.id)}
            >
              <span aria-hidden="true">{tech.text}</span>
              {activeTechTip === tech.id && (
                <span className="hero-art-tooltip" id={`hero-tip-${tech.id}`} role="tooltip">
                  {tech.label} powers the web
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {storageError && <p className="notice" role="alert">{storageError}</p>}

      <section className="tutorial-overview-stats" aria-label="Your tutorial progress">
        <article className="card tutorial-stat">
          <span className="tutorial-stat-icon" aria-hidden="true">✓</span>
          <span className="tutorial-stat-label">Completed</span>
          <strong>{completedCount}<small> / {tutorialCatalog.length}</small></strong>
        </article>
        <article className="card tutorial-stat">
          <span className="tutorial-stat-icon is-active" aria-hidden="true">↗</span>
          <span className="tutorial-stat-label">In progress</span>
          <strong>{inProgressCount}</strong>
        </article>
        <article className="card tutorial-stat">
          <span className="tutorial-stat-icon is-next" aria-hidden="true">✦</span>
          <span className="tutorial-stat-label">Your next win</span>
          <strong>{tutorialCatalog.length - completedCount}<small> to go</small></strong>
        </article>
      </section>

      <section className="math-hero-promo" aria-labelledby="math-hero-promo-heading">
        <img className="math-hero-promo-icon" src={mathHeroMascot} alt="" />
        <div>
          <p className="eyebrow">A new kind of adventure</p>
          <h2 id="math-hero-promo-heading">Ready to be a Math Hero?</h2>
          <p>Practice addition and subtraction, earn XP, and unlock new levels as you go.</p>
        </div>
        <Link className="button math-hero-primary" to="/math-hero">
          Play Math Hero <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section className="tutorial-section" aria-labelledby="home-tutorials-heading">
        <div className="tutorial-section-heading">
          <div>
            <p className="eyebrow">Learn at your pace</p>
            <h2 id="home-tutorials-heading">Choose your next tutorial</h2>
          </div>
          <Link className="tutorial-text-link" to="/tutorials">
            View all <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="tutorial-card-grid">
          {tutorialCatalog.map((tutorial) => {
            const progress = getProgress(tutorial, quizProgress, completedTutorials, startedTutorialIds)
            return (
              <TutorialCard
                key={tutorial.id}
                tutorial={tutorial}
                result={completedTutorials[tutorial.id]}
                {...progress}
                to={`/tutorials/${tutorial.id}`}
              />
            )
          })}
        </div>
      </section>
    </main>
  )
}

export default Home
