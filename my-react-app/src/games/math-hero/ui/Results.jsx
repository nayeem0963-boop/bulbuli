import { useCountUp } from '../../../shared/hooks/useCountUp.js'
import { runSummary } from '../journey.js'
import Stars from './Stars.jsx'

/** A finished run: stars, the numbers, the question that ended it, and what to do next. */
export default function Results({ gameOver, before, lastMiss, text, n, onReplay, onDashboard, headingRef }) {
  const run = runSummary(gameOver)
  const xp = useCountUp(run.xp)
  const newBest = Boolean(before) && run.xp > 0 && run.xp > before.bestScore
  const q = lastMiss?.question
  return (
    <section className="mh-results" aria-labelledby="mh-results-heading">
      <div className="mh-results-card">
        <span className="mh-results-badge" aria-hidden="true">{run.stars >= 2 ? '🏆' : run.stars === 1 ? '🌟' : '💫'}</span>
        <p className="mh-eyebrow">{text.resultsEyebrow}</p>
        <h2 id="mh-results-heading" ref={headingRef} tabIndex={-1}>{text.resultsTitle}</h2>
        <Stars count={run.stars} label={text.runStarsLabel(n(run.stars))} size="lg" animate />
        <p className="mh-results-message">{text.resultsMessage[run.stars]}</p>
        {newBest && <p className="mh-chip is-gold">🎉 {text.newBest}</p>}

        <dl className="mh-tiles is-results">
          <div className="is-good"><dt>{text.correct}</dt><dd>{n(run.correct)}</dd></div>
          <div className="is-soft"><dt>{text.incorrect}</dt><dd>{n(run.missed)}</dd></div>
          <div><dt>{text.accuracy}</dt><dd>{n(run.accuracy)}%</dd></div>
          <div className="is-xp"><dt>{text.xpEarned}</dt><dd>+{n(xp)}</dd></div>
          <div><dt>{text.levelReached}</dt><dd>{n(run.level)}</dd></div>
        </dl>

        {q && (
          <p className="mh-last-question">
            <span>{lastMiss.type === 'timeout' ? text.timeUp : text.almost}</span>{' '}
            <strong>{n(q.left)} {q.operator === '-' ? '−' : q.operator} {n(q.right)} = {n(q.answer)}</strong>
          </p>
        )}

        <div className="mh-actions">
          <button type="button" className="mh-btn is-primary is-big" onClick={onReplay}>
            <span aria-hidden="true">↻</span> {text.playAgain}
          </button>
          <button type="button" className="mh-btn is-ghost is-big" onClick={onDashboard}>
            <span aria-hidden="true">⌂</span> {text.dashboard}
          </button>
        </div>
      </div>
    </section>
  )
}
