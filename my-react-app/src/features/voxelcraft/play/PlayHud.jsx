import { CornerDownLeft, Flag, LogOut, RotateCcw, Timer, Trophy } from 'lucide-react'
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { formatStopwatch } from './playStore.js'

const CONFETTI_COLORS = ['#818cf8', '#a855f7', '#34d399', '#fbbf24', '#f472b6', '#22d3ee']

/** Stopwatch text written straight to the DOM every animation frame: no React renders. */
function Stopwatch({ store, className }) {
  const el = useRef(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (el.current) el.current.textContent = formatStopwatch(store.elapsed())
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [store])
  return <span ref={el} className={className}>00:00.00</span>
}

/** Full-screen flash on death: red for lava, violet for the void. Re-keyed per death to replay. */
function DeathFlash({ flash }) {
  if (!flash) return null
  const lava = flash.cause === 'lava'
  return (
    <div key={flash.id} className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      <div className={`vc-flash absolute inset-0 ${lava ? 'bg-red-600' : 'bg-violet-900'}`} />
      <p className={`vc-flash-text absolute inset-x-0 top-1/3 text-center font-display text-3xl font-bold drop-shadow-lg ${lava ? 'text-orange-200' : 'text-violet-200'}`}>
        {lava ? 'Burned! Back to spawn' : 'Fell into the void'}
      </p>
    </div>
  )
}

function DomConfetti() {
  // Fixed random layout per mount (pure CSS animation afterwards).
  const pieces = useMemo(
    () => Array.from({ length: 70 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      dur: 2.2 + Math.random() * 1.6,
      drift: (Math.random() - 0.5) * 160,
      spin: (Math.random() - 0.5) * 1080,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      w: 6 + Math.random() * 6,
    })),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="vc-confetti absolute -top-4 block h-2.5 rounded-[2px]"
          style={{
            left: `${p.left}%`,
            width: p.w,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            '--drift': `${p.drift}px`,
            '--spin': `${p.spin}deg`,
          }}
        />
      ))}
    </div>
  )
}

function VictoryModal({ state, onRestart, onExit }) {
  const primary = useRef(null)
  useEffect(() => primary.current?.focus(), [])

  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
      <DomConfetti />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="victory-title"
        className="vc-pop relative w-full max-w-sm rounded-2xl bg-slate-900/95 p-6 text-center shadow-[0_0_60px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/50"
      >
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_0_30px_rgba(251,191,36,0.6)]">
          <Trophy className="size-8 text-amber-950" aria-hidden="true" />
        </div>
        <h2 id="victory-title" className="mt-4 font-display text-3xl font-bold text-white">Level complete!</h2>
        <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-amber-300">{formatStopwatch(state.finalMs)}</p>
        {state.newBest ? (
          <p className="mt-1 text-sm font-semibold text-emerald-300">New best time!</p>
        ) : (
          state.bestMs != null && <p className="mt-1 text-sm text-slate-400">Best {formatStopwatch(state.bestMs)}</p>
        )}
        <p className="mt-3 text-sm text-slate-400">
          {state.respawns === 0 ? 'Flawless: no respawns' : `${state.respawns} respawn${state.respawns === 1 ? '' : 's'}`}
        </p>
        <div className="mt-6 flex gap-2">
          <button
            ref={primary}
            type="button"
            onClick={onRestart}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2.5 font-display font-bold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <RotateCcw className="size-4" aria-hidden="true" /> Play again
          </button>
          <button
            type="button"
            onClick={onExit}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 font-display font-bold text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <LogOut className="size-4" aria-hidden="true" /> Studio
          </button>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-slate-500">
          <CornerDownLeft className="size-3" aria-hidden="true" /> Enter / R to replay · Esc for Studio
        </p>
      </div>
    </div>
  )
}

/**
 * Play-mode HUD over the canvas: speedrun stopwatch, respawn counter, exit button, start hint,
 * death flash and the victory modal. Esc exits to the Studio, R restarts the run.
 */
export default function PlayHud({ store, hasFinish, onExit }) {
  const state = useSyncExternalStore(store.subscribe, store.get)

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Escape') onExit()
      else if (e.code === 'KeyR' || (e.key === 'Enter' && store.get().status === 'won')) {
        e.preventDefault()
        store.restart()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store, onExit])

  return (
    <>
      <DeathFlash flash={state.flash} />

      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-slate-950/75 px-3 py-2 ring-1 ring-slate-700/70 backdrop-blur" role="timer" aria-label="Run time">
            <Timer className={`size-5 ${state.status === 'running' ? 'text-emerald-400' : 'text-slate-500'}`} aria-hidden="true" />
            <Stopwatch store={store} className="font-mono text-2xl font-bold tabular-nums text-white" />
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-950/75 px-3 py-2.5 text-sm ring-1 ring-slate-700/70 backdrop-blur" aria-live="polite">
            <RotateCcw className="size-4 text-rose-300" aria-hidden="true" />
            <span className="font-semibold tabular-nums text-white">{state.respawns}</span>
            <span className="text-slate-400">respawn{state.respawns === 1 ? '' : 's'}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="pointer-events-auto flex items-center gap-1.5 rounded-xl bg-slate-950/75 px-3 py-2.5 text-sm font-semibold text-slate-200 ring-1 ring-slate-700/70 backdrop-blur transition hover:bg-indigo-500/25 hover:ring-indigo-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <LogOut className="size-4" aria-hidden="true" /> Exit to Studio
          <kbd className="ml-1 rounded bg-slate-800 px-1 font-sans text-[10px] text-slate-400">Esc</kbd>
        </button>
      </div>

      {state.status === 'ready' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center px-3">
          <p className="rounded-xl bg-slate-950/80 px-4 py-2.5 text-center text-sm text-slate-300 ring-1 ring-indigo-400/40 backdrop-blur">
            <span className="font-semibold text-white">WASD / arrows</span> move · <span className="font-semibold text-white">Space</span> jump ·{' '}
            <span className="font-semibold text-white">drag</span> to look · <span className="font-semibold text-white">R</span> restart
            <span className="block text-xs text-slate-400">The timer starts when you move.</span>
          </p>
        </div>
      )}

      {!hasFinish && state.status !== 'won' && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center">
          <p className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/40">
            <Flag className="size-3.5" aria-hidden="true" /> No Finish ring yet: free-roam test
          </p>
        </div>
      )}

      {state.status === 'won' && <VictoryModal state={state} onRestart={store.restart} onExit={onExit} />}
    </>
  )
}
