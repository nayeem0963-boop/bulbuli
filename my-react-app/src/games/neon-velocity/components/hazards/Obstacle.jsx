import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BoxGeometry, EdgesGeometry, LineBasicMaterial, MeshBasicMaterial, MeshStandardMaterial,
} from 'three'
import { COLORS, PLATFORM_WIDTH } from '../../config/constants'
import { useSensor } from '../../hooks/useCollision'
import { runtime } from '../../stores/runtime'
import { boxFrom } from '../../systems/collisionWorld'

/*
 * Obstacle — every hazard in the game.
 *
 *   block       low lane block           → jump over
 *   pillar      tall lane block          → change lane
 *   overhead    full-width bar on posts  → slide under (or jump high)
 *   laserSweep  horizontal beam bobbing up/down across the track → time a jump or slide
 *   laserGate   vertical beam sweeping side to side              → time a lane change
 *
 * All hazards are *sensors* in the collision world (systems/collisionWorld.js): they
 * never physically stop Bulbuli. On contact they
 * push a hit into runtime.hitQueue; PlayerPhysics decides what happens (i-frames,
 * boost smash, lose a heart, momentum loss). The obstacle plays its own
 * "struck" reaction and then stops being dangerous.
 */

// ── Shared resources ──
const unitBox = new BoxGeometry(1, 1, 1)
const unitEdges = new EdgesGeometry(unitBox)
const glow = (color, k) => {
  const m = new LineBasicMaterial({ color, toneMapped: false })
  m.color.multiplyScalar(k)
  return m
}
const bodyMat = new MeshStandardMaterial({ color: '#12052a', roughness: 0.4, metalness: 0.6 })
const struckMat = new MeshBasicMaterial({ color: COLORS.red, transparent: true, opacity: 0.35, toneMapped: false })
const edgeMats = { block: glow(COLORS.yellow, 3), pillar: glow(COLORS.red, 3), overhead: glow(COLORS.yellow, 3) }
const laserMat = new MeshBasicMaterial({ color: COLORS.red, toneMapped: false })
laserMat.color.multiplyScalar(6)
const laserHaloMat = new MeshBasicMaterial({
  color: COLORS.red, transparent: true, opacity: 0.25, depthWrite: false, toneMapped: false,
})
const laserDeadMat = new MeshBasicMaterial({ color: '#4a1020', transparent: true, opacity: 0.4 })
const emitterMat = new MeshStandardMaterial({
  color: '#2a1550', emissive: COLORS.red, emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.3,
})

// width, height, depth, bottom y
const STATIC = {
  block: { size: [2.6, 1.0, 0.8], bottom: 0 },
  pillar: { size: [2.6, 3.6, 0.8], bottom: 0 },
  overhead: { size: [PLATFORM_WIDTH, 0.6, 0.6], bottom: 1.2 },
}

const HALF_W = PLATFORM_WIDTH / 2
const BEAM_DEPTH = 0.5 // sensor is deeper than the visual beam so fast players can't tunnel through

/**
 * Shared hit logic: report once (with a world position for effects), then
 * flip into the struck state. `getPosition` lets moving lasers report where
 * the beam actually was.
 */
function useHazardContact(kind, getPosition) {
  const [struck, setStruck] = useState(false)
  const done = useRef(false)
  const posFn = useRef(getPosition)
  posFn.current = getPosition
  const onEnter = useCallback(() => {
    if (done.current) return
    done.current = true
    runtime.hitQueue.push({ kind, position: posFn.current() })
    setStruck(true)
  }, [kind])
  return [struck, onEnter]
}

export const Obstacle = memo(function Obstacle({ variant, x = 0, z, phase = 0, speed = 1 }) {
  if (variant === 'laserSweep' || variant === 'laserGate') {
    return <LaserBarrier variant={variant} z={z} phase={phase} speed={speed} />
  }
  return <StaticObstacle variant={variant} x={x} z={z} />
})

// ─── Static ──────────────────────────────────────────────────────

