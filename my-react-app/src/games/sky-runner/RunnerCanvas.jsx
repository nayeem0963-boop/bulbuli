/**
 * Bulbuli's Sky Runner — the 3D scene.
 *
 * Bulbuli flies forward through the sky in one of three lanes. Gold stars come
 * towards her in lines (collect them); grumpy rain clouds sit in lanes (dodge
 * them, or get a gentle bump). The world scrolls forever: nothing is created
 * after the first frame, every star and cloud comes from a fixed pool and is
 * recycled once it passes the camera.
 *
 * Controls (all built in): tap the left/right half, swipe left/right, or the
 * ← → / A D keys. A parent can also steer through controlsRef.
 *
 * Usage:
 *   <RunnerCanvas
 *     key={runId}                 // new key = brand new run (fresh world)
 *     running={started && !over}  // world scrolls and collisions count only while true
 *     paused={paused}
 *     onStar={() => …}            // a star was collected
 *     onBump={() => …}            // Bulbuli bumped into a rain cloud
 *     statsRef={stats}            // optional: { distance, speed, stars, bumps } updated every frame, no re-renders
 *     controlsRef={controls}      // optional: controls.current.left() / right() / goTo(lane)
 *   />
 *
 * Performance (8 GB RAM / integrated GPUs):
 *   • dpr capped at [1, 1.5]; no shadow maps at all (a flying game doesn't need them).
 *   • Stars, cloud puffs, cloud eyes, scenery clouds, lane dashes and sparkles are each ONE
 *     instancedMesh → about a dozen draw calls in total.
 *   • All per-frame state lives in a plain object (`world`), never in React state.
 *   • The render loop stops while paused (frameloop="demand").
 */
