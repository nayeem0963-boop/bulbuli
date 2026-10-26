import { Vector3 } from 'three'
import { FOOT_RADIUS } from '../config/constants'

/**
 * Per-frame runtime data shared between 3D components without going through React.
 *
 * - playerPosition / playerMode: written by PlayerPhysics, read by camera, spawner, model.
 * - gameTime: advances only while PLAYING, so moving hazards freeze when paused.
 * - hitQueue: hazards push { kind, position } here on contact; PlayerPhysics drains it once per frame
 *   and decides whether the hit counts (i-frames, boost).
 * - rails / walls: spatial registries that GrindRail / WallRunPanel add themselves to
 *   on mount and remove on unmount. The player queries these instead of relying on
 *   physics contacts, which keeps attach/detach deterministic.
 */
export const runtime = {
  playerPosition: new Vector3(0, FOOT_RADIUS, 0),
  playerMode: 'RUN',
  wallSide: 0,
  speed: 0,           // current forward speed, m/s
  speedFactor: 0,     // 0..1 progress toward max run speed (surge excluded)
  invulnerable: false,
  gameTime: 0,
  ghostLead: null,    // metres ahead of the racing ghost (negative = behind); null = no ghost
  hitQueue: [],
  rails: new Map(),   // id → { x, y (rail top), z0 (near), z1 (far) }
  walls: new Map(),   // id → { side, yMin, yMax, z0, z1 }
}

export const resetRuntime = () => {
  runtime.playerPosition.set(0, FOOT_RADIUS, 0)
  runtime.playerMode = 'RUN'
  runtime.wallSide = 0
  runtime.speed = 0
  runtime.speedFactor = 0
  runtime.invulnerable = false
  runtime.gameTime = 0
  runtime.ghostLead = null
  runtime.hitQueue.length = 0
  runtime.rails.clear()
  runtime.walls.clear()
}
