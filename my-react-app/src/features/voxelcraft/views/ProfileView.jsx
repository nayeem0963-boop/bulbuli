import { ArrowBigUp, Eye, HardDrive, Hammer, RotateCcw, Timer, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { playSfx } from '../audio/sfx.js'
import { formatCount, timeAgo } from '../community/gallery.js'
import { mockStarterLevel } from '../data/mockData.js'
import { useEditorActions } from '../level/LevelEditorProvider.jsx'
import { parseLevel } from '../level/levelSchema.js'
import { formatStopwatch } from '../play/playStore.js'
import { ownLevels } from '../profile/achievements.js'
import AvatarCustomizer from '../profile/AvatarCustomizer.jsx'
import BadgeGallery from '../profile/BadgeGallery.jsx'
import { effectiveLook } from '../profile/cosmetics.js'
import StatsOverview, { MedalChip } from '../profile/StatsOverview.jsx'
import { CARD, CARD_PAD, H2, StatusTag } from '../profile/ui.jsx'
import DevPanel from '../dev/DevPanel.jsx'
import { DEV_TOOLS } from '../dev/devMode.js'
import { useGameActions, useGameState } from '../state/GameStateProvider.jsx'

/** Your published levels: stats, best time, and "Edit in Studio" for ones built here. */
function MyLevels({ state }) {
  const { loadLevel } = useEditorActions()
  const { setTab } = useGameActions()
  const levels = ownLevels(state)
  return (
    <section aria-labelledby="my-levels-title" className={`${CARD} ${CARD_PAD}`}>
      <h2 id="my-levels-title" className={H2}>My levels</h2>
      {levels.length ? (
        <ul className="mt-3 divide-y divide-slate-700/70">
          {levels.map((l) => {
            const best = state.player.beaten[l.level.id]
            const editable = l.id.startsWith('ugc_')
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{l.title}</p>
                  <p className="text-xs text-slate-500">
                    {timeAgo(l.createdAt)}
                    {l.contestId === state.community.contest.id && <StatusTag tone="badge" className="ml-2 align-middle">Contest entry</StatusTag>}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-sm tabular-nums text-slate-300" title="Upvotes"><ArrowBigUp className="size-4 text-indigo-300" aria-hidden="true" />{formatCount(l.votes)}</span>
                <span className="flex items-center gap-1 text-sm tabular-nums text-slate-300" title="Plays"><Eye className="size-4 text-slate-500" aria-hidden="true" />{formatCount(l.plays)}</span>
                <span className="flex items-center gap-1 text-sm tabular-nums text-slate-300" title="Your best time"><Timer className="size-4 text-emerald-300" aria-hidden="true" />{best ? formatStopwatch(best) : '—'}</span>
                {editable && (
                  <button
                    type="button"
                    onClick={() => {
                      loadLevel(l.level)
                      setTab('build')
                    }}
                    className="flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-100 hover:bg-slate-700"
                  >
                    <Hammer className="size-3.5" aria-hidden="true" /> Edit in Studio
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-400">Publish a level from the Build Studio and it shows up here.</p>
      )}
    </section>
  )
}

function ContestHistory({ medals }) {
  if (!medals.length) return null
  return (
    <section aria-labelledby="medals-title" className={`${CARD} ${CARD_PAD}`}>
      <h2 id="medals-title" className={`flex items-center gap-2 ${H2}`}>
        <Trophy className="size-5 text-amber-300" aria-hidden="true" /> Contest medals
      </h2>
      <ul className="mt-3 space-y-2.5">
        {medals.map((m) => (
          <li key={m.contestId} className="flex items-center gap-3 text-sm">
            <MedalChip place={m.place} size="size-8" />
            <div className="min-w-0">
              <p className="font-semibold text-white">{m.theme}</p>
              <p className="text-xs text-slate-400">with “{m.levelTitle}” · {new Date(m.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Local save status + a guarded "start over". */
function SaveCard() {
  const { resetProgress } = useGameActions()
  const { loadLevel } = useEditorActions()
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <section className={`${CARD} flex flex-wrap items-center gap-3 p-4`}>
      <HardDrive className="size-5 text-emerald-300" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm text-slate-300">
        Progress, gems, unlocks and your levels are <span className="font-semibold text-white">saved on this device</span>.
      </p>
      <button
        type="button"
        onClick={() => {
          if (!armed) return setArmed(true)
          setArmed(false)
          resetProgress()
          loadLevel(parseLevel(mockStarterLevel).level)
          playSfx('clear')
        }}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${armed ? 'bg-rose-500 text-white shadow-[0_0_16px_rgba(244,63,94,0.5)]' : 'border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
      >
        <RotateCcw className="size-3.5" aria-hidden="true" /> {armed ? 'Really erase everything?' : 'Reset progress'}
      </button>
    </section>
  )
}

/** "My Profile" tab: Profile & Creator Shop. */
export default function ProfileView() {
  const state = useGameState()
  const { player } = state
  const look = useMemo(() => effectiveLook(state), [state])

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
      <header className="flex items-center gap-3 sm:gap-4">
        <div
          className="grid size-14 shrink-0 place-items-center rounded-2xl font-display text-xl sm:size-16 sm:text-2xl font-bold text-white shadow-[0_0_24px_rgba(129,140,248,0.45)] ring-2 ring-white/10"
          style={{ background: `linear-gradient(135deg, ${look.skin.color}, ${look.shirt.color})` }}
          aria-hidden="true"
        >
          {player.handle.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300 sm:text-xs">Profile &amp; Creator Shop</p>
          <h1 className="truncate font-display text-2xl font-bold text-white sm:text-3xl">{player.handle}</h1>
        </div>
      </header>

      <StatsOverview state={state} />
      <AvatarCustomizer state={state} />
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <BadgeGallery state={state} />
        <div className="space-y-4 sm:space-y-5">
          <ContestHistory medals={player.medals} />
          <MyLevels state={state} />
        </div>
      </div>
      {DEV_TOOLS && <DevPanel state={state} />}
      <SaveCard />
    </div>
  )
}