import { Component, memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { ExtrudeGeometry, MathUtils, Object3D, Shape } from 'three'
import BulbuliModel from '../../components/game/BulbuliModel.jsx'
import './RunnerCanvas.css'

/* ------------------------------------------------------------------ tuning */

const LANES = [-2, 0, 2] // x position of each lane
const BIRD_Y = 0.15
const BIRD_Z = 0
const SPAWN_Z = -64 // rows appear here, hidden in the fog
const DESPAWN_Z = 8 // and are recycled once they pass behind the camera
const STAR_GAP = 1.7 // distance between stars in a line
const MAX_DT = 0.05 // slow frames slow the game down instead of teleporting things

const STAR_POOL = 48
const CLOUD_POOL = 12
const SCENERY_COUNT = 16
const SPARKLE_COUNT = 18
const DASH_SPACING = 3

/** Speeds in world units per second. A row of the sky passes in a few seconds. */
const DEFAULT_DIFFICULTY = { baseSpeed: 8, maxSpeed: 16, accel: 0.02 }
/** Two-cloud rows (only one lane open) start after this distance. */
const HARD_ROWS_AFTER = 300

// Hit boxes: generous for stars (easy to collect), forgiving for clouds (hard to hit by accident).
const STAR_HIT = { x: 0.9, z: 0.8 }
const CLOUD_HIT = { x: 0.95, z: 0.9 }
const BUMP_INVULNERABLE_S = 1.4

/** Turns the model so its tail faces the camera. Use 0 if Bulbuli appears to fly backwards. */
const BIRD_YAW = Math.PI
const BIRD_SIZE = 1.8 // wingspan in world units; lanes are 2 apart

// Rain-cloud shape: puffs as [dx, dy, dz, radius].
const PUFFS = [
  [0, 0, 0, 0.72],
  [0.62, -0.05, 0.05, 0.52],
  [-0.62, -0.02, 0.02, 0.56],
  [0.22, 0.42, -0.05, 0.48],
  [-0.24, 0.38, -0.08, 0.44],
]
const SCENERY_PUFFS = [
  [0, 0, 0, 1],
  [1.1, -0.15, 0.2, 0.75],
  [-1.05, -0.2, -0.1, 0.8],
]

const SWIPE_PX = 28
const TAP_PX = 14

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* ------------------------------------------------------------------ spawner (pure, no three.js) */

/** Small seeded random generator, so a run can be replayed in tests. */
function createRng(seed = Date.now()) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const line = (lane, count) => Array.from({ length: count }, (_, offset) => ({ lane, offset }))

/**
 * Plans one row of the sky.
 * Every row has a "safe" lane with no cloud, and it is never more than one lane
 * away from the previous row's safe lane, so there is always a reachable way through.
 *
 * The open lane usually moves away from Bulbuli and single clouds usually sit in her lane,
 * so a child who never steers runs out of hearts long before the star goal.
 *
 * @returns {{ safe: number, clouds: number[], stars: Array<{lane, offset}> }}
 *   offset = position in a line of stars (0 = nearest)
 */
function planRow(rng, prevSafe, distance, calm, birdLane = 1) {
  const near = [prevSafe - 1, prevSafe, prevSafe + 1].filter((lane) => lane >= 0 && lane < LANES.length)
  // The open lane (and its stars) usually moves away from Bulbuli, so the child has to steer.
  const away = near.filter((lane) => lane !== birdLane)
  const choices = !calm && away.length > 0 && rng() < 0.6 ? away : near
  const safe = choices[Math.floor(rng() * choices.length)]
  const roll = rng()

  // A plain line of stars (always used for the first calm rows).
  if (calm || roll < 0.25) return { safe, clouds: [], stars: line(safe, 5) }

  // A weave: stars that lead from one lane to the next.
  if (roll < 0.4) {
    const other = prevSafe !== safe
      ? safe
      : near.filter((lane) => lane !== prevSafe)[Math.floor(rng() * (near.length - 1))]
    const path = prevSafe !== safe
      ? [prevSafe, prevSafe, prevSafe, safe, safe, safe]
      : [prevSafe, prevSafe, other, other, prevSafe, prevSafe]
    return { safe, clouds: [], stars: path.map((lane, offset) => ({ lane, offset })) }
  }

  const blocked = [0, 1, 2].filter((lane) => lane !== safe)

  // Harder: clouds in both other lanes, stars show the way through.
  if (distance > HARD_ROWS_AFTER && roll > 0.82) return { safe, clouds: blocked, stars: line(safe, 3) }

  // Usual row: one cloud, usually with a line of stars in the safe lane.
  const cloud = blocked.includes(birdLane) && rng() < 0.7 ? birdLane : blocked[Math.floor(rng() * blocked.length)]
  return { safe, clouds: [cloud], stars: rng() < 0.7 ? line(safe, 4) : [] }
}

/** More room between rows when flying faster. */
const rowGap = (speed) => 11 + speed * 0.3

function createWorld(seed) {
  const world = {
    rng: createRng(seed),
    distance: 0,
    speed: 0,
    untilNextRow: 0,
    safeLane: 1,
    rowsSpawned: 0,
    targetLane: 1,
    birdX: 0,
    bank: 0,
    invulnerable: 0,
    wobble: 0,
    shake: 0,
    stars: Array.from({ length: STAR_POOL }, () => ({ active: false, state: 'fly', x: 0, y: 0, z: 0, t: 0, spin: 0 })),
    clouds: Array.from({ length: CLOUD_POOL }, () => ({ active: false, state: 'fly', x: 0, y: 0, z: 0, t: 0, tilt: 0 })),
    stats: { distance: 0, speed: 0, stars: 0, bumps: 0 },
    burst: () => {},
  }
  // Fill the sky ahead so the first seconds aren't empty (starting a little way off, for a calm start).
  const firstGap = rowGap(DEFAULT_DIFFICULTY.baseSpeed)
  for (let z = -26; z > SPAWN_Z; z -= firstGap) spawnRow(world, z)
  world.untilNextRow = firstGap
  return world
}

function spawnRow(world, z) {
  const plan = planRow(world.rng, world.safeLane, world.distance, world.rowsSpawned < 2, world.targetLane)
  world.safeLane = plan.safe
  world.rowsSpawned += 1
  for (const star of plan.stars) {
    const slot = world.stars.find((candidate) => !candidate.active)
    if (!slot) break
    Object.assign(slot, {
      active: true, state: 'fly', x: LANES[star.lane], y: BIRD_Y, z: z - star.offset * STAR_GAP, t: 0, spin: star.offset * 0.6,
    })
  }
  for (const lane of plan.clouds) {
    const slot = world.clouds.find((candidate) => !candidate.active)
    if (!slot) break
    Object.assign(slot, {
      active: true, state: 'fly', x: LANES[lane], y: BIRD_Y + 0.05, z: z - 2.5, t: 0, tilt: (world.rng() - 0.5) * 0.4,
    })
  }
}

/* ------------------------------------------------------------------ geometry helpers */

function useStarGeometry() {
  const geometry = useMemo(() => {
    const shape = new Shape()
    const points = 5
    for (let i = 0; i < points * 2; i += 1) {
      const r = i % 2 === 0 ? 0.42 : 0.19
      const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      if (i === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    shape.closePath()
    const g = new ExtrudeGeometry(shape, {
      depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 1,
    })
    g.center()
    return g
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

/** Hides every instance until it is used. */
function hideAll(mesh, count, dummy) {
  dummy.position.set(0, -100, 0)
  dummy.scale.setScalar(0)
  dummy.updateMatrix()
  for (let i = 0; i < count; i += 1) mesh.setMatrixAt(i, dummy.matrix)
  mesh.instanceMatrix.needsUpdate = true
}

/* ------------------------------------------------------------------ the bird */

/** Low-poly stand-in, shown while the real model downloads (or if it can't load). */
function PlaceholderBird({ reducedMotion }) {
  const left = useRef()
  const right = useRef()
  useFrame((state) => {
    const flap = Math.sin(state.clock.elapsedTime * (reducedMotion ? 6 : 14)) * 0.6
    if (left.current) left.current.rotation.z = flap
    if (right.current) right.current.rotation.z = -flap
  })
  return (
    <group scale={0.62}>
      <mesh>
        <sphereGeometry args={[0.55, 16, 12]} />
        <meshStandardMaterial color="#5a4636" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.12, -0.32]}>
        <sphereGeometry args={[0.38, 14, 10]} />
        <meshStandardMaterial color="#f3e6c8" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.5, 0.05]}>
        <sphereGeometry args={[0.36, 14, 10]} />
        <meshStandardMaterial color="#2c2420" roughness={0.6} />
      </mesh>
      <mesh position={[0.22, 0.45, -0.2]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#e5322d" />
      </mesh>
      <mesh position={[0, 0.48, -0.42]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.08, 0.25, 8]} />
        <meshStandardMaterial color="#ff9f43" />
      </mesh>
      <group ref={left} position={[0.45, 0.05, 0]}>
        <mesh position={[0.4, 0, 0]}>
          <boxGeometry args={[0.8, 0.06, 0.45]} />
          <meshStandardMaterial color="#4a3a2d" />
        </mesh>
      </group>
      <group ref={right} position={[-0.45, 0.05, 0]}>
        <mesh position={[-0.4, 0, 0]}>
          <boxGeometry args={[0.8, 0.06, 0.45]} />
          <meshStandardMaterial color="#4a3a2d" />
        </mesh>
      </group>
    </group>
  )
}

/** If the model file fails, keep playing with the stand-in bird. */
class BirdBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    console.warn('[Sky Runner] Bulbuli model did not load; using the simple bird.', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/* ------------------------------------------------------------------ world: stars, clouds, bird */

const World = memo(function World({ world, running, paused, difficulty, reducedMotion, onStar, onBump, statsRef }) {
  const bird = useRef()
  const stars = useRef()
  const puffs = useRef()
  const eyes = useRef()
  const starGeometry = useStarGeometry()
  const dummy = useMemo(() => new Object3D(), [])

  const props = useRef(null)
  props.current = { running, paused, difficulty, onStar, onBump }

  useEffect(() => {
    if (statsRef) statsRef.current = world.stats
  }, [statsRef, world])

  useLayoutEffect(() => {
    hideAll(stars.current, STAR_POOL, dummy)
    hideAll(puffs.current, CLOUD_POOL * PUFFS.length, dummy)
    hideAll(eyes.current, CLOUD_POOL * 2, dummy)
  }, [dummy])

  useFrame((state, delta) => {
    const w = world
    const p = props.current
    const dt = Math.min(delta, MAX_DT)
    const time = state.clock.elapsedTime
    const moving = p.running && !p.paused
    const motion = reducedMotion ? 0.35 : 1

    /* scrolling + spawning */
    let step = 0
    if (moving) {
      const cfg = p.difficulty
      w.speed = Math.min(cfg.maxSpeed, cfg.baseSpeed + w.distance * cfg.accel)
      step = w.speed * dt
      w.distance += step
      w.untilNextRow -= step
      while (w.untilNextRow <= 0) {
        // A row that was "due" a little earlier has already travelled that far.
        spawnRow(w, SPAWN_Z - w.untilNextRow)
        w.untilNextRow += rowGap(w.speed)
      }
    }

    /* the bird: glide to the lane, bank into the turn, wobble after a bump */
    const targetX = LANES[w.targetLane]
    w.birdX = MathUtils.damp(w.birdX, targetX, 11, dt)
    w.bank = MathUtils.damp(w.bank, (w.birdX - targetX) * 0.35, 10, dt)
    w.invulnerable = Math.max(0, w.invulnerable - dt)
    w.wobble = Math.max(0, w.wobble - dt * 1.8)
    w.shake = Math.max(0, w.shake - dt * 2.5)
    const b = bird.current
    if (b) {
      b.position.set(w.birdX, BIRD_Y + Math.sin(time * 3) * 0.1 * motion, BIRD_Z)
      b.rotation.z = w.bank + Math.sin(time * 28) * w.wobble * 0.35 * motion
      b.rotation.x = -0.12 + Math.sin(time * 1.7) * 0.04 * motion
      // Blink while protected after a bump, so the child sees "safe for a moment".
      b.visible = w.invulnerable <= 0 || Math.floor(time * 10) % 2 === 0
    }

    /* stars */
    const sm = stars.current
    for (let i = 0; i < STAR_POOL; i += 1) {
      const s = w.stars[i]
      if (!s.active) {
        dummy.scale.setScalar(0)
      } else if (s.state === 'fly') {
        s.z += step
        s.spin += dt * 2.5
        if (p.running && Math.abs(s.z - BIRD_Z) < STAR_HIT.z && Math.abs(s.x - w.birdX) < STAR_HIT.x) {
          s.state = 'pop'
          s.t = 0
          w.stats.stars += 1
          w.burst(s.x, s.y, s.z)
          p.onStar?.()
        } else if (s.z > DESPAWN_Z) {
          s.active = false
        }
        dummy.position.set(s.x, s.y + Math.sin(time * 2.4 + s.z * 0.5) * 0.1 * motion, s.z)
        dummy.rotation.set(0, s.spin, 0)
        dummy.scale.setScalar(1)
      } else {
        // Collected: zip up towards Bulbuli and pop.
        s.t += dt
        s.x = MathUtils.damp(s.x, w.birdX, 14, dt)
        s.y += dt * 3
        s.z = MathUtils.damp(s.z, BIRD_Z, 14, dt)
        dummy.position.set(s.x, s.y, s.z)
        dummy.rotation.set(0, s.spin + s.t * 20, 0)
        dummy.scale.setScalar(Math.max(0, (1 + s.t * 2.5) * (1 - s.t / 0.28)))
        if (s.t > 0.28) s.active = false
      }
      dummy.updateMatrix()
      sm.setMatrixAt(i, dummy.matrix)
    }
    sm.instanceMatrix.needsUpdate = true

    /* rain clouds */
    const pm = puffs.current
    const em = eyes.current
    for (let i = 0; i < CLOUD_POOL; i += 1) {
      const c = w.clouds[i]
      let scale = 1
      if (c.active) {
        if (c.state === 'fly') {
          c.z += step
          if (
            p.running && w.invulnerable <= 0
            && Math.abs(c.z - BIRD_Z) < CLOUD_HIT.z && Math.abs(c.x - w.birdX) < CLOUD_HIT.x
          ) {
            c.state = 'poof'
            c.t = 0
            w.invulnerable = BUMP_INVULNERABLE_S
            w.wobble = 1
            w.shake = reducedMotion ? 0 : 0.35
            w.stats.bumps += 1
            p.onBump?.()
          } else if (c.z > DESPAWN_Z) {
            c.active = false
          }
        } else {
          // Bumped: the cloud puffs up and vanishes.
          c.t += dt
          c.z += step
          scale = Math.max(0, (1 + c.t * 3) * (1 - c.t / 0.3))
          if (c.t > 0.3) c.active = false
        }
      }
      const bob = Math.sin(time * 1.6 + i) * 0.08 * motion
      for (let k = 0; k < PUFFS.length; k += 1) {
        const [dx, dy, dz, r] = PUFFS[k]
        if (c.active) {
          dummy.position.set(c.x + dx * scale, c.y + bob + dy * scale, c.z + dz)
          dummy.rotation.set(0, 0, c.tilt)
          dummy.scale.setScalar(r * scale)
        } else {
          dummy.scale.setScalar(0)
        }
        dummy.updateMatrix()
        pm.setMatrixAt(i * PUFFS.length + k, dummy.matrix)
      }
      // Two little grumpy eyes, so children can tell rain clouds from scenery.
      for (let k = 0; k < 2; k += 1) {
        if (c.active && c.state === 'fly') {
          dummy.position.set(c.x + (k === 0 ? -0.24 : 0.24), c.y + bob + 0.08, c.z + 0.66)
          dummy.rotation.set(0, 0, 0)
          dummy.scale.set(0.09, 0.12, 0.05)
        } else {
          dummy.scale.setScalar(0)
        }
        dummy.updateMatrix()
        em.setMatrixAt(i * 2 + k, dummy.matrix)
      }
    }
    pm.instanceMatrix.needsUpdate = true
    em.instanceMatrix.needsUpdate = true

    w.stats.distance = w.distance
    w.stats.speed = w.speed
  })

  return (
    <>
      <group ref={bird} position={[0, BIRD_Y, BIRD_Z]}>
        <BirdBoundary fallback={<PlaceholderBird reducedMotion={reducedMotion} />}>
          <Suspense fallback={<PlaceholderBird reducedMotion={reducedMotion} />}>
            <BulbuliModel size={BIRD_SIZE} idleSpin={0} rotation={[0, BIRD_YAW, 0]} />
          </Suspense>
        </BirdBoundary>
      </group>

      <instancedMesh ref={stars} args={[starGeometry, undefined, STAR_POOL]} frustumCulled={false}>
        <meshStandardMaterial color="#ffd23f" emissive="#ffb000" emissiveIntensity={0.55} roughness={0.3} metalness={0.2} />
      </instancedMesh>

      <instancedMesh ref={puffs} args={[undefined, undefined, CLOUD_POOL * PUFFS.length]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#8f9cc0" roughness={1} flatShading />
      </instancedMesh>

      <instancedMesh ref={eyes} args={[undefined, undefined, CLOUD_POOL * 2]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#1b2a49" />
      </instancedMesh>

      <Sparkles world={world} reducedMotion={reducedMotion} />
    </>
  )
})

/** Little gold burst when a star is collected. */
function Sparkles({ world, reducedMotion }) {
  const mesh = useRef()
  const dummy = useMemo(() => new Object3D(), [])
  const parts = useMemo(
    () => Array.from({ length: SPARKLE_COUNT }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0 })),
    [],
  )
  const active = useRef(false)

  useLayoutEffect(() => {
    hideAll(mesh.current, SPARKLE_COUNT, dummy)
    let next = 0
    world.burst = (x, y, z) => {
      // Re-use the oldest sparkles so overlapping bursts never run out.
      for (let n = 0; n < 6; n += 1) {
        const part = parts[next]
        next = (next + 1) % SPARKLE_COUNT
        const a = Math.random() * Math.PI * 2
        const speed = (reducedMotion ? 1 : 2.2) + Math.random() * 1.5
        Object.assign(part, { x, y, z, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed + 1, vz: 0, life: 0.45 })
      }
      active.current = true
    }
    return () => { world.burst = () => {} }
  }, [world, parts, dummy, reducedMotion])

  useFrame((_, delta) => {
    if (!active.current) return
    const dt = Math.min(delta, MAX_DT)
    let alive = false
    parts.forEach((part, i) => {
      if (part.life > 0) {
        part.life -= dt
        part.x += part.vx * dt
        part.y += part.vy * dt
        part.z += part.vz * dt
        dummy.position.set(part.x, part.y, part.z)
        dummy.rotation.set(part.life * 9, part.life * 7, 0)
        dummy.scale.setScalar(Math.max(0, part.life * 2.4) * 0.12)
        alive = true
      } else {
        dummy.scale.setScalar(0)
      }
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
    active.current = alive
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, SPARKLE_COUNT]} frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#fff3b0" toneMapped={false} />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------ scenery: parallax clouds + lane dashes */

/** Big white clouds on both sides and below, drifting past slower than the lanes (parallax). */
function Scenery({ world, running, paused }) {
  const mesh = useRef()
  const dummy = useMemo(() => new Object3D(), [])
  const props = useRef(null)
  props.current = { running, paused }
  const clouds = useMemo(() => {
    const rng = createRng(42)
    return Array.from({ length: SCENERY_COUNT }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1
      return {
        x: side * (7 + rng() * 8), // well clear of the outer lanes
        y: -4.5 + rng() * 7,
        z: SPAWN_Z + rng() * (DESPAWN_Z - SPAWN_Z),
        size: 1.2 + rng() * 1.4,
      }
    })
  }, [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, MAX_DT)
    const { running: r, paused: pz } = props.current
    // Gentle drift even before the run starts, so the sky feels alive.
    const step = pz ? 0 : (r ? world.speed * 0.55 : 0.6) * dt
    clouds.forEach((cloud, i) => {
      cloud.z += step
      if (cloud.z > DESPAWN_Z + 6) cloud.z = SPAWN_Z - 6
      SCENERY_PUFFS.forEach(([dx, dy, dz, r2], k) => {
        dummy.position.set(cloud.x + dx * cloud.size, cloud.y + dy * cloud.size, cloud.z + dz * cloud.size)
        dummy.scale.set(r2 * cloud.size * 1.3, r2 * cloud.size * 0.8, r2 * cloud.size)
        dummy.updateMatrix()
        mesh.current.setMatrixAt(i * SCENERY_PUFFS.length + k, dummy.matrix)
      })
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, SCENERY_COUNT * SCENERY_PUFFS.length]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.35} roughness={1} flatShading />
    </instancedMesh>
  )
}

/** Soft dashed "air streams" between the lanes, scrolling at belt speed so motion reads clearly. */
function LaneDashes({ world, running, paused }) {
  const mesh = useRef()
  const dummy = useMemo(() => new Object3D(), [])
  const offset = useRef(0)
  const perLine = Math.ceil((DESPAWN_Z - SPAWN_Z) / DASH_SPACING)
  const boundaries = [(LANES[0] + LANES[1]) / 2, (LANES[1] + LANES[2]) / 2]
  const props = useRef(null)
  props.current = { running, paused }

  useFrame((_, delta) => {
    const dt = Math.min(delta, MAX_DT)
    if (props.current.running && !props.current.paused) {
      offset.current = (offset.current + world.speed * dt) % DASH_SPACING
    }
    boundaries.forEach((x, b) => {
      for (let i = 0; i < perLine; i += 1) {
        dummy.position.set(x, BIRD_Y - 1.05, SPAWN_Z + i * DASH_SPACING + offset.current)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        mesh.current.setMatrixAt(b * perLine + i, dummy.matrix)
      }
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, perLine * 2]} frustumCulled={false}>
      <boxGeometry args={[0.08, 0.02, 1.1]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------ camera */

/** Keeps all three lanes in view on any screen, a little behind and above Bulbuli. Adds bump shake. */
function CameraRig({ world }) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const base = useRef({ y: 2.4, z: 7 })

  useLayoutEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    const halfFov = MathUtils.degToRad(camera.fov / 2)
    const halfWidth = 3.4 // the outer lanes (±2) plus room for the bird's wings
    const distance = MathUtils.clamp(halfWidth / (Math.tan(halfFov) * aspect), 6, 12.5)
    base.current = { y: BIRD_Y + 1.1 + distance * 0.2, z: BIRD_Z + distance }
    camera.position.set(0, base.current.y, base.current.z)
    camera.lookAt(0, BIRD_Y + 0.2, BIRD_Z - 12)
    camera.updateProjectionMatrix()
  }, [camera, size])

  useFrame((state) => {
    const s = world.shake
    if (s <= 0) {
      camera.position.x = 0
      camera.position.y = base.current.y
      return
    }
    const t = state.clock.elapsedTime
    camera.position.x = Math.sin(t * 47) * s * 0.18
    camera.position.y = base.current.y + Math.cos(t * 39) * s * 0.12
  })
  return null
}

/* ------------------------------------------------------------------ scene + canvas */

function Scene({ world, running, paused, difficulty, reducedMotion, onStar, onBump, statsRef }) {
  return (
    <>
      <CameraRig world={world} />
      <fog attach="fog" args={['#dff1ff', 22, 62]} />
      <hemisphereLight args={['#ffffff', '#9fd2ff', 1.1]} />
      <directionalLight position={[3, 6, 5]} intensity={1.6} color="#fff1d6" />
      <ambientLight intensity={0.25} />

      <Scenery world={world} running={running} paused={paused} />
      <LaneDashes world={world} running={running} paused={paused} />
      <World
        world={world}
        running={running}
        paused={paused}
        difficulty={difficulty}
        reducedMotion={reducedMotion}
        onStar={onStar}
        onBump={onBump}
        statsRef={statsRef}
      />
    </>
  )
}

class ViewportBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    console.error('[Sky Runner] 3D view could not start (WebGL unavailable?)', error)
  }
  render() {
    return this.state.failed ? <p className="sr-fallback" role="alert">{this.props.message}</p> : this.props.children
  }
}

const isTyping = (target) => target instanceof HTMLElement
  && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/**
 * @param {object}  props
 * @param {boolean} [props.running=false]   world scrolls, spawns and collides only while true
 * @param {boolean} [props.paused=false]    freezes everything and stops the render loop
 * @param {{baseSpeed:number, maxSpeed:number, accel:number}} [props.difficulty]
 * @param {() => void} [props.onStar]       a star was collected
 * @param {() => void} [props.onBump]       Bulbuli bumped a rain cloud (she's safe for a moment after)
 * @param {(lane:number) => void} [props.onMove]  lane changed (0, 1, 2), e.g. for a whoosh sound
 * @param {{current: object|null}} [props.statsRef]     receives { distance, speed, stars, bumps }, mutated every frame
 * @param {{current: object|null}} [props.controlsRef]  receives { left(), right(), goTo(lane) }
 * @param {boolean} [props.keyboard=true]   listen for ← → / A D
 * @param {boolean} [props.showHints=false] show the tap-left / tap-right arrows
 * @param {string}  [props.label]           accessible name of the play area
 * @param {string}  [props.loadingLabel]
 * @param {string}  [props.noWebglMessage]
 * @param {number}  [props.seed]            fixed seed → the same sky every run (tests, daily challenge)
 */
function RunnerCanvas({
  running = false,
  paused = false,
  difficulty = DEFAULT_DIFFICULTY,
  onStar,
  onBump,
  onMove,
  statsRef,
  controlsRef,
  keyboard = true,
  showHints = false,
  label = 'Sky Runner',
  loadingLabel = 'Loading…',
  noWebglMessage = "This device can't show the 3D sky right now.",
  seed,
}) {
  const [reducedMotion] = useState(prefersReducedMotion)
  const [world] = useState(() => createWorld(seed))
  const overlay = useRef(null) // drei <Html> renders here (a fixed target avoids remounting on the first frame)
  const gesture = useRef(null)

  const active = running && !paused
  const activeRef = useRef(active)
  activeRef.current = active
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  const goTo = useCallback((lane) => {
    if (!activeRef.current) return
    const next = MathUtils.clamp(lane, 0, LANES.length - 1)
    if (next === world.targetLane) return
    world.targetLane = next
    onMoveRef.current?.(next)
  }, [world])
  const move = useCallback((dir) => goTo(world.targetLane + dir), [goTo, world])

  useEffect(() => {
    if (!controlsRef) return undefined
    controlsRef.current = { left: () => move(-1), right: () => move(1), goTo }
    return () => { controlsRef.current = null }
  }, [controlsRef, move, goTo])

  useEffect(() => {
    if (!keyboard) return undefined
    const onKey = (e) => {
      if (!activeRef.current || e.repeat || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return
      const key = e.key.toLowerCase()
      if (key === 'arrowleft' || key === 'a') {
        e.preventDefault()
        move(-1)
      } else if (key === 'arrowright' || key === 'd') {
        e.preventDefault()
        move(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keyboard, move])

  // Swipe left/right anywhere, or tap the left/right half. Fires mid-swipe for snappy steering.
  const onPointerDown = useCallback((e) => {
    if (!e.isPrimary) return
    gesture.current = { x: e.clientX, y: e.clientY, id: e.pointerId, fired: false }
  }, [])
  const onPointerMove = useCallback((e) => {
    const g = gesture.current
    if (!g || g.id !== e.pointerId || g.fired) return
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.2) {
      g.fired = true
      move(dx < 0 ? -1 : 1)
    }
  }, [move])
  const onPointerUp = useCallback((e) => {
    const g = gesture.current
    gesture.current = null
    if (!g || g.id !== e.pointerId || g.fired) return
    if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > TAP_PX) return
    const rect = e.currentTarget.getBoundingClientRect()
    move(e.clientX < rect.left + rect.width / 2 ? -1 : 1)
  }, [move])
  const onPointerCancel = useCallback(() => { gesture.current = null }, [])

  return (
    <div
      ref={overlay}
      className={`sr-canvas ${paused ? 'is-paused' : ''}`}
      role="group"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <ViewportBoundary message={noWebglMessage}>
        <Canvas
          dpr={[1, 1.5]}
          frameloop={paused ? 'demand' : 'always'}
          camera={{ fov: 55, near: 0.1, far: 90, position: [0, 3, 7] }}
          gl={{ antialias: true, alpha: true, powerPreference: 'default', stencil: false }}
        >
          <Suspense
            fallback={(
              <Html center portal={overlay}>
                <span className="sr-loading" role="status">{loadingLabel}</span>
              </Html>
            )}
          >
            <Scene
              world={world}
              running={running}
              paused={paused}
              difficulty={difficulty}
              reducedMotion={reducedMotion}
              onStar={onStar}
              onBump={onBump}
              statsRef={statsRef}
            />
          </Suspense>
        </Canvas>
      </ViewportBoundary>

      {showHints && running && !paused && (
        <div className="sr-hints" aria-hidden="true">
          <span className="sr-hint is-left">◀</span>
          <span className="sr-hint is-right">▶</span>
        </div>
      )}
    </div>
  )
}

export default memo(RunnerCanvas)
