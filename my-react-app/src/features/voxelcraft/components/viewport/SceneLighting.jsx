import { HALF_GRID } from './sceneConfig.js'

/**
 * Soft ambient fill + a hemisphere tint for the neon mood + one shadow-casting "sun".
 * The sun's orthographic shadow camera is sized to the 20x20 floor (plus a margin for
 * tall builds near the edge), so shadow-map texels aren't wasted on empty space.
 */
export default function SceneLighting() {
  const extent = HALF_GRID + 3

  return (
    <>
      <ambientLight intensity={0.35} color="#c7d2fe" />
      <hemisphereLight args={['#a5b4fc', '#0f172a', 0.45]} />
      <directionalLight
        castShadow
        position={[10, 18, 8]}
        intensity={2.2}
        color="#ffffff"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={4}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-camera-left={-extent}
        shadow-camera-right={extent}
        shadow-camera-top={extent}
        shadow-camera-bottom={-extent}
      />
      {/* Cool purple rim light from the opposite side, no shadows: keeps dark faces readable. */}
      <directionalLight position={[-12, 8, -10]} intensity={0.5} color="#a855f7" />
    </>
  )
}
