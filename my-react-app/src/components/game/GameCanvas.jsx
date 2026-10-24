/**
 * GameCanvas.jsx
 *
 * The 3D viewport. Memoised so the score ticking up in the parent never
 * re-renders the <Canvas> tree — only `onTap` matters, and it must be stable
 * (useScoreSync's `addPoints` already is).
 *
 * Two error boundaries:
 *   • ModelErrorBoundary (inside the canvas) — .glb missing / corrupt.
 *     Shows a message with a "Try again" button; the rest of the scene stays.
 *   • ViewportErrorBoundary (around the canvas) — WebGL unavailable or the
 *     GPU context fails. Shows a flat fallback instead of a white screen.
 */
import { Component, memo, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Html, OrbitControls, useGLTF, useProgress } from '@react-three/drei'
import BulbuliModel, { BULBULI_MODEL_URL } from './BulbuliModel'
import './GameCanvas.css'

// English defaults; pass `labels` to translate (see src/games/bulbuli-3d/text.js).
const DEFAULT_LABELS = {
  loading: (pct) => `Bulbuli is hatching… ${pct}%`,
  modelError: 'Bulbuli flew away!',
  retry: 'Try again',
  noWebgl: "This device can't show the 3D bird right now.",
  ariaLabel: 'Bulbuli the bird. Tap to collect stars.',
}

/* ---------- Kid-friendly loader (rendered inside the canvas) ---------- */
function NestLoader({ labels }) {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="bulbuli-loader" role="status" aria-live="polite">
        <div className="bulbuli-loader__egg" aria-hidden="true">🥚</div>
        <div className="bulbuli-loader__bar">
          <div className="bulbuli-loader__fill" style={{ width: `${progress}%` }} />
        </div>
        <p>{labels.loading(Math.round(progress))}</p>
      </div>
    </Html>
  )
}

/* ---------- .glb failed to load: friendly message + retry ---------- */
class ModelErrorBoundary extends Component {
  state = { failed: false, attempt: 0 }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err) {
    console.error(`[Bulbuli] model failed to load from ${BULBULI_MODEL_URL} (file should be at public/models/bulbuli.glb)`, err)
  }
  retry = () => {
    // useGLTF caches the failed request; clear it so the retry really refetches.
    useGLTF.clear(BULBULI_MODEL_URL)
    this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }))
  }
  render() {
    if (this.state.failed) {
      return (
        <Html center>
          <div className="bulbuli-loader bulbuli-loader--interactive" role="alert">
            <div className="bulbuli-loader__egg" aria-hidden="true">🪺</div>
            <p>{this.props.labels.modelError}</p>
            <button type="button" className="bulbuli-retry" onClick={this.retry}>
              {this.props.labels.retry}
            </button>
          </div>
        </Html>
      )
    }
    // key forces a fresh Suspense subtree on each retry
    return <group key={this.state.attempt}>{this.props.children}</group>
  }
}

/* ---------- No WebGL / context failure: DOM fallback ---------- */
class ViewportErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err) {
    console.error('[Bulbuli] 3D view could not start (WebGL unavailable?)', err)
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="bulbuli-loader bulbuli-canvas__fallback" role="alert">
          <div className="bulbuli-loader__egg" aria-hidden="true">🐦</div>
          <p>{this.props.labels.noWebgl}</p>
        </div>
      )
    }
    return this.props.children
  }
}

/* ---------- The canvas ---------- */
function GameCanvas({ onTap, pointsPerTap = 1, className = '', labels: customLabels }) {
  const labels = customLabels ?? DEFAULT_LABELS
  return (
    <figure className={`bulbuli-canvas ${className}`} aria-label={labels.ariaLabel}>
      <ViewportErrorBoundary labels={labels}>
        <Canvas
          shadows
          dpr={[1, 2]} // cap pixel ratio: crisp on retina, cheap on low-end tablets
          camera={{ position: [0, 0.5, 5], fov: 40 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          {/* Lighting: soft sky/ground fill + one warm key light. Tuned for this
              model's matte (metallic 0, roughness 0.6) texture so colours stay
              bright without washing out under ACES tone mapping. */}
          <hemisphereLight args={['#fff6e5', '#9ad0ff', 0.7]} />
          <ambientLight intensity={0.3} />
          <directionalLight
            position={[3, 5, 4]}
            intensity={1.8}
            color="#fff2d9"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0005}
          />
          {/* Cool rim light from behind so the silhouette pops */}
          <directionalLight position={[-4, 2, -3]} intensity={0.7} color="#bfe3ff" />

          <ModelErrorBoundary labels={labels}>
            <Suspense fallback={<NestLoader labels={labels} />}>
              {/* Fitted to 2 units wide (wingspan) × ~1 unit tall, centred on the origin */}
              <BulbuliModel onTap={onTap} points={pointsPerTap} position={[0, 0.05, 0]} />
            </Suspense>
          </ModelErrorBoundary>

          {/* Soft blob shadow just under the bird's feet */}
          <ContactShadows position={[0, -0.7, 0]} opacity={0.35} scale={5} blur={2.5} far={2} />

          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom={false}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.6}
            target={[0, 0, 0]}
            // Lock the vertical angle to a narrow, friendly band: kids can spin
            // the bird left/right but can't flip under the "floor".
            minPolarAngle={Math.PI / 2.6}
            maxPolarAngle={Math.PI / 2.1}
          />
        </Canvas>
      </ViewportErrorBoundary>

      {/* Required by the model's CC BY 4.0 licence — keep it visible. */}
      <figcaption className="bulbuli-canvas__credit">
        3D model: <a href="https://sketchfab.com/3d-models/bird-7a51fc9ea78d499e980a929ca25a6dba" target="_blank" rel="noopener noreferrer">“bird”</a>{' '}
        by zhao517578549, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
      </figcaption>
    </figure>
  )
}

export default memo(GameCanvas)
