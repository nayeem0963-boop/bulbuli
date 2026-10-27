import { BLOCK, BLOCK_TYPES } from '../level/blockTypes.js'
import { cellKey } from '../level/levelSchema.js'

/**
 * Platformer physics for the voxel world: pure functions with no three.js or React, so they're
 * deterministic and unit-testable. The player is an axis-aligned box (AABB) moved with a fixed
 * timestep; collisions resolve one axis at a time against the solid boxes of nearby cells.
 *
 * Units: 1 = one block. Player position = centre of the feet.
 * The Studio's build floor is NOT solid in play: falling off the course drops into the void.
 */

export const PHYSICS = {
  STEP: 1 / 120, // fixed timestep (s): stable, and max speed per step << player half-width (no tunnelling)
  MAX_STEPS_PER_FRAME: 12, // after a long hitch, drop time instead of spiralling
  GRAVITY: 32,
  MAX_FALL: 35,
  MOVE_SPEED: 6.5,
  GROUND_ACCEL: 70,
  AIR_ACCEL: 30,
  JUMP_VELOCITY: 11, // apex ≈ 1.9 blocks: clears a 1-block step, not a 2-block wall
  JUMP_CUT: 0.45, // releasing jump early multiplies upward speed by this (variable jump height)
  COYOTE_TIME: 0.1, // can still jump this long after walking off a ledge
  JUMP_BUFFER: 0.12, // a jump pressed this long before landing still fires
  MAX_BOUNCE_VELOCITY: 22,
  BOUNCE_HOLD_BONUS: 3, // holding jump as you hit a bounce pad launches a bit higher
  VOID_Y: -10,
  HALF_WIDTH: 0.3,
  HEIGHT: 1.5,
}

const EPS = 1e-6
const HAZARD_REACH = 0.04 // touching lava counts within this distance (standing on it, brushing a side)

/**
 * Collision shape per block type, relative to its cell's min corner. `null` = no solid shape.
 * SPAWN is the short pedestal you stand on; FINISH is a walk-through trigger.
 */
const SOLID_SHAPE = {
  [BLOCK.PLATFORM]: [0, 0, 0, 1, 1, 1],
  [BLOCK.BOUNCE]: [0, 0, 0, 1, 1, 1],
  [BLOCK.LAVA]: [0, 0, 0, 1, 1, 1],
  [BLOCK.SPAWN]: [0.04, 0, 0.04, 0.96, 0.3, 0.96],
  [BLOCK.FINISH]: null,
}
const FINISH_TRIGGER = [0.1, 0, 0.1, 0.9, 1.1, 0.9]
export const SPAWN_STAND_HEIGHT = 0.3

/** Precomputes per-cell lookups for one level. Rebuild when the level changes. */
export function createWorld(level) {
  const cells = new Map()
  let finish = null
  for (const b of level.blocks) {
    cells.set(cellKey(b.x, b.y, b.z), b.type)
    if (b.type === BLOCK.FINISH) finish = b
  }
  const spawn = level.spawnPoint
  return {
    cells,
    spawnPosition: spawn
      ? { x: spawn.x + 0.5, y: spawn.y + SPAWN_STAND_HEIGHT, z: spawn.z + 0.5 }
      : { x: 0.5, y: 2, z: 0.5 },
    finishBox: finish ? boxAt(FINISH_TRIGGER, finish.x, finish.y, finish.z, BLOCK.FINISH) : null,
    finishCell: finish ? { x: finish.x, y: finish.y, z: finish.z } : null,
  }
}

function boxAt(shape, x, y, z, type) {
  return { minX: x + shape[0], minY: y + shape[1], minZ: z + shape[2], maxX: x + shape[3], maxY: y + shape[4], maxZ: z + shape[5], type }
}

/** Is world point p inside a solid block? (Used by the camera to avoid looking through walls.) */
export function solidAt(world, x, y, z) {
  const type = world.cells.get(cellKey(Math.floor(x), Math.floor(y), Math.floor(z)))
  const shape = type && SOLID_SHAPE[type]
  if (!shape) return false
  const fy = y - Math.floor(y)
  return fy >= shape[1] && fy <= shape[4]
}

const playerBox = (p, grow = 0) => ({
  minX: p.x - PHYSICS.HALF_WIDTH - grow,
  minY: p.y - grow,
  minZ: p.z - PHYSICS.HALF_WIDTH - grow,
  maxX: p.x + PHYSICS.HALF_WIDTH + grow,
  maxY: p.y + PHYSICS.HEIGHT + grow,
  maxZ: p.z + PHYSICS.HALF_WIDTH + grow,
})

const overlaps = (a, b) =>
  a.minX < b.maxX - EPS && a.maxX > b.minX + EPS &&
  a.minY < b.maxY - EPS && a.maxY > b.minY + EPS &&
  a.minZ < b.maxZ - EPS && a.maxZ > b.minZ + EPS

/** Solid boxes of every cell the AABB touches. */
function solidsNear(world, box, out) {
  out.length = 0
  const x0 = Math.floor(box.minX), x1 = Math.floor(box.maxX - EPS)
  const y0 = Math.floor(box.minY), y1 = Math.floor(box.maxY - EPS)
  const z0 = Math.floor(box.minZ), z1 = Math.floor(box.maxZ - EPS)
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++) {
        const type = world.cells.get(cellKey(x, y, z))
        const shape = type && SOLID_SHAPE[type]
        if (shape) out.push(boxAt(shape, x, y, z, type))
      }
  return out
}

