import { memo, useMemo } from 'react'
import { PLATFORM_THICKNESS as T } from '../../../config/constants'
import { useSolid } from '../../../hooks/useCollision'
import { boxFrom } from '../../../systems/collisionWorld'
import { platformGridMaterial } from '../../../shaders/neonGridMaterial'
import { geo, mat } from './materials'

/**
 * Floating low-poly platform. Top surface at `y`, spans z0 → z1.
 * The top is a world-space neon grid shader (lane lines, travelling pulses).
 */
export const Platform = memo(function Platform({ x, y, z0, z1, w }) {
  const length = z0 - z1
  const cz = (z0 + z1) / 2
  // collision: the slab itself (top surface at y), standable
  const box = useMemo(() => boxFrom(x, y - T / 2, cz, w, T, length), [x, y, cz, w, length])
  useSolid(box)

  return (
    <group position={[x, y - T / 2, cz]}>

      <group scale={[w, T, length]}>
        <mesh geometry={geo.box} material={mat.platform} />
        <lineSegments geometry={geo.boxEdges} material={mat.platformEdge} />
      </group>

      {/* Inverted pyramid underneath — reads as a floating island against the void */}
      <group position={[0, -T / 2 - 1.6, 0]} scale={[w * 0.85, 3.2, length * 0.85]}>
        <mesh geometry={geo.underside} material={mat.underside} />
        <lineSegments geometry={geo.undersideEdges} material={mat.undersideEdge} />
      </group>

      <mesh
        geometry={geo.plane}
        material={platformGridMaterial}
        position={[0, T / 2 + 0.005, 0]}
        rotation-x={-Math.PI / 2}
        scale={[w, length, 1]}
      />
    </group>
  )
})
