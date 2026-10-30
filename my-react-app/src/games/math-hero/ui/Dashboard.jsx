import { useCountUp } from '../../../shared/hooks/useCountUp.js'
import { MATH_HERO_QUESTIONS_PER_LEVEL } from '../../../utils/mathHero.js'
import {
  clearedInStage, journeySummary, MAX_JOURNEY_STARS, STAGES, stageForLevel, stageStars, stageStatus,
} from '../journey.js'
import Stars from './Stars.jsx'

function StageCard({ stage, records, level, runStarted, text, n, index }) {
  const status = stageStatus(stage, records.bestLevel)
  const stars = stageStars(stage, records.bestLevel)
  const words = text.stages[stage.id - 1]
  const size = (stage.to ?? stage.from + 9) - stage.from + 1
  const cleared = clearedInStage(stage, records.bestLevel)
  const here = runStarted && stageForLevel(level).id === stage.id
  const goal = !here && status === 'current'
  const tag = here
    ? text.stageNow
    : goal ? text.stageNext : status === 'cleared' ? text.stageCleared : status === 'locked' ? text.stageLocked : text.stageOpen
  return (
    <li
      className={`mh-stage is-${status}${here || goal ? ' is-focus' : ''}`}
      style={{ '--mh-stage': stage.color, animationDelay: `${index * 60}ms` }}
    >
      <div className="mh-stage-top">
        <span className="mh-stage-icon" aria-hidden="true">{status === 'locked' ? '🔒' : stage.icon}</span>
        <span className="mh-stage-range">{text.levelsRange(n(stage.from), stage.to ? n(stage.to) : null)}</span>
        <span className={`mh-stage-tag${here || goal ? ' is-focus' : ''}`}>{tag}</span>
      </div>
      <h3 className="mh-stage-title">{words.topic}</h3>
      <p className="mh-stage-desc">{words.desc}</p>
      <div className="mh-stage-foot">
        <p className="mh-stage-sample" aria-hidden="true">{n(stage.sample)} = ?</p>
        <span className="mh-stage-meta">
          <span className="mh-stage-qs">{text.questionsPer(n(MATH_HERO_QUESTIONS_PER_LEVEL))}</span>
          <Stars count={stars} label={text.starsOf(n(stars), n(3))} />
        </span>
      </div>
      <div className="mh-stage-meter" aria-hidden="true">
        <span style={{ width: `${(cleared / size) * 100}%` }} />
      </div>
      {status === 'locked' && <p className="mh-stage-lock">{text.stageLockedHint(n(stage.from))}</p>}
    </li>
  )
}

export default function Dashboard({ records, totalXp, level, runStarted, text, n, onPlay, headingRef }) {
  const { stars, cleared } = journeySummary(records.bestLevel)
  const shownXp = useCountUp(totalXp)
  const shownStars = useCountUp(stars)
  return (
    <div className="mh-home">
      <section className="mh-hero" aria-labelledby="mh-home-heading">
        <div className="mh-hero-copy">
          <h2 id="mh-home-heading" ref={headingRef} tabIndex={-1}>{text.readyTitle}</h2>
          <p>{text.dashboardIntro}</p>
          <button type="button" className="mh-btn is-primary is-big" onClick={onPlay}>
            <span aria-hidden="true">▶</span> {runStarted ? text.continueRun : text.startPlaying}
          </button>
        </div>
        <dl className="mh-tiles">
          <div className="is-xp">
            <dt>{text.totalXp}</dt>
            <dd><span aria-hidden="true">🏆</span> {n(shownXp)}</dd>
          </div>
          <div className="is-stars">
            <dt>{text.starsLabel}</dt>
            <dd><span aria-hidden="true" className="mh-star-glyph">★</span> {n(shownStars)} <small>/ {n(MAX_JOURNEY_STARS)}</small></dd>
          </div>
          <div>
            <dt>{runStarted ? text.currentLevel : text.bestLevel}</dt>
            <dd>{n(runStarted ? level : records.bestLevel)}</dd>
          </div>
          <div>
            <dt>{text.bestScore}</dt>
            <dd>{n(records.bestScore)} <small>XP</small></dd>
          </div>
        </dl>
        <ul className="mh-rules">
          <li><span aria-hidden="true">⭐</span> {text.earnXp}</li>
          <li><span aria-hidden="true">❤️</span> {text.bonusRule}</li>
          <li><span aria-hidden="true">🎯</span> {text.questionsPer(n(MATH_HERO_QUESTIONS_PER_LEVEL))}</li>
        </ul>
        <div className="mh-journey-bar">
          <div className="mh-journey-label">
            <span>{text.journey}</span>
            <span>{text.journeyOf(n(cleared), n(STAGES.length))}</span>
          </div>
          <div
            className="mh-meter"
            role="progressbar"
            aria-label={text.journey}
            aria-valuemin={0}
            aria-valuemax={STAGES.length}
            aria-valuenow={cleared}
          >
            <span style={{ width: `${Math.max(3, (cleared / STAGES.length) * 100)}%` }} />
          </div>
          <p className="mh-footnote">{text.saveNote}</p>
        </div>
      </section>

      <section className="mh-journey" aria-labelledby="mh-journey-heading">
        <div className="mh-section-head">
          <h2 id="mh-journey-heading">{text.journeyTitle}</h2>
          <p>{text.journeyHint}</p>
        </div>
        <ol className="mh-stage-grid">
          {STAGES.map((stage, index) => (
            <StageCard
              key={stage.id}
              stage={stage}
              records={records}
              level={level}
              runStarted={runStarted}
              text={text}
              n={n}
              index={index}
            />
          ))}
        </ol>
      </section>
    </div>
  )
}
