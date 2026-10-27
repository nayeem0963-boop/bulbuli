import { PerspectiveCamera, View } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import BlockLayer from '../components/viewport/blocks/BlockLayer.jsx'

/**
 * Live 3D previews for the gallery: ONE WebGL canvas for every card. Each card renders a drei
 * <View> (a tracked div); the shared canvas, fixed behind the page, draws every on-screen view
 * into its own scissored rectangle. Browsers cap WebGL contexts at around 8–16, so one canvas
 * per card would break; this scales to any number of cards, and off-screen views cost nothing.
 *
 * This module (three + drei) is lazy-loaded, so the gallery's first paint is just HTML + SVG.
 */

const NO_HANDLERS = { onPointerMove: undefined, onPointerOut: undefined, onClick: undefined, onContextMenu: undefined }
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * drei's views render with autoClear off and nothing else clears the shared canvas, so as cards
 * scroll their old frames would linger in the gaps between them. Clear everything first each
 * frame (priority −1 runs before the views' priority 1).
 */
function ClearEachFrame() {
  useFrame(({ gl }) => {
    gl.setScissorTest(false)
    gl.setClearColor(0x000000, 0)
    gl.clear(true, true, true)
  }, -1)
  return null
}

/** The shared canvas. Mount once per gallery; `onLive(true|false)` reports whether 3D is running. */
export function GalleryCanvas({ onLive }) {
  useEffect(() => () => onLive(false), [onLive])
  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={() => onLive(true)}
      fallback={null}
      aria-hidden="true"
    >
      <ClearEachFrame />
      <View.Port />
    </Canvas>
  )
}

function levelBounds(blocks) {
  let min = [Infinity, Infinity, Infinity]
  let max = [-Infinity, -Infinity, -Infinity]
  for (const b of blocks) {
    min = [Math.min(min[0], b.x), Math.min(min[1], b.y), Math.min(min[2], b.z)]
    max = [Math.max(max[0], b.x + 1), Math.max(max[1], b.y + 1), Math.max(max[2], b.z + 1)]
  }
  const size = max.map((v, i) => v - min[i])
  return {
    center: min.map((v, i) => v + size[i] / 2),
    radius: Math.max(2, 0.5 * Math.hypot(...size)),
  }
}

function PreviewScene({ blocks, spin }) {
  const { center, radius } = useMemo(() => levelBounds(blocks), [blocks])
  const group = useRef(null)
  const camera = useRef(null)
  const still = useMemo(reducedMotion, [])
  const distance = radius / Math.sin((35 / 2) * (Math.PI / 180)) * 0.74 // fit the level snugly

  useLayoutEffect(() => {
    camera.current?.position.set(0, distance * 0.5, distance * 0.87)
    camera.current?.lookAt(0, 0, 0)
  }, [distance])

  useFrame((_, dt) => {
    const s = spin.current
    if (!s.dragging && !still) s.angle += Math.min(dt, 0.05) * (s.hover ? 0.9 : 0.3)
    if (group.current) group.current.rotation.y = s.angle
  })

  return (
    <>
      <color attach="background" args={['#0b1222']} />
      <PerspectiveCamera ref={camera} makeDefault fov={35} near={0.1} far={200} />
      <ambientLight intensity={0.55} color="#c7d2fe" />
      <hemisphereLight args={['#a5b4fc', '#0f172a', 0.5]} />
      <directionalLight position={[8, 14, 6]} intensity={2} />
      <directionalLight position={[-8, 5, -6]} intensity={0.45} color="#a855f7" />
      <group ref={group}>
        <group position={[-center[0], -center[1], -center[2]]}>
          <BlockLayer blocks={blocks} handlers={NO_HANDLERS} />
        </group>
      </group>
    </>
  )
}

/** A card's live preview: a tracked div whose pixels come from the shared GalleryCanvas. */
export function LevelPreview3D({ blocks, spin, className }) {
  return (
    <View className={className}>
      <PreviewScene blocks={blocks} spin={spin} />
    </View>
  )
}
