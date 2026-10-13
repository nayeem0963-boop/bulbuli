import { formatDuration } from '../utils/formatDuration.js'

function IntroCard({ level, highScore, onStart }) {
  return (
    <section className="card intro-card" aria-labelledby="intro-title">
      <p className="eyebrow">Level introduction</p>
      <h2 id="intro-title">{level.title}</h2>
      <p>{level.intro}</p>
      {level.codeExample && (
        <pre className="code-example"><code>{level.codeExample}</code></pre>
      )}
      {highScore && (
        <p className="personal-best">
          Personal best: <strong>{highScore.score}/{highScore.total} ({highScore.percentage}%)</strong>
          {' · '}{formatDuration(highScore.elapsedMs)}
        </p>
      )}
      <button className="button" type="button" onClick={onStart}>Start Questions</button>
    </section>
  )
}

export default IntroCard
