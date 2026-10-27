import { Camera, Check, CircleAlert, Crop, Gem, ImageOff, Medal, RefreshCw, Rocket, Trophy, X, Zap } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { playSfx } from '../../audio/sfx.js'
import { DESCRIPTION_MAX, DIFFICULTIES } from '../../community/creatorStorage.js'
import { REWARDS } from '../../data/mockData.js'
import { BLOCK } from '../../level/blockTypes.js'
import { useEditorActions, useLevel } from '../../level/LevelEditorProvider.jsx'
import { TITLE_MAX, cellKey } from '../../level/levelSchema.js'
import { FIRST_CREATOR_BADGE, communityIdFor, isContestOpen } from '../../state/gameReducer.js'
import { useGameActions, useGameState } from '../../state/GameStateProvider.jsx'

const DIFFICULTY_STYLE = {
  Easy: 'peer-checked:bg-emerald-500/25 peer-checked:text-emerald-100 peer-checked:ring-emerald-400/70',
  Medium: 'peer-checked:bg-amber-500/25 peer-checked:text-amber-100 peer-checked:ring-amber-400/70',
  Hard: 'peer-checked:bg-red-500/25 peer-checked:text-red-100 peer-checked:ring-red-400/70',
}

/** Requirement checklist shown in the modal; publishing is locked until every item passes. */
function useChecks(level, title) {
  return useMemo(() => {
    const spawn = level.blocks.some((b) => b.type === BLOCK.SPAWN)
    const finish = level.blocks.some((b) => b.type === BLOCK.FINISH)
    const apart = !(level.spawnPoint && level.finishGate &&
      cellKey(level.spawnPoint.x, level.spawnPoint.y, level.spawnPoint.z) === cellKey(level.finishGate.x, level.finishGate.y, level.finishGate.z))
    return [
      { id: 'spawn', ok: spawn, label: 'At least 1 Spawn point', fix: 'Place a Spawn block (key 4)' },
      { id: 'finish', ok: finish, label: 'At least 1 Finish gate', fix: 'Place a Finish ring (key 5)' },
      { id: 'apart', ok: apart, label: 'Spawn and Finish in different spots', fix: 'Move one of them' },
      { id: 'title', ok: title.trim().length > 0, label: 'A level title', fix: 'Type a title above' },
    ]
  }, [level, title])
}

