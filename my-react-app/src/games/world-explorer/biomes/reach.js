/**
 * Reachability (design T10): proves with the REAL movement rules (skyward-explorer/physics.js,
 * unchanged) that every station of a map can be reached on foot from the spawn point.
 *
 * Each intended link is tried by simulating a run-and-jump from one disc to the other, without
 * gliding, against the map's full collider list (so trees or rocks in the way would fail it).
 */
import { createPlayer, stepPlayer } from '../../skyward-explorer/physics.js'
import { collidersFor } from './common.js'

const DT = 1 / 60

/** Simulates walking from disc `from` towards disc `to`, jumping near the edge. true if Bulbuli lands on `to`. */
export function canHop(colliders, from, to, { glide = false } = {}) {
  const fromC = colliders.find((c) => c.id === from.id)
  const toC = colliders.find((c) => c.id === to.id)
  // start at the centre of `from`; jump only when the next piece is higher or there is a gap
  const gap = Math.hypot(to.x - from.x, to.z - from.z) - fromC.r - toC.r
  const needsJump = toC.top > fromC.top + 0.04 || gap > 0.5
  const p = createPlayer({ position: [from.x, fromC.top, from.z], facing: Math.atan2(to.x - from.x, to.z - from.z) })
  p.groundId = fromC.id
  let jumped = false
  for (let t = 0; t < 8; t += DT) {
    const dx = toC.x - p.pos[0]
    const dz = toC.z - p.pos[2]
    const dist = Math.hypot(dx, dz) || 1
    const fromDist = Math.hypot(p.pos[0] - fromC.x, p.pos[2] - fromC.z)
    const press = needsJump && !jumped && p.grounded && p.groundId === fromC.id && (dist - toC.r <= 1.1 || fromDist >= fromC.r - 0.35)
    // like a player: once above the target, let go of the stick so Bulbuli doesn't overshoot
    const amount = !p.grounded && dist < toC.r * 0.6 ? 0 : 1
    const step = { moveX: (dx / dist) * amount, moveZ: (dz / dist) * amount, jumpPressed: press, jumpHeld: press || (jumped && (glide || p.vel[1] > 0)) }
    if (press) jumped = true
    stepPlayer(p, step, DT, colliders)
    if (p.grounded && p.groundId === toC.id) return true
    if (p.pos[1] < Math.min(fromC.top, toC.top) - 3) return false
  }
  return false
}

/** Discs reachable from the spawn disc by simulated hops along the map's links (both directions). */
export function reachableDiscs(biome) {
  const colliders = collidersFor(biome)
  const spawnDisc = biome.discs.find((d) => Math.hypot(d.x - biome.spawn.position[0], d.z - biome.spawn.position[2]) <= d.r * 0.92 && Math.abs(d.top - biome.spawn.position[1]) < 0.01)
  if (!spawnDisc) return { reached: new Set(), failed: [['spawn', 'not on a disc']] }
  const reached = new Set([spawnDisc.id])
  const failed = []
  let grew = true
  while (grew) {
    grew = false
    for (const [a, b] of biome.links) {
      for (const [from, to] of [[a, b], [b, a]]) {
        if (reached.has(from.id) && !reached.has(to.id)) {
          if (canHop(colliders, from, to)) { reached.add(to.id); grew = true } else failed.push([from.id, to.id])
        }
      }
    }
  }
  return { reached, failed, spawnDisc: spawnDisc.id }
}
