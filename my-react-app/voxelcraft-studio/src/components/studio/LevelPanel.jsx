import { CircleAlert, CircleCheck, ClipboardCopy, FilePlus, Gem, Play, Rocket, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { REWARDS } from '../../data/mockData.js'
import { BLOCK_TYPE_LIST } from '../../level/blockTypes.js'
import { useEditorActions, useLevel } from '../../level/LevelEditorProvider.jsx'
import { countByType } from '../../level/levelOps.js'
import { MAX_BLOCKS, TITLE_MAX, validateLevel } from '../../level/levelSchema.js'
import { useGameState } from '../../state/GameStateProvider.jsx'

const DOT = {
  PLATFORM: 'bg-slate-400',
  BOUNCE: 'bg-green-400',
  LAVA: 'bg-red-500',
  SPAWN: 'bg-blue-500',
  FINISH: 'bg-amber-400',
}

const PLAY_CONTROLS = [
  ['WASD / arrows', 'move (camera-relative)'],
  ['Space', 'jump (hold = higher)'],
  ['Drag · Scroll', 'look around · zoom'],
  ['Bounce block', 'launches you up'],
  ['Lava · falling', 'back to spawn'],
  ['R · Esc', 'restart · exit to Studio'],
]

const CONTROLS = [
  ['P', 'play test your level'],
  ['Click', 'place block'],
  ['Shift+click / right-click', 'delete block'],
  ['Drag', 'rotate view'],
  ['Right-drag', 'pan'],
  ['Scroll', 'zoom'],
  ['1–5 · E · M', 'blocks · erase · mute'],
  ['Ctrl+Z / Ctrl+Shift+Z', 'undo / redo'],
]

/** "New level" with a confirm step: the current level is replaced (it stays in the gallery if published). */
function NewLevelButton({ disabled, published }) {
  const { newLevel } = useEditorActions()
  const { player } = useGameState()
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!armed) return setArmed(true)
        setArmed(false)
        newLevel(player.handle)
      }}
      title={published ? 'Start a fresh level (this one stays in the gallery)' : 'Start a fresh level (this one isn’t published yet)'}
      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition disabled:opacity-40 ${armed ? 'bg-amber-500/25 text-amber-100 ring-1 ring-amber-400/60' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
    >
      <FilePlus className="size-3.5" aria-hidden="true" /> {armed ? (published ? 'Start new?' : 'Discard & start new?') : 'New level'}
    </button>
  )
}

export default function LevelPanel({ playing = false, onPlay, onPublish }) {
  const { level } = useLevel()
  const { rename } = useEditorActions()
  const { studio } = useGameState()
  const published = studio.publishedIds.includes(level.id)
  const [copied, setCopied] = useState(false)

  const counts = useMemo(() => countByType(level.blocks), [level.blocks])
  const errors = useMemo(() => validateLevel(level), [level])

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(level, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      console.info('[voxelcraft] level JSON:', level) // clipboard blocked: fall back to console
    }
  }

  return (
    <aside className="flex shrink-0 flex-col gap-4 lg:w-72 lg:overflow-y-auto">
      <div className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
        <label htmlFor="level-title" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Level title
        </label>
        <input
          id="level-title"
          value={level.title}
          maxLength={TITLE_MAX}
          onChange={(e) => rename(e.target.value)}
          className="mt-1 w-full rounded-lg bg-slate-800/70 px-2.5 py-1.5 font-display text-lg font-bold text-white ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-400"
        />
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">by {level.author}</p>
          <NewLevelButton disabled={playing} published={published} />
        </div>

        <ul className="mt-4 space-y-1.5 text-sm">
          {BLOCK_TYPE_LIST.map((def) => (
            <li key={def.id} className="flex items-center gap-2 text-slate-300">
              <span className={`size-2.5 rounded-sm ${DOT[def.id]}`} aria-hidden="true" />
              <span className="flex-1">{def.label}</span>
              <span className="tabular-nums text-slate-400">{counts[def.id]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-slate-800 pt-2 text-xs tabular-nums text-slate-500">
          {level.blocks.length} / {MAX_BLOCKS} blocks
        </p>
      </div>

      <div className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ready to publish?</p>
        {errors.length ? (
          <ul className="mt-2 space-y-1.5">
            {errors.map((err) => (
              <li key={err} className="flex gap-2 text-sm text-amber-200">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" /> {err}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 flex items-center gap-2 text-sm text-emerald-300">
            <CircleCheck className="size-4" aria-hidden="true" /> Spawn and finish placed. Good to go!
          </p>
        )}

        <button
          type="button"
          onClick={onPlay}
          disabled={playing || !level.spawnPoint}
          title={level.spawnPoint ? 'Play test (P)' : 'Place a Spawn block first'}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-2 font-display font-bold text-emerald-200 ring-1 ring-emerald-400/50 transition hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play className="size-4" aria-hidden="true" /> {playing ? 'Playing…' : 'Play test'}
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={playing}
          title={errors.length ? 'Opens the publish checklist' : undefined}
          className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 px-4 py-2.5 font-display text-base font-bold text-white shadow-[0_0_24px_rgba(129,140,248,0.45)] transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:scale-100"
        >
          <Rocket className="size-5 transition group-enabled:group-hover:-translate-y-0.5" aria-hidden="true" />
          {published ? 'Update listing…' : 'Publish…'}
          {!published && (
            <span className="ml-1 flex items-center gap-1 rounded-md bg-slate-950/30 px-1.5 py-0.5 text-xs font-semibold">
              <Zap className="size-3" aria-hidden="true" />+{REWARDS.publishBuild.xp}
              <Gem className="ml-1 size-3" aria-hidden="true" />+{REWARDS.publishBuild.gems}
            </span>
          )}
        </button>
        <p className="mt-1.5 text-center text-[11px] text-slate-500">Publishing shares it in Play &amp; Vote.</p>
        <button
          type="button"
          onClick={copyJson}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
        >
          <ClipboardCopy className="size-3.5" aria-hidden="true" />
          {copied ? 'Copied level JSON' : 'Copy level JSON'}
        </button>
      </div>

      <div className="hidden rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800 sm:block">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{playing ? 'Play controls' : 'Controls'}</p>
        <dl className="mt-2 space-y-1 text-xs">
          {(playing ? PLAY_CONTROLS : CONTROLS).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="font-semibold text-slate-200">{k}</dt>
              <dd className="text-right text-slate-400">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  )
}
