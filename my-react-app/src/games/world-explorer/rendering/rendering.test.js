import test from 'node:test'
import assert from 'node:assert/strict'
import { BIOMES } from '../biomes/index.js'
import { collidersFor } from '../biomes/common.js'
import { createPlayer, stepPlayer } from '../../skyward-explorer/physics.js'
import { scatterBiomeAssets } from './scattering.js'
import { createTerrainGeometry, hasExpandedTerrainFootprint, terrainFootprintRadius, terrainHeightAt, TERRAIN_FOOTPRINT_SCALE } from './terrain.js'
import { createWetlandField } from './wetland.js'
import { createSundarbansModels } from './mangroveModels.js'
import { scatterAmazon } from './amazonScatter.js'
import {
  createAmazonDistantTree,
  createAmazonLog,
  createAmazonRootCluster,
  createAmazonTree,
  createAmazonUnderstory,
} from './amazonTrees.js'

for (const biome of Object.values(BIOMES)) {
  test(`${biome.id}: procedural placements are deterministic and use biome-specific assets`, () => {
    const first = scatterBiomeAssets(biome)
    const second = scatterBiomeAssets(biome)
    const allowedLooks = {
      sundarbans: ['mud', 'mudflat', 'sandbar'],
      amazon: ['floor'],
      sahara: ['gravel', 'sand', 'ridge', 'valley'],
    }[biome.id]
    assert.deepEqual(first, second)
    assert.ok(first.length > 0)
    assert.ok(first.every((item) => Number.isFinite(item.x) && Number.isFinite(item.y) && Number.isFinite(item.z)))

    const reachableLand = collidersFor(biome).filter((collider) => collider.kind === 'land')
    for (const item of first) {
      if (item.background) {
        // background wetland dressing never stands on ground the player can reach
        assert.ok(!reachableLand.some((collider) => Math.hypot(item.x - collider.x, item.z - collider.z) <= collider.r),
          `${item.kind} at ${item.x.toFixed(1)},${item.z.toFixed(1)} must stay off the walkable land`)
        continue
      }
      const disc = biome.discs.find((candidate) => (
        allowedLooks.includes(candidate.look)
          && Math.hypot(item.x - candidate.x, item.z - candidate.z) <= candidate.r * TERRAIN_FOOTPRINT_SCALE
          && Math.abs(item.y - candidate.top) < 0.06
      ))
      assert.ok(disc, `${item.kind} must be on its eligible biome terrain`)
      assert.ok(Math.abs(item.y - disc.top) < 0.06)
      assert.ok(!biome.links.some(([a, b]) => {
        const dx = b.x - a.x
        const dz = b.z - a.z
        const length = dx * dx + dz * dz || 1
        const t = Math.max(0, Math.min(1, ((item.x - a.x) * dx + (item.z - a.z) * dz) / length))
        return Math.hypot(item.x - (a.x + t * dx), item.z - (a.z + t * dz)) < 1.8
      }))
      assert.ok(!biome.stations.some((station) => Math.hypot(item.x - station.x, item.z - station.z) < 2.8))
    }

    const expectedKind = { sundarbans: 'mangrove', amazon: 'kapok', sahara: 'acacia' }[biome.id]
    assert.ok(first.some((item) => item.kind === expectedKind))
    assert.ok(first.some((item) => {
      const nearest = biome.discs
        .filter((disc) => allowedLooks.includes(disc.look))
        .reduce((distance, disc) => Math.min(distance, Math.hypot(item.x - disc.x, item.z - disc.z) / disc.r), Infinity)
      return nearest > 1
    }), 'expanded scatter should populate the outer visual terrain ring')

    const colliders = collidersFor(biome)
    const landColliders = colliders.filter((collider) => collider.kind === 'land')
    const coreColliders = landColliders.filter((collider) => !collider.surfaceOnly)
    const apronColliders = landColliders.filter((collider) => collider.surfaceOnly)
    assert.equal(coreColliders.length, biome.discs.length)
    const expandedDiscs = biome.discs.filter(hasExpandedTerrainFootprint)
    assert.equal(apronColliders.length, expandedDiscs.length)
    coreColliders.forEach((collider, index) => {
      assert.equal(collider.r, biome.discs[index].r - 0.3)
      assert.equal(collider.x, biome.discs[index].x)
      assert.equal(collider.z, biome.discs[index].z)
      assert.equal(collider.heightAt(biome.discs[index].x, biome.discs[index].z), biome.discs[index].top)
    })
    apronColliders.forEach((collider, index) => {
      const disc = expandedDiscs[index]
      const coreCollider = coreColliders.find((candidate) => candidate.id === disc.id)
      assert.equal(collider.r, terrainFootprintRadius(disc) - 0.3)
      assert.equal(collider.innerRadius, coreCollider.r)
      assert.equal(collider.groundId, disc.id)
    })

    const elevated = biome.discs.filter((disc) => disc.top > 0).sort((a, b) => b.top - a.top)[0]
    if (elevated) {
      const elevatedCollider = coreColliders.find((collider) => collider.id === elevated.id)
      const elevatedX = elevated.x + Math.min(elevatedCollider.r * 0.2, 0.5)
      const elevatedZ = elevated.z
      const elevatedY = elevatedCollider.heightAt(elevatedX, elevatedZ)
      const platformPlayer = createPlayer({ position: [elevatedX, elevatedY + 0.05, elevatedZ], facing: 0 })
      platformPlayer.grounded = false
      platformPlayer.groundId = null
      platformPlayer.vel[1] = -5
      stepPlayer(platformPlayer, { moveX: 0, moveZ: 0, jumpHeld: false, jumpPressed: false }, 1 / 60, [elevatedCollider])
      assert.equal(platformPlayer.grounded, true, `${biome.id}: descending onto elevated tier lands`)
      assert.equal(platformPlayer.groundId, elevated.id)
      assert.ok(Math.abs(platformPlayer.pos[1] - elevatedY) < 1e-6)
    }

    const outerX = biome.discs[0].x + biome.discs[0].r * 1.5
    const outerZ = biome.discs[0].z
    const outerCollider = apronColliders[0]
    const outerY = outerCollider.heightAt(outerX, outerZ)
    const outerPlayer = createPlayer({ position: [outerX, outerY + 0.05, outerZ], facing: 0 })
    outerPlayer.grounded = false
    outerPlayer.groundId = null
    outerPlayer.vel[1] = -5
    stepPlayer(outerPlayer, { moveX: 0, moveZ: 0, jumpHeld: false, jumpPressed: false }, 1 / 60, [outerCollider])
    assert.equal(outerPlayer.grounded, true, `${biome.id}: expanded outer terrain catches downward movement`)
    assert.equal(outerPlayer.groundId, biome.discs[0].id)

    const station = biome.stations[0]
    const post = colliders.find((collider) => collider.id === `station-post-${station.n}`)
    assert.ok(post.walkable)
    assert.ok(post.supportRadius > post.r)
    assert.ok(post.top > post.bottom)
    const postPlayer = createPlayer({ position: [station.x, post.top + 0.05, station.z], facing: 0 })
    postPlayer.grounded = false
    postPlayer.groundId = null
    postPlayer.vel[1] = -5
    stepPlayer(postPlayer, { moveX: 0, moveZ: 0, jumpHeld: false, jumpPressed: false }, 1 / 60, [post])
    assert.equal(postPlayer.grounded, true, `${biome.id}: station post catches a downward landing`)
    assert.equal(postPlayer.groundId, post.id)
    assert.equal(postPlayer.pos[1], post.top)
  })

  test(`${biome.id}: terrain geometry has displaced surfaces and valid normals`, () => {
    const disc = biome.discs[0]
    const geometry = createTerrainGeometry(disc, biome.id)
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const colors = geometry.getAttribute('color')
    assert.ok(positions.count > 300)
    assert.equal(normals.count, positions.count)
    assert.equal(colors.count, positions.count)
    assert.ok(geometry.index.count > 1000)
    let maxRadius = 0
    for (let i = 0; i < normals.count; i += 1) {
      assert.ok(Number.isFinite(normals.getX(i)))
      assert.ok(Number.isFinite(normals.getY(i)))
      assert.ok(Number.isFinite(normals.getZ(i)))
      maxRadius = Math.max(maxRadius, Math.hypot(positions.getX(i), positions.getZ(i)))
    }
    assert.ok(maxRadius >= disc.r * TERRAIN_FOOTPRINT_SCALE, 'render terrain should span the expanded footprint')
    const height = terrainHeightAt(disc, disc.x + disc.r / 3, disc.z, 42, biome.id)
    assert.ok(Math.abs(height - disc.top) < 0.05)
    assert.equal(height, terrainHeightAt(disc, disc.x + disc.r / 3, disc.z, 42, biome.id))
    if (biome.id === 'sundarbans') {
      let widestShoreline = 0
      for (let i = 0; i < positions.count; i += 1) {
        if (Math.abs(positions.getY(i) + disc.depth) < 1e-4) {
          widestShoreline = Math.max(widestShoreline, Math.hypot(positions.getX(i), positions.getZ(i)))
        }
      }
      assert.ok(widestShoreline > disc.r * TERRAIN_FOOTPRINT_SCALE + 0.8, 'shoreline should slope outward beneath the waterline')
    }
    geometry.dispose()
  })
}

