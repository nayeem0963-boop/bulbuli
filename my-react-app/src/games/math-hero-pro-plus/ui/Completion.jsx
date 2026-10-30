import { ArrowRight, Check, LayoutGrid, LockOpen, RotateCcw, Trophy, X, Zap } from 'lucide-react'
import { useCountUp } from '../../../shared/hooks/useCountUp.js'
import { LEVELS, RESULT_HEADLINES } from '../engine.js'
import { Confetti, StarRow } from './Celebrate.jsx'
import { CARD, GHOST_BUTTON, GOLD_BUTTON, lvlStyle } from './theme.js'
import { unitOf, withUnit } from './QuestionCard.jsx'

function Tile({ label, value, tone = 'text-mf-text', className = '' }) {
  return (
    <div className={`rounded-2xl border-2 border-mf-line bg-mf-panel-2 px-4 py-3 text-center ${className}`}>
      <dt className="text-xs font-extrabold tracking-wider text-mf-muted uppercase">{label}</dt>
      <dd className={`m-0 mt-0.5 font-hero text-[clamp(1.8rem,1.2rem+1.4cqi,2.6rem)] leading-tight font-extrabold tabular-nums ${tone}`}>{value}</dd>
    </div>
  )
}

/** Every question of the round, right or missed; missed ones show the answer and how it works. */
function Review({ review, language, text, n }) {
  const missed = review.filter((item) => !item.response?.correct).length
  // missed questions first (they carry the explanations), then the rest, each in round order
  const ordered = review
    .map((item, i) => ({ ...item, number: i + 1 }))
    .sort((a, b) => Number(Boolean(a.response?.correct)) - Number(Boolean(b.response?.correct)))
  return (
    // On wide screens the review sits beside the results and scrolls inside itself, so it never
    // makes the page taller than the results card.
    <div className="relative min-h-0 @5xl:min-h-[20rem]">
      <div className={`flex min-h-0 flex-col p-5 @xl:p-6 @5xl:absolute @5xl:inset-0 ${CARD}`}>
        <h3 className="m-0 mb-1 font-hero text-xl font-extrabold text-mf-text">{text.reviewTitle}</h3>
        <p className="m-0 mb-3 text-sm text-mf-muted">{missed === 0 ? text.reviewPerfect : text.practise}</p>
        <ol className="m-0 grid gap-2 overflow-y-auto overscroll-contain p-0 pr-1">
          {ordered.map(({ question: q, response: r, number }, i) => {
            const right = Boolean(r?.correct)
            return (
              <li
                key={`${number}-${q.id}`}
                className={`mhpp-anim-rise list-none rounded-xl border-2 px-3.5 py-2.5 ${right ? 'border-mf-line-soft bg-mf-panel-2' : 'border-mf-bad/50 bg-mf-bad-bg'}`}
                style={{ animationDelay: `${200 + i * 40}ms` }}
              >
                <div className="flex items-start gap-2.5">
                  <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${right ? 'bg-mf-good text-mf-on-gold' : 'bg-mf-bad text-mf-on-gold'}`} aria-hidden="true">
                    {right ? <Check size={14} strokeWidth={3.5} /> : <X size={14} strokeWidth={3.5} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 flex flex-wrap items-baseline justify-between gap-x-3 text-sm text-mf-text @xl:text-base">
                      <span className="min-w-0"><span className="mr-1.5 text-xs font-extrabold text-mf-faint">{n(number)}.</span>{n(q.equation ?? q.prompt[language])}</span>
                      <strong className="font-hero text-lg font-extrabold text-mf-good-ink">{n(withUnit(q.answer, unitOf(q, language)))}</strong>
                    </p>
                    {!right && (
                      <>
                        {r && <p className="m-0 text-xs font-bold text-mf-bad-ink">{text.yourAnswer}: {n(withUnit(r.choice, unitOf(q, language)))}</p>}
                        <p className="m-0 mt-1 text-sm text-mf-muted"><strong className="text-mf-text">{text.howLabel}:</strong> {n(q.explain[language])}</p>
                      </>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

export default function Completion({ level, result, language, text, n, onNext, onRetry, onLevels, headingRef }) {
  const { summary, xp, badgeNew, badgeOwned, unlockedNext, nextOpen, review } = result
  const passed = summary.stars >= 1
  const nextLevel = LEVELS.find((l) => l.id === level.id + 1)
  const canGoNext = nextOpen && nextLevel
  const shownXp = useCountUp(xp, { duration: 900 })
  const shownPercent = useCountUp(summary.percent, { duration: 900 })

  return (
    <section
      aria-labelledby="mhpp-results"
      className="mhpp-lvl relative z-10 grid w-full flex-1 gap-4 @5xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] @5xl:gap-5"
      style={lvlStyle(level.accent)}
    >
      <div className="relative flex w-full flex-col items-center justify-center overflow-clip rounded-2xl border-2 border-mf-gold/50 bg-mf-panel/95 p-5 text-center shadow-[0_0_60px_-24px_rgba(250,204,21,0.7),var(--mf-shadow)] sm:p-8">
        {passed && <Confetti count={summary.stars === 3 ? 110 : 70} />}

        <span className="mhpp-anim-pop grid size-20 place-items-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-mf-on-gold shadow-[0_0_44px_-4px_rgba(250,204,21,0.85)] @xl:size-24">
          <Trophy size={44} strokeWidth={2.5} aria-hidden="true" focusable="false" />
        </span>
        <p className="m-0 mt-4 text-sm font-extrabold tracking-widest text-lvl-ink uppercase">{text.missionN(n(level.id))} · {level.title[language]}</p>
        <h2 id="mhpp-results" ref={headingRef} tabIndex={-1} className="m-0 mt-1 font-hero text-3xl font-extrabold text-mf-text outline-none @xl:text-5xl">
          {text.resultsTitle(n(level.id))}
        </h2>
        <p className="m-0 mt-2 text-lg text-mf-muted">{RESULT_HEADLINES[summary.stars][language]}</p>

        <div className="mt-4 flex justify-center" role="img" aria-label={text.starsOf(n(summary.stars), n(3))}>
          <StarRow stars={summary.stars} size={60} animate />
        </div>

        <dl className="m-0 mt-4 grid w-full max-w-2xl grid-cols-3 gap-3">
          <Tile label={text.score} value={`${n(summary.correct)}/${n(summary.total)}`} />
          <Tile label={text.percent} value={`${n(shownPercent)}%`} tone="text-mf-good-ink" />
          <Tile
            label={text.xpGained}
            value={<span className="inline-flex items-center gap-1"><Zap size={24} strokeWidth={3} aria-hidden="true" focusable="false" />+{n(shownXp)}</span>}
            tone="text-mf-gold-ink"
            className="border-mf-gold/60 bg-mf-gold/10"
          />
        </dl>

        {/* the level's collectible badge */}
        <div
          className={`mt-4 flex w-full max-w-md items-center gap-4 rounded-2xl border-2 p-4 text-left ${
            badgeOwned ? 'border-mf-gold/70 bg-mf-gold/10 shadow-[0_0_30px_-12px_rgba(250,204,21,0.9)]' : 'border-mf-line bg-mf-panel-2'
          }`}
        >
          <span
            aria-hidden="true"
            className={`grid size-16 shrink-0 place-items-center rounded-2xl text-4xl ${badgeOwned ? `bg-mf-panel ring-2 ring-mf-gold/80 ${badgeNew ? 'mhpp-anim-badge' : ''}` : 'bg-mf-panel opacity-50 grayscale'}`}
          >
            {level.badge.emoji}
          </span>
          <div className="min-w-0">
            <p className={`m-0 text-xs font-extrabold tracking-widest uppercase ${badgeOwned ? 'text-mf-gold-ink' : 'text-mf-muted'}`}>
              {badgeOwned ? (badgeNew ? text.badgeNew : text.badgeKept) : text.badgeLocked}
            </p>
            <p className={`m-0 font-hero text-2xl font-extrabold ${badgeOwned ? 'text-mf-text' : 'text-mf-muted'}`}>{level.badge.name[language]}</p>
          </div>
        </div>

        {unlockedNext && nextLevel && (
          <p className="mhpp-anim-pop mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-mf-accent/15 px-4 py-1.5 text-sm font-extrabold text-mf-accent ring-1 ring-mf-accent/40" style={{ animationDelay: '1.1s' }}>
            <LockOpen size={16} strokeWidth={3} aria-hidden="true" focusable="false" />
            {text.unlocked(n(nextLevel.id))}
          </p>
        )}
        {passed && !nextLevel && <p className="m-0 mt-4 font-bold text-mf-gold-ink">{text.allDone}</p>}

        <div className="mt-5 flex w-full flex-col-reverse gap-3 @md:w-auto @md:flex-row @md:justify-center">
          <button type="button" onClick={onLevels} className={GHOST_BUTTON}>
            <LayoutGrid size={20} strokeWidth={2.75} aria-hidden="true" focusable="false" />
            {text.backToLevels}
          </button>
          <button type="button" onClick={onRetry} className={canGoNext ? GHOST_BUTTON : GOLD_BUTTON}>
            <RotateCcw size={20} strokeWidth={2.75} aria-hidden="true" focusable="false" />
            {text.tryAgain}
          </button>
          {canGoNext && (
            <button type="button" onClick={onNext} className={GOLD_BUTTON}>
              {text.playNext}
              <ArrowRight size={20} strokeWidth={3} aria-hidden="true" focusable="false" />
            </button>
          )}
        </div>
      </div>

      <Review review={review} language={language} text={text} n={n} />
    </section>
  )
}
