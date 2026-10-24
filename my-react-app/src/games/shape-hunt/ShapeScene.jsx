/**
 * The 3D part of Shape Hunt: floating shapes laid out in a grid that fits the
 * screen, with Bulbuli perched above them.
 *
 * Everything that moves every frame lives in refs, so React only re-renders
 * when a round changes or a shape is tapped — never per frame.
 */
import { Component, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, useCursor } from '@react-three/drei'
import { Color } from 'three'
import BulbuliModel from '../../components/game/BulbuliModel.jsx'

const TAP_SLOP_PX = 12
const FADED_COLOR = new Color('#b9c0cc')

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Press + release within a few pixels = a tap. Scrolling the page is not. */
function useTap(onTap) {
  const start = useRef(null)
  return useMemo(() => ({
    onPointerDown: (e) => {
      e.stopPropagation()
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    },
    onPointerUp: (e) => {
      e.stopPropagation()
      const s = start.current
      start.current = null
      if (!s || s.id !== e.pointerId) return
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > TAP_SLOP_PX) return
      onTap()
    },
    onPointerCancel: () => {
      start.current = null
    },
  }), [onTap])
}

/** Each shape is built to be roughly 1.2 units tall/wide. */
function ShapeGeometry({ shape }) {
  switch (shape) {
    case 'cube':
      return <boxGeometry args={[1, 1, 1]} />
    case 'sphere':
      return <sphereGeometry args={[0.62, 40, 28]} />
    case 'cone':
      return <coneGeometry args={[0.6, 1.2, 40]} />
    case 'cylinder':
      return <cylinderGeometry args={[0.5, 0.5, 1.1, 40]} />
    case 'pyramid':
      return <coneGeometry args={[0.75, 1.1, 4]} />
    case 'torus':
      return <torusGeometry args={[0.45, 0.2, 20, 48]} />
    default:
      return <boxGeometry args={[1, 1, 1]} />
  }
}

// Starting tilt so every shape shows it is 3D (a cube face-on looks like a square).
const TILT = {
  cube: [0.45, 0.6, 0],
  sphere: [0.3, 0, 0],
  cone: [0.25, 0, 0],
  cylinder: [0.35, 0, 0],
  pyramid: [0.25, 0.4, 0],
  torus: [0.9, 0, 0],
}

const ShapeItem = memo(function ShapeItem({
  option, position, scale, status, focused, badge, label, reducedMotion, onPick,
}) {
  const group = useRef()
  const spinner = useRef()
  const material = useRef()
  const motion = useRef({ shake: 0, jump: 0, jumpVel: 0, phase: Math.random() * Math.PI * 2 })
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && status === 'idle')

  const baseColor = useMemo(() => new Color(option.color), [option.color])

  // Kick off feedback animations when the status changes.
  useEffect(() => {
    if (status === 'wrong') motion.current.shake = 1
    if (status === 'correct') motion.current.jumpVel = reducedMotion ? 3 : 7
  }, [status, reducedMotion])

  useFrame((state, delta) => {
    const g = group.current
    const sp = spinner.current
    const m = material.current
    if (!g || !sp || !m) return
    const dt = Math.min(delta, 1 / 30)
    const t = state.clock.elapsedTime
    const mo = motion.current

    // Idle float + spin (slower for reduced motion).
    const float = reducedMotion ? 0 : Math.sin(t * 1.6 + mo.phase) * 0.06
    sp.rotation.y += dt * (status === 'correct' ? 4 : reducedMotion ? 0.25 : 0.7)

    // Wrong: quick side-to-side shake that fades out.
    mo.shake = Math.max(0, mo.shake - dt * 2.2)
    const shakeX = Math.sin(t * 45) * mo.shake * 0.12

    // Correct: a hop driven by a damped spring.
    mo.jumpVel += (-90 * mo.jump - 9 * mo.jumpVel) * dt
    mo.jump += mo.jumpVel * dt

    g.position.set(position[0] + shakeX, position[1] + float + Math.max(0, mo.jump) * 0.25, position[2])

    const grow = status === 'correct' ? 1.2 : focused || (hovered && status === 'idle') ? 1.1 : 1
    const s = g.scale.x + (scale * grow - g.scale.x) * Math.min(1, dt * 10)
    g.scale.setScalar(s)

    // Tried-and-wrong shapes fade to grey so the child can see what's left.
    const targetColor = status === 'wrong' || status === 'faded' ? FADED_COLOR : baseColor
    m.color.lerp(targetColor, Math.min(1, dt * 6))
    const targetOpacity = status === 'wrong' || status === 'faded' ? 0.45 : 1
    m.opacity += (targetOpacity - m.opacity) * Math.min(1, dt * 6)
    m.emissiveIntensity = focused ? 0.35 : status === 'correct' ? 0.25 : 0
  })

  const handlePick = useCallback(() => onPick(option.id), [onPick, option.id])
  const tap = useTap(handlePick)

  return (
    <group ref={group} position={position} scale={scale}>
      <group ref={spinner} rotation={TILT[option.shape] ?? [0.3, 0, 0]}>
        <mesh castShadow>
          <ShapeGeometry shape={option.shape} />
          <meshStandardMaterial
            ref={material}
            color={option.color}
            emissive={option.color}
            emissiveIntensity={0}
            roughness={0.42}
            metalness={0.05}
            transparent
          />
        </mesh>
      </group>

      {/* Big invisible hit sphere: easy for small fingers, and the torus hole still counts. */}
      <mesh
        {...tap}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.85, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {label && (
        <Html position={[0, -0.95, 0]} center zIndexRange={[10, 0]}>
          <span className={`sh-label is-${status}`}>{label}</span>
        </Html>
      )}
      {focused && badge && !label && (
        <Html position={[0, -0.95, 0]} center zIndexRange={[10, 0]}>
          <span className="sh-label is-badge">{badge}</span>
        </Html>
      )}
    </group>
  )
})

