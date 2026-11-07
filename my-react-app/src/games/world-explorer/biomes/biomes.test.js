import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BIOMES, collidersFor } from './index.js'
import { WALK_INSET } from './common.js'
import { canHop, reachableDiscs } from './reach.js'
import { createPlayer, PHYS, stepPlayer } from '../../skyward-explorer/physics.js'
import { scatterBiomeAssets } from '../rendering/scattering.js'

const idle = { moveX: 0, moveZ: 0, jumpHeld: false, jumpPressed: false, avatarHeightOffset: 0.06 }

for (const biome of Object.values(BIOMES)) {
  test(`${biome.id}: five stations, each standing on its disc`, () => {
    assert.deepEqual(biome.stations.map((s) => s.n), [1, 2, 3, 4, 5])
    for (const s of biome.stations) {
      const d = biome.discs.find((x) => x.id === s.disc)
      assert.ok(d, `station ${s.n} disc ${s.disc} exists`)
      assert.ok(Math.hypot(s.x - d.x, s.z - d.z) <= d.r - WALK_INSET - 0.4, `station ${s.n} is on the walkable part of ${d.id}`)
    }
  })

  test(`${biome.id}: every station is reachable from the spawn point with the real movement rules`, () => {
    const { reached, failed } = reachableDiscs(biome)
    for (const s of biome.stations) assert.ok(reached.has(s.disc), `station ${s.n} (${s.disc}) unreachable; failed hops ${JSON.stringify(failed)}`)
  })

  test(`${biome.id}: every link can be crossed in BOTH directions (the learner can always get back)`, () => {
    const colliders = collidersFor(biome)
    for (const [a, b] of biome.links) {
      assert.ok(canHop(colliders, a, b), `${a.id} → ${b.id}`)
      assert.ok(canHop(colliders, b, a), `${b.id} → ${a.id}`)
    }
  })

  test(`${biome.id}: ground that looks joined is joined (no invisible holes between flush pieces)`, () => {
    for (const [a, b] of biome.links) {
      if (Math.abs(a.top - b.top) > 0.04) continue
      const drawnGap = Math.hypot(a.x - b.x, a.z - b.z) - a.r - b.r
      const walkGap = drawnGap + 2 * WALK_INSET
      // either clearly separate (a visible jump) or overlapping enough to walk across
      assert.ok(drawnGap > 0.6 || walkGap <= -0.3, `${a.id}–${b.id}: drawn gap ${drawnGap.toFixed(2)}, walkable gap ${walkGap.toFixed(2)}`)
    }
  })

  test(`${biome.id}: nothing solid stands on a station or the spawn point`, () => {
    const blockers = collidersFor(biome).filter((c) => !c.walkable)
    const points = [...biome.stations, { n: 'spawn', x: biome.spawn.position[0], z: biome.spawn.position[2] }]
    for (const p of points) {
      for (const c of blockers) assert.ok(Math.hypot(p.x - c.x, p.z - c.z) > c.r + 1.0, `${c.id} blocks ${p.n}`)
    }
  })
}

test('all three wave 1 expeditions have a map', () => {
  assert.deepEqual(Object.keys(BIOMES).sort(), ['amazon', 'sahara', 'sundarbans'])
})

test('Sundarbans roof support lets Bulbuli land and perch on a roof', () => {
  const roof = collidersFor(BIOMES.sundarbans).find((collider) => collider.id === 'village-roof-0')
  assert.ok(roof?.walkable)
  assert.equal(roof.surfaceType, 'roof')
  const player = createPlayer({ position: [roof.x, roof.top + 0.1, roof.z], facing: 0 })
  player.grounded = false
  player.groundId = null
  player.vel[1] = -1

  for (let i = 0; i < 30 && !player.grounded; i += 1) {
    stepPlayer(player, idle, 1 / 60, [roof])
  }

  assert.equal(player.grounded, true)
  assert.equal(player.isPerched, true)
  assert.equal(player.groundId, roof.id)
  assert.equal(player.pos[1], roof.top + idle.avatarHeightOffset)
})

