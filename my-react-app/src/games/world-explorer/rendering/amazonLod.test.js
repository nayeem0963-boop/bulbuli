import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { BIOMES } from '../biomes/index.js'
import { scatterAmazon } from './amazonScatter.js'
import { AMAZON_LOD, chooseLevel, createLodSet, selectVisible } from './amazonLod.js'
import { AMAZON_TREE_LOD, amazonTreeHeight, createAmazonDistantTree, createAmazonShadowProxy, createAmazonTree } from './amazonTrees.js'

const triangles = (geometry) => geometry.getAttribute('position').count / 3
const TREES = [[11, 'emergent'], [23, 'canopy'], [37, 'subcanopy']]
const DISTANT = [[61, 'emergent'], [67, 'canopy'], [71, 'subcanopy']]
const box = (geometry) => { geometry.computeBoundingBox(); return geometry.boundingBox }

/** A simple camera: sees everything within `fov` degrees either side of `yaw`, out to `far`. */
const cone = (camera, yaw, fov = 50, far = 320) => (x, y, z, r) => {
  const dx = x - camera.x
  const dz = z - camera.z
  const d = Math.hypot(dx, dz)
  if (d - r > far) return false
  if (d < r + 2) return true
  let off = (Math.atan2(dx, dz) - yaw) % (Math.PI * 2)
  if (off > Math.PI) off -= Math.PI * 2
  if (off < -Math.PI) off += Math.PI * 2
  return Math.abs(off) <= (fov * Math.PI) / 180 + Math.asin(Math.min(1, r / d))
}

test('amazon LOD: the near model is byte-identical to the tree the forest has always drawn', () => {
  // sha-256 of the emergent tree's vertex positions, recorded before levels of detail existed
  const near = createAmazonTree(11, 'emergent')
  assert.equal(createHash('sha256').update(Buffer.from(near.getAttribute('position').array.buffer)).digest('hex').slice(0, 16), '63a79d6fa6011a16')
  assert.deepEqual([...createAmazonTree(11, 'emergent', 'near').getAttribute('position').array.slice(0, 60)], [...near.getAttribute('position').array.slice(0, 60)])
  assert.equal(triangles(near), 18502)
})

test('amazon LOD: mid and far are the same tree with less detail, not a thinner or smaller one', () => {
  for (const [seed, layer] of TREES) {
    const near = createAmazonTree(seed, layer, 'near')
    const mid = createAmazonTree(seed, layer, 'mid')
    const far = createAmazonTree(seed, layer, 'far')
    assert.ok(triangles(mid) <= triangles(near) / 5 && triangles(mid) <= 2700, `${layer} mid has ${triangles(mid)} triangles`)
    assert.ok(triangles(far) <= triangles(near) / 15 && triangles(far) <= 800, `${layer} far has ${triangles(far)} triangles`)
    assert.ok(triangles(far) >= 250, 'far is still a tree, not a card')
    const a = box(near)
    for (const [name, geometry] of [['mid', mid], ['far', far]]) {
      const b = box(geometry)
      // same height and crown spread (larger blades reach a little further)
      assert.ok(Math.abs(b.max.y - a.max.y) <= 0.8, `${layer} ${name} height ${b.max.y.toFixed(1)} vs ${a.max.y.toFixed(1)}`)
      const spread = (q) => Math.max(q.max.x - q.min.x, q.max.z - q.min.z)
      assert.ok(spread(b) >= spread(a) * 0.85 && spread(b) <= spread(a) * 1.4, `${layer} ${name} crown ${spread(b).toFixed(1)} vs ${spread(a).toFixed(1)}`)
      // the trunk stands where the collider is
      const position = geometry.getAttribute('position')
      let trunk = 0
      for (let i = 0; i < position.count; i += 1) if (position.getY(i) < 1.5 && position.getY(i) > 0.6) trunk = Math.max(trunk, Math.hypot(position.getX(i), position.getZ(i)))
      assert.ok(trunk > 0.1 && trunk < 0.6, `${layer} ${name} trunk radius ${trunk.toFixed(2)}`)
      for (let i = 0; i < position.array.length; i += 1) assert.ok(Number.isFinite(position.array[i]))
    }
    // leaf area is kept: fewer blades are larger by about as much
    const leafArea = (lod) => (1 / (AMAZON_TREE_LOD[lod].every * AMAZON_TREE_LOD[lod].clusters)) * AMAZON_TREE_LOD[lod].leafScale ** 2
    assert.ok(leafArea('mid') >= 0.9 && leafArea('mid') <= 1.3)
    assert.ok(leafArea('far') >= 0.7 && leafArea('far') <= 1.1)
  }
  // the three families stay distinct at every level: emergent tallest, subcanopy shortest
  for (const lod of ['near', 'mid', 'far']) {
    const heights = TREES.map(([seed, layer]) => box(createAmazonTree(seed, layer, lod)).max.y)
    assert.ok(heights[0] > heights[1] + 1.5 && heights[1] > heights[2] + 0.5, `${lod}: ${heights.map((h) => h.toFixed(1))}`)
  }
  assert.ok(amazonTreeHeight(11, 'emergent') > amazonTreeHeight(23, 'canopy'))
})

