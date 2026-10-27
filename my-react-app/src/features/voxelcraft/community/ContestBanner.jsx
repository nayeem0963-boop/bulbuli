import { CircleAlert, FlaskConical, Gem, Hammer, Send, Sparkles, Trophy, Zap } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { playSfx } from '../audio/sfx.js'
import { useLevel } from '../level/LevelEditorProvider.jsx'
import { validateLevel } from '../level/levelSchema.js'
import { communityIdFor } from '../state/gameReducer.js'
import { DEV_TOOLS } from '../dev/devMode.js'
import { useGameActions, useGameState } from '../state/GameStateProvider.jsx'
import { countdownParts } from './gallery.js'

const pad = (n) => String(n).padStart(2, '0')

/** Ticking countdown. Only this small component re-renders every second. */
function Countdown({ endsAt, onEnded }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const c = countdownParts(endsAt - now)
  // The moment the week's contest ends (with the page open), settle it: rank entries, award medals.
  useEffect(() => {
    if (c.ended) onEnded?.()
  }, [c.ended, onEnded])
  if (c.ended) return <p className="font-display text-xl font-bold text-amber-300">Voting closed: judging now</p>

  const units = [
    ['days', c.days],
    ['hrs', c.hours],
    ['min', c.minutes],
    ['sec', c.seconds],
  ]
  return (
    <div>
      <p className="sr-only">
        Contest ends in {c.days} days, {c.hours} hours and {c.minutes} minutes
      </p>
      <div className="flex gap-1.5" aria-hidden="true">
        {units.map(([label, v]) => (
          <div key={label} className="w-14 rounded-lg bg-slate-950/60 py-1.5 text-center ring-1 ring-white/10">
            <div className="font-mono text-xl font-bold tabular-nums text-white">{label === 'days' ? v : pad(v)}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Inline panel: enter (or update) the level currently in the Studio. */
function SubmitPanel({ id, entered, onDone }) {
  const { level } = useLevel()
  const { submitContestEntry, setTab } = useGameActions()
  const errors = validateLevel(level)

  return (
    <div id={id} className="mt-4 rounded-xl bg-slate-950/70 p-4 ring-1 ring-white/10">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">From your Studio</p>
      <p className="mt-1 font-display text-lg font-bold text-white">{level.title || 'Untitled level'}</p>
      <p className="text-xs text-slate-400">{level.blocks.length} blocks</p>
      {errors.length ? (
        <>
          <ul className="mt-2 space-y-1">
            {errors.map((e) => (
              <li key={e} className="flex gap-1.5 text-sm text-amber-200">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" /> {e}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setTab('build')}
            className="mt-3 flex items-center gap-1.5 rounded-lg bg-indigo-500/20 px-3 py-2 text-sm font-semibold text-indigo-100 ring-1 ring-indigo-400/50 hover:bg-indigo-500/30"
          >
            <Hammer className="size-4" aria-hidden="true" /> Fix it in Build Studio
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            submitContestEntry(level)
            playSfx('submit')
            onDone()
          }}
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-indigo-500 px-4 py-2 font-display font-bold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Send className="size-4" aria-hidden="true" /> {entered ? 'Update my entry' : 'Enter the contest'}
        </button>
      )}
    </div>
  )
}

export default function ContestBanner({ contest, entryCount, myEntryIds, onShowEntries }) {
  const { settleContest } = useGameActions()
  const { sim } = useGameState()
  const simulating = DEV_TOOLS && sim.enabled
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const { level } = useLevel()
  const entered = myEntryIds.includes(communityIdFor(level))

  return (
    <section
      aria-labelledby="contest-title"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/40 via-purple-700/30 to-emerald-600/25 p-5 ring-1 ring-indigo-400/40 sm:p-6"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-purple-500/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-emerald-400/15 blur-3xl" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            <Sparkles className="size-3.5" aria-hidden="true" /> Weekly contest · live
            {simulating && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-fuchsia-500/20 px-2 py-0.5 text-[10px] tracking-wider text-fuchsia-100 ring-1 ring-fuchsia-400/60">
                <FlaskConical className="size-3" aria-hidden="true" /> Simulated voting
              </span>
            )}
          </p>
          <h2 id="contest-title" className="mt-2 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
            {contest.theme}
          </h2>
          <p className="mt-1 text-slate-200/90">{contest.blurb}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="flex items-center gap-1.5 rounded-full bg-purple-500/25 px-3 py-1 font-semibold text-purple-100 ring-1 ring-purple-300/40">
              <Trophy className="size-4 text-amber-300" aria-hidden="true" /> Prize:
              <Gem className="size-4 text-purple-200" aria-hidden="true" /> {contest.prizeGems} UGC Gems
            </span>
            <button
              type="button"
              onClick={onShowEntries}
              className="rounded-full bg-slate-950/40 px-3 py-1 font-semibold text-slate-200 ring-1 ring-white/10 hover:bg-slate-950/60"
            >
              {entryCount} {entryCount === 1 ? 'entry' : 'entries'} so far
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">Ends in</p>
          <Countdown endsAt={contest.endsAt} onEnded={settleContest} />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 font-display font-bold text-slate-900 shadow-[0_0_24px_rgba(255,255,255,0.25)] transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <Zap className="size-4 text-indigo-600" aria-hidden="true" />
            {entered ? 'Update my entry' : 'Submit your level'}
          </button>
        </div>
      </div>

      {open && <SubmitPanel id={panelId} entered={entered} onDone={() => setOpen(false)} />}
    </section>
  )
}
