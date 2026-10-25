/**
 * Bulbuli: Skyward Explorer — the 3D scene.
 *
 * Sky, fog, light and shadows; the world (FloatingIsland + CrystalField); Bulbuli
 * (PlayerController); collect bursts; and the 60-second game clock.
 *
 * The clock runs inside the render loop, so it stops whenever the scene does
 * (paused, or the tab hidden). The parent reads `live` for the HUD:
 *   live.timeLeft, live.stamina, live.gliding   (and live.focus, Bulbuli's position)
 *
 * Usage:
 *   <SkywardExplorerCanvas
 *     key={runId}              // new key = a fresh run (Bulbuli back at the start, crystals back)
 *     seed={7}
 *     status="playing"         // 'ready' | 'playing' | 'win' | 'gameover'
 *     paused={false}
 *     input={input}            // input.js
 *     live={live}              // { timeLeft, stamina, gliding }
 *     onCollect={(count, total) => …}
 *     onTimeUp={() => …}
 *   />
 *
 * Sizing: the canvas always fills its parent and follows it (R3F watches the parent with a
 * ResizeObserver), so it adapts to the page, the launcher dialog, full screen and rotation.
 * Give the parent a real height; there is no `responsive` prop to set.
 *
 * Performance, aiming at 60 fps on ordinary laptops and phones:
 *   • Two quality tiers. Start on 'low' on small or low-memory devices; drei's PerformanceMonitor
 *     then steps down if frames drop and back up when there's room:
 *       high: pixel ratio up to 1.5, 2048 shadow map, drifting sparkles
 *       low:  pixel ratio 1, 1024 shadow map, no sparkles
 *   • One shadow-casting light whose shadow box follows Bulbuli (tight box = sharp shadows
 *     from a small map), snapped to whole shadow texels so the edges don't shimmer.
 *   • About 40 draw calls for the whole world: merged land, instanced props and crystals.
 *   • Per-frame motion lives in refs; React state changes only on a pick-up.
 *   • frameloop="never" while paused: nothing is drawn or simulated.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerformanceMonitor, Sky, Sparkles } from '@react-three/drei'
import { Object3D, Vector3 } from 'three'
import CollectBurst from './CollectBurst.jsx'
import CrystalField from './CrystalField.jsx'
import FloatingIsland from './FloatingIsland.jsx'
import PlayerController from './PlayerController.jsx'
import { generateWorld } from './layout.js'
import { buildColliders } from './physics.js'
import { sfx } from './sfx.js'

const SUN_DIRECTION = new Vector3(0.55, 0.75, 0.35).normalize()
const FOG_COLOR = '#cfe5f4'   // close to the Sky shader's horizon, so far platforms melt into it
const FOG_NEAR = 35
const FOG_FAR = 130
const STREAK_WINDOW = 2.5     // seconds between pick-ups that still count as a streak (rising chime)

export const QUALITY = {
  high: { dpr: [1, 1.5], shadowMap: 2048, shadowBox: 22, sparkles: true },
  low: { dpr: 1, shadowMap: 1024, shadowBox: 16, sparkles: false },
}

/** A first guess before any frames are measured: small screens and low-memory devices start low. */
function initialTier() {
  if (typeof window === 'undefined') return 'high'
  const smallScreen = window.matchMedia?.('(max-width: 768px)').matches
  const lowMemory = (navigator.deviceMemory ?? 8) <= 4
  const fewCores = (navigator.hardwareConcurrency ?? 8) <= 4
  return smallScreen || lowMemory || fewCores ? 'low' : 'high'
}

/* ------------------------------------------------------------------ lighting */

/** The sun: the only shadow caster. Its shadow box rides along with Bulbuli. */
function Sun({ live, quality }) {
  const light = useRef()
  const target = useMemo(() => new Object3D(), [])

  // a new map size or box needs a fresh shadow map
  useEffect(() => {
    const l = light.current
    if (!l) return
    const box = quality.shadowBox
    l.shadow.mapSize.set(quality.shadowMap, quality.shadowMap)
    Object.assign(l.shadow.camera, { left: -box, right: box, top: box, bottom: -box })
    l.shadow.camera.updateProjectionMatrix()
    l.shadow.map?.dispose()
    l.shadow.map = null
  }, [quality])

  useFrame(() => {
    const l = light.current
    if (!l) return
    const [x, y, z] = live.focus ?? [0, 0, 0]
    // move in whole shadow texels, or the shadow edges crawl as Bulbuli runs
    const texel = (quality.shadowBox * 2) / quality.shadowMap
    const fx = Math.round(x / texel) * texel
    const fy = Math.round(y / texel) * texel
    const fz = Math.round(z / texel) * texel
    target.position.set(fx, fy, fz)
    target.updateMatrixWorld()
    l.position.set(fx + SUN_DIRECTION.x * 40, fy + SUN_DIRECTION.y * 40, fz + SUN_DIRECTION.z * 40)
  })

  return (
    <>
      <primitive object={target} />
      <directionalLight
        ref={light}
        target={target}
        intensity={2.1}
        color="#fff3dc"
        castShadow
        shadow-mapSize={[quality.shadowMap, quality.shadowMap]}
        shadow-camera-left={-quality.shadowBox}
        shadow-camera-right={quality.shadowBox}
        shadow-camera-top={quality.shadowBox}
        shadow-camera-bottom={-quality.shadowBox}
        shadow-camera-near={5}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
    </>
  )
}

