import { Link } from 'react-router-dom'
import { ArrowRight, Check, Lock, Play, RotateCcw, Zap } from 'lucide-react'
import { bestStars, isUnlocked, LEVELS, QUESTIONS_PER_LEVEL } from '../engine.js'
import { StarRow } from './Celebrate.jsx'
import { CARD, LEVEL_ICONS, LEVEL_SYMBOLS, lvlStyle } from './theme.js'

// Where each card sits in the grid: 1 column (phones) → 2 → 3 + 2 (wide) → 5 in a row (very wide).
const SPANS = [
  '@5xl:col-span-2 @7xl:col-span-1',
  '@5xl:col-span-2 @7xl:col-span-1',
  '@5xl:col-span-2 @7xl:col-span-1',
  '@5xl:col-span-3 @7xl:col-span-1',
  '@2xl:col-span-2 @5xl:col-span-3 @7xl:col-span-1',
]
// where the floating symbols sit on the picture: [left %, top %, tilt, size class, opacity]
const SYMBOL_SPOTS = [
  [44, 12, -12, 'text-3xl', 0.55],
  [66, 18, 8, 'text-xl', 0.45],
  [50, 58, -6, 'text-2xl', 0.5],
  [78, 64, 10, 'text-lg', 0.4],
]

function MissionArt({ level, open, isNext, text, n }) {
  const Icon = LEVEL_ICONS[level.icon]
  return (
    <span
      className={`relative block h-[clamp(7.5rem,17cqh,12rem)] w-full overflow-hidden ${
        open ? 'bg-[radial-gradient(120%_90%_at_30%_10%,color-mix(in_oklab,var(--lvl)_38%,transparent),transparent_70%)] bg-lvl/10' : 'bg-mf-sunken'
      }`}
      aria-hidden="true"
    >
      {/* the mission number as a big watermark */}
      <span className="absolute -right-1 -bottom-5 font-hero text-[6rem] leading-none font-extrabold text-lvl-ink opacity-[0.13]">
        {n(String(level.id).padStart(2, '0'))}
      </span>
      {LEVEL_SYMBOLS[level.icon].map((symbol, i) => {
        const [left, top, tilt, size, o] = SYMBOL_SPOTS[i]
        return (
          <span
            key={i}
            className={`mhp-symbol absolute font-hero font-extrabold whitespace-nowrap ${open ? 'text-lvl-ink' : 'text-mf-faint'} ${size}`}
            style={{ left: `${left}%`, top: `${top}%`, '--mhp-tilt': `${tilt}deg`, '--mhp-o': o, animationDelay: `${120 + i * 90}ms` }}
          >
            {n(symbol)}
          </span>
        )
      })}
      <span
        className={`absolute top-1/2 left-5 grid size-[clamp(4rem,9cqh,5.5rem)] -translate-y-1/2 place-items-center rounded-3xl border-2 transition duration-300 group-hover:scale-105 ${
          open ? 'border-lvl/70 bg-mf-panel text-lvl-ink shadow-[0_10px_30px_-10px_var(--lvl)]' : 'border-mf-line bg-mf-panel-2 text-mf-faint'
        }`}
      >
        {open ? <Icon size={40} strokeWidth={2.75} /> : <Lock size={34} strokeWidth={2.5} />}
      </span>
      {isNext && (
        <span className="absolute top-3 right-3 rounded-full bg-mf-gold px-3 py-1 font-copy text-xs font-extrabold text-mf-on-gold shadow-[var(--mf-glow-gold)]">
          {text.suggested}
        </span>
      )}
    </span>
  )
}

