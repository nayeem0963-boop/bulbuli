import { Canvas } from '@react-three/fiber'
import { ArrowBigUp, Gem } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePortalRoot } from '../components/portalRoot.js'
import ResponsiveRenderer from '../components/viewport/ResponsiveRenderer.jsx'
import SceneLighting from '../components/viewport/SceneLighting.jsx'
import { CAMERA, COLORS } from '../components/viewport/sceneConfig.js'
import PlayHud from '../play/PlayHud.jsx'
import PlaySession from '../play/PlaySession.jsx'
import { createPlayStore } from '../play/playStore.js'
import { effectiveLook } from '../profile/cosmetics.js'
import { useGameActions, useGameState } from '../state/GameStateProvider.jsx'

/**
 * "Play Community Level": a full-screen Play Mode for a gallery level, reusing the Studio's
 * engine (PlaySession) and HUD. It never touches the level open in your Studio.
 */
export default function CommunityPlayer({ entry, canVote, onVote, onClose }) {
  // One play store per opened level (timer, respawns, best time).
  const store = useMemo(() => createPlayStore(entry.level), [entry.level])
  const [gemPop, setGemPop] = useState(0)
  const game = useGameState()
  const look = useMemo(() => effectiveLook(game), [game.player, game.cosmetics]) // eslint-disable-line react-hooks/exhaustive-deps
  const { levelBeaten } = useGameActions()
  const portalRoot = usePortalRoot()

  useEffect(() => {
    // Typing focus (e.g. the search box) would swallow WASD, and the page shouldn't scroll behind.
    document.activeElement?.blur?.()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Playing ${entry.title} by ${entry.author}`} className="voxel-canvas fixed inset-0 z-50 bg-slate-950">
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={CAMERA}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        resize={{ debounce: 0, scroll: false }}
        fallback={<p className="grid h-full place-items-center text-slate-400">This device can’t run WebGL, so the level can’t be played here.</p>}
      >
        <color attach="background" args={[COLORS.background]} />
        <fog attach="fog" args={[COLORS.background, 35, 80]} />
        <SceneLighting />
        <PlaySession level={entry.level} store={store} look={look} onWin={(ms) => levelBeaten(entry.level.id, entry.title, ms)} />
        <ResponsiveRenderer />
      </Canvas>

      <PlayHud store={store} hasFinish={Boolean(entry.level.finishGate)} onExit={onClose} />

      {/* Level info + upvote, without leaving the game */}
      <div className="pointer-events-none absolute inset-x-0 top-[4.25rem] z-10 flex justify-center px-3">
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-slate-950/75 py-1.5 pl-3 pr-1.5 ring-1 ring-slate-700/70 backdrop-blur">
          <p className="min-w-0 text-sm">
            <span className="font-display font-bold text-white">{entry.title}</span>
            <span className="text-slate-400"> by {entry.author}</span>
          </p>
          {canVote && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur() // keep Space for jumping, not re-clicking the button
                  const paid = onVote()
                  if (paid) setGemPop((n) => n + 1)
                }}
                aria-pressed={entry.votedByMe}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-bold tabular-nums ${entry.votedByMe ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/60' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
              >
                <ArrowBigUp className={`size-5 ${entry.votedByMe ? 'fill-emerald-400 text-emerald-300' : ''}`} aria-hidden="true" />
                {entry.votes}
                <span className="sr-only"> upvotes</span>
              </button>
              {gemPop > 0 && (
                <span key={gemPop} className="vc-gem-pop pointer-events-none absolute -top-2 left-1/2 flex items-center gap-0.5 font-display text-sm font-bold text-purple-200" aria-hidden="true">
                  +10 <Gem className="size-3.5" />
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    portalRoot,
  )
}
