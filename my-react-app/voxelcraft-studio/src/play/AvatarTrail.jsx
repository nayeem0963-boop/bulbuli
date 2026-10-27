import { useFrame } from '@react-three/fiber'
import { useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { TRAIL_MAX, clearTrail, createTrailSim, stepTrail } from './trailSim.js'

const COMET_TAIL = new THREE.Color('#64748b')
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
const noRaycast = () => null

/**
 * Per-style particle behaviour. rate = particles/second while moving, life in seconds,
 * size in world units, up = initial upward speed, gravity, spread = random sideways speed.
 * colour(i, age01, t, out, base) writes the particle colour (base = the player's picked colour);
 * `recolour` styles update colour as particles age (flame, comet).
 */
const STYLES = {
  trail_streak: { rate: 55, life: 0.45, size: 0.15, up: 0, gravity: 0, spread: 0.15, shape: 'orb' },
  trail_sparks: { rate: 38, life: 0.8, size: 0.1, up: 1.6, gravity: -6, spread: 1.2, shape: 'cube', spin: true },
  trail_rainbow: { rate: 70, life: 0.6, size: 0.15, up: 0, gravity: 0, spread: 0.1, shape: 'orb', colour: (i, a, t, c) => c.setHSL((t * 0.5 + i * 0.013) % 1, 0.9, 0.6) },
  trail_creator: { rate: 55, life: 0.55, size: 0.13, up: 0.3, gravity: 0, spread: 0.35, shape: 'orb', colour: (i, a, t, c, base) => (i % 3 === 0 ? c.set('#818cf8') : i % 7 === 0 ? c.set('#ffffff') : c.copy(base)) },
  trail_comet: { rate: 90, life: 1.1, size: 0.2, up: 0, gravity: 0, spread: 0.06, shape: 'orb', recolour: true, colour: (i, a, t, c) => c.set('#e2e8f0').lerp(COMET_TAIL, a) },
  trail_flame: { rate: 80, life: 0.55, size: 0.17, up: 1.9, gravity: 0, spread: 0.35, shape: 'orb', recolour: true, colour: (i, a, t, c) => (a < 0.35 ? c.set('#fde047') : a < 0.7 ? c.set('#f97316') : c.set('#dc2626')) },
}

/**
 * Glowing trail behind the avatar: up to 120 particles in ONE instanced, additive draw call.
 * Particles live in world space and are only emitted while the target moves. The simulation is
 * in trailSim.js; `ref.current.clear()` wipes the trail (PlaySession calls it on every respawn).
 * `trail` = { item, color } from the equipped cosmetics.
 */
export default function AvatarTrail({ ref, target, trail, height = 0.75 }) {
  const style = STYLES[trail?.item]
  const mesh = useRef(null)
  const sim = useMemo(() => createTrailSim(TRAIL_MAX), [])
  const geo = useMemo(
    () => (style?.shape === 'cube' ? new THREE.BoxGeometry(1, 1, 1) : new THREE.IcosahedronGeometry(0.5, 1)),
    [style?.shape],
  )
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    [],
  )
  useEffect(() => () => geo.dispose(), [geo])
  useEffect(() => () => mat.dispose(), [mat])

  const hideAll = () => {
    const m = mesh.current
    if (!m) return
    for (let i = 0; i < TRAIL_MAX; i++) m.setMatrixAt(i, ZERO)
    m.instanceMatrix.needsUpdate = true
  }

  useImperativeHandle(ref, () => ({
    /** Respawn / restart / teleport: no particle survives, no streak to the new position. */
    clear() {
      clearTrail(sim)
      hideAll()
    },
  }))

  // New style (or first mount): start empty. Instances default to identity = full size at origin.
  useEffect(() => {
    clearTrail(sim)
    hideAll()
  }, [style, sim])

  const base = useMemo(() => new THREE.Color(trail?.color ?? '#34d399'), [trail?.color])
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color(), w: new THREE.Vector3() }), [])

  useFrame(({ clock }, delta) => {
    const m = mesh.current
    if (!m || !style || !target.current) return
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime
    target.current.getWorldPosition(tmp.w)
    stepTrail(sim, tmp.w, style, dt, height, (i) => {
      m.setColorAt(i, style.colour ? style.colour(i, 0, t, tmp.c, base) : tmp.c.copy(base))
    })

    for (let i = 0; i < TRAIL_MAX; i++) {
      const a = sim.age[i] / style.life
      if (a >= 1) {
        m.setMatrixAt(i, ZERO)
        continue
      }
      const k = i * 3
      tmp.p.set(sim.pos[k], sim.pos[k + 1], sim.pos[k + 2])
      tmp.s.setScalar(style.size * (1 - a))
      tmp.q.setFromEuler(tmp.e.set(sim.rot[i], sim.rot[i] * 0.7, 0))
      m.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s))
      if (style.recolour) m.setColorAt(i, style.colour(i, a, t, tmp.c, base))
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  if (!style) return null
  return <instancedMesh key={trail.item} ref={mesh} args={[geo, mat, TRAIL_MAX]} frustumCulled={false} raycast={noRaycast} userData={{ noSnapshot: true }} />
}