test('sundarbans: trees frame an open player and camera approach with varied crowns', () => {
  const biome = BIOMES.sundarbans
  const placements = scatterBiomeAssets(biome)
  const trees = placements.filter((item) => item.kind === 'mangrove')
  const background = placements.filter((item) => item.kind === 'backgroundMangrove')
  const shrubs = placements.filter((item) => item.kind === 'understory')
  const cameraYaw = biome.spawn.facing + Math.PI
  const cameraX = biome.spawn.position[0] + Math.sin(cameraYaw) * 8.2
  const cameraZ = biome.spawn.position[2] + Math.cos(cameraYaw) * 8.2
  const viewEnd = {
    x: biome.spawn.position[0] + Math.sin(biome.spawn.facing) * 28,
    z: biome.spawn.position[2] + Math.cos(biome.spawn.facing) * 28,
  }
  const viewDistance = (item) => {
    const dx = viewEnd.x - cameraX
    const dz = viewEnd.z - cameraZ
    const length = dx * dx + dz * dz
    const t = Math.max(0, Math.min(1, ((item.x - cameraX) * dx + (item.z - cameraZ) * dz) / length))
    return Math.hypot(item.x - (cameraX + t * dx), item.z - (cameraZ + t * dz))
  }

  assert.ok(trees.length >= 12 && trees.length <= 64, `expected a spaced forest, got ${trees.length} trees`)
  assert.ok(background.length >= 300, `distant mangroves should form a dense layered forest, got ${background.length}`)
  assert.ok(background.some((tree) => tree.lod === 'mid') && background.some((tree) => tree.lod === 'far'), 'background forest uses a mid and a far layer')
  const backgroundQuadrants = new Set(background.map((tree) => {
    const angle = Math.atan2(tree.z - biome.spawn.position[2], tree.x - biome.spawn.position[0])
    return Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 8)
  }))
  assert.equal(backgroundQuadrants.size, 8, 'distant mangroves should form a continuous all-angle surround')
  assert.ok(shrubs.length >= 50, `expected understory vegetation, got ${shrubs.length} shrubs`)
  assert.ok(new Set(trees.map((tree) => tree.variant)).size >= 3, 'tree crowns should use multiple silhouettes')
  assert.ok(trees.every((tree) => Math.hypot(tree.x - biome.spawn.position[0], tree.z - biome.spawn.position[2]) >= 9.5))
  assert.ok(trees.every((tree) => viewDistance(tree) >= 4.4))
  assert.ok(shrubs.every((plant) => Math.hypot(plant.x - biome.spawn.position[0], plant.z - biome.spawn.position[2]) >= 3.8))
  assert.ok(shrubs.every((plant) => viewDistance(plant) >= 3.8))
  for (const station of biome.stations) {
    assert.ok(trees.every((tree) => Math.hypot(tree.x - station.x, tree.z - station.z) >= 4.4), `trees should not crowd station ${station.n}`)
    assert.ok(shrubs.every((plant) => Math.hypot(plant.x - station.x, plant.z - station.z) >= 3.8), `understory should leave station ${station.n} visible`)
    const nearbyVegetation = biome.props.filter((prop) => ['fern', 'pneumatophores', 'rock'].includes(prop.type))
    assert.ok(nearbyVegetation.every((prop) => Math.hypot(prop.x - station.x, prop.z - station.z) >= 3.8), `scattered vegetation should leave station ${station.n} visible`)
  }
  assert.ok(shrubs.some((plant) => shrubs.filter((other) => Math.hypot(plant.x - other.x, plant.z - other.z) < 2.4).length >= 3), 'understory plants should form irregular clusters')
  const village = biome.props.find((prop) => prop.type === 'village')
  assert.ok(village, 'the Sundarbans village should remain in the scene')
  assert.ok(biome.discs.some((disc) => (
    Math.hypot(village.x - disc.x, village.z - disc.z) <= disc.r * TERRAIN_FOOTPRINT_SCALE
  )), 'the village should sit on the expanded wetland terrain, not beyond its edge')
})

