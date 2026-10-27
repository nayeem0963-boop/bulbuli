import { FastForward, FlaskConical, Info, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { playSfx } from '../audio/sfx.js'
import { formatCount } from '../community/gallery.js'
import { APPEAL_PRESETS, contestStandings, hoursLeft } from '../community/simulation.js'
import { MedalChip } from '../profile/StatsOverview.jsx'
import { CARD, CARD_PAD, GemBadge, H2, INSET, StatusTag } from '../profile/ui.jsx'
import { useGameActions } from '../state/GameStateProvider.jsx'

const PLACE = { 1: 'Gold', 2: 'Silver', 3: 'Bronze' }

/** Accessible on/off switch. */
function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-sm font-semibold text-slate-200 focus-visible:outline-none"
    >
      <span className={`relative h-6 w-11 shrink-0 rounded-full ring-1 transition ${checked ? 'bg-fuchsia-500 ring-fuchsia-300/70' : 'bg-slate-700 ring-slate-600'}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left] ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
      {label}
    </button>
  )
}

/** Two-step fast-forward: first click arms, second settles the contest for real. */
function FastForwardButton({ hours, onConfirm }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      type="button"
      onClick={() => {
        if (!armed) return setArmed(true)
        setArmed(false)
        onConfirm()
      }}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300 ${armed ? 'bg-fuchsia-500 text-white shadow-[0_0_18px_rgba(217,70,239,0.5)]' : 'bg-fuchsia-500/15 text-fuchsia-100 ring-1 ring-fuchsia-400/50 hover:bg-fuchsia-500/25'}`}
    >
      <FastForward className="size-4" aria-hidden="true" />
      {armed ? `Confirm: simulate ${hours} h & settle now` : 'Fast-forward contest'}
    </button>
  )
}

/**
 * Dev / Test Mode (only rendered when DEV_TOOLS): simulated community voters + a contest
 * fast-forward, so QA can reach every settlement outcome (gold → 500 gems + Contest Winner,
 * podium, no medal) without waiting a real week or needing other players.
 */
export default function DevPanel({ state }) {
  const { configureSim, fastForwardContest } = useGameActions()
  const { sim, community, player } = state
  const contest = community.contest
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])
  const left = hoursLeft(contest, now)
  const standings = contestStandings(state)
  const mine = standings.filter((s) => s.entry.author === player.handle)
  const shown = standings.slice(0, 5)
  if (mine[0] && mine[0].rank > 5) shown.push(mine[0])
  const last = community.pastContests[0]

  return (
    <section aria-labelledby="dev-title" className={`${CARD} ${CARD_PAD} border-dashed border-fuchsia-500/50`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="dev-title" className={`flex items-center gap-2 ${H2}`}>
          <FlaskConical className="size-5 text-fuchsia-300" aria-hidden="true" /> Dev / Test Mode
          <StatusTag tone="test">Test</StatusTag>
        </h2>
        <p className="text-xs text-slate-400">
          Simulated: <span className="font-semibold tabular-nums text-slate-200">{sim.simulatedHours} h</span> of voting
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className={`${INSET} space-y-3 p-3`}>
            <Switch checked={sim.enabled} onChange={(enabled) => configureSim({ enabled })} label="Simulated voters (live)" />
            <p className="text-xs text-slate-400">While on, every 5 seconds the crowd casts one hour of votes on gallery levels and contest entries.</p>
            <div>
              <p id="appeal-label" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your entries' appeal</p>
              <div role="radiogroup" aria-labelledby="appeal-label" className="mt-1.5 flex gap-1 rounded-lg bg-slate-950/60 p-1 ring-1 ring-slate-700">
                {APPEAL_PRESETS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={sim.appeal === a.id}
                    title={a.hint}
                    onClick={() => configureSim({ appeal: a.id })}
                    className={`flex-1 rounded-md px-2 py-1 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300 ${sim.appeal === a.id ? 'bg-fuchsia-500/30 text-white ring-1 ring-fuchsia-400/60' : 'text-slate-400 hover:text-slate-100'}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">{APPEAL_PRESETS.find((a) => a.id === sim.appeal)?.hint}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <FastForwardButton hours={left} onConfirm={() => {
              fastForwardContest()
              playSfx('victory')
            }} />
            <span className="text-xs text-slate-400">{left} h of voting left in “{contest.theme}”</span>
          </div>

          {last && (
            <div className={`${INSET} p-3`} aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Last settled · {last.theme}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                {last.myRank > 0 && last.myRank <= 3 ? (
                  <>
                    <MedalChip place={last.myRank} /> You placed #{last.myRank}: {PLACE[last.myRank]} medal
                    {last.myRank === 1 && <GemBadge amount={contest.prizeGems ?? 500} signed />}
                  </>
                ) : last.myRank > 0 ? (
                  <>You placed #{last.myRank} of {last.entries}: no medal</>
                ) : (
                  <>You had no entry: no medal</>
                )}
              </p>
              <ol className="mt-2 space-y-0.5 text-xs text-slate-400">
                {last.podium.map((p, i) => (
                  <li key={i} className="flex justify-between gap-2"><span className="truncate">{i + 1}. {p.title} · {p.author}</span><span className="tabular-nums">{formatCount(p.votes)}</span></li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className={`${INSET} p-3`}>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Users className="size-3.5" aria-hidden="true" /> Live standings · {standings.length} entries
          </p>
          {shown.length ? (
            <ol className="mt-2 space-y-1">
              {shown.map(({ entry, rank }) => {
                const own = entry.author === player.handle
                return (
                  <li key={entry.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${own ? 'bg-emerald-400/10 ring-1 ring-emerald-400/50' : ''}`}>
                    <span className="w-6 text-right font-mono text-xs font-bold tabular-nums text-slate-400">#{rank}</span>
                    {rank <= 3 ? <MedalChip place={rank} size="size-5" /> : <span className="size-5" />}
                    <span className={`min-w-0 flex-1 truncate ${own ? 'font-bold text-emerald-100' : 'text-slate-200'}`}>{entry.title}</span>
                    {own && <StatusTag tone="equipped">You</StatusTag>}
                    <span className="font-semibold tabular-nums text-slate-300">{formatCount(entry.votes)}</span>
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No entries yet this week.</p>
          )}
          {!mine.length && <p className="mt-2 text-xs text-amber-200/90">Enter a level from the Play &amp; Vote contest banner to compete.</p>}
        </div>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Simulated votes only change vote and play counts. They never pay gems or change your own upvotes. Hidden in production unless opened with ?devtools=1.
      </p>
    </section>
  )
}
