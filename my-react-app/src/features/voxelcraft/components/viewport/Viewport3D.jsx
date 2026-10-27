import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Crosshair, RotateCcw } from 'lucide-react'
import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { useLevel } from '../../level/LevelEditorProvider.jsx'
import { effectiveLook } from '../../profile/cosmetics.js'
import { useGameActions, useGameState } from '../../state/GameStateProvider.jsx'
import PlayHud from '../../play/PlayHud.jsx'
import PlaySession from '../../play/PlaySession.jsx'
import ModeToggle from '../studio/ModeToggle.jsx'
import { createHoverStore } from './hoverStore.js'
import PlacementController from './PlacementController.jsx'
import ResponsiveRenderer from './ResponsiveRenderer.jsx'
import SceneLighting from './SceneLighting.jsx'
import SnapshotBridge from './SnapshotBridge.jsx'
import { CAMERA, COLORS, CONTROLS } from './sceneConfig.js'

function WebGLUnavailable() {
  return (
    <div className="grid h-full place-items-center p-6 text-center text-sm text-slate-400">
      Your browser or device can’t run WebGL, so the 3D studio can’t start here.
      Try an up-to-date Chrome, Edge, Firefox or Safari.
    </div>
  )
}

/** Live readout of what a click will do. Subscribes to the hover store, not React state. */
function TargetReadout({ store }) {
  const target = useSyncExternalStore(store.subscribe, store.get)
  const { level } = useLevel()

  let text = 'Point at the floor or a block'
  let tone = 'text-slate-300'
  if (target) {
    const { x, y, z } = target.cell
    const where = `${x}, ${y}, ${z}`
    if (target.action === 'erase') {
      text = `Delete block at ${where}`
      tone = 'text-rose-300'
    } else if (!target.valid) {
      text = `${target.reason} (${where})`
      tone = 'text-rose-300'
    } else {
      text = `Place at ${where}`
      tone = 'text-emerald-300'
    }
  }

  return (
    <div className="rounded-lg bg-slate-950/70 px-3 py-2 text-xs ring-1 ring-slate-700/70 backdrop-blur">
      <div className={`flex items-center gap-1.5 font-medium tabular-nums ${tone}`}>
        <Crosshair className="size-3.5 shrink-0" aria-hidden="true" />
        <span>{text}</span>
      </div>
      <div className="mt-0.5 text-slate-500">{level.blocks.length} blocks · 20 × 20 plot</div>
    </div>
  )
}

/**
 * The Studio's 3D viewport. Two modes share one Canvas (no WebGL context churn):
 *   build  OrbitControls + placement raycasting + the Studio hotbar (`buildOverlay`)
 *   play   PlaySession owns the camera and the game loop; PlayHud overlays the canvas
 * The level comes from LevelEditorProvider (R3F bridges React context into the Canvas).
 */
/**
 * captureRef: receives a `capture()` function that snapshots the current Studio camera view
 * (used by the Publish modal's thumbnail generator).
 * framing: thumbnail-framing mode: camera moves freely, editing is off, `buildOverlay` is the frame guide.
 */
export default function Viewport3D({ mode = 'build', playStore = null, onModeChange, buildOverlay = null, captureRef = null, framing = false }) {
  const controls = useRef(null)
  const [hoverStore] = useState(createHoverStore)
  const { level } = useLevel()
  const game = useGameState()
  const look = useMemo(() => effectiveLook(game), [game.player, game.cosmetics]) // eslint-disable-line react-hooks/exhaustive-deps
  const { levelBeaten } = useGameActions()
  const playing = mode === 'play' && playStore

  // Back to the default Studio camera. One undamped update() first flushes any damping momentum
  // left from a recent drag, which would otherwise keep the camera drifting after the reset.
  const resetView = () => {
    const c = controls.current
    if (!c) return
    c.enableDamping = false
    c.update()
    c.object.position.set(...CAMERA.position)
    c.target.set(0, 0, 0)
    c.update()
    c.enableDamping = true
  }

  return (
    <div className="voxel-canvas relative h-full w-full overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-800">
      <Canvas
        // PCF filtering + shadow.radius gives soft edges (PCFSoftShadowMap is deprecated in recent three).
        shadows="percentage"
        dpr={[1, 2]}
        camera={CAMERA}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        // Zero-debounce ResizeObserver: the canvas tracks layout changes immediately (no stretch).
        resize={{ debounce: 0, scroll: false }}
        fallback={<WebGLUnavailable />}
        aria-label={playing ? '3D play test. Use WASD or arrow keys to move, Space to jump.' : '3D build viewport. Click to place blocks.'}
      >
        <color attach="background" args={[COLORS.background]} />
        <fog attach="fog" args={[COLORS.background, 35, 80]} />
        <SceneLighting />

        {playing ? (
          <PlaySession
            key={playStore.id}
            level={level}
            store={playStore}
            look={look}
            onWin={(ms) => levelBeaten(level.id, level.title, ms)}
          />
        ) : (
          <>
            <PlacementController hoverStore={hoverStore} readOnly={framing} />
            <SnapshotBridge captureRef={captureRef} />
            <OrbitControls
              ref={controls}
              makeDefault
              target={[0, 0, 0]}
              enableDamping
              dampingFactor={CONTROLS.dampingFactor}
              minDistance={CONTROLS.minDistance}
              maxDistance={CONTROLS.maxDistance}
              maxPolarAngle={CONTROLS.maxPolarAngle}
              zoomToCursor
              // left = rotate, wheel/middle = zoom, right = pan; touch: 1 finger rotate, 2 zoom+pan.
              mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
              touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
            />
          </>
        )}
        <ResponsiveRenderer />
      </Canvas>

      <div className={framing ? 'hidden' : playing ? 'hidden md:block' : undefined}>
        <ModeToggle mode={playing ? 'play' : 'build'} canPlay={Boolean(level.spawnPoint)} onChange={onModeChange} />
      </div>

      {playing ? (
        <PlayHud store={playStore} hasFinish={Boolean(level.finishGate)} onExit={() => onModeChange('build')} />
      ) : (
        <>
          {/* HUD: pointer-events off except on buttons, so it never blocks building or orbiting. */}
          <div className={`pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3 ${framing ? 'hidden' : ''}`}>
            <TargetReadout store={hoverStore} />
            <button
              type="button"
              onClick={resetView}
              className="pointer-events-auto flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-950/70 px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-slate-700/70 backdrop-blur transition hover:bg-indigo-500/20 hover:ring-indigo-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" /> Reset view
            </button>
          </div>
          {buildOverlay}
        </>
      )}
    </div>
  )
}