/** Keeps Tab focus inside the dialog. */
function trapFocus(e, root) {
  if (e.key !== 'Tab' || !root) return
  const items = [...root.querySelectorAll('button, input, textarea, [href], [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && el.offsetParent !== null)
  if (!items.length) return
  const first = items[0]
  const last = items.at(-1)
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}

function SuccessView({ result, onViewCommunity, onClose }) {
  const done = useRef(null)
  useEffect(() => done.current?.focus(), [])
  return (
    <div className="p-6 text-center">
      <div className="vc-pop mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-indigo-500 shadow-[0_0_40px_rgba(52,211,153,0.5)]">
        <Rocket className="size-8 text-white" aria-hidden="true" />
      </div>
      <h2 id="publish-title" className="mt-4 font-display text-2xl font-bold text-white">
        {result.update ? 'Level updated!' : 'Level published!'}
      </h2>
      <p className="mt-1 text-sm text-slate-300">
        <span className="font-semibold text-white">“{result.title}”</span> is live in the Community Gallery
        {result.contest ? ' and entered in the weekly contest.' : '.'}
      </p>

      {result.firstEver && (
        <div className="vc-pop mt-5 flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-400/20 via-purple-500/20 to-indigo-500/20 p-3 text-left ring-1 ring-amber-300/50" style={{ animationDelay: '120ms' }}>
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_0_24px_rgba(251,191,36,0.55)]">
            <Medal className="size-7 text-amber-950" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200">Badge unlocked</p>
            <p className="font-display text-lg font-bold text-white">{FIRST_CREATOR_BADGE}</p>
            <p className="flex items-center gap-1 text-sm font-semibold text-emerald-300">
              <Zap className="size-3.5" aria-hidden="true" /> +{REWARDS.firstCreator.xp} XP bonus
            </p>
          </div>
        </div>
      )}
      {result.firstOfLevel && (
        <p className="mt-3 flex items-center justify-center gap-3 text-sm font-semibold">
          <span className="flex items-center gap-1 text-emerald-300"><Zap className="size-3.5" aria-hidden="true" />+{REWARDS.publishBuild.xp} XP</span>
          <span className="flex items-center gap-1 text-purple-200"><Gem className="size-3.5" aria-hidden="true" />+{REWARDS.publishBuild.gems} gems</span>
        </p>
      )}

      <div className="mt-6 flex gap-2">
        <button
          ref={done}
          type="button"
          onClick={onViewCommunity}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2.5 font-display font-bold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Trophy className="size-4" aria-hidden="true" /> View in Community
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl bg-slate-800 px-4 py-2.5 font-display font-bold text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          Keep building
        </button>
      </div>
    </div>
  )
}

/**
 * "Publish Level" modal. Stays mounted (hidden) while the player frames a thumbnail, so the
 * form keeps what they typed.
 *   thumbnail: data URL or null · onRetake(): capture current view · onFrame(): enter framing mode
 */
export default function PublishModal({ hidden, thumbnail, onRetake, onFrame, onClose }) {
  const { level } = useLevel()
  const { rename } = useEditorActions()
  const { community, player, studio } = useGameState()
  const { publishBuild, setTab } = useGameActions()

  const existing = community.levels.find((l) => l.id === communityIdFor(level))
  const contestOpen = isContestOpen(community.contest)
  const [title, setTitle] = useState(level.title)
  const [description, setDescription] = useState(existing?.description ?? '')
  const [difficulty, setDifficulty] = useState(existing?.difficulty ?? 'Medium')
  // Contest entry is opt-in: off for a new level, the current status for a re-publish.
  const [contest, setContest] = useState(existing ? existing.contestId === community.contest.id : false)
  const [result, setResult] = useState(null)

  const checks = useChecks(level, title)
  const ready = checks.every((c) => c.ok)
  const root = useRef(null)
  const firstField = useRef(null)
  const ids = { title: useId(), desc: useId(), descCount: useId(), contest: useId() }

  // Focus the title on open; give focus back to whatever opened the modal on close.
  useEffect(() => {
    const opener = document.activeElement
    firstField.current?.focus()
    firstField.current?.select()
    return () => opener?.focus?.()
  }, [])
  useEffect(() => {
    if (hidden) return
    if (root.current && !root.current.contains(document.activeElement)) firstField.current?.focus() // back from framing
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else trapFocus(e, root.current)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hidden, onClose])

  const publish = (e) => {
    e.preventDefault()
    if (!ready) return
    const cleanTitle = title.trim().slice(0, TITLE_MAX)
    const outcome = {
      title: cleanTitle,
      update: Boolean(existing),
      contest: contest && contestOpen,
      firstEver: !player.badges.includes(FIRST_CREATOR_BADGE),
      firstOfLevel: !studio.publishedIds.includes(level.id),
    }
    rename(cleanTitle)
    publishBuild({ ...level, title: cleanTitle }, { description: description.trim(), difficulty, contest: outcome.contest, thumbnail })
    playSfx(outcome.firstEver ? 'victory' : 'submit')
    setResult(outcome)
  }

  return (
    <div hidden={hidden} className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={root} role="dialog" aria-modal="true" aria-labelledby="publish-title" className="vc-pop relative w-full max-w-2xl rounded-2xl bg-slate-900 shadow-2xl ring-1 ring-slate-700">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white">
          <X className="size-5" aria-hidden="true" />
        </button>

        {result ? (
          <SuccessView
            result={result}
            onClose={onClose}
            onViewCommunity={() => {
              onClose()
              setTab('play')
            }}
          />
        ) : (
          <form onSubmit={publish} className="p-5 sm:p-6" noValidate>
            <h2 id="publish-title" className="font-display text-2xl font-bold text-white">{existing ? 'Update your level' : 'Publish level'}</h2>
            <p className="text-sm text-slate-400">Share it in the Community Gallery for everyone to play and vote on.</p>

            <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_15rem]">
              <div className="space-y-4">
                <div>
                  <label htmlFor={ids.title} className="text-xs font-semibold uppercase tracking-wider text-slate-400">Level title</label>
                  <input
                    ref={firstField}
                    id={ids.title}
                    value={title}
                    maxLength={TITLE_MAX}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    aria-invalid={!title.trim()}
                    className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 font-display text-lg font-bold text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 aria-[invalid=true]:ring-rose-500/70"
                  />
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor={ids.desc} className="text-xs font-semibold uppercase tracking-wider text-slate-400">Description</label>
                    <span id={ids.descCount} className="text-[11px] tabular-nums text-slate-500">{description.length}/{DESCRIPTION_MAX}</span>
                  </div>
                  <textarea
                    id={ids.desc}
                    value={description}
                    maxLength={DESCRIPTION_MAX}
                    rows={3}
                    onChange={(e) => setDescription(e.target.value)}
                    aria-describedby={ids.descCount}
                    placeholder="What makes your level fun? Any tricks or shortcuts?"
                    className="mt-1 w-full resize-none rounded-lg bg-slate-800 px-3 py-2 text-sm text-white ring-1 ring-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <fieldset>
                  <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400">Difficulty</legend>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    {DIFFICULTIES.map((d) => (
                      <label key={d} className="cursor-pointer">
                        <input type="radio" name="difficulty" value={d} checked={difficulty === d} onChange={() => setDifficulty(d)} className="peer sr-only" />
                        <span className={`block rounded-lg bg-slate-800 py-2 text-center text-sm font-semibold text-slate-300 ring-1 ring-slate-700 transition hover:bg-slate-700 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400 ${DIFFICULTY_STYLE[d]}`}>
                          {d}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-800/60 p-3 ring-1 ring-slate-700">
                  <div>
                    <p id={ids.contest} className="flex items-center gap-1.5 text-sm font-semibold text-white">
                      <Trophy className="size-4 text-amber-300" aria-hidden="true" /> Enter “{community.contest.theme}”
                    </p>
                    <p className="text-xs text-slate-400">
                      {contestOpen ? `Prize: ${community.contest.prizeGems} UGC Gems for the top-voted entry` : 'This week’s contest has closed.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={contest && contestOpen}
                    aria-labelledby={ids.contest}
                    disabled={!contestOpen}
                    onClick={() => setContest((c) => !c)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-40 ${contest && contestOpen ? 'bg-emerald-500' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${contest && contestOpen ? 'left-6' : 'left-1'}`} />
                    <span className="sr-only">{contest && contestOpen ? 'Yes' : 'No'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Thumbnail</p>
                  <div className="mt-1 aspect-[4/3] overflow-hidden rounded-lg bg-slate-950 ring-1 ring-slate-700">
                    {thumbnail ? (
                      <img src={thumbnail} alt="Thumbnail snapshot of your level from the current camera view" className="size-full object-cover" />
                    ) : (
                      <div className="grid size-full place-items-center p-3 text-center text-xs text-slate-500">
                        <span><ImageOff className="mx-auto mb-1 size-5" aria-hidden="true" />No snapshot: the gallery will draw one from your blocks.</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={onRetake} className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-2 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700">
                      <RefreshCw className="size-3.5" aria-hidden="true" /> Retake
                    </button>
                    <button type="button" onClick={onFrame} className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-2 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700">
                      <Crop className="size-3.5" aria-hidden="true" /> Frame shot
                    </button>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500"><Camera className="size-3" aria-hidden="true" /> Snapshot of your current 3D camera view</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Checklist</p>
                  <ul className="mt-1.5 space-y-1.5" aria-label="Publishing requirements">
                    {checks.map((c) => (
                      <li key={c.id} className={`flex gap-1.5 text-sm ${c.ok ? 'text-emerald-300' : 'text-amber-200'}`}>
                        {c.ok ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />}
                        <span>
                          {c.label}
                          <span className="sr-only">{c.ok ? ': done' : ': missing'}</span>
                          {!c.ok && <span className="block text-xs text-slate-400">{c.fix}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800">Cancel</button>
              <button
                type="submit"
                disabled={!ready}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 px-5 py-2.5 font-display font-bold text-white shadow-[0_0_24px_rgba(129,140,248,0.45)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                <Rocket className="size-5" aria-hidden="true" /> {existing ? 'Update level' : 'Publish level'}
              </button>
            </div>
            {!ready && <p className="mt-2 text-right text-xs text-amber-200/90" role="status">Finish the checklist to publish.</p>}
          </form>
        )}
      </div>
    </div>
  )
}
