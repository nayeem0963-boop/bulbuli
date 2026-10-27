import { LEVELS, TIER_ORDER, TIERS } from '../curriculum/index.js'
import { isCleared, isUnlocked } from '../engine.js'

export function Pips({ value, label }) {
  return (
    <span className="mm-pips" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= value ? 'is-on' : ''} aria-hidden="true" />)}
    </span>
  )
}

export function Stars({ count, label, size = 'sm' }) {
  return (
    <span className={`mm-stars is-${size}`} role="img" aria-label={label}>
      {[1, 2, 3].map((i) => <span key={i} className={i <= count ? 'is-on' : ''} aria-hidden="true">★</span>)}
    </span>
  )
}

/** The ten levels grouped by rank, each a button that opens its briefing. Locked levels explain why. */
export default function LevelMap({ record, suggested, language, text, n, onOpen, headingRef }) {
  const groups = TIER_ORDER.map((tier) => ({ tier, levels: LEVELS.filter((level) => level.tier === tier) }))
  return (
    <section className="mm-map" aria-labelledby="mm-map-heading">
      <div className="mm-section-head">
        <h2 id="mm-map-heading" ref={headingRef} tabIndex={-1}>{text.chooseLevel}</h2>
        <p>{text.mapIntro}</p>
      </div>
      {groups.map(({ tier, levels }) => (
        <div key={tier} className="mm-tier">
          <h3 className="mm-tier-name">{TIERS[tier][language]}</h3>
          <ul className="mm-level-grid">
            {levels.map((level) => {
              const unlocked = isUnlocked(level.id, record)
              const cleared = isCleared(level.id, record)
              const best = record.levels?.[level.id]?.bestStars ?? 0
              const status = !unlocked ? text.locked(n(level.id - 1)) : cleared ? text.clearedTag : level.id === suggested ? text.newTag : ''
              return (
                <li key={level.id}>
                  <button
                    type="button"
                    className={`mm-level ${unlocked ? '' : 'is-locked'} ${cleared ? 'is-cleared' : ''} ${level.id === suggested && unlocked ? 'is-next' : ''}`}
                    style={{ '--mm-level': level.color }}
                    aria-disabled={!unlocked}
                    aria-describedby={`mm-level-${level.id}-status`}
                    onClick={() => unlocked && onOpen(level.id)}
                  >
                    <span className="mm-level-number" aria-hidden="true">{unlocked ? n(level.id) : '🔒'}</span>
                    <span className="mm-level-body">
                      <span className="mm-level-eyebrow">{text.level(n(level.id))} · {text.questions(n(level.questions.length))}</span>
                      <span className="mm-level-title">{level.title[language]}</span>
                      <span className="mm-level-meta">
                        <Pips value={level.difficulty} label={text.difficultyOf(n(level.difficulty))} />
                        <Stars count={best} label={text.bestStars(n(best))} />
                      </span>
                      <span id={`mm-level-${level.id}-status`} className="mm-level-status">{status}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <p className="mm-footnote">{text.saved}</p>
    </section>
  )
}