test('Sundarbans mangrove meshes have trunk blockers and branch perches', () => {
  const trees = scatterBiomeAssets(BIOMES.sundarbans).filter((asset) => asset.kind === 'mangrove' && !asset.background)
  const colliders = collidersFor(BIOMES.sundarbans)
  const branches = colliders.filter((collider) => collider.id.startsWith('mangrove-branch-'))
  const trunks = colliders.filter((collider) => collider.id.startsWith('mangrove-trunk-'))
  assert.ok(trees.length > 10)
  assert.equal(branches.length, trees.length)
  assert.equal(trunks.length, trees.length)
  assert.ok(branches.every((collider) => collider.walkable && collider.surfaceType === 'branch'))

  const branch = branches[0]
  const player = createPlayer({ position: [branch.x, branch.top + 0.1, branch.z], facing: 0 })
  player.grounded = false
  player.groundId = null
  player.vel[1] = -1
  for (let i = 0; i < 30 && !player.grounded; i += 1) {
    stepPlayer(player, idle, 1 / 60, [branch])
  }
  assert.equal(player.grounded, true)
  assert.equal(player.isPerched, true)
  assert.equal(player.groundId, branch.id)
})

test('scattered rocks have walkable support colliders', () => {
  const colliders = collidersFor(BIOMES.sahara).filter((collider) => collider.id.startsWith('scattered-rock-'))
  assert.ok(colliders.length > 0)
  assert.ok(colliders.every((collider) => collider.walkable && collider.surfaceType === 'prop'))

  const rock = colliders[0]
  const player = createPlayer({ position: [rock.x, rock.top + 0.1, rock.z], facing: 0 })
  player.grounded = false
  player.groundId = null
  player.vel[1] = -1
  for (let i = 0; i < 30 && !player.grounded; i += 1) {
    stepPlayer(player, idle, 1 / 60, [rock])
  }
  assert.equal(player.grounded, true)
  assert.equal(player.isPerched, true)
  assert.equal(player.groundId, rock.id)
})

test('box-shaped station props and boardwalks provide tagged support colliders', () => {
  const biome = BIOMES.sundarbans
  const colliders = collidersFor(biome)
  const tankIndex = biome.props.findIndex((prop) => prop.type === 'waveTank')
  const tank = colliders.find((collider) => collider.id === `box-prop-${tankIndex}`)
  assert.equal(tank?.shape, 'aabb')
  assert.equal(tank?.walkable, true)
  assert.equal(tank?.surfaceType, 'prop')
  assert.equal(tank?.top, 0.7)
  assert.ok(colliders.some((collider) => collider.surfaceType === 'boardwalk'))
})

test('held flight applies smooth ascent and clamps to the safe ceiling', () => {
  const player = createPlayer({ position: [0, 0, 0], facing: 0 })
  const start = player.pos[1]
  stepPlayer(player, { ...idle, flightHeld: true }, 1 / 60, [])
  assert.ok(player.vel[1] > 0)
  assert.ok(player.pos[1] > start)
  assert.equal(player.grounded, false)
  assert.equal(player.gliding, false)

  for (let i = 0; i < 600 && player.pos[1] < PHYS.maxFlightHeight; i += 1) {
    stepPlayer(player, { ...idle, flightHeld: true }, 1 / 60, [])
  }
  assert.equal(player.pos[1], PHYS.maxFlightHeight)
  assert.equal(player.vel[1], 0)
})

