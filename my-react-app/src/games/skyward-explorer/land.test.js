import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLandGeometries } from './islandGeometry.js'
import { generateWorld } from './layout.js'

test('the island and all its platforms merge into three geometries', () => {
  for (const seed of [1, 7, 42]) {
    const land = createLandGeometries(generateWorld(seed))
    assert.deepEqual(Object.keys(land).sort(), ['dirt', 'grass', 'rock'])
    for (const g of Object.values(land)) {
      assert.ok(g.attributes.position.count > 0)
      assert.ok(g.attributes.position.array.every(Number.isFinite), 'no NaN vertices')
      g.dispose()
    }
  }
})

test('every platform\'s grass top is flat at its height', () => {
  const world = generateWorld(7)
  const { grass } = createLandGeometries(world)
  const pos = grass.attributes.position
  for (const p of world.platforms) {
    const [px, py, pz] = p.position
    let found = false
    for (let i = 0; i < pos.count; i++) {
      if (Math.hypot(pos.getX(i) - px, pos.getZ(i) - pz) < 1e-3) {
        // the cap's centre vertex
        if (Math.abs(pos.getY(i) - py) < 1e-4) found = true
      }
    }
    assert.ok(found, `${p.id} has no flat top at ${py}`)
  }
})