test('amazon LOD: horizon trees and the shadow shape are tiny', () => {
  for (const [seed, form] of DISTANT) {
    const distant = createAmazonDistantTree(seed, form)
    const horizon = createAmazonDistantTree(seed, form, 'horizon')
    assert.deepEqual([...createAmazonDistantTree(seed, form, 'distant').getAttribute('position').array.slice(0, 30)], [...distant.getAttribute('position').array.slice(0, 30)])
    assert.ok(triangles(horizon) <= 130 && triangles(horizon) >= 60, `${form} horizon ${triangles(horizon)}`)
    assert.ok(Math.abs(box(horizon).max.y - box(distant).max.y) < 0.6)
  }
  const shadow = createAmazonShadowProxy(11)
  assert.ok(triangles(shadow) <= 140, `shadow shape ${triangles(shadow)} triangles`)
  const b = box(shadow)
  assert.ok(b.max.y > 8 && b.max.y < 11 && b.max.x - b.min.x > 5, 'as tall and as wide as an emergent crown')
})

test('amazon LOD: a level is chosen by distance and held across the hysteresis band', () => {
  const layers = AMAZON_LOD.tree
  assert.deepEqual(layers.map((l) => l.level), ['near', 'mid', 'far'])
  assert.equal(chooseLevel(layers, 0), 0)
  assert.equal(chooseLevel(layers, layers[0].until - 0.01), 0)
  assert.equal(chooseLevel(layers, layers[0].until + 0.01), 1)
  assert.equal(chooseLevel(layers, layers[1].until + 0.01), 2)
  assert.equal(chooseLevel(layers, 500), 2)
  // just past a threshold the previous level is kept, either way; well past it, not
  const h = AMAZON_LOD.hysteresis
  assert.equal(chooseLevel(layers, layers[0].until + h * 0.9, 0), 0)
  assert.equal(chooseLevel(layers, layers[0].until - h * 0.9, 1), 1)
  assert.equal(chooseLevel(layers, layers[0].until + h * 1.1, 0), 1)
  assert.equal(chooseLevel(layers, layers[0].until - h * 1.1, 1), 0)
  // walking back and forth over a threshold never flickers
  let level = -1
  let changes = 0
  for (let step = 0; step < 200; step += 1) {
    const next = chooseLevel(layers, layers[0].until + Math.sin(step * 0.7) * h * 0.8, level)
    if (level >= 0 && next !== level) changes += 1
    level = next
  }
  assert.equal(changes, 0)
  // the dither that keeps Bulbuli in view only acts within 7 m, so only the near level needs it
  assert.ok(layers[0].until - h >= 7.5)
  assert.ok(AMAZON_LOD.distant[0].until > 40 && AMAZON_LOD.small.length === 1)
})

