import { Hammer, Play } from 'lucide-react'

/** Build ⇄ Play switch at the top centre of the viewport. Play needs a Spawn block. */
export default function ModeToggle({ mode, canPlay, onChange }) {
  const base =
    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400'
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
      <div role="radiogroup" aria-label="Studio mode" className="pointer-events-auto flex gap-1 rounded-xl bg-slate-950/80 p-1 ring-1 ring-slate-700/80 backdrop-blur">
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'build'}
          onClick={() => onChange('build')}
          className={`${base} ${mode === 'build' ? 'bg-indigo-500/25 text-white ring-1 ring-indigo-400/60' : 'text-slate-400 hover:text-slate-100'}`}
        >
          <Hammer className="size-4" aria-hidden="true" /> Build
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'play'}
          disabled={!canPlay}
          onClick={() => onChange('play')}
          title={canPlay ? 'Test your level (P)' : 'Place a Spawn block first'}
          className={`${base} ${mode === 'play' ? 'bg-emerald-500/25 text-white ring-1 ring-emerald-400/60' : 'text-slate-400 hover:text-slate-100'} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <Play className="size-4" aria-hidden="true" /> Play
        </button>
      </div>
    </div>
  )
}
