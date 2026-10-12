import LevelCard from '../components/LevelCard.jsx'
import { htmlLevels } from '../data/htmlLevels.js'
import { useProgress } from '../hooks/useProgress.js'

function Home() {
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
        <p>Build your programming skills one quick question at a time.</p>
      </header>
      {storageError && <p className="notice" role="alert">{storageError}</p>}
      <section aria-labelledby="levels-heading">
        <div className="section-heading">
          <h2 id="levels-heading">Your levels</h2>
          <button className="text-button" type="button" onClick={resetProgress}>Reset progress</button>
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
                  unlocked={unlockedLevels.includes(level.id)}
                  completed={completedLevels.includes(level.id)}
                  inProgress={startedLevels.includes(level.id)}
                  onStart={() => markLevelStarted(level.id)}
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
