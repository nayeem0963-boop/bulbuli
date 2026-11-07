import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateWorld, JUMP } from './layout.js'
import { buildColliders, cameraRelative, contactRadius, createPlayer, PHYS, spawnPoint, stepPlayer } from './physics.js'

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

test('descending onto a perch uses a downward support probe and keeps Bulbuli above the surface', () => {
  const perch = {
    id: 'branch',
    kind: 'prop',
    x: 0,
    z: 0,
    r: 1,
    top: 3,
    bottom: 2.7,
    walkable: true,
    surfaceType: 'branch',
  }
  const p = createPlayer({ position: [0, 4.1, 0], facing: 0 })
  p.grounded = false
  p.groundId = null
  p.vel[1] = -4

  for (let i = 0; i < 60 && !p.grounded; i += 1) stepPlayer(p, idle, DT, [perch])

  assert.equal(p.grounded, true)
  assert.equal(p.isPerched, true)
  assert.equal(p.groundId, 'branch')
  assert.equal(p.pos[1], perch.top + PHYS.avatarHeightOffset)
})

test('walkable shrub-like props use the increased clearance when landing', () => {
  const shrub = {
    id: 'shrub',
    kind: 'prop',
    x: 0,
    z: 0,
    r: 1,
    top: 0.6,
    bottom: 0,
    walkable: true,
    surfaceType: 'prop',
  }
  const p = createPlayer({ position: [0, 0.8, 0], facing: 0 })
  p.grounded = false
  p.groundId = null
  p.vel[1] = -1

  for (let i = 0; i < 30 && !p.grounded; i += 1) stepPlayer(p, idle, DT, [shrub])

  assert.equal(p.grounded, true)
  assert.equal(p.isPerched, true)
  assert.equal(p.pos[1], shrub.top + PHYS.avatarHeightOffset)
})

test('held flight keeps accelerating until capped by the flight ceiling', () => {
  const p = createPlayer({ position: [0, 0, 0], facing: 0 })
  const input = { ...idle, flightHeld: true }
  stepPlayer(p, input, DT, [])
  const firstSpeed = p.vel[1]
  stepPlayer(p, input, DT, [])
  assert.ok(p.vel[1] > firstSpeed)

  for (let i = 0; i < 300 && p.pos[1] < PHYS.maxFlightHeight; i += 1) stepPlayer(p, input, DT, [])
  assert.equal(p.pos[1], PHYS.maxFlightHeight)
  assert.equal(p.vel[1], 0)
})

test('held flight ascends through a branch support without being grounded or stalled', () => {
  const branch = {
    id: 'overhead-branch',
    kind: 'prop',
    x: 0,
    z: 0,
    r: 1,
    top: 3,
    bottom: 2.7,
    walkable: true,
    surfaceType: 'branch',
  }
  const p = createPlayer({ position: [0, 1.5, 0], facing: 0 })
  p.grounded = false
  p.groundId = null
  const flight = { ...idle, flightHeld: true }

  for (let i = 0; i < 30 && p.pos[1] <= branch.top; i += 1) stepPlayer(p, flight, DT, [branch])

  assert.ok(p.pos[1] > branch.top)
  assert.ok(p.vel[1] > 0)
  assert.equal(p.grounded, false)
})

test('descending onto an AABB prop lands on its highest top surface', () => {
  const box = {
    id: 'utility-box',
    kind: 'prop',
    shape: 'aabb',
    minX: -0.5,
    maxX: 0.5,
    minZ: -0.5,
    maxZ: 0.5,
    x: 0,
    z: 0,
    top: 1,
    bottom: 0.5,
    walkable: true,
    surfaceType: 'prop',
  }
  const p = createPlayer({ position: [0, 1.4, 0], facing: 0 })
  p.grounded = false
  p.groundId = null
  p.vel[1] = -2
  const input = { ...idle, avatarHeightOffset: 0.06 }

  for (let i = 0; i < 30 && !p.grounded; i += 1) stepPlayer(p, input, DT, [box])

  assert.equal(p.grounded, true)
  assert.equal(p.groundId, box.id)
  assert.equal(p.pos[1], box.top + input.avatarHeightOffset)
})

test('walking into an AABB prop pushes Bulbuli out using the box collision radius', () => {
  const box = {
    id: 'crate',
    kind: 'prop',
    shape: 'aabb',
    minX: 1,
    maxX: 2,
    minZ: -0.5,
    maxZ: 0.5,
    x: 1.5,
    z: 0,
    top: 1,
    bottom: 0,
    walkable: true,
    surfaceType: 'prop',
  }
  const ground = pad('ground', 0, 0, 20)
  const p = createPlayer({ position: [0, 0, 0], facing: Math.PI / 2 })

  for (let i = 0; i < 90; i += 1) stepPlayer(p, { ...idle, moveX: 1 }, DT, [ground, box])

  assert.ok(p.pos[0] <= box.minX - PHYS.boxPlayerRadius + 1e-6)
  assert.ok(p.pos[0] > 0.5, 'the player slides up to the box edge instead of stopping far away')
})

test('walking into a tree trunk stops at its edge', () => {
  const colliders = [pad('ground', 0, 0, 20), { id: 't', kind: 'prop', x: 3, z: 0, r: 0.3, top: 50, bottom: -1, walkable: false }]
  const p = createPlayer({ position: [0, 0, 0], facing: Math.PI / 2 })
  for (let i = 0; i < 120; i++) stepPlayer(p, { ...idle, moveX: 1 }, DT, colliders)
  assert.ok(p.pos[0] <= 3 - 0.3 - PHYS.radius + 1e-6)
})

