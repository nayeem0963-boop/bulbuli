import { memo, useMemo } from 'react'
import { useRamp } from '../../../hooks/useCollision'
import { rampGridMaterial } from '../../../shaders/neonGridMaterial'
import { geo, mat } from './materials'

const THICKNESS = 0.5

/**
 * Inclined launch ramp rising `rise` metres over `length` metres (toward −z).
 * Collision is the analytic slope (height grows linearly from z0 to z0 − length), so the
 * player climbs at the ramp's angle and keeps that upward speed when leaving the top.
 */
export const Ramp = memo(function Ramp({ x, z0, length, rise, w }) {
  const angle = Math.atan2(rise, length)
  const hyp = Math.hypot(length, rise)
  // centre chosen so the top surface starts at y=0 on z0 and ends at y=rise
  const cy = rise / 2 - (THICKNESS / 2) * Math.cos(angle)
  const cz = z0 - length / 2 - (THICKNESS / 2) * Math.sin(angle)
  useRamp(useMemo(() => ({ x, w, z0, length, rise }), [x, w, z0, length, rise]))

  return (
    <group position={[x, cy, cz]} rotation={[angle, 0, 0]}>
      <group scale={[w, THICKNESS, hyp]}>
        <mesh geometry={geo.box} material={mat.platform} />
        <lineSegments geometry={geo.boxEdges} material={mat.rampEdge} />
      </group>
      <mesh
        geometry={geo.plane}
        material={rampGridMaterial}
        position={[0, THICKNESS / 2 + 0.005, 0]}
        rotation-x={-Math.PI / 2}
        scale={[w, hyp, 1]}
      />
      {/* Chevrons pointing up the ramp */}
      {[0.25, 0.5, 0.75].map((t) =>
        [-1, 1].map((s) => (
          <mesh
            key={`${t}${s}`}
            geometry={geo.box}
            material={mat.chevron}
            position={[s * 0.6, THICKNESS / 2 + 0.03, hyp / 2 - t * hyp]}
            rotation={[0, s * 0.6, 0]}
            scale={[1.5, 0.03, 0.15]}
          />
        )),
      )}
    </group>
  )
})
