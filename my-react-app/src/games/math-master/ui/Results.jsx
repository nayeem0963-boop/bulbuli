import { displayAnswer, displayValue, LEVELS } from '../curriculum/index.js'
import { Stars } from './LevelMap.jsx'

function duration(ms, text, n) {
  const seconds = Math.round(ms / 1000)
  return text.durationOf(Math.floor(seconds / 60) ? n(Math.floor(seconds / 60)) : 0, n(seconds % 60))
}

/** End of a round: score, accuracy, XP, unlocks, topic-by-topic performance and a review of misses. */
export default function Results({ level, result, language, text, n, onRetry, onNext, onLevels, headingRef }) {
  const { summary, xp, unlockedNext, badge, newBest, questions, responses } = result
  const cleared = summary.stars >= 1
  const missed = questions.filter((q) => responses.find((r) => r.id === q.id && !r.correct))
  const hasNext = level.id < LEVELS.length
  const accuracy = Math.round(summary.accuracy * 100)

  const tiles = [
    { label: text.score, value: n(summary.score) },
    { label: text.correctCount, value: n(summary.correct) },
    { label: text.incorrectCount, value: n(summary.incorrect) },
    { label: text.accuracy, value: `${n(accuracy)}%` },
    { label: text.timeTaken, value: duration(summary.durationMs, text, n) },
    { label: text.xpEarned, value: `+${n(xp)}` },
    { label: text.bestStreak, value: n(summary.bestStreak) },
  ]

  return (
    <section className="mm-panel mm-results" aria-labelledby="mm-results-heading" style={{ '--mm-level': level.color }}>
      <p className="mm-eyebrow">{text.level(n(level.id))} · {level.title[language]}</p>
      <h2 id="mm-results-heading" ref={headingRef} tabIndex={-1}>{cleared ? text.resultsCleared : text.resultsTry}</h2>
      <Stars count={summary.stars} size="lg" label={text.starsLabel(n(summary.stars))} />
      {!cleared && <p className="mm-results-lead">{text.resultsTryText}</p>}

      {(unlockedNext || badge || newBest) && (
        <ul className="mm-rewards-earned" role="status">
          {unlockedNext && <li>🔓 {text.unlocked(n(level.id + 1))}</li>}
          {badge && <li>🏅 {text.badgeEarned(level.badge[language])}</li>}
          {newBest && <li>⭐ {text.newBest}</li>}
        </ul>
      )}

      <dl className="mm-tiles">
        {tiles.map((tile) => (
          <div key={tile.label}><dt>{tile.label}</dt><dd>{tile.value}</dd></div>
        ))}
      </dl>

      <div className="mm-results-columns">
        <div>
          <h3>{text.byTopic}</h3>
          <ul className="mm-topics">
            {summary.byTopic.map((topic) => (
              <li key={topic.topic}>
                <span className="mm-topic-name">{topic.topic}</span>
                <span className="mm-topic-bar" aria-hidden="true">
                  <span style={{ width: `${(topic.correct / topic.total) * 100}%` }} />
                </span>
                <span className="mm-topic-score">{n(topic.correct)}/{n(topic.total)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>{text.practise}</h3>
          {summary.practise.length ? (
            <ul className="mm-chips is-practise">{summary.practise.map((topic) => <li key={topic}>{topic}</li>)}</ul>
          ) : (
            <p>{text.allTopicsGood}</p>
          )}
        </div>
      </div>

      {missed.length > 0 && (
        <details className="mm-review">
          <summary>{text.review(missed.length)}</summary>
          <ol>
            {missed.map((question) => {
              const response = responses.find((r) => r.id === question.id)
              const yours = response.timedOut || response.response === null
                ? text.noAnswer
                : question.format === 'input' ? response.response : displayValue(question, response.response)
              return (
                <li key={question.id}>
                  <p className="mm-review-prompt">{question.prompt}</p>
                  <p><span>{text.yourAnswer}:</span> {yours}</p>
                  <p><span>{text.rightAnswer}:</span> <strong>{displayAnswer(question)}</strong></p>
                  <p className="mm-review-why">{question.explanation}</p>
                </li>
              )
            })}
          </ol>
        </details>
      )}

      <div className="mm-actions">
        {hasNext && cleared && <button type="button" className="mm-btn is-primary" onClick={onNext}>{text.nextLevel} →</button>}
        <button type="button" className={`mm-btn ${hasNext && cleared ? 'is-secondary' : 'is-primary'}`} onClick={onRetry}>{text.retry}</button>
        <button type="button" className="mm-btn is-ghost" onClick={onLevels}>{text.levelSelect}</button>
      </div>
    </section>
  )
}