test('sundarbans: overlapping island footprints share one ground height, flat at stations, spawn and boardwalks', () => {
  const biome = BIOMES.sundarbans
  const land = collidersFor(biome).filter((collider) => collider.kind === 'land' && collider.heightAt)
  const field = createWetlandField(biome)
  let checked = 0
  for (let x = -26; x <= 28; x += 0.73) {
    for (let z = -16; z <= 30; z += 0.71) {
      const covering = land.filter((collider) => Math.hypot(x - collider.x, z - collider.z) <= collider.r)
      if (covering.length < 1) continue
      const heights = covering.map((collider) => collider.heightAt(x, z))
      assert.ok(Math.max(...heights) - Math.min(...heights) < 1e-9, `discs disagree at ${x},${z}`)
      assert.ok(Math.abs(field.heightAt(x, z) - heights[0]) < 1e-9, `drawn ground differs from physics at ${x},${z}`)
      assert.ok(Math.abs(heights[0]) <= 0.051)
      checked += 1
    }
  }
  assert.ok(checked > 1500)
  const flatAt = (x, z) => land.filter((c) => Math.hypot(x - c.x, z - c.z) <= c.r).every((c) => Math.abs(c.heightAt(x, z)) < 1e-9)
  for (const station of biome.stations) assert.ok(flatAt(station.x, station.z), `station ${station.n} stands on flat ground`)
  assert.ok(flatAt(biome.spawn.position[0], biome.spawn.position[2]))
  for (const [a, b] of biome.links) {
    for (let t = 0; t <= 1; t += 0.1) assert.ok(flatAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t), `boardwalk ${a.id}–${b.id} is flat`)
  }
})