/** A trunk as the biome maps build them: a tree-trunk cylinder with a wider root flare near its base. */
function trunk(id, x, z, { r = 0.3, root = 0.66, rootTop = 0.5, top = 9, bottom = -0.1 } = {}) {
  return { id, kind: 'prop', collisionKind: 'tree-trunk', x, z, r, collisionRadius: r, rootRadius: root, rootTop, top, bottom, walkable: false }
}

/** How far Bulbuli is inside a trunk's clearance (0 when clear or out of its height band). */
function embedDepth(p, c) {
  const y = p.pos[1]
  if (y >= c.top - 0.05 || y + PHYS.height <= c.bottom) return 0
  return Math.max(0, contactRadius(c, y) - Math.hypot(p.pos[0] - c.x, p.pos[2] - c.z))
}

test('a long frame at full speed cannot carry Bulbuli through a trunk', () => {
  const tree = trunk('t', 2, 0)
  const ground = pad('ground', 0, 0, 20)
  const p = createPlayer({ position: [0, 0, 0], facing: Math.PI / 2 })
  p.groundId = 'ground'
  p.vel = [40, 0, 0] // a hitch (or a dash) moving 4 m in one 0.1 s frame: far past the trunk
  stepPlayer(p, { ...idle, moveX: 1 }, 0.1, [ground, tree])
  assert.ok(p.pos[0] < tree.x, `ended at x=${p.pos[0].toFixed(2)}, on the far side of the trunk`)
  assert.equal(embedDepth(p, tree), 0)
})

test('dropping into a gap narrower than two root flares ends clear of both trunks', () => {
  // Two Amazon emergent trunks (positions taken from the real map, relative to Bulbuli). Diving
  // between them, the root flares switch on as Bulbuli sinks past rootTop + height and their
  // clearances overlap: pushing out of one trunk at a time ping-pongs between the two.
  const a = trunk('emergent-131', -0.363, 0.821, { r: 0.311, root: 0.689, rootTop: 0.5 })
  const b = trunk('emergent-4', 0.679, -1.264, { r: 0.285, root: 0.631, rootTop: 0.458 })
  const ground = pad('ground', 0, 0, 20)
  const p = createPlayer({ position: [0, 1.662, 0], facing: 0.942 })
  p.grounded = false
  p.groundId = null
  p.vel = [1.746, -10, 1.269]
  for (let i = 0; i < 30; i += 1) {
    stepPlayer(p, { ...idle, moveX: -0.123, moveZ: 0.992 }, DT, [ground, a, b])
    assert.ok(embedDepth(p, a) < 1e-3, `inside ${a.id} by ${embedDepth(p, a).toFixed(3)} m at frame ${i}`)
    assert.ok(embedDepth(p, b) < 1e-3, `inside ${b.id} by ${embedDepth(p, b).toFixed(3)} m at frame ${i}`)
  }
  assert.equal(p.grounded, true)
})

test('flying straight up beside a trunk from below its base is still pushed clear', () => {
  // e.g. rising out of the water next to a mangrove whose collider starts at the waterline
  const tree = trunk('m', 0, 0, { r: 0.26, root: 0, bottom: -0.23, top: 6 })
  const p = createPlayer({ position: [0.4, -1.4, 0], facing: 0 })
  p.grounded = false
  p.groundId = null
  for (let i = 0; i < 40; i += 1) {
    stepPlayer(p, { ...idle, moveX: -1, flightHeld: true }, DT, [tree])
    assert.equal(embedDepth(p, tree), 0, `inside the trunk at frame ${i}`)
  }
})

test('a trunk at the edge of a platform never shoves Bulbuli off it into the water', () => {
  // Walking straight along the rim (+z) into a trunk that stands on the rim: the step itself stays
  // on the island, but sliding round the outside of the trunk would carry Bulbuli past the edge.
  const island = pad('island', 0, 0, 3.2)
  const tree = trunk('rim', 2.7, 0, { root: 0 })
  const p = createPlayer({ position: [2.85, 0, -1.2], facing: 0 })
  p.groundId = 'island'
  for (let i = 0; i < 120; i += 1) {
    const events = stepPlayer(p, { ...idle, moveZ: 1 }, DT, [island, tree])
    assert.equal(events.fell, false)
    assert.equal(p.grounded, true, `knocked off the island at frame ${i}`)
    assert.equal(p.groundId, 'island')
    assert.ok(embedDepth(p, tree) < 1e-3)
  }
})

test('running, jumping and gliding through a dense grove never ends a frame inside a trunk', () => {
  const ground = pad('ground', 0, 0, 30)
  const trees = []
  for (let i = 0; i < 7; i += 1) {
    for (let j = 0; j < 7; j += 1) {
      const jitter = ((i * 7 + j) * 0.618) % 1
      trees.push(trunk(`g${i}-${j}`, -6 + i * 2 + jitter * 0.5, -6 + j * 2 - jitter * 0.4, { root: 0.4 + jitter * 0.3 }))
    }
  }
  const colliders = [ground, ...trees]
  const p = createPlayer({ position: [-9, 0, -9], facing: 0 })
  p.groundId = 'ground'
  let seed = 7
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  for (let i = 0; i < 1800; i += 1) {
    const angle = Math.atan2(-p.pos[0], -p.pos[2]) + (rnd() - 0.5) * 2.4
    const input = {
      moveX: Math.sin(angle),
      moveZ: Math.cos(angle),
      jumpPressed: i % 50 === 0,
      jumpHeld: i % 50 < 30,
      flightHeld: i % 400 > 340,
    }
    stepPlayer(p, input, rnd() < 0.2 ? 1 / 30 : DT, colliders)
    for (const tree of trees) assert.ok(embedDepth(p, tree) < 1e-3, `inside ${tree.id} at frame ${i}`)
  }
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
