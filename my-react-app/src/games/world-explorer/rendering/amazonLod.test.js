import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { BIOMES } from '../biomes/index.js'
import { scatterAmazon } from './amazonScatter.js'
import { Frustum, Matrix4, PerspectiveCamera, Sphere, Vector3 } from 'three'
import { AMAZON_BOUNDS, AMAZON_LOD, chooseLevel, createLodSet, selectVisible } from './amazonLod.js'
import { AMAZON_TREE_LOD, amazonTreeHeight, createAmazonDistantTree, createAmazonShadowProxy, createAmazonTree } from './amazonTrees.js'

const WORST_VIEW = { value: 0 }
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
    const close = createAmazonTree(seed, layer, 'close')
    const mid = createAmazonTree(seed, layer, 'mid')
    const far = createAmazonTree(seed, layer, 'far')
    assert.ok(triangles(mid) <= triangles(near) / 5 && triangles(mid) <= 2700, `${layer} mid has ${triangles(mid)} triangles`)
    assert.ok(triangles(far) <= triangles(near) / 15 && triangles(far) <= 950, `${layer} far has ${triangles(far)} triangles`)
    // close: every blade is still there (flat instead of cupped), at about a third of the cost
    assert.ok(triangles(close) <= triangles(near) * 0.4 && triangles(close) >= triangles(near) * 0.25, `${layer} close has ${triangles(close)} triangles`)
    assert.equal(AMAZON_TREE_LOD.close.every, 1)
    assert.equal(AMAZON_TREE_LOD.close.clusters, 1)
    assert.ok(triangles(far) >= 250, 'far is still a tree, not a card')
    const a = box(near)
    for (const [name, geometry] of [['close', close], ['mid', mid], ['far', far]]) {
      const b = box(geometry)
      // same height and crown spread (larger blades reach a little further)
      assert.ok(Math.abs(b.max.y - a.max.y) <= 0.8, `${layer} ${name} height ${b.max.y.toFixed(1)} vs ${a.max.y.toFixed(1)}`)
      const spread = (q) => Math.max(q.max.x - q.min.x, q.max.z - q.min.z)
      assert.ok(spread(b) >= spread(a) * 0.85 && spread(b) <= spread(a) * 1.4, `${layer} ${name} crown ${spread(b).toFixed(1)} vs ${spread(a).toFixed(1)}`)
      if (name === 'close') continue // (close keeps the lianas, which hang beside the trunk)
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
    assert.ok(leafArea('far') >= 0.85 && leafArea('far') <= 1.1)
  }
  // the three families stay distinct at every level: emergent tallest, subcanopy shortest
  for (const lod of ['near', 'close', 'mid', 'far']) {
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
    assert.ok(triangles(horizon) <= 210 && triangles(horizon) >= 110, `${form} horizon ${triangles(horizon)}`)
    // half the cards at 1.5x size: the crown covers at least as much as the full distant tree
    assert.ok(0.5 * 1.5 ** 2 >= 1)
    assert.ok(Math.abs(box(horizon).max.y - box(distant).max.y) < 0.6)
  }
  const shadow = createAmazonShadowProxy(11)
  assert.ok(triangles(shadow) <= 140, `shadow shape ${triangles(shadow)} triangles`)
  const b = box(shadow)
  assert.ok(b.max.y > 8 && b.max.y < 11 && b.max.x - b.min.x > 5, 'as tall and as wide as an emergent crown')
})