test('sundarbans: the land meets one continuous wetland (no floating platform edge)', () => {
  const biome = BIOMES.sundarbans
  const field = createWetlandField(biome)
  const octantsWithForestBank = new Set()
  let raysIntoWater = 0
  for (let i = 0; i < 64; i += 1) {
    const angle = (i / 64) * Math.PI * 2
    const dx = Math.cos(angle)
    const dz = Math.sin(angle)
    // walk outwards from the walkable edge: the ground slopes into the water without a cliff
    let r = 0
    while (field.walkSD(field.center.x + dx * r, field.center.z + dz * r) < 0) r += 0.25
    let previous = field.heightAt(field.center.x + dx * r, field.center.z + dz * r)
    let reachedWater = false
    let lowest = previous
    for (let step = 0.25; step <= 9; step += 0.25) {
      const h = field.heightAt(field.center.x + dx * (r + step), field.center.z + dz * (r + step))
      assert.ok(Math.abs(h - previous) < 0.16, `no cliff in the shore at angle ${angle.toFixed(2)}`)
      previous = h
      lowest = Math.min(lowest, h)
      if (h < field.waterY) reachedWater = true
    }
    // every shore descends to tide level (exposed mud bars are allowed), most into open water
    assert.ok(lowest < field.waterY + 0.25, `shore at angle ${angle.toFixed(2)} slopes down to the tide line`)
    if (reachedWater) raysIntoWater += 1
    for (let d = 40; d < 150; d += 2) {
      if (field.heightAt(field.center.x + dx * d, field.center.z + dz * d) > field.waterY + 0.05) {
        octantsWithForestBank.add(Math.floor(i / 8))
        break
      }
    }
  }
  assert.ok(raysIntoWater >= 54, `most of the shoreline meets open water, got ${raysIntoWater}/64`)
  assert.equal(octantsWithForestBank.size, 8, 'forested mud banks surround the islands in every direction')
})

