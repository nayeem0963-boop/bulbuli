import { LEVELS, TIERS, topicsOf } from '../curriculum/index.js'
import { timeLimitFor, XP } from '../engine.js'
import { Pips, Stars } from './LevelMap.jsx'

/** Before a round: what the level teaches, how hard it is, what it pays, and Practice or Challenge. */
export default function Briefing({ level, record, mode, onMode, onStart, onBack, language, text, n, headingRef }) {
  const best = record.levels?.[level.id]?.bestStars ?? 0
  const nextId = level.id < LEVELS.length ? level.id + 1 : null
  const maxXp = level.questions.length * XP.perCorrectChallenge + XP.firstClear + 3 * XP.perNewStar
  return (
    <section className="mm-panel mm-brief" aria-labelledby="mm-brief-heading" style={{ '--mm-level': level.color }}>
      <p className="mm-eyebrow">
        {text.level(n(level.id))} · {TIERS[level.tier][language]} · {text.questions(n(level.questions.length))}
      </p>
      <h2 id="mm-brief-heading" ref={headingRef} tabIndex={-1}>{level.title[language]}</h2>
      <div className="mm-brief-meta">
        <span>{text.difficulty}</span>
        <Pips value={level.difficulty} label={text.difficultyOf(n(level.difficulty))} />
        <Stars count={best} label={text.bestStars(n(best))} />
      </div>

      <h3>{text.objective}</h3>
      <p className="mm-objective">{level.objective[language]}</p>

      <h3>{text.topics}</h3>
      <ul className="mm-chips">
        {topicsOf(level).map((topic) => <li key={topic}>{topic}</li>)}
      </ul>

      <h3>{text.rewards}</h3>
      <ul className="mm-rewards">
        <li>{text.rewardClear(nextId ? n(nextId) : null)}</li>
        <li>{text.rewardBadge(level.badge[language])}</li>
        <li>{text.rewardStars}</li>
        <li>{text.rewardXp(n(maxXp))}</li>
      </ul>

      <fieldset className="mm-modes">
        <legend>{text.mode}</legend>
        {['practice', 'challenge'].map((option) => (
          <label key={option} className={`mm-mode ${mode === option ? 'is-active' : ''}`}>
            <input type="radio" name="mm-mode" value={option} checked={mode === option} onChange={() => onMode(option)} />
            <span className="mm-mode-name">{option === 'practice' ? `🧭 ${text.practice}` : `⏱ ${text.challenge}`}</span>
            <span className="mm-mode-info">
              {option === 'practice' ? text.practiceInfo : text.challengeInfo(n(timeLimitFor(level)))}
            </span>
          </label>
        ))}
      </fieldset>
      {text.questionsInEnglish && <p className="mm-note">{text.questionsInEnglish}</p>}

      <div className="mm-actions">
        <button type="button" className="mm-btn is-primary" onClick={onStart}>{text.start}</button>
        <button type="button" className="mm-btn is-ghost" onClick={onBack}>{text.backToLevels}</button>
      </div>
    </section>
  )
}
