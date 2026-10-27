/**
 * Math Master's 3D stage (its own lazy chunk: three.js, R3F and drei load only when the game opens).
 *
 *   • Arena: the lab platform, ring and background (scene/Arena.jsx)
 *   • Figure: the current question's figure, or the level core when it has none (scene/Figures.jsx)
 *
 * Performance: the pixel ratio is capped, the frame loop stops while the tab is hidden, and with
 * prefers-reduced-motion it renders only on demand (when the player drags or the question changes).
 * R3F disposes geometries, materials and the WebGL context when this unmounts.
 */
import { Component, memo, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import GameLoadingSpinner from '../../../components/game/GameLoadingSpinner.jsx'
import SceneReady from '../../../components/game/SceneReady.jsx'
import { useReducedMotion } from '../../../shared/hooks/useReducedMotion.js'
import Arena from './Arena.jsx'
import Figure from './Figures.jsx'
import { LabelOverlay, LabelProjector } from './Labels.jsx'
import { createLabelStore, LabelContext } from './labelStore.js'
import { isBoardVisual } from '../ui/visualKinds.js'

const BASE_FOV = 38
const CAMERA_DISTANCE = 9.6
const VISIBLE_WIDTH = 9 // world units that must fit across, even on a narrow phone stage

function subscribeVisibility(callback) {
  document.addEventListener('visibilitychange', callback)
  return () => document.removeEventListener('visibilitychange', callback)
}
const pageVisible = () => document.visibilityState !== 'hidden'

/** The camera, with a wider field of view on narrow stages so figures never get cut off at the sides. */
function FittedCamera() {
  const size = useThree((state) => state.size)
  const aspect = size.width / Math.max(1, size.height)
  const needed = (2 * Math.atan(VISIBLE_WIDTH / 2 / (CAMERA_DISTANCE * aspect)) * 180) / Math.PI
  const fov = Math.min(70, Math.max(BASE_FOV, needed))
  return <PerspectiveCamera makeDefault position={[0, 2.1, CAMERA_DISTANCE]} fov={fov} near={0.1} far={60} />
}

const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2

/** Brings each new figure in with a small pop, hops on a correct answer and shakes on a wrong one. */
function FocusGroup({ children, feedback, reducedMotion }) {
  const ref = useRef()
  const motion = useRef({ appear: reducedMotion ? 1 : 0, hop: 0, hopVelocity: 0, shake: 0, phase: 0 })

  useEffect(() => {
    if (!feedback || reducedMotion) return
    if (feedback.kind === 'correct') motion.current.hopVelocity = 4.2
    else motion.current.shake = 1
  }, [feedback, reducedMotion])

  useFrame((state, delta) => {
    const group = ref.current
    if (!group) return
    const m = motion.current
    if (reducedMotion) {
      group.scale.setScalar(1)
      group.position.set(0, 0, 0)
      return
    }
    const dt = Math.min(delta, 1 / 30)
    m.appear = Math.min(1, m.appear + dt * 2.6)
    m.hopVelocity += (-60 * m.hop - 7 * m.hopVelocity) * dt
    m.hop += m.hopVelocity * dt
    m.shake = Math.max(0, m.shake - dt * 2.4)
    const t = state.clock.elapsedTime
    group.scale.setScalar(Math.max(0.001, easeOutBack(m.appear)))
    group.position.set(Math.sin(t * 42) * m.shake * 0.09, Math.sin(t * 1.3 + m.phase) * 0.05 + Math.max(0, m.hop) * 0.18, 0)
  })

  return <group ref={ref}>{children}</group>
}

/** Puts the camera back where it started whenever a new question arrives. */
function ResetView({ resetKey, controls }) {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    controls.current?.reset()
    invalidate()
  }, [resetKey, controls, invalidate])
  return null
}

class ViewportBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    console.error('[Math Master] 3D view could not start (WebGL unavailable?)', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/**
 * @param {object} props
 * @param {{ color: string, glyph: string }} props.level
 * @param {object|null} props.visual          the current question's figure (null → level core)
 * @param {string} props.figureKey            changes with each question (resets camera, replays the pop-in)
 * @param {{ kind: 'correct'|'wrong', key: number }|null} props.feedback
 * @param {boolean} props.pickable            points on a coordinate board can be tapped
 * @param {(label: string) => void} props.onPick
 * @param {{ chosen: string|null, answer: string }|null} props.reveal  after answering a tap-the-point question
 * @param {React.ReactNode} props.fallback    shown if WebGL fails while running
 * @param {string} props.loadingLabel
 */
function MathMasterScene({ level, visual, figureKey, feedback, pickable, onPick, reveal, fallback, loadingLabel }) {
  const reducedMotion = useReducedMotion()
  const visible = useSyncExternalStore(subscribeVisibility, pageVisible, () => true)
  const [ready, setReady] = useState(false)
  const [labels] = useState(createLabelStore)
  const markReady = useCallback(() => setReady(true), [])
  const controls = useRef()
  const board = isBoardVisual(visual)
  const frameloop = !visible ? 'never' : reducedMotion ? 'demand' : 'always'

  return (
    <ViewportBoundary fallback={fallback}>
      <Canvas
        className="mm-canvas"
        frameloop={frameloop}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <FittedCamera />
        <hemisphereLight args={['#dfe8ff', '#141a3a', 0.75]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[4, 7, 6]} intensity={1.7} color="#fff4e2" />
        <directionalLight position={[-5, 3, -4]} intensity={0.9} color={level.color} />

        <Arena color={level.color} feedback={feedback} reducedMotion={reducedMotion} />
        <LabelContext.Provider value={labels}>
          <FocusGroup key={figureKey} feedback={feedback} reducedMotion={reducedMotion}>
            <Figure
              visual={visual}
              color={level.color}
              glyph={level.glyph}
              reducedMotion={reducedMotion}
              pickable={pickable}
              onPick={onPick}
              reveal={reveal}
            />
          </FocusGroup>
        </LabelContext.Provider>
        <LabelProjector store={labels} />
        <ContactShadows position={[0, -1.57, 0]} scale={7} blur={2.4} opacity={0.55} far={4} resolution={256} color="#000010" />

        <OrbitControls
          ref={controls}
          makeDefault
          enablePan={false}
          enableDamping={!reducedMotion}
          dampingFactor={0.08}
          rotateSpeed={0.7}
          minDistance={6}
          maxDistance={13}
          target={[0, 0.35, 0]}
          minPolarAngle={Math.PI / 3.6}
          maxPolarAngle={Math.PI / 1.85}
          // boards (graphs, charts, diagrams) can tilt a little but always stay readable
          minAzimuthAngle={board ? -0.55 : -Infinity}
          maxAzimuthAngle={board ? 0.55 : Infinity}
        />
        <ResetView resetKey={figureKey} controls={controls} />
        <SceneReady onReady={markReady} />
      </Canvas>
      <LabelOverlay store={labels} />
      {!ready && <GameLoadingSpinner label={loadingLabel} tone="dark" fill delayMs={0} />}
    </ViewportBoundary>
  )
}

export default memo(MathMasterScene)