/** Triangles drawn by a geometry, indexed (welded, smooth-shaded trees) or not. */
const triangleCount = (geometry) => (geometry.index ? geometry.index.count : geometry.getAttribute('position').count) / 3

test('sundarbans: procedural mangrove models are valid and within their triangle budgets', () => {
  const models = createSundarbansModels()
  for (const [name, budget] of [['tree', 3200], ['treeMid', 720]]) {
    for (const [species, forms] of Object.entries(models[name])) {
      assert.ok(Array.isArray(forms) && forms.length >= 2, `${name}:${species} offers several seeded forms`)
      for (const [form, geometry] of forms.entries()) {
        const position = geometry.getAttribute('position')
        const color = geometry.getAttribute('color')
        assert.equal(position.count, color.count)
        assert.ok(triangleCount(geometry) <= budget, `${name}:${species}:${form} has ${triangleCount(geometry)} triangles`)
        for (let i = 0; i < position.array.length; i += 1) assert.ok(Number.isFinite(position.array[i]))
      }
    }
  }
  assert.ok(models.treeFar.length >= 3)
  for (const geometry of models.treeFar) assert.ok(triangleCount(geometry) <= 160)
  models.rootsCarpet.computeBoundingBox()
  assert.equal(models.rootsCarpet.boundingBox.min.y, 0)
  assert.equal(models.rootsCarpet.boundingBox.max.y, 1)
  assert.ok(models.rootsCarpet.getAttribute('position').count <= 36)
  assert.ok(models.plant.nipa.getAttribute('position').count > 300, 'golpatta fronds are built into one low-poly asset')
  // stilt-rooted species reach the mud well away from the trunk
  for (const geometry of models.tree.garjan) {
    const garjan = geometry.getAttribute('position')
    let rootReach = 0
    for (let i = 0; i < garjan.count; i += 1) {
      if (garjan.getY(i) < 0.05) rootReach = Math.max(rootReach, Math.hypot(garjan.getX(i), garjan.getZ(i)))
    }
    assert.ok(rootReach > 1.1, 'garjan prop roots arch out into the mud')
  }
  models.dispose()
})

test('amazon: dense layered scatter is deterministic and attaches bromeliads to emergent trunks', () => {
  const biome = BIOMES.amazon
  const first = scatterAmazon(biome)
  assert.deepEqual(first, scatterAmazon(biome))
  for (const kind of ['emergent', 'canopy', 'subcanopy', 'understory', 'fern', 'heliconia', 'roots', 'bromeliad', 'log', 'trail', 'distantEmergent', 'distantCanopy', 'distantSubcanopy']) {
    assert.ok(first.some((item) => item.kind === kind), `Amazon scatter includes ${kind}`)
  }
  assert.ok(first.filter((item) => item.kind === 'emergent').length >= 198)
  assert.ok(first.filter((item) => item.kind === 'canopy').length >= 300)
  assert.ok(first.filter((item) => item.kind === 'subcanopy').length >= 350)
  assert.ok(first.filter((item) => item.kind === 'understory').length >= 240)
  assert.ok(first.filter((item) => item.kind === 'fern').length >= 220)
  assert.ok(first.filter((item) => item.kind === 'heliconia').length >= 110)
  assert.ok(first.filter((item) => item.kind === 'roots').length >= 65)
  assert.ok(first.filter((item) => item.kind.startsWith('distant')).length >= 1700)
  assert.ok(first.filter((item) => item.kind.startsWith('distant')).some((item) => Math.hypot(item.x, item.z) > 100))
  const trees = first.filter((item) => item.kind === 'emergent')
  const bromeliads = first.filter((item) => item.kind === 'bromeliad')
  assert.ok(bromeliads.length >= trees.length)
  for (const bromeliad of bromeliads) {
    assert.ok(trees.some((tree) => Math.hypot(tree.x - bromeliad.x, tree.z - bromeliad.z) < 0.4))
    assert.ok(bromeliad.y > 0.7 && bromeliad.y < 2)
  }
  const links = biome.links
  for (const item of first.filter((placement) => ['emergent', 'canopy', 'understory', 'fern'].includes(placement.kind))) {
    for (const [start, end] of links) {
      const dx = end.x - start.x
      const dz = end.z - start.z
      const t = Math.max(0, Math.min(1, ((item.x - start.x) * dx + (item.z - start.z) * dz) / (dx * dx + dz * dz || 1)))
      assert.ok(Math.hypot(item.x - start.x - dx * t, item.z - start.z - dz * t) >= 2.1)
    }
  }
})

