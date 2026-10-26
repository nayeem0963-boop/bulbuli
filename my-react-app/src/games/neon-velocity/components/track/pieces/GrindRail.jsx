import { memo, useEffect, useMemo } from 'react'
import { runtime } from '../../../stores/runtime'
import { geo, mat } from './materials'

const POST_SPACING = 8
const POST_DEPTH = 6

/**
 * Floating neon grind rail. No collider — the rail registers itself in
 * runtime.rails and PlayerPhysics snaps onto it when the player drops within
 * the capture zone. This keeps grinding deterministic at any speed.
 */
export const GrindRail = memo(function GrindRail({ id, x, y, z0, z1 }) {
  const length = z0 - z1

  useEffect(() => {
    runtime.rails.set(id, { x, y, z0, z1 })
    return () => { runtime.rails.delete(id) }
  }, [id, x, y, z0, z1])

  const posts = useMemo(() => {
    const out = []
    for (let z = z0 - 1; z > z1; z -= POST_SPACING) out.push(z)
    return out
  }, [z0, z1])

  return (
    <group>
      <mesh
        geometry={geo.rail}
        material={mat.rail}
        position={[x, y - 0.09, (z0 + z1) / 2]}
        scale={[1, 1, length]}
      />
      {posts.map((z) => (
        <mesh
          key={z}
          geometry={geo.post}
          material={mat.post}
          position={[x, y - 0.09 - POST_DEPTH / 2, z]}
          scale={[1, POST_DEPTH, 1]}
        />
      ))}
    </group>
  )
})
