import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateWorld, JUMP } from './layout.js'
import { buildColliders, cameraRelative, createPlayer, PHYS, spawnPoint, stepPlayer } from './physics.js'

const DT = 1 / 60
const idle = { moveX: 0, moveZ: 0, jumpHeld: false, jumpPressed: false }

function pad(id, x, top, r = 2) {
  return { id, kind: 'land', x, z: 0, r, top, bottom: top - 1, walkable: true }
}

/** Run along +x, jump at the edge of `from`, keep running (holding Space if `glide`). Returns where it ends up. */
function runJump(colliders, { glide = false, seconds = 4 } = {}) {
  const p = createPlayer({ position: [0, 0, 0], facing: Math.PI / 2 })
  const from = colliders[0]
  let jumped = false
  for (let t = 0; t < seconds; t += DT) {
    const atEdge = !jumped && p.pos[0] >= from.x + from.r - 0.15
    const input = { moveX: 1, moveZ: 0, jumpHeld: jumped ? glide || p.vel[1] > 0 : atEdge, jumpPressed: atEdge }
    if (atEdge) jumped = true
    stepPlayer(p, input, DT, colliders)
    if (jumped && p.grounded) break
  }
  return p
}

test('standing still on the island stays put', () => {
  const world = generateWorld(7)
  const colliders = buildColliders(world)
  const p = createPlayer(spawnPoint(world))
  for (let i = 0; i < 120; i++) stepPlayer(p, idle, DT, colliders)
  assert.equal(p.grounded, true)
  assert.equal(p.pos[1], 0)
})

test('a running jump clears the widest gap at the highest rise the layout makes', () => {
  // the walkable edge is a little inside each chunk, so add that slack to the gap
  const slack = 0.5
  const fromR = 2
  const toR = 2
  const colliders = [pad('a', 0, 0, fromR), pad('b', fromR + JUMP.maxGap + slack + toR, JUMP.maxRise, toR)]
  const p = runJump(colliders)
  assert.equal(p.grounded, true)
  assert.equal(p.groundId, 'b')
})

test('the glider carries Bulbuli much further than a plain jump', () => {
  // how far a running jump off a 4 m ledge travels before dropping that 4 m
  const reach = (glide) => {
    const p = createPlayer({ position: [0, 0, 0], facing: Math.PI / 2 })
    const ledge = [pad('a', 0, 0, 2)]
    let jumped = false
    for (let t = 0; t < 6; t += DT) {
      const atEdge = !jumped && p.pos[0] >= 1.85
      if (atEdge) jumped = true
      stepPlayer(p, { moveX: 1, moveZ: 0, jumpHeld: atEdge || (jumped && (glide || p.vel[1] > 0)), jumpPressed: atEdge }, DT, ledge)
      if (p.pos[1] <= -4) return p.pos[0] - 2
    }
    return Infinity
  }
  const plain = reach(false)
  const gliding = reach(true)
  assert.ok(gliding > plain * 2, `glide ${gliding.toFixed(1)} vs jump ${plain.toFixed(1)}`)
  // but stamina runs out: it never reaches across the island (20 m wide) and on round the ring
  assert.ok(gliding < 25, `glide ${gliding.toFixed(1)}`)
})

test('gliding slows the fall and uses stamina', () => {
  const p = createPlayer({ position: [0, 10, 0], facing: 0 })
  p.grounded = false
  p.groundId = null
  for (let i = 0; i < 60; i++) stepPlayer(p, { ...idle, jumpHeld: true }, DT, [])
  assert.ok(p.vel[1] >= -PHYS.glideMaxFall - 1e-9)
  assert.ok(p.stamina < 0.7)
  // out of stamina: back to a normal fall
  for (let i = 0; i < 300; i++) stepPlayer(p, { ...idle, jumpHeld: true }, DT, [])
  assert.equal(p.stamina, 0)
  assert.equal(p.gliding, false)
})

test('walking into a tree trunk stops at its edge', () => {
  const colliders = [pad('ground', 0, 0, 20), { id: 't', kind: 'prop', x: 3, z: 0, r: 0.3, top: 50, bottom: -1, walkable: false }]
  const p = createPlayer({ position: [0, 0, 0], facing: Math.PI / 2 })
  for (let i = 0; i < 120; i++) stepPlayer(p, { ...idle, moveX: 1 }, DT, colliders)
  assert.ok(p.pos[0] <= 3 - 0.3 - PHYS.radius + 1e-6)
})

test('falling off the world brings Bulbuli back to the last safe spot', () => {
  const colliders = [pad('a', 0, 0, 2)]
  const p = createPlayer({ position: [0, 0, 0], facing: Math.PI / 2 })
  let fell = false
  for (let i = 0; i < 600 && !fell; i++) fell = stepPlayer(p, { ...idle, moveX: 1 }, DT, colliders).fell
  assert.equal(fell, true)
  assert.deepEqual(p.pos, [0, 0, 0])
})

test('controls follow the camera', () => {
  // camera behind Bulbuli looking towards -z (yaw 0): forward is -z, right is +x
  const f = cameraRelative(0, 1, 0)
  assert.ok(Math.abs(f.moveX) < 1e-9 && Math.abs(f.moveZ + 1) < 1e-9)
  const r = cameraRelative(1, 0, 0)
  assert.ok(Math.abs(r.moveX - 1) < 1e-9 && Math.abs(r.moveZ) < 1e-9)
})