const _solids = []

/**
 * Moves the player along one axis and pushes it out of anything it now overlaps.
 * @returns {string|null} type of the block hit, if any
 */
function moveAxis(p, axis, delta) {
  if (delta === 0) return null
  p[axis] += delta
  let hit = null
  for (const s of solidsNear(p.world, playerBox(p), _solids)) {
    if (!overlaps(playerBox(p), s)) continue
    if (axis === 'y') p.y = delta > 0 ? s.minY - PHYSICS.HEIGHT : s.maxY
    else if (axis === 'x') p.x = delta > 0 ? s.minX - PHYSICS.HALF_WIDTH : s.maxX + PHYSICS.HALF_WIDTH
    else p.z = delta > 0 ? s.minZ - PHYSICS.HALF_WIDTH : s.maxZ + PHYSICS.HALF_WIDTH
    hit = s.type
  }
  return hit
}

/** A fresh player standing on the world's spawn. */
export function createPlayer(world) {
  const p = {
    world,
    x: 0, y: 0, z: 0,
    vx: 0, vy: 0, vz: 0,
    grounded: false,
    coyote: 0,
    jumpBuffer: 0,
    jumpCutDone: true,
    groundType: null,
  }
  return respawn(p)
}

export function respawn(p) {
  const s = p.world.spawnPosition
  Object.assign(p, { x: s.x, y: s.y, z: s.z, vx: 0, vy: 0, vz: 0, grounded: true, coyote: PHYSICS.COYOTE_TIME, jumpBuffer: 0, jumpCutDone: true, groundType: BLOCK.SPAWN })
  return p
}

const approach = (v, target, maxDelta) => (v < target ? Math.min(v + maxDelta, target) : Math.max(v - maxDelta, target))

/**
 * Advances the player by one fixed step.
 * @param {object} p       player (mutated)
 * @param {{ moveX: number, moveZ: number, jumpPressed: boolean, jumpHeld: boolean }} input
 *        moveX/moveZ: desired world-space direction, length ≤ 1 (camera-relative already applied)
 * @param {number} dt
 * @returns {Array<{ type: 'jump'|'land'|'bounce'|'lava'|'void'|'finish', speed?: number }>}
 */
export function stepPlayer(p, input, dt = PHYSICS.STEP) {
  const events = []
  const P = PHYSICS

  // --- timers: coyote time and jump buffering make jumps feel fair
  p.coyote = p.grounded ? P.COYOTE_TIME : Math.max(0, p.coyote - dt)
  p.jumpBuffer = input.jumpPressed ? P.JUMP_BUFFER : Math.max(0, p.jumpBuffer - dt)

  // --- horizontal: accelerate toward the wished velocity (snappier on the ground)
  const accel = (p.grounded ? P.GROUND_ACCEL : P.AIR_ACCEL) * dt
  p.vx = approach(p.vx, input.moveX * P.MOVE_SPEED, accel)
  p.vz = approach(p.vz, input.moveZ * P.MOVE_SPEED, accel)

  // --- jump
  if (p.jumpBuffer > 0 && p.coyote > 0) {
    p.vy = P.JUMP_VELOCITY
    p.jumpBuffer = 0
    p.coyote = 0
    p.grounded = false
    p.jumpCutDone = false
    events.push({ type: 'jump' })
  }
  // variable jump height: let go early → shorter hop (applied once per jump)
  if (!p.jumpCutDone && !input.jumpHeld && p.vy > 0) {
    p.vy *= P.JUMP_CUT
    p.jumpCutDone = true
  }

  // --- gravity
  p.vy = Math.max(-P.MAX_FALL, p.vy - P.GRAVITY * dt)

  // --- move + collide, one axis at a time
  if (moveAxis(p, 'x', p.vx * dt)) p.vx = 0
  if (moveAxis(p, 'z', p.vz * dt)) p.vz = 0
  const impact = p.vy
  const yHit = moveAxis(p, 'y', p.vy * dt)
  const wasGrounded = p.grounded
  p.grounded = false
  p.groundType = null
  if (yHit) {
    if (impact < 0) {
      p.grounded = true
      p.groundType = yHit
      if (yHit === BLOCK.BOUNCE) {
        // high-elasticity pad: always a strong launch, harder landings launch higher
        const def = BLOCK_TYPES[BLOCK.BOUNCE].physics
        const launch = Math.max(def.launchVelocity, -impact * def.restitution * 0.5) + (input.jumpHeld ? P.BOUNCE_HOLD_BONUS : 0)
        p.vy = Math.min(P.MAX_BOUNCE_VELOCITY, launch)
        p.grounded = false
        p.coyote = 0
        p.jumpCutDone = true // a bounce isn't cut short by releasing jump
        events.push({ type: 'bounce', speed: p.vy })
      } else {
        if (!wasGrounded) events.push({ type: 'land', speed: -impact })
        p.vy = 0
      }
    } else {
      p.vy = 0 // bonked a ceiling
    }
  }

  // --- hazards and triggers
  for (const s of solidsNear(p.world, playerBox(p, HAZARD_REACH), _solids)) {
    if (s.type === BLOCK.LAVA && overlaps(playerBox(p, HAZARD_REACH), s)) {
      events.push({ type: 'lava' })
      return events
    }
  }
  if (p.y < P.VOID_Y) {
    events.push({ type: 'void' })
    return events
  }
  if (p.world.finishBox && overlaps(playerBox(p), p.world.finishBox)) events.push({ type: 'finish' })

  return events
}