function Lighting({ live, quality }) {
  return (
    <>
      {/* soft fill: sky-blue from above, grassy bounce from below */}
      <hemisphereLight args={['#e3f3ff', '#6d8f58', 0.85]} />
      <ambientLight intensity={0.15} />
      <Sun live={live} quality={quality} />
    </>
  )
}

/* ------------------------------------------------------------------ game clock */

/** Counts live.timeLeft down while playing; calls onTimeUp once when it reaches 0. */
function GameClock({ running, live, onTimeUp }) {
  const runningRef = useRef(running)
  runningRef.current = running
  const fired = useRef(false)
  useFrame((_, delta) => {
    if (!runningRef.current || fired.current) return
    live.timeLeft = Math.max(0, live.timeLeft - Math.min(delta, 0.1))
    if (live.timeLeft === 0) {
      fired.current = true
      onTimeUp?.()
    }
  })
  return null
}

/* ------------------------------------------------------------------ scene */

const World = memo(function World({ seed, status, input, live, onCollect, onTimeUp }) {
  const world = useMemo(() => generateWorld(seed), [seed])
  const colliders = useMemo(() => buildColliders(world), [world])
  const playing = status === 'playing'

  // pick-ups: id → time taken. Read every frame by the controller and the crystals.
  const collectedRef = useRef(new Map())
  const [bursts, setBursts] = useState([])
  const streak = useRef({ count: -1, at: -Infinity })

  const handleCollect = useCallback((crystal) => {
    if (collectedRef.current.has(crystal.id)) return
    const now = performance.now() / 1000
    collectedRef.current.set(crystal.id, now)
    const s = streak.current
    s.count = now - s.at < STREAK_WINDOW ? s.count + 1 : 0
    s.at = now
    sfx.crystal(s.count)
    setBursts((list) => [...list, { id: `${crystal.id}-burst`, position: crystal.position, color: crystal.color }])
    onCollect?.(collectedRef.current.size, world.crystals.length)
  }, [onCollect, world.crystals.length])

  const handleBurstDone = useCallback((id) => setBursts((list) => list.filter((b) => b.id !== id)), [])

  return (
    <>
      <FloatingIsland world={world} />
      <CrystalField crystals={world.crystals} collectedRef={collectedRef} />
      {bursts.map((b) => (
        <CollectBurst key={b.id} id={b.id} position={b.position} color={b.color} onDone={handleBurstDone} />
      ))}
      <PlayerController
        world={world}
        colliders={colliders}
        input={input}
        active={playing}
        crystals={world.crystals}
        collectedRef={collectedRef}
        onCollect={handleCollect}
        live={live}
      />
      <GameClock running={playing} live={live} onTimeUp={onTimeUp} />
    </>
  )
})

function SkywardExplorerCanvas({ seed = 7, status = 'ready', paused = false, input, live, onCollect, onTimeUp, className = '' }) {
  const [tier, setTier] = useState(initialTier)
  const quality = QUALITY[tier]

  return (
    <Canvas
      className={className}
      shadows="percentage" // PCF; three r18x dropped PCFSoft (R3F's default) and warns about it
      dpr={quality.dpr}
      frameloop={paused ? 'never' : 'always'}
      resize={{ scroll: false }} // the stage never moves with page scroll; only watch its size
      camera={{ position: [24, 14, 24], fov: 55, near: 0.1, far: 200 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <PerformanceMonitor
        onDecline={() => setTier('low')}
        onIncline={() => setTier('high')}
        onFallback={() => setTier('low')}
        flipflops={3} // after flipping three times, settle on the safer tier
      />
      <color attach="background" args={[FOG_COLOR]} />
      <fog attach="fog" args={[FOG_COLOR, FOG_NEAR, FOG_FAR]} />
      <Sky
        distance={450000}
        sunPosition={SUN_DIRECTION.toArray()}
        turbidity={3}
        rayleigh={1.4}
        mieCoefficient={0.004}
        mieDirectionalG={0.85}
      />
      {/* drifting motes of light: the air feels alive */}
      {quality.sparkles && (
        <Sparkles count={70} scale={[60, 24, 60]} position={[0, 6, 0]} size={3} speed={0.25} opacity={0.55} color="#fff6d5" />
      )}

      <Lighting live={live} quality={quality} />
      <World seed={seed} status={status} input={input} live={live} onCollect={onCollect} onTimeUp={onTimeUp} />
    </Canvas>
  )
}

export default memo(SkywardExplorerCanvas)