/** Lays out N slots in a grid that fits the visible area below the bird. */
function useLayout(count) {
  const { viewport } = useThree()
  return useMemo(() => {
    const { width, height } = viewport
    const portrait = width < height
    const birdBand = height * (portrait ? 0.28 : 0.3)
    let cols = portrait ? Math.min(count, 3) : count
    if (portrait && count === 4) cols = 2
    const rows = Math.ceil(count / cols)
    const top = height / 2 - birdBand
    const bottom = -height / 2 + height * 0.04
    const cellW = width / cols
    const cellH = (top - bottom) / rows
    const scale = Math.min(cellW, cellH) * 0.42
    const slots = []
    for (let i = 0; i < count; i += 1) {
      const row = Math.floor(i / cols)
      const inRow = Math.min(cols, count - row * cols) // last row may be shorter: centre it
      const col = i - row * cols
      const x = (col - (inRow - 1) / 2) * cellW
      const y = top - cellH * (row + 0.5) + scale * 0.15
      slots.push([x, y, 0])
    }
    const birdSize = Math.min(width * 0.42, birdBand * 1.5)
    return { slots, scale, bird: { position: [0, height / 2 - birdBand * 0.5, 0], size: birdSize } }
  }, [viewport, count])
}

/** The bird is decoration: if its model fails, the game carries on without it. */
class QuietBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    console.warn('[Shape Hunt] Bulbuli model did not load; playing without the bird.', error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function Scene({ options, statusOf, focusedId, labelOf, badgeOf, onPick, onBirdTap, reducedMotion }) {
  const layout = useLayout(options.length)
  return (
    <>
      <hemisphereLight args={['#fff6e5', '#9ad0ff', 0.75]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 6, 6]} intensity={1.9} color="#fff2d9" />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} color="#bfe3ff" />

      <QuietBoundary>
        <Suspense fallback={null}>
          <BulbuliModel
            position={layout.bird.position}
            size={layout.bird.size}
            idleSpin={reducedMotion ? 0.1 : 0.35}
            onTap={onBirdTap}
          />
        </Suspense>
      </QuietBoundary>

      {options.map((option, index) => (
        <ShapeItem
          key={option.id}
          option={option}
          position={layout.slots[index]}
          scale={layout.scale}
          status={statusOf(option.id)}
          focused={focusedId === option.id}
          label={labelOf(option.id)}
          badge={badgeOf(index)}
          reducedMotion={reducedMotion}
          onPick={onPick}
        />
      ))}
    </>
  )
}

class ViewportBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    console.error('[Shape Hunt] 3D view could not start (WebGL unavailable?)', error)
  }
  render() {
    return this.state.failed ? <p className="sh-fallback" role="alert">{this.props.message}</p> : this.props.children
  }
}

/**
 * @param {object} props
 * @param {Array<{id, shape, color}>} props.options
 * @param {(id) => 'idle'|'wrong'|'correct'|'faded'} props.statusOf
 * @param {(id) => string|null} props.labelOf   name shown under a shape (after it's tapped)
 * @param {(index) => string} props.badgeOf     number shown under the keyboard-focused shape
 */
function ShapeScene({ noWebglMessage, ...sceneProps }) {
  const [reducedMotion] = useState(prefersReducedMotion)
  return (
    <div className="sh-canvas">
      <ViewportBoundary message={noWebglMessage}>
        <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 8], fov: 35 }} gl={{ antialias: true }}>
          <Scene {...sceneProps} reducedMotion={reducedMotion} />
        </Canvas>
      </ViewportBoundary>
    </div>
  )
}

export default memo(ShapeScene)