function LevelCard({ level, index, record, suggested, language, text, n, onOpen }) {
  const open = isUnlocked(level.id, record)
  const stars = bestStars(record, level.id)
  const saved = record.levels?.[level.id] ?? {}
  const played = (saved.plays ?? 0) > 0
  const best = saved.bestCorrect ?? 0
  const isNext = open && suggested
  const hasBadge = (record.badges ?? []).includes(level.badge.id)

  return (
    <li className={`mhp-anim-rise list-none ${SPANS[index]}`} style={{ animationDelay: `${index * 70}ms` }}>
      <button
        type="button"
        disabled={!open}
        onClick={() => onOpen(level.id)}
        style={lvlStyle(level.accent)}
        aria-label={`${text.levelN(n(level.id))}: ${level.title[language]}. ${open ? text.starsOf(n(stars), n(3)) : `${text.locked}. ${text.unlockHint(n(level.id - 1))}`}`}
        className={`mhp-lvl group relative flex h-full w-full flex-col overflow-hidden rounded-3xl border-2 bg-mf-panel p-0 text-left transition duration-200 ${
          open
            ? `cursor-pointer hover:-translate-y-1 hover:shadow-[var(--mf-shadow-lift)] active:translate-y-0 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-mf-focus ${
              isNext ? 'border-lvl shadow-[0_0_0_4px_color-mix(in_oklab,var(--lvl)_22%,transparent),var(--mf-shadow-lift)]' : 'border-mf-line shadow-[var(--mf-shadow)] hover:border-lvl'
            }`
            : 'cursor-not-allowed border-mf-line-soft bg-mf-sunken'
        }`}
      >
        <MissionArt level={level} open={open} isNext={isNext} text={text} n={n} />
        <span className="flex flex-1 flex-col gap-2 p-4 @xl:p-5">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className={`text-xs font-extrabold tracking-widest uppercase ${open ? 'text-lvl-ink' : 'text-mf-faint'}`}>
              {text.missionN(n(level.id))}
            </span>
            <span className="text-xs font-bold text-mf-muted">{text.questionsN(n(QUESTIONS_PER_LEVEL))}</span>
          </span>
          <span className={`font-hero text-2xl leading-tight font-extrabold ${open ? 'text-mf-text' : 'text-mf-muted'}`}>{level.title[language]}</span>
          <span className={`text-[0.95rem] leading-snug ${open ? 'text-mf-muted' : 'text-mf-faint'}`}>{level.blurb[language]}</span>

          {/* progress: best stars, best score as a bar */}
          <span className="mt-auto flex flex-col gap-1.5 pt-2">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <StarRow stars={stars} size={24} />
              <span className="text-xs font-bold text-mf-muted">
                {played ? text.bestScore(n(best), n(QUESTIONS_PER_LEVEL)) : text.notPlayed}
              </span>
            </span>
            <span className="block h-2 overflow-hidden rounded-full bg-mf-track" aria-hidden="true">
              <span className="mhp-anim-fill block h-full rounded-full bg-lvl" style={{ width: `${(best / QUESTIONS_PER_LEVEL) * 100}%` }} />
            </span>
          </span>

          {/* rewards: XP and the mission's badge */}
          <span className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1 rounded-full bg-mf-gold/15 px-2.5 py-1 text-mf-gold-ink">
              <Zap size={14} strokeWidth={2.75} aria-hidden="true" focusable="false" />
              {text.upToXp(n(level.maxXp))}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${hasBadge ? 'bg-mf-good-bg text-mf-good-ink' : 'bg-mf-panel-2 text-mf-muted'}`}>
              <span aria-hidden="true" className={hasBadge ? '' : 'opacity-60 grayscale'}>{level.badge.emoji}</span>
              {hasBadge ? <Check size={14} strokeWidth={3} aria-hidden="true" focusable="false" /> : null}
              {level.badge.name[language]}
            </span>
          </span>

          <span
            className={`mt-1 flex min-h-12 items-center justify-center gap-2 rounded-xl font-hero text-base font-extrabold transition ${
              open ? (isNext ? 'bg-mf-gold text-mf-on-gold group-hover:brightness-105' : 'bg-lvl/15 text-mf-text group-hover:bg-lvl/25') : 'bg-mf-panel-2 text-mf-faint'
            }`}
            aria-hidden="true"
          >
            {open ? (
              <>
                {played ? <RotateCcw size={18} strokeWidth={3} /> : <Play size={18} strokeWidth={3} className="fill-current" />}
                {played ? text.replay : text.start}
              </>
            ) : (
              <>
                <Lock size={16} strokeWidth={3} />
                <span className="text-sm">{text.unlockHint(n(level.id - 1))}</span>
              </>
            )}
          </span>
        </span>
      </button>
    </li>
  )
}

function BadgeShelf({ record, language, text, n }) {
  const won = new Set(record.badges ?? [])
  return (
    <section className={`mt-5 p-5 @xl:p-6 ${CARD}`} aria-labelledby="mhp-badges-heading">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="mhp-badges-heading" className="m-0 font-hero text-xl font-extrabold text-mf-text">{text.collection}</h3>
        <p className="m-0 text-sm font-bold text-mf-muted">{won.size === 0 ? text.collectionEmpty : `${n(won.size)} / ${n(LEVELS.length)}`}</p>
      </div>
      <ul className="m-0 grid grid-cols-1 gap-3 p-0 @md:grid-cols-2 @3xl:grid-cols-5">
        {LEVELS.map((level, i) => {
          const has = won.has(level.badge.id)
          return (
            <li
              key={level.id}
              style={{ ...lvlStyle(level.accent), animationDelay: `${300 + i * 80}ms` }}
              className={`mhp-lvl mhp-anim-rise flex list-none items-center gap-3 rounded-2xl border-2 p-3 ${
                has ? 'border-mf-gold/70 bg-mf-gold/10 shadow-[0_0_24px_-12px_rgba(250,204,21,0.9)]' : 'border-mf-line-soft bg-mf-sunken'
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid size-16 shrink-0 place-items-center rounded-2xl text-4xl ${has ? 'bg-mf-panel ring-2 ring-mf-gold/70' : 'bg-mf-panel-2 opacity-60 grayscale'}`}
              >
                {level.badge.emoji}
              </span>
              <span className="min-w-0">
                <span className={`block font-hero text-base leading-tight font-extrabold ${has ? 'text-mf-text' : 'text-mf-muted'}`}>
                  {level.badge.name[language]}
                </span>
                <span className={`mt-0.5 block text-xs font-bold ${has ? 'text-mf-good-ink' : 'text-mf-faint'}`}>
                  {has ? `✓ ${text.badgeWon}` : text.badgeEarnHint(n(level.id))}
                </span>
                <span className="sr-only">{has ? '' : ` — ${text.badgeLocked}`}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function LevelSelect({ record, suggested, language, text, n, onOpen, headingRef }) {
  return (
    <section aria-labelledby="mhp-levels-heading" className="relative z-10 flex flex-1 flex-col">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="mhp-levels-heading" ref={headingRef} tabIndex={-1} className="m-0 font-hero text-2xl font-extrabold text-mf-text outline-none @xl:text-3xl">
            {text.pickMission}
          </h2>
          <p className="m-0 mt-1 text-sm text-mf-muted @xl:text-base">{text.pickMissionHint}</p>
        </div>
      </div>
      <ol className="m-0 grid grid-cols-1 gap-4 p-0 @2xl:grid-cols-2 @5xl:grid-cols-6 @7xl:grid-cols-5 @7xl:gap-5">
        {LEVELS.map((level, index) => (
          <LevelCard
            key={level.id}
            level={level}
            index={index}
            record={record}
            suggested={level.id === suggested}
            language={language}
            text={text}
            n={n}
            onOpen={onOpen}
          />
        ))}
      </ol>
      <BadgeShelf record={record} language={language} text={text} n={n} />
      <p className="m-0 mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-mf-muted">
        {text.olderKids}
        <Link
          to="/games/math-master"
          className="inline-flex items-center gap-1 font-bold text-mf-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-mf-focus"
        >
          {text.olderKidsLink}
          <ArrowRight size={14} strokeWidth={3} aria-hidden="true" focusable="false" />
        </Link>
      </p>
    </section>
  )
}
