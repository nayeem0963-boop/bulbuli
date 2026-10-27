import assert from 'node:assert/strict'
import { test } from 'node:test'
import { TELEPORT_DISTANCE, clearTrail, createTrailSim, stepTrail } from './trailSim.js'

const STYLE = { rate: 60, life: 0.5, up: 0, gravity: 0, spread: 0 }
const DT = 1 / 60
const alive = (sim) => [...sim.age].filter((a) => a < STYLE.life).length
const rand = () => 0.5

/** Runs `frames` frames walking +x at `speed` blocks/s; returns the final position. */
function walk(sim, from, frames, speed = 6) {
  const p = { ...from }
  for (let i = 0; i < frames; i++) {
    p.x += speed * DT
    stepTrail(sim, p, STYLE, DT, 0.75, undefined, rand)
  }
  return p
}

/** Every live particle lies within `r` of the x-range [a, b] on the path. */
const allNear = (sim, a, b, r = 0.5) =>
  [...sim.age].every((age, i) => age >= STYLE.life || (sim.pos[i * 3] >= a - r && sim.pos[i * 3] <= b + r))

test('moving emits particles; standing still emits none', () => {
  const sim = createTrailSim()
  walk(sim, { x: 0, y: 0, z: 0 }, 30)
  assert.ok(alive(sim) > 10)
  const still = createTrailSim()
  for (let i = 0; i < 60; i++) stepTrail(still, { x: 0, y: 0, z: 0 }, STYLE, DT, 0.75, undefined, rand)
  assert.equal(alive(still), 0)
})

test('a respawn teleport without clear() never streaks across the map', () => {
  const sim = createTrailSim()
  const end = walk(sim, { x: -9, y: 0, z: 0 }, 30) // ends near x = -6
  stepTrail(sim, { x: 8, y: 5, z: 8 }, STYLE, DT, 0.75, undefined, rand) // teleport: 15+ blocks in one frame
  assert.ok(15 > TELEPORT_DISTANCE)
  // nothing was spawned in the gap between the old position and the spawn
  assert.ok(allNear(sim, -9, end.x), 'no particle along the teleport path')
})

test('clear() on respawn wipes all particles and starts fresh at the spawn', () => {
  const sim = createTrailSim()
  walk(sim, { x: 0, y: 0, z: 0 }, 30)
  assert.ok(alive(sim) > 0)
  clearTrail(sim)
  assert.equal(alive(sim), 0, 'history gone immediately')
  // first frame after the respawn only records the position (no segment to emit along)
  assert.equal(stepTrail(sim, { x: 5, y: 2, z: 5 }, STYLE, DT, 0.75, undefined, rand), 0)
  walk(sim, { x: 5, y: 2, z: 5 }, 20)
  assert.ok(allNear(sim, 5, 7.1), 'new trail starts at the spawn, not where the player died')
})

test('particles age out after their life', () => {
  const sim = createTrailSim()
  walk(sim, { x: 0, y: 0, z: 0 }, 20)
  for (let i = 0; i < 40; i++) stepTrail(sim, { x: 2, y: 0, z: 0 }, STYLE, DT, 0.75, undefined, rand)
  assert.equal(alive(sim), 0)
})
