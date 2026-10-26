import { memo } from 'react'
import { Collectible } from '../collectibles/Collectible'
import { Obstacle } from '../hazards/Obstacle'
import { GrindRail } from './pieces/GrindRail'
import { Platform } from './pieces/Platform'
import { Ramp } from './pieces/Ramp'
import { WallRunPanel } from './pieces/WallRunPanel'

/** Renders one generated segment description. Memoised: segments never change after creation. */
export const TrackSegment = memo(function TrackSegment({ segment }) {
  return segment.pieces.map((p) => {
    switch (p.kind) {
      case 'platform':
        return <Platform key={p.id} x={p.x} y={p.y} z0={p.z0} z1={p.z1} w={p.w} />
      case 'ramp':
        return <Ramp key={p.id} x={p.x} z0={p.z0} length={p.length} rise={p.rise} w={p.w} />
      case 'wall':
        return <WallRunPanel key={p.id} id={p.id} side={p.side} z0={p.z0} z1={p.z1} yMin={p.yMin} yMax={p.yMax} />
      case 'rail':
        return <GrindRail key={p.id} id={p.id} x={p.x} y={p.y} z0={p.z0} z1={p.z1} />
      case 'hazard':
        return <Obstacle key={p.id} variant={p.variant} x={p.x} z={p.z} phase={p.phase} speed={p.speed} />
      case 'pickup':
        return <Collectible key={p.id} variant={p.variant} position={p.position} />
      default:
        return null
    }
  })
})