test('amazon LOD: every tree is still in the forest; each frame draws only what is in view, at a bounded cost', () => {
  const biome = BIOMES.amazon
  const items = scatterAmazon(biome)
  const kinds = {
    emergent: [AMAZON_LOD.tree, 11, createAmazonTree], canopy: [AMAZON_LOD.tree, 23, createAmazonTree], subcanopy: [AMAZON_LOD.tree, 37, createAmazonTree],
    distantEmergent: [AMAZON_LOD.distant, 61, createAmazonDistantTree], distantCanopy: [AMAZON_LOD.distant, 67, createAmazonDistantTree], distantSubcanopy: [AMAZON_LOD.distant, 71, createAmazonDistantTree],
  }
  const sets = Object.entries(kinds).map(([kind, [layers, seed, build]]) => {
    const layer = kind.replace('distant', '').toLowerCase()
    const cost = layers.map((l) => triangles(build(seed, layer, l.level)))
    return { kind, cost, set: createLodSet(items.filter((i) => i.kind === kind), layers, { reach: 9, centre: 5 }) }
  })
  assert.equal(sets.slice(0, 3).reduce((n, s) => n + s.set.items.length, 0), 905, 'all 905 near trees are placed, as before')
  assert.equal(sets.slice(3).reduce((n, s) => n + s.set.items.length, 0), 1760, 'all 1,760 distant trees are placed, as before')
  const full = sets.reduce((n, s) => n + s.set.items.length * s.cost[0], 0)
  assert.ok(full > 12e6, 'drawn whole at full detail the forest is over 12 million triangles')

  const frame = (camera, yaw) => {
    let cost = 0
    let drawn = 0
    for (const { set, cost: each } of sets) {
      drawn += selectVisible(set, camera, cone(camera, yaw))
      for (let level = 0; level < each.length; level += 1) cost += set.counts[level] * each[level]
    }
    return { cost, drawn }
  }
  const [sx, , sz] = biome.spawn.position
  const places = [[sx, sz], ...biome.stations.map((s) => [s.x, s.z]), [0, 0], [10, 10], [-12, 6]]
  const seen = new Set()
  let worst = 0
  for (const [x, z] of places) {
    for (let k = 0; k < 8; k += 1) {
      const yaw = (k * Math.PI) / 4
      const camera = { x: x + Math.sin(yaw) * 3.2, z: z + Math.cos(yaw) * 3.2 }
      const { cost, drawn } = frame(camera, yaw + Math.PI)
      worst = Math.max(worst, cost)
      assert.ok(drawn > 150, `only ${drawn} trees drawn from (${x}, ${z}) facing ${k}: the forest must stay dense`)
      for (const { kind, set } of sets) for (let level = 0; level < set.layers.length; level += 1) for (let n = 0; n < set.counts[level]; n += 1) seen.add(`${kind}:${set.picked[level][n]}`)
    }
  }
  // the budget: under 2 million tree triangles in any view (it was 12.5 million in every view)
  assert.ok(worst <= 2e6, `worst view draws ${Math.round(worst)} tree triangles`)
  assert.ok(worst <= full / 6)
  // and even with every tree in view at once, levels of detail alone keep it under 3 million
  let everything = 0
  for (const { set, cost: each } of sets) {
    selectVisible(set, { x: sx, z: sz }, () => true)
    for (let level = 0; level < each.length; level += 1) everything += set.counts[level] * each[level]
  }
  assert.ok(everything <= 3e6, `all trees in view: ${Math.round(everything)} triangles`)
  // turning on the spot at spawn shows every tree that is within reach of the eye: none is lost
  const all = new Set()
  for (let k = 0; k < 16; k += 1) {
    const yaw = (k * Math.PI) / 8
    frame({ x: sx, z: sz }, yaw)
    for (const { kind, set } of sets) for (let level = 0; level < set.layers.length; level += 1) for (let n = 0; n < set.counts[level]; n += 1) all.add(`${kind}:${set.picked[level][n]}`)
  }
  assert.equal(all.size, 905 + 1760, 'looking all the way round draws every tree at least once')
  // an item behind the camera is not drawn, and its level is remembered for when it comes back
  const { set } = sets[0]
  selectVisible(set, { x: sx, z: sz }, () => false)
  assert.equal(set.counts.reduce((a, b) => a + b, 0), 0)
  assert.ok(set.levels.every((level) => level >= 0))
})

test('amazon LOD: the scenery draws shadows from the stand-in shape and dithers only the near level', () => {
  const source = readFileSync(new URL('./AmazonScenery.jsx', import.meta.url), 'utf8')
  assert.ok(source.includes('createAmazonShadowProxy') && /colorWrite: false/.test(source), 'shadow stand-in is used and never drawn to the screen')
  assert.ok(!/LodInstances[^>]*castShadow/.test(source), 'full trees no longer render into the shadow map')
  assert.ok(/foliageFar/.test(source) && !/foliageFar[^\n]*onBeforeCompile/.test(source))
  assert.ok(source.includes('frustumCulled={false}') && source.includes('selectVisible'), 'visibility is decided per tree, each frame')
  // placement and colliders are untouched by this pass
  assert.equal(scatterAmazon(BIOMES.amazon).filter((i) => ['emergent', 'canopy', 'subcanopy'].includes(i.kind)).length, 905)
})
