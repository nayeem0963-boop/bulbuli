import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseLevel } from '../level/levelSchema.js'
import { PHYSICS, createPlayer, createWorld, respawn, solidAt, stepPlayer } from './physics.js'

const IDLE = { moveX: 0, moveZ: 0, jumpPressed: false, jumpHeld: false }
const level = (blocks) => parseLevel({ blocks }).level
const row = (type, y, z, from, to) => Array.from({ length: to - from + 1 }, (_, i) => ({ type, x: from + i, y, z }))

/** Runs n fixed steps; `input` may be a function of the step index. Collects all events. */
function run(p, n, input = IDLE) {
  const events = []
  for (let i = 0; i < n; i++) {
    const ev = stepPlayer(p, typeof input === 'function' ? input(i) : input)
    events.push(...ev)
    if (ev.some((e) => ['lava', 'void', 'finish'].includes(e.type))) break
  }
  return events
}
const seconds = (s) => Math.round(s / PHYSICS.STEP)
const FAR_SPAWN = { type: 'SPAWN', x: -9, y: 12, z: -9 } // out of the way; tests place the player
const standAt = (p, x, y, z) => Object.assign(p, { x, y, z, vx: 0, vy: 0, vz: 0, grounded: true })

test('spawns standing on the spawn pedestal and stays put', () => {
  const p = createPlayer(createWorld(level([{ type: 'SPAWN', x: 0, y: 3, z: 0 }])))
  assert.deepEqual([p.x, p.y, p.z], [0.5, 3.3, 0.5])
  run(p, seconds(1))
  assert.ok(Math.abs(p.y - 3.3) < 1e-9, `y=${p.y}`)
  assert.equal(p.grounded, true)
})

test('gravity: falls, lands on a platform, emits one land event', () => {
  const w = createWorld(level([{ type: 'SPAWN', x: 0, y: 8, z: 0 }, { type: 'PLATFORM', x: 0, y: 0, z: 0 }]))
  const p = createPlayer(w)
  p.y = 5 // start in the air above the platform
  p.grounded = false
  const ev = run(p, seconds(2))
  assert.equal(p.y, 1)
  assert.equal(p.grounded, true)
  assert.equal(ev.filter((e) => e.type === 'land').length, 1)
})

test('walks across a row of platforms without snagging on block edges', () => {
  const p = standAt(createPlayer(createWorld(level([FAR_SPAWN, ...row('PLATFORM', 0, 0, 0, 8)]))), 0.5, 1, 0.5)
  run(p, seconds(1), { ...IDLE, moveX: 1 })
  assert.ok(p.x > 6, `x=${p.x}`)
  assert.equal(p.y, 1)
  assert.ok(Math.abs(p.vx - PHYSICS.MOVE_SPEED) < 1e-9, 'kept full speed across seams')
})

test('walls stop horizontal movement', () => {
  const w = createWorld(level([
    FAR_SPAWN, ...row('PLATFORM', 0, 0, 0, 4),
    { type: 'PLATFORM', x: 3, y: 1, z: 0 }, { type: 'PLATFORM', x: 3, y: 2, z: 0 },
  ]))
  const p = standAt(createPlayer(w), 0.5, 1, 0.5)
  run(p, seconds(2), { ...IDLE, moveX: 1 })
  assert.ok(Math.abs(p.x - (3 - PHYSICS.HALF_WIDTH)) < 1e-9, `x=${p.x}`)
})

test('jump apex ≈ 1.9 blocks; short hop when released early', () => {
  const flat = () => createPlayer(createWorld(level([{ type: 'SPAWN', x: 0, y: 1, z: 0 }, { type: 'PLATFORM', x: 0, y: 0, z: 0 }])))
  const h = (() => { const p = flat(); let top = p.y; for (let i = 0; i < seconds(1.5); i++) { stepPlayer(p, { ...IDLE, jumpPressed: i === 0, jumpHeld: true }); top = Math.max(top, p.y) } return top - 1.3 })()
  assert.ok(h > 1.75 && h < 2.0, `full jump height ${h.toFixed(2)}`)
  const p = flat()
  let apex = p.y
  for (let i = 0; i < seconds(1.5); i++) { stepPlayer(p, { ...IDLE, jumpPressed: i === 0, jumpHeld: i < 6 }); apex = Math.max(apex, p.y) }
  assert.ok(apex - 1.3 < h * 0.5, `short hop ${(apex - 1.3).toFixed(2)}`)
})

