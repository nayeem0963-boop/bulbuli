/**
 * Particle simulation behind AvatarTrail, kept free of three.js/React so it can be unit-tested.
 * A fixed-size ring buffer of particles in world space; the renderer reads `pos`, `age`, `rot`.
 *
 * Teleport safety: a respawn moves the avatar across the map in one frame. Without care the
 * trail would emit particles along that jump and draw a streak through the whole level. Two
 * independent guards prevent it:
 *   1. clear(): called by PlaySession on every respawn/restart. It kills all live particles and
 *      forgets the last position, so the next frame starts a fresh trail at the spawn.
 *   2. a per-frame jump > TELEPORT_DISTANCE is never treated as movement (covers any teleport
 *      that doesn't call clear()).
 */
export const TRAIL_MAX = 120
export const TELEPORT_DISTANCE = 3 // blocks in one frame; real running covers ~0.1
const MIN_EMIT_SPEED = 0.6 // blocks/second: standing still leaves no trail
const DEAD = 1e9

export function createTrailSim(max = TRAIL_MAX) {
  return {
    max,
    pos: new Float32Array(max * 3),
    vel: new Float32Array(max * 3),
    age: new Float32Array(max).fill(DEAD),
    rot: new Float32Array(max),
    seq: 0,
    carry: 0,
    last: { x: 0, y: 0, z: 0 },
    hasLast: false,
  }
}

/** Kills every particle and forgets the last position (respawn / restart / teleport). */
export function clearTrail(sim) {
  sim.age.fill(DEAD)
  sim.carry = 0
  sim.hasLast = false
}

export const isAlive = (sim, i, life) => sim.age[i] < life

/**
 * Advances one frame.
 * @param sim     from createTrailSim
 * @param target  { x, y, z } current avatar world position
 * @param style   { rate, life, up, gravity, spread }
 * @param dt      seconds
 * @param onSpawn (index) => void, so the renderer can colour new particles
 * @param rand    () => [0, 1), injectable for tests
 * @returns number of particles spawned this frame
 */
export function stepTrail(sim, target, style, dt, height = 0.75, onSpawn = () => {}, rand = Math.random) {
  let spawned = 0
  if (sim.hasLast) {
    const dx = target.x - sim.last.x
    const dy = target.y - sim.last.y
    const dz = target.z - sim.last.z
    const moved = Math.hypot(dx, dy, dz)
    const speed = moved / Math.max(dt, 1e-4)
    if (moved < TELEPORT_DISTANCE && speed > MIN_EMIT_SPEED) {
      sim.carry += style.rate * dt
      while (sim.carry >= 1) {
        sim.carry -= 1
        const i = sim.seq++ % sim.max
        const k = i * 3
        // spread spawns along the segment travelled this frame, so fast movement stays continuous
        const f = rand()
        sim.pos[k] = sim.last.x + dx * f + (rand() - 0.5) * 0.12
        sim.pos[k + 1] = sim.last.y + dy * f + height + (rand() - 0.5) * 0.25
        sim.pos[k + 2] = sim.last.z + dz * f + (rand() - 0.5) * 0.12
        sim.vel[k] = (rand() - 0.5) * style.spread
        sim.vel[k + 1] = style.up * (0.6 + rand() * 0.6)
        sim.vel[k + 2] = (rand() - 0.5) * style.spread
        sim.age[i] = 0
        sim.rot[i] = rand() * 6.28
        onSpawn(i)
        spawned++
      }
    } else if (moved >= TELEPORT_DISTANCE) {
      sim.carry = 0
    }
  }
  sim.last.x = target.x
  sim.last.y = target.y
  sim.last.z = target.z
  sim.hasLast = true

  for (let i = 0; i < sim.max; i++) {
    if (sim.age[i] >= DEAD) continue
    sim.age[i] += dt
    const k = i * 3
    sim.vel[k + 1] += style.gravity * dt
    sim.pos[k] += sim.vel[k] * dt
    sim.pos[k + 1] += sim.vel[k + 1] * dt
    sim.pos[k + 2] += sim.vel[k + 2] * dt
    if (style.spin) sim.rot[i] += dt * 8
  }
  return spawned
}