test('amazon: low-poly tree, understory and log geometries have valid normals and bounded size', () => {
  const geometries = [
    createAmazonTree(11, 'emergent'),
    createAmazonTree(23, 'canopy'),
    createAmazonTree(37, 'subcanopy'),
    createAmazonDistantTree(61, 'emergent'),
    createAmazonDistantTree(67, 'canopy'),
    createAmazonDistantTree(71, 'subcanopy'),
    createAmazonUnderstory(31, 'broadleaf'),
    createAmazonUnderstory(41, 'fern'),
    createAmazonUnderstory(43, 'heliconia'),
    createAmazonUnderstory(47, 'bromeliad'),
    createAmazonRootCluster(53),
    createAmazonLog(),
  ]
  for (const [geometryIndex, geometry] of geometries.entries()) {
    const position = geometry.getAttribute('position')
    const color = geometry.getAttribute('color')
    const normal = geometry.getAttribute('normal')
    assert.ok(position.count > 0 && position.count <= 60000)
    if (geometryIndex === 0) assert.ok(position.count > 54000, 'emergent canopy has dense overlapping foliage')
    if (geometryIndex === 1) assert.ok(position.count > 32000, 'canopy layer carries increased leaf-card coverage')
    if (geometryIndex === 2) assert.ok(position.count > 21000, 'subcanopy has fuller layered crowns')
    if (geometryIndex === 3) assert.ok(position.count > 4500, 'distant emergent silhouettes use layered leaf cards')
    if (geometryIndex === 5) assert.ok(position.count > 3000, 'distant subcanopy silhouettes use dense leaf cards')
    assert.equal(position.count, color.count)
    assert.equal(position.count, normal.count)
    if (geometryIndex < 7) {
      let minimumGreen = Infinity
      let maximumGreen = -Infinity
      for (let index = 1; index < color.array.length; index += 3) {
        minimumGreen = Math.min(minimumGreen, color.array[index])
        maximumGreen = Math.max(maximumGreen, color.array[index])
      }
      assert.ok(maximumGreen - minimumGreen > 0.08, 'foliage colors span dark and bright canopy greens')
    }
    for (let index = 0; index < position.count; index += 1) {
      assert.ok(Number.isFinite(position.getX(index)) && Number.isFinite(position.getY(index)) && Number.isFinite(position.getZ(index)))
      assert.ok(Number.isFinite(normal.getX(index)) && Number.isFinite(normal.getY(index)) && Number.isFinite(normal.getZ(index)))
    }
    geometry.dispose()
  }

  const smoothTree = createAmazonTree(11, 'emergent')
  const positions = smoothTree.getAttribute('position')
  const normals = smoothTree.getAttribute('normal')
  const sharedNormals = new Map()
  let compared = 0
  for (let index = 0; index < positions.count; index += 1) {
    const key = [
      Math.round(positions.getX(index) * 10000),
      Math.round(positions.getY(index) * 10000),
      Math.round(positions.getZ(index) * 10000),
    ].join(',')
    const current = [normals.getX(index), normals.getY(index), normals.getZ(index)]
    const previous = sharedNormals.get(key)
    if (previous) {
      assert.ok(current.every((value, axis) => Math.abs(value - previous[axis]) < 1e-6))
      compared += 1
    } else {
      sharedNormals.set(key, current)
    }
  }
  assert.ok(compared > 100, 'coincident foliage vertices share smoothed normals')
  smoothTree.dispose()
})