test('Amazon branch surfaces are declared as perchable colliders', () => {
  const colliders = collidersFor(BIOMES.amazon)
  const branches = colliders.filter((collider) => collider.surfaceType === 'branch')
  assert.ok(branches.length > 0)
  assert.ok(branches.every((collider) => collider.walkable))
  assert.ok(branches.some((collider) => collider.id.startsWith('amazon-emergent-branch-')))
  const branch = branches.find((collider) => collider.id.startsWith('amazon-emergent-branch-'))
  const branchTop = branch.heightAt(branch.x, branch.z)
  const branchPlayer = createPlayer({ position: [branch.x, branchTop + 0.1, branch.z], facing: 0 })
  branchPlayer.grounded = false
  branchPlayer.groundId = null
  branchPlayer.vel[1] = -1
  for (let frame = 0; frame < 30 && !branchPlayer.grounded; frame += 1) {
    stepPlayer(branchPlayer, idle, 1 / 60, [branch])
  }
  assert.equal(branchPlayer.grounded, true)
  assert.equal(branchPlayer.isPerched, true)
  assert.equal(branchPlayer.groundId, branch.id)

  const log = colliders.find((collider) => collider.id.startsWith('amazon-fallen-log-') && collider.surfaceType === 'log')
  assert.ok(log)
  const logPlayer = createPlayer({ position: [log.x, log.top + 0.1, log.z], facing: 0 })
  logPlayer.grounded = false
  logPlayer.groundId = null
  logPlayer.vel[1] = -1
  for (let frame = 0; frame < 30 && !logPlayer.grounded; frame += 1) {
    stepPlayer(logPlayer, idle, 1 / 60, [log])
  }
  assert.equal(logPlayer.grounded, true)
  assert.equal(logPlayer.isPerched, true)
  assert.equal(logPlayer.groundId, log.id)
})

test('Amazon tree trunks block walking and upward flight with clearance for the visible trunk', () => {
  const colliders = collidersFor(BIOMES.amazon)
  const tree = colliders.find((collider) => collider.id === 'prop-0')
  const floor = colliders.find((collider) => collider.id === 'floor')
  assert.equal(tree.collisionKind, 'tree-trunk')
  const safeDistance = tree.collisionRadius + PHYS.radius + PHYS.treeCollisionPadding

  const walker = createPlayer({ position: [tree.x - 4, 0, tree.z], facing: Math.PI / 2 })
  for (let frame = 0; frame < 120; frame += 1) {
    stepPlayer(walker, { ...idle, moveX: 1 }, 1 / 60, [floor, tree])
  }
  assert.ok(Math.hypot(walker.pos[0] - tree.x, walker.pos[2] - tree.z) >= safeDistance - 1e-6)

  const embedded = createPlayer({ position: [tree.x + 0.1, 0, tree.z], facing: Math.PI / 2 })
  stepPlayer(embedded, idle, 1 / 60, [floor, tree])
  assert.ok(Math.hypot(embedded.pos[0] - tree.x, embedded.pos[2] - tree.z) >= safeDistance - 1e-6)

  const flyer = createPlayer({ position: [tree.x - 4, 1, tree.z], facing: Math.PI / 2 })
  flyer.grounded = false
  flyer.groundId = null
  for (let frame = 0; frame < 45; frame += 1) {
    stepPlayer(flyer, { ...idle, moveX: 1, flightHeld: true }, 1 / 60, [floor, tree])
    if (flyer.pos[1] < tree.top) {
      assert.ok(Math.hypot(flyer.pos[0] - tree.x, flyer.pos[2] - tree.z) >= safeDistance - 1e-6)
    }
  }

  const amazonTrunk = colliders.find((collider) => collider.id.startsWith('amazon-emergent-trunk-'))
  assert.ok(amazonTrunk.rootRadius > amazonTrunk.collisionRadius, 'emergent trunks account for their flared root span')
  const rootPlayer = createPlayer({ position: [amazonTrunk.x + 0.1, 0, amazonTrunk.z], facing: Math.PI / 2 })
  stepPlayer(rootPlayer, idle, 1 / 60, [floor, amazonTrunk])
  const rootClearance = amazonTrunk.rootRadius + PHYS.radius + PHYS.treeCollisionPadding
  assert.ok(Math.hypot(rootPlayer.pos[0] - amazonTrunk.x, rootPlayer.pos[2] - amazonTrunk.z) >= rootClearance - 1e-6)
})
