/** The bar above a round: quit, level, progress, score, streak and (Challenge) the countdown. */
export default function Hud({ level, round, timeLeft, language, text, n, onQuit }) {
  const answered = round.responses.length
  const total = round.questions.length
  const urgent = timeLeft !== null && timeLeft <= 10
  return (
    <div className="mm-hud" style={{ '--mm-level': level.color }}>
      <button type="button" className="mm-btn is-ghost is-small" onClick={onQuit} aria-label={text.quitLabel}>
        ← {text.back}
      </button>
      <div className="mm-hud-progress">
        <p className="mm-hud-level">
          <span>{text.level(n(level.id))}</span> · {level.title[language]}
        </p>
        <p className="mm-hud-count">{text.questionOf(n(round.index + 1), n(total))}</p>
        <div
          className="mm-progress"
          role="progressbar"
          aria-label={text.questionOf(n(round.index + 1), n(total))}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={answered}
        >
          <span style={{ width: `${(answered / total) * 100}%` }} />
        </div>
      </div>
      <dl className="mm-hud-stats">
        <div><dt>{text.score}</dt><dd>{n(round.score)}</dd></div>
        <div><dt>{text.streak}</dt><dd>{round.streak > 1 ? '🔥 ' : ''}{n(round.streak)}</dd></div>
        {round.mode === 'challenge' && (
          <div className={`mm-timer ${urgent ? 'is-urgent' : ''}`}>
            <dt>{text.time}</dt>
            <dd aria-label={text.secondsLeft(n(timeLeft ?? 0))}>
              {n(`${Math.floor((timeLeft ?? 0) / 60)}:${String((timeLeft ?? 0) % 60).padStart(2, '0')}`)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}
