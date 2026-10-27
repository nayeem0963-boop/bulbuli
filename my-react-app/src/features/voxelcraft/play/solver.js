import { PHYSICS, createPlayer, createWorld, stepPlayer } from './physics.js'

/**
 * Brute-force "is this level beatable?" check using the real physics engine (test / tooling use;
 * not imported by the app). From every spot the player can stand, it tries runs and jumps in
 * 16 directions with several run-ups and jump timings, records where each attempt comes to
 * rest, and keeps exploring until the finish trigger is hit or nothing new is reachable.
 *
 * @returns {{ beatable: boolean, spots: number }}
 */
export function canReachFinish(level, { maxSpots = 400 } = {}) {
  const world = createWorld(level)
  if (!world.finishBox) return { beatable: false, spots: 0 }
  const dirs = Array.from({ length: 16 }, (_, i) => [Math.cos((i * Math.PI) / 8), Math.sin((i * Math.PI) / 8)])
  const key = (p) => `${Math.floor(p.x * 2)},${Math.round(p.y * 10)},${Math.floor(p.z * 2)}`
  const start = createPlayer(world)
  const seen = new Set([key(start)])
  const queue = [{ x: start.x, y: start.y, z: start.z }]

  while (queue.length && seen.size < maxSpots) {
    const pos = queue.shift()
    for (const [dx, dz] of dirs)
      for (const jumpAt of [-1, 0, 8, 16, 26])
        for (const runFrames of [10, 24, 45, 90]) {
          // Jumps either release the stick on landing (precise hops onto 1x1 blocks) or keep running.
          for (const releaseOnLand of jumpAt < 0 ? [false] : [true, false]) {
          const p = createPlayer(world)
          Object.assign(p, pos)
          let airborne = false
          let landed = false
          for (let i = 0; i < 720; i++) {
            if (!p.grounded) airborne = true
            else if (airborne) landed = true
            const holdFor = jumpAt < 0 ? runFrames : Math.max(runFrames, jumpAt + 1) + 70
            const moving = i < holdFor && !(releaseOnLand && landed)
            const ev = stepPlayer(p, {
              moveX: moving ? dx : 0,
              moveZ: moving ? dz : 0,
              jumpPressed: i === jumpAt,
              jumpHeld: jumpAt >= 0 && i < jumpAt + 45,
            }, PHYSICS.STEP)
            if (ev.some((e) => e.type === 'finish')) return { beatable: true, spots: seen.size }
            if (ev.some((e) => e.type === 'lava' || e.type === 'void')) break
            if (p.grounded && !moving && Math.abs(p.vx) + Math.abs(p.vz) < 1e-3) {
              const k = key(p) // came to rest: a new standing spot to explore from
              if (!seen.has(k)) {
                seen.add(k)
                queue.push({ x: p.x, y: p.y, z: p.z })
              }
              break
            }
          }
          }
        }
  }
  return { beatable: false, spots: seen.size }
}
