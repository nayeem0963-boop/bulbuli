/**
 * Sky Science Explorer: the 3D flight (design 1.4, 8.1).
 *
 * Keeps Sky Runner's idea (three lanes, Bulbuli flying forward, rain clouds to dodge) in a new
 * scene, because Sky Runner's RunnerCanvas has no answer gates and must not be edited.
 *
 * Everything per frame lives in refs. The parent writes `motion.current`:
 *   { phase: 'cruise' | 'approach' | 'hover' | 'through' | 'idle', progress: 0..1, lane: 0..2,
 *     clouds: boolean, paused: boolean }
 * and receives onCloudHit() when Bulbuli bumps a rain cloud during a cruise.
 *
 * Performance follows RunnerCanvas: capped DPR, no shadows, one instanced mesh for scenery clouds,
 * the loop stops while paused.
 */
import { Component, memo, Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MathUtils, Object3D } from 'three'
import ExplorerBird from './ExplorerBird.jsx'
import { LANE_COLORS } from './laneColors.js'
import { rng } from './flight.js'

const LANES = [-2.2, 0, 2.2]
const GATE_FAR = -46
const GATE_HOVER = -3.2
const CLOUD_FAR = -60
const SCENERY = 22
const SPEED = 9 // world units per second during cruise

function Gates({ motion, reducedMotion }) {
  const group = useRef()
  const z = useRef(GATE_FAR)
  useFrame((_, dtRaw) => {
    const m = motion.current
    const dt = Math.min(dtRaw, 0.05)
    if (!group.current) return
    if (m.phase === 'approach') z.current = MathUtils.lerp(GATE_FAR, GATE_HOVER, m.progress)
    else if (m.phase === 'hover') z.current = GATE_HOVER
    else if (m.phase === 'through') z.current = Math.min(z.current + dt * 22, 10)
    else z.current = GATE_FAR
    group.current.position.z = z.current
    group.current.visible = m.phase === 'approach' || m.phase === 'hover' || m.phase === 'through'
    if (!reducedMotion) group.current.position.y = Math.sin(performance.now() / 600) * 0.06
  })
  return (
    <group ref={group}>
      {LANES.map((x, i) => (
        <group key={i} position={[x, 0.9, 0]}>
          <mesh>
            <torusGeometry args={[1, 0.16, 12, 36, Math.PI]} />
            <meshStandardMaterial color={LANE_COLORS[i]} emissive={LANE_COLORS[i]} emissiveIntensity={0.25} roughness={0.5} />
          </mesh>
          <mesh position={[-1, -0.6, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 1.2, 10]} />
            <meshStandardMaterial color={LANE_COLORS[i]} />
          </mesh>
          <mesh position={[1, -0.6, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 1.2, 10]} />
            <meshStandardMaterial color={LANE_COLORS[i]} />
          </mesh>
          {/* a flag in the lane colour on top; the matching answer card carries the number */}
          <mesh position={[0, 1.32, 0]}>
            <octahedronGeometry args={[0.26, 0]} />
            <meshStandardMaterial color={LANE_COLORS[i]} emissive={LANE_COLORS[i]} emissiveIntensity={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function RainClouds({ motion, onCloudHit }) {
  const refs = useRef([])
  const state = useRef({ clouds: [], next: 0.6 })
  const birdLane = useRef(1)
  useFrame((_, dtRaw) => {
    const m = motion.current
    const dt = Math.min(dtRaw, 0.05)
    birdLane.current = m.lane
    const s = state.current
    if (m.phase === 'cruise' && m.clouds) {
      s.next -= dt
      if (s.next <= 0 && s.clouds.length < 3) {
        const lane = Math.floor(Math.random() * 3)
        s.clouds.push({ lane, z: CLOUD_FAR, hit: false })
        s.next = 1.1 + Math.random() * 0.6
      }
    }
    for (const c of s.clouds) {
      c.z += dt * SPEED * (m.phase === 'cruise' ? 1 : 2.2)
      if (!c.hit && c.lane === m.lane && c.z > -0.9 && c.z < 0.9 && m.phase === 'cruise') {
        c.hit = true
        onCloudHit?.()
      }
    }
    s.clouds = s.clouds.filter((c) => c.z < 8)
    refs.current.forEach((mesh, i) => {
      const c = s.clouds[i]
      if (!mesh) return
      mesh.visible = Boolean(c)
      if (c) mesh.position.set(LANES[c.lane], 0.7, c.z)
    })
  })
  return [0, 1, 2].map((i) => (
    <group key={i} ref={(el) => { refs.current[i] = el }} visible={false}>
      {[[0, 0, 0, 0.75], [0.65, -0.05, 0, 0.55], [-0.65, -0.02, 0, 0.58], [0.2, 0.42, -0.05, 0.5]].map(([x, y, z, r], k) => (
        <mesh key={k} position={[x, y, z]}>
          <sphereGeometry args={[r, 14, 10]} />
          <meshStandardMaterial color="#7f8b9c" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[-0.25, 0.05, 0.62]}><sphereGeometry args={[0.08, 8, 8]} /><meshBasicMaterial color="#1b2a49" /></mesh>
      <mesh position={[0.25, 0.05, 0.62]}><sphereGeometry args={[0.08, 8, 8]} /><meshBasicMaterial color="#1b2a49" /></mesh>
    </group>
  ))
}

function Scenery({ motion, night }) {
  const mesh = useRef()
  const dummy = useMemo(() => new Object3D(), [])
  const items = useMemo(() => {
    const random = rng(2026) // fixed layout: no impure calls during render
    return Array.from({ length: SCENERY }, (_, i) => ({
      x: (i % 2 ? 1 : -1) * (9 + random() * 9), y: 0.5 + random() * 6, z: -10 - random() * 60, s: 0.7 + random() * 1.1,
    }))
  }, [])
  useFrame((_, dtRaw) => {
    const m = motion.current
    const dt = Math.min(dtRaw, 0.05)
    const speed = m.phase === 'hover' || m.phase === 'idle' ? 1.5 : SPEED
    items.forEach((it, i) => {
      it.z += dt * speed
      if (it.z > 4) it.z = -70
      dummy.position.set(it.x, it.y, it.z)
      dummy.scale.set(it.s * 1.6, it.s, it.s)
      dummy.updateMatrix()
      mesh.current?.setMatrixAt(i, dummy.matrix)
    })
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[null, null, SCENERY]}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshStandardMaterial color={night ? '#3a5080' : '#ffffff'} emissive={night ? '#1d2b4d' : '#dfefff'} emissiveIntensity={night ? 0.4 : 0.55} transparent opacity={0.92} />
    </instancedMesh>
  )
}

function Bird({ motion, decoderPath, reducedMotion, bumpRef }) {
  const group = useRef()
  const x = useRef(0)
  useFrame((_, dtRaw) => {
    const m = motion.current
    const dt = Math.min(dtRaw, 0.05)
    if (!group.current) return
    const target = LANES[m.lane]
    x.current = MathUtils.damp(x.current, target, 10, dt)
    group.current.position.x = x.current
    const t = performance.now() / 1000
    group.current.position.y = 0.55 + (reducedMotion ? 0 : Math.sin(t * 2.4) * 0.12) + (bumpRef.current > 0 ? Math.sin(bumpRef.current * 30) * 0.12 : 0)
    group.current.rotation.z = reducedMotion ? 0 : (target - x.current) * -0.18
    if (bumpRef.current > 0) bumpRef.current = Math.max(0, bumpRef.current - dt)
  })
  return (
    <group ref={group}>
      <BirdBoundary>
        <Suspense fallback={<SimpleBird />}>
          <ExplorerBird decoderPath={decoderPath} />
        </Suspense>
      </BirdBoundary>
    </group>
  )
}

/** Shown while the model loads, or if it can't load (offline, decoder missing). */
function SimpleBird() {
  return (
    <group rotation={[0, Math.PI, 0]}>
      <mesh><sphereGeometry args={[0.45, 16, 12]} /><meshStandardMaterial color="#d42a37" /></mesh>
      <mesh position={[0, 0.32, -0.32]}><sphereGeometry args={[0.28, 14, 10]} /><meshStandardMaterial color="#d42a37" /></mesh>
      <mesh position={[0, 0.3, -0.62]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.09, 0.25, 8]} /><meshStandardMaterial color="#f39c12" /></mesh>
      <mesh position={[0.55, 0.05, 0]} rotation={[0, 0, -0.3]}><boxGeometry args={[0.7, 0.06, 0.35]} /><meshStandardMaterial color="#b11f2b" /></mesh>
      <mesh position={[-0.55, 0.05, 0]} rotation={[0, 0, 0.3]}><boxGeometry args={[0.7, 0.06, 0.35]} /><meshStandardMaterial color="#b11f2b" /></mesh>
    </group>
  )
}

class BirdBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { console.warn('Sky Science: Bulbuli model unavailable, using the simple bird.', error?.message) }
  render() { return this.state.failed ? <SimpleBird /> : this.props.children }
}

function Ground() {
  return (
    <group>
      {LANES.map((x, i) => (
        <mesh key={i} position={[x, -0.6, -20]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.6, 60]} />
          <meshBasicMaterial color={LANE_COLORS[i]} transparent opacity={0.16} />
        </mesh>
      ))}
    </group>
  )
}

class CanvasBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { console.warn('Sky Science: 3D unavailable.', error?.message); this.props.onFail?.() }
  render() { return this.state.failed ? <p className="ssx-no3d" role="status">{this.props.message}</p> : this.props.children }
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function SkyScienceCanvas({ motion, onCloudHit, decoderPath, reducedMotion, dark, label, noWebglMessage, bumpRef, paused }) {
  const supported = useMemo(() => hasWebGL(), [])
  if (!supported) return <p className="ssx-no3d" role="status">{noWebglMessage}</p>
  const sky = dark ? '#142449' : '#bfe4fb'
  return (
    <CanvasBoundary message={noWebglMessage}>
      <Canvas
        className="ssx-canvas"
        aria-label={label}
        role="img"
        dpr={[1, 1.5]}
        frameloop={paused ? 'never' : 'always'}
        gl={{ antialias: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 2.3, 6.2], fov: 52, near: 0.1, far: 120 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.6, -8)}
      >
        <color attach="background" args={[sky]} />
        <fog attach="fog" args={[sky, 24, 70]} />
        <hemisphereLight args={['#ffffff', dark ? '#1b2a49' : '#9fd3f5', 1.1]} />
        <directionalLight position={[4, 8, 5]} intensity={1.2} />
        <Scenery motion={motion} night={dark} />
        <Ground />
        <Gates motion={motion} reducedMotion={reducedMotion} />
        <RainClouds motion={motion} onCloudHit={onCloudHit} />
        <Bird motion={motion} decoderPath={decoderPath} reducedMotion={reducedMotion} bumpRef={bumpRef} />
      </Canvas>
    </CanvasBoundary>
  )
}

export default memo(SkyScienceCanvas)
