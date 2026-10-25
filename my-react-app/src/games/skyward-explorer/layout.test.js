import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateWorld, ISLAND, JUMP, parkourRoute } from './layout.js'

const flat = ([x, , z]) => [x, z]
const dist2d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
const SEEDS = [1, 7, 42, 2026, 99999]

test('the same seed always builds the same world', () => {
  assert.deepEqual(generateWorld(7), generateWorld(7))
  assert.notDeepEqual(generateWorld(7).platforms, generateWorld(8).platforms)
})

test('every platform can be reached by a jump from the one before', () => {
  for (const seed of SEEDS) {
    const { platforms } = generateWorld(seed)
    const first = platforms[0]
    const gapFromIsland = Math.hypot(...flat(first.position)) - first.radius - ISLAND.radius
    assert.ok(gapFromIsland <= JUMP.maxGap, `seed ${seed}: first jump is ${gapFromIsland.toFixed(2)}`)
    assert.ok(first.position[1] <= JUMP.maxRise)
    for (let i = 1; i < platforms.length; i++) {
      const a = platforms[i - 1]
      const b = platforms[i]
      const gap = dist2d(flat(a.position), flat(b.position)) - a.radius - b.radius
      const rise = b.position[1] - a.position[1]
      assert.ok(gap > 0.5 && gap <= JUMP.maxGap, `seed ${seed}: gap ${i} is ${gap.toFixed(2)}`)
      assert.ok(rise > 0 && rise <= JUMP.maxRise, `seed ${seed}: rise ${i} is ${rise.toFixed(2)}`)
    }
  }
})

test('platforms float clear of the island and of each other, and end at a summit', () => {
  for (const seed of SEEDS) {
    const { platforms } = generateWorld(seed)
    assert.equal(platforms.at(-1).summit, true)
    for (const p of platforms) {
      assert.ok(Math.hypot(...flat(p.position)) - p.radius > ISLAND.radius + 0.5, `seed ${seed}: ${p.id} touches the island`)
    }
    for (let i = 0; i < platforms.length; i++) {
      for (let j = i + 1; j < platforms.length; j++) {
        const a = platforms[i]
        const b = platforms[j]
        const apart = dist2d(flat(a.position), flat(b.position)) - a.radius - b.radius
        const stacked = Math.abs(a.position[1] - b.position[1]) > 3
        assert.ok(apart > 0.3 || stacked, `seed ${seed}: ${a.id} overlaps ${b.id}`)
      }
    }
  }
})

test('trees, rocks and pillars stand on the island and crystals hover over something', () => {
  for (const seed of SEEDS) {
    const world = generateWorld(seed)
    for (const item of [...world.trees, ...world.rocks, ...world.pillars]) {
      assert.ok(Math.hypot(...flat(item.position)) < ISLAND.radius, `seed ${seed}: ${item.id} is off the island`)
    }
    assert.ok(world.trees.length >= 6)
    assert.ok(world.crystals.length >= world.platforms.length)
    for (const c of world.crystals) {
      const onIsland = Math.hypot(...flat(c.position)) < ISLAND.radius
      const onPlatform = world.platforms.some((p) => dist2d(flat(p.position), flat(c.position)) < p.radius)
      assert.ok(onIsland || onPlatform, `seed ${seed}: ${c.id} floats over nothing`)
    }
  }
})

test('the test route starts on the island and visits every platform', () => {
  const world = generateWorld(7)
  const route = parkourRoute(world)
  assert.equal(route.length, world.platforms.length + 1)
  assert.ok(Math.hypot(...flat(route[0])) < ISLAND.radius)
})
