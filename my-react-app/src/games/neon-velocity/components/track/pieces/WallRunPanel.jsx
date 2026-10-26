import { memo, useEffect, useMemo } from 'react'
import { WALL_THICKNESS, WALL_X } from '../../../config/constants'
import { useSolid } from '../../../hooks/useCollision'
import { boxFrom } from '../../../systems/collisionWorld'
import { runtime } from '../../../stores/runtime'
import { geo, mat } from './materials'

/**
 * Wall-run panel beside a gap. It's solid (you can't pass through it) and it
 * registers its extents in runtime.walls so PlayerPhysics can attach to it.
 */
export const WallRunPanel = memo(function WallRunPanel({ id, side, z0, z1, yMin, yMax }) {
  const length = z0 - z1
  const height = yMax - yMin
  const cy = (yMin + yMax) / 2
  const cz = (z0 + z1) / 2
  // solid sideways (you can't run through it), not something to stand on
  const box = useMemo(() => boxFrom(side * WALL_X, cy, cz, WALL_THICKNESS, height, length), [side, cy, cz, height, length])
  useSolid(box, { standable: false })

  useEffect(() => {
    runtime.walls.set(id, { side, z0, z1, yMin, yMax })
    return () => { runtime.walls.delete(id) }
  }, [id, side, z0, z1, yMin, yMax])

  return (
    <group position={[side * WALL_X, cy, cz]}>
      <group scale={[WALL_THICKNESS, height, length]}>
        <mesh geometry={geo.box} material={mat.wall} />
        <lineSegments geometry={geo.boxEdges} material={mat.wallEdge} />
      </group>
      {/* Horizontal neon strips on the running face */}
      {[-0.25, 0.1, 0.45].map((t) => (
        <mesh
          key={t}
          geometry={geo.box}
          material={mat.wallStripe}
          position={[-side * (WALL_THICKNESS / 2 + 0.01), t * height, 0]}
          scale={[0.02, 0.08, length - 1]}
        />
      ))}
    </group>
  )
})
