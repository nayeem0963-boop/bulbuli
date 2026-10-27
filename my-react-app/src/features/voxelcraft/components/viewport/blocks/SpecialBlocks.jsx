import { useFrame } from '@react-three/fiber'
import { memo, useRef } from 'react'
import { cellCenter } from '../sceneConfig.js'

/**
 * SPAWN and FINISH are unique (one each), so they get bespoke meshes instead of instancing.
 * Each sits inside its grid cell and carries an invisible 1x1x1 hit box: raycasts get clean,
 * axis-aligned face normals no matter how curvy the visible shape is.
 */

// Invisible but raycastable: colorWrite/depthWrite off so it draws nothing.
// Omitted when there are no handlers (play mode), so it costs nothing there.
function HitBox({ block, handlers }) {
  if (!handlers.onClick) return null
  return (
    <mesh
      position-y={0.5}
      onPointerMove={(e) => handlers.onPointerMove(e, block)}
      onPointerOut={handlers.onPointerOut}
      onClick={(e) => handlers.onClick(e, block)}
      onContextMenu={(e) => handlers.onContextMenu(e, block)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial colorWrite={false} depthWrite={false} transparent opacity={0} />
    </mesh>
  )
}

const noRaycast = () => null

export const SpawnPedestal = memo(function SpawnPedestal({ block, handlers }) {
  const arrow = useRef(null)
  useFrame(({ clock }) => {
    if (!arrow.current) return
    const t = clock.elapsedTime
    arrow.current.position.y = 0.72 + Math.sin(t * 2.4) * 0.06
    arrow.current.rotation.y = t * 1.5
  })

  return (
    <group position={[cellCenter(block.x), block.y, cellCenter(block.z)]}>
      {/* pedestal */}
      <mesh position-y={0.14} castShadow receiveShadow raycast={noRaycast}>
        <cylinderGeometry args={[0.46, 0.5, 0.28, 32]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.35} metalness={0.3} />
      </mesh>
      {/* glowing top ring */}
      <mesh position-y={0.29} rotation-x={-Math.PI / 2} raycast={noRaycast}>
        <ringGeometry args={[0.28, 0.42, 40]} />
        <meshBasicMaterial color="#60a5fa" toneMapped={false} />
      </mesh>
      {/* floating "start here" marker */}
      <mesh ref={arrow} rotation-x={Math.PI} castShadow raycast={noRaycast}>
        <coneGeometry args={[0.16, 0.3, 4]} />
        <meshStandardMaterial color="#93c5fd" emissive="#3b82f6" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <HitBox block={block} handlers={handlers} />
    </group>
  )
})

export const FinishRing = memo(function FinishRing({ block, handlers }) {
  const ring = useRef(null)
  const glow = useRef(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (ring.current) ring.current.rotation.y = t * 0.9
    if (glow.current) glow.current.material.opacity = 0.18 + Math.sin(t * 3) * 0.07
  })

  return (
    <group position={[cellCenter(block.x), block.y, cellCenter(block.z)]}>
      {/* base plate */}
      <mesh position-y={0.05} castShadow receiveShadow raycast={noRaycast}>
        <boxGeometry args={[0.9, 0.1, 0.9]} />
        <meshStandardMaterial color="#b45309" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* spinning victory ring */}
      <group ref={ring} position-y={0.55}>
        <mesh castShadow raycast={noRaycast}>
          <torusGeometry args={[0.36, 0.07, 16, 48]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.9} metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh ref={glow} raycast={noRaycast}>
          <circleGeometry args={[0.3, 32]} />
          <meshBasicMaterial color="#fde68a" transparent opacity={0.2} depthWrite={false} side={2} toneMapped={false} />
        </mesh>
      </group>
      <HitBox block={block} handlers={handlers} />
    </group>
  )
})