function StaticObstacle({ variant, x, z }) {
  const { size: [w, h, d], bottom } = STATIC[variant] ?? STATIC.block
  const cy = bottom + h / 2
  const [struck, onEnter] = useHazardContact(variant, () => [x, cy, z])
  const box = useMemo(() => boxFrom(x, cy, z, w, h, d), [x, cy, z, w, h, d])
  useSensor(!struck, box, onEnter)
  const group = useRef()
  const fade = useRef(1)

  // Struck reaction: flash red and collapse
  useFrame((_, dt) => {
    if (!struck || !group.current || fade.current <= 0) return
    fade.current = Math.max(0, fade.current - dt / 0.35)
    group.current.scale.set(1 + (1 - fade.current) * 0.3, fade.current, 1 + (1 - fade.current) * 0.3)
    if (fade.current === 0) group.current.visible = false
  })

  return (
    <group position={[x, 0, z]}>
      <group ref={group} position={[0, cy, 0]}>
        <group scale={[w, h, d]}>
          <mesh geometry={unitBox} material={struck ? struckMat : bodyMat} />
          <lineSegments geometry={unitEdges} material={struck ? struckMat : edgeMats[variant]} />
        </group>
      </group>
      {variant === 'overhead' && [-1, 1].map((s) => (
        <mesh key={s} geometry={unitBox} material={bodyMat} position={[s * (HALF_W - 0.15), bottom / 2, 0]} scale={[0.3, bottom, 0.3]} />
      ))}
    </group>
  )
}

// ─── Moving lasers ───────────────────────────────────────────────

function LaserBarrier({ variant, z, phase, speed }) {
  const sweep = variant === 'laserSweep'
  const beam = useRef()

  // Position as a pure function of game time → deterministic, freezes on pause
  const placeAt = (t) => (sweep
    ? { x: 0, y: 1.25 + 0.95 * Math.sin(t * 2.2 * speed + phase), z }
    : { x: Math.sin(t * 1.6 * speed + phase) * (HALF_W - 0.8), y: 1.2, z })

  const beamScale = sweep ? [PLATFORM_WIDTH, 0.08, 0.08] : [0.08, 2.4, 0.08]
  const haloScale = sweep ? [PLATFORM_WIDTH, 0.35, 0.35] : [0.35, 2.4, 0.35]
  // trigger volume: the beam, a little thicker, and deeper so fast runners can't slip through
  const half = [beamScale[0] / 2, beamScale[1] / 2 + 0.04, BEAM_DEPTH / 2]

  const [struck, onEnter] = useHazardContact(variant, () => {
    const p = placeAt(runtime.gameTime)
    return [p.x, p.y, p.z]
  })
  // the sensor box follows the beam: computed from game time whenever it's tested
  useSensor(!struck, (out) => {
    const p = placeAt(runtime.gameTime)
    out.min.set(p.x - half[0], p.y - half[1], p.z - half[2])
    out.max.set(p.x + half[0], p.y + half[1], p.z + half[2])
    return out
  }, onEnter)

  useFrame(() => {
    if (!beam.current) return
    const p = placeAt(runtime.gameTime)
    beam.current.position.set(p.x, p.y, p.z)
  })

  const start = placeAt(0)

  return (
    <group>
      {/* Static emitters */}
      {sweep
        ? [-1, 1].map((s) => (
          <mesh key={s} geometry={unitBox} material={emitterMat} position={[s * (HALF_W + 0.2), 1.3, z]} scale={[0.4, 2.6, 0.4]} />
        ))
        : (
          <mesh geometry={unitBox} material={emitterMat} position={[0, 2.6, z]} scale={[PLATFORM_WIDTH + 0.8, 0.25, 0.4]} />
        )}

      {/* Moving beam */}
      <group ref={beam} position={[start.x, start.y, start.z]}>
        <mesh geometry={unitBox} material={struck ? laserDeadMat : laserMat} scale={beamScale} />
        {!struck && <mesh geometry={unitBox} material={laserHaloMat} scale={haloScale} />}
      </group>
    </group>
  )
}