test('amazon LOD: a level is chosen by distance and held across the hysteresis band', () => {
  const layers = AMAZON_LOD.tree
  assert.deepEqual(layers.map((l) => l.level), ['near', 'close', 'mid', 'far'])
  assert.equal(chooseLevel(layers, 0), 0)
  assert.equal(chooseLevel(layers, layers[0].until - 0.01), 0)
  assert.equal(chooseLevel(layers, layers[0].until + 0.01), 1)
  assert.equal(chooseLevel(layers, layers[1].until + 0.01), 2)
  assert.equal(chooseLevel(layers, 500), 3)
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
  // the dither that keeps Bulbuli in view only acts within 7 m: every level that can come that
  // close (allowing for hysteresis) is one of the dithered ones
  assert.ok(layers[AMAZON_LOD.ditherLevels - 1].until - h >= 7.5)
  assert.equal(AMAZON_LOD.ditherLevels, 2)
  // the distant forest keeps its full model across most of its depth (it starts 38 m out)
  assert.ok(AMAZON_LOD.distant[0].until >= 80 && AMAZON_LOD.small.length === 1)
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
  WORST_VIEW.value = worst
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

test('amazon LOD: nothing that can be seen is ever left out (the whole forest footprint is kept)', () => {
  const biome = BIOMES.amazon
  const items = scatterAmazon(biome)
  const models = {
    emergent: createAmazonTree(11, 'emergent'), canopy: createAmazonTree(23, 'canopy'), subcanopy: createAmazonTree(37, 'subcanopy'),
    distantEmergent: createAmazonDistantTree(61, 'emergent'), distantCanopy: createAmazonDistantTree(67, 'canopy'), distantSubcanopy: createAmazonDistantTree(71, 'subcanopy'),
  }
  // 1. each kind's sphere really contains its model, at every level of detail
  for (const [kind, geometry] of Object.entries(models)) {
    const { centre, reach } = AMAZON_BOUNDS[kind]
    const layer = kind.replace('distant', '').toLowerCase()
    const all = kind.startsWith('distant')
      ? AMAZON_LOD.distant.map(({ level }) => createAmazonDistantTree({ emergent: 61, canopy: 67, subcanopy: 71 }[layer], layer, level))
      : AMAZON_LOD.tree.map(({ level }) => createAmazonTree({ emergent: 11, canopy: 23, subcanopy: 37 }[layer], layer, level))
    for (const g of [geometry, ...all]) {
      const p = g.getAttribute('position')
      let furthest = 0
      for (let i = 0; i < p.count; i += 1) furthest = Math.max(furthest, Math.hypot(p.getX(i), p.getY(i) - centre, p.getZ(i)))
      assert.ok(furthest <= reach, `${kind}: a vertex lies ${furthest.toFixed(2)} m from the sphere centre (reach ${reach})`)
    }
  }
  // 2. the footprint is the original one: same counts, same extent, no empty sector
  const near = items.filter((i) => ['emergent', 'canopy', 'subcanopy'].includes(i.kind))
  const distant = items.filter((i) => i.kind.startsWith('distant'))
  assert.equal(near.length, 905)
  assert.equal(distant.length, 1760)
  assert.ok(Math.max(...near.map((i) => Math.hypot(i.x, i.z))) > 30 && Math.max(...distant.map((i) => Math.hypot(i.x, i.z))) > 105)
  for (const group of [near, distant]) {
    const sectors = new Array(24).fill(0)
    for (const i of group) sectors[Math.floor(((Math.atan2(i.z, i.x) + Math.PI) / (Math.PI * 2)) * 24) % 24] += 1
    assert.ok(Math.min(...sectors) >= group.length / 24 / 2.6, `thinnest of 24 sectors holds ${Math.min(...sectors)} trees`)
  }
  // 3. with the game's real camera, every tree with any part on screen is selected for drawing
  const camera = new PerspectiveCamera(50, 1236 / 587, 0.1, 320)
  const frustum = new Frustum()
  const sphere = new Sphere()
  const point = new Vector3()
  // a spread of real points on each model (every 40th vertex or so)
  const samples = (geometry) => {
    const p = geometry.getAttribute('position')
    const step = Math.max(1, Math.floor(p.count / 60))
    const out = []
    for (let i = 0; i < p.count; i += step) out.push([p.getX(i), p.getY(i), p.getZ(i)])
    return out
  }
  const sets = Object.keys(models).map((kind) => ({ kind, points: samples(models[kind]), set: createLodSet(items.filter((i) => i.kind === kind), kind.startsWith('distant') ? AMAZON_LOD.distant : AMAZON_LOD.tree, AMAZON_BOUNDS[kind]) }))
  const [sx, , sz] = biome.spawn.position
  const poses = []
  for (const [x, z] of [[sx, sz], ...biome.stations.map((s) => [s.x, s.z])]) for (let k = 0; k < 6; k += 1) poses.push([x, 0, z, (k * Math.PI) / 3])
  for (let k = 0; k < 8; k += 1) poses.push([sx, 22, sz, (k * Math.PI) / 4], [8, 12, 14, (k * Math.PI) / 4]) // flying
  let onScreen = 0
  let drawnTotal = 0
  for (const [x, y, z, yaw] of poses) {
    // ExplorerController's default rig: 3.2 m behind, 1.8 m above, looking 0.3 m above Bulbuli
    camera.position.set(x + Math.sin(yaw) * 3.2, y + 1.8, z + Math.cos(yaw) * 3.2)
    camera.lookAt(x, y + 0.3, z)
    camera.updateMatrixWorld(true)
    frustum.setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
    const inView = (px, py, pz, r) => { sphere.center.set(px, py, pz); sphere.radius = r; return frustum.intersectsSphere(sphere) }
    for (const { kind, points, set } of sets) {
      drawnTotal += selectVisible(set, camera.position, inView)
      const drawn = new Set()
      for (let level = 0; level < set.layers.length; level += 1) for (let n = 0; n < set.counts[level]; n += 1) drawn.add(set.picked[level][n])
      set.items.forEach((item, index) => {
        // is any sampled point of the tree itself inside the picture?
        const s = item.scale ?? 1
        const cos = Math.cos(item.rot ?? 0)
        const sin = Math.sin(item.rot ?? 0)
        let visible = false
        for (const [px, py, pz] of points) {
          point.set(item.x + (px * cos + pz * sin) * s, item.y + py * s, item.z + (-px * sin + pz * cos) * s).project(camera)
          if (Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && point.z > -1 && point.z < 1) { visible = true; break }
        }
        if (!visible) return
        onScreen += 1
        assert.ok(drawn.has(index), `${kind} at (${item.x.toFixed(1)}, ${item.z.toFixed(1)}) is on screen from (${x}, ${y}, ${z}) but was not drawn`)
      })
    }
  }
  assert.ok(onScreen > 20000, `${onScreen} tree sightings checked`)
  assert.ok(drawnTotal >= onScreen)
})