test('coyote time: can still jump just after walking off a ledge', () => {
  const w = createWorld(level([{ type: 'SPAWN', x: 0, y: 1, z: 0 }, { type: 'PLATFORM', x: 0, y: 0, z: 0 }]))
  const p = createPlayer(w)
  p.y = 1
  p.x = 1.25 // half off the edge, will slide off
  let left = -1
  for (let i = 0; i < seconds(1) && left < 0; i++) { stepPlayer(p, { ...IDLE, moveX: 1 }); if (!p.grounded) left = i }
  stepPlayer(p, { ...IDLE, moveX: 1 }) // ~8 ms later
  const ev = stepPlayer(p, { ...IDLE, moveX: 1, jumpPressed: true, jumpHeld: true })
  assert.ok(ev.some((e) => e.type === 'jump'), 'jump allowed within coyote window')
})

test('bounce pad launches much higher than a jump', () => {
  const w = createWorld(level([{ type: 'SPAWN', x: 5, y: 0, z: 5 }, { type: 'BOUNCE', x: 0, y: 0, z: 0 }]))
  const p = createPlayer(w)
  p.x = 0.5; p.y = 3; p.z = 0.5; p.grounded = false
  let top = 0
  const ev = []
  for (let i = 0; i < seconds(2.5); i++) { ev.push(...stepPlayer(p, IDLE)); top = Math.max(top, p.y) }
  const bounce = ev.find((e) => e.type === 'bounce')
  assert.ok(bounce && bounce.speed >= 14, `launch ${bounce?.speed}`)
  assert.ok(top - 1 > 3, `rose ${(top - 1).toFixed(2)} blocks above the pad`)
})

test('lava kills on touch (standing or brushing a side)', () => {
  const w = createWorld(level([{ type: 'SPAWN', x: 0, y: 5, z: 3 }, { type: 'PLATFORM', x: 0, y: 0, z: 0 }, { type: 'PLATFORM', x: 1, y: 0, z: 0 }, { type: 'LAVA', x: 2, y: 1, z: 0 }]))
  const p = standAt(createPlayer(w), 0.5, 1, 0.5)
  const side = run(p, seconds(2), { ...IDLE, moveX: 1 })
  assert.equal(side.at(-1)?.type, 'lava', 'brushing the side')
  respawn(p)
  assert.deepEqual([p.x, p.y, p.z, p.vx], [0.5, 5.3, 3.5, 0], 'respawn resets to spawn, stopped')
  standAt(p, 2.5, 2, 0.5) // standing on top of the lava block
  assert.equal(stepPlayer(p, IDLE).at(-1)?.type, 'lava', 'standing on top')
})

test('falling below Y = -10 is a void death', () => {
  const p = createPlayer(createWorld(level([{ type: 'SPAWN', x: 0, y: 2, z: 0 }])))
  const ev = run(p, seconds(3), { ...IDLE, moveX: 1 })
  assert.equal(ev.at(-1).type, 'void')
  assert.ok(p.y < PHYSICS.VOID_Y)
})

test('walking into the finish ring triggers finish (it is not solid)', () => {
  const w = createWorld(level([
    FAR_SPAWN, ...row('PLATFORM', 0, 0, 0, 4), { type: 'FINISH', x: 3, y: 1, z: 0 },
  ]))
  const p = standAt(createPlayer(w), 0.5, 1, 0.5)
  const ev = run(p, seconds(2), { ...IDLE, moveX: 1 })
  assert.equal(ev.at(-1)?.type, 'finish')
  assert.ok(solidAt(w, 1.5, 0.5, 0.5) && !solidAt(w, 3.5, 1.5, 0.5))
})

test('build floor is not solid in play mode', () => {
  const p = createPlayer(createWorld(level([{ type: 'SPAWN', x: 0, y: 0, z: 0 }])))
  run(p, seconds(2), { ...IDLE, moveZ: 1 })
  assert.ok(p.y < 0, 'walked off the pedestal and fell through y = 0')
})
