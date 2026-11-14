import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ACACIA_TRUNK, SAPLING_STEM } from './common.js'
import { BIOMES, collidersFor } from './index.js'
import { scatterBiomeAssets } from '../rendering/scattering.js'
import { scatterAmazon } from '../rendering/amazonScatter.js'
import { createPlayer, stepPlayer } from '../../skyward-explorer/physics.js'
import { createInputState } from '../../skyward-explorer/input.js'
import { readExplorerControls, rescueFromWater, stayOnDunes } from '../drive.js'

const BODY = 0.35 // Bulbuli's body radius (PHYS.radius)

function landAt(colliders, x, z) {
  let top = -Infinity
  for (const c of colliders) {
    if (c.kind !== 'land' || Math.hypot(x - c.x, z - c.z) > (c.supportRadius ?? c.r)) continue
    top = Math.max(top, c.heightAt ? c.heightAt(x, z) : c.top)
  }
  return top
}

/**
 * Sends Bulbuli straight at a tree from `angle`, on foot or flying level at `height` above its
 * foot, exactly as ExplorerController drives it. Returns how close its centre came to the trunk's
 * axis and where it ended, or null when there is no level run-up on that side.
 */
function approach(biome, colliders, tree, angle, { fps = 60, fly = null, offset = 0, seconds = 1.4, from = 2.6 } = {}) {
  const sx = tree.x + Math.sin(angle) * from + Math.cos(angle) * offset
  const sz = tree.z + Math.cos(angle) * from - Math.sin(angle) * offset
  const ground = landAt(colliders, sx, sz)
  if (fly === null) {
    if (ground === -Infinity || Math.abs(ground - tree.y) > 0.3) return null
    // nothing else solid, and no step or perch, on the way in
    for (let t = 0; t <= 1; t += 0.05) {
      const x = sx + (tree.x - sx) * t
      const z = sz + (tree.z - sz) * t
      if (Math.abs(landAt(colliders, x, z) - tree.y) > 0.3) return null
      if (colliders.some((c) => c !== tree.collider && c.kind === 'prop' && !c.supportOnly && c.bottom < tree.y + 1.1 && Math.hypot(c.x - x, c.z - z) < (c.supportRadius ?? c.r) + BODY + 0.15)) return null
    }
  }
  const y0 = fly === null ? ground + 0.03 : tree.y + fly
  const p = createPlayer({ position: [sx, y0, sz], facing: 0 })
  const input = createInputState()
  input.held.add('back')
  let yaw = angle + Math.PI // camera beyond the tree: "back" walks towards it
  let lastJumps = null
  let closest = Infinity
  let fell = 0
  for (let frame = 0; frame < seconds * fps; frame += 1) {
    const controls = readExplorerControls(input, { active: true, yaw, lastJumps, dt: 1 / fps })
    yaw = controls.yaw
    lastJumps = controls.lastJumps
    if (fly !== null) { p.grounded = false; p.vel[1] = 0; p.pos[1] = y0 }
    const events = stepPlayer(p, controls.step, 1 / fps, colliders)
    rescueFromWater(p, biome, events)
    stayOnDunes(p, biome)
    if (events.fell) fell += 1
    closest = Math.min(closest, Math.hypot(p.pos[0] - tree.x, p.pos[2] - tree.z))
  }
  // how far past the tree it got, along the line it set out on
  const past = (p.pos[0] - sx) * -Math.sin(angle) + (p.pos[2] - sz) * -Math.cos(angle) - from
  return { closest, fell, end: [...p.pos], past }
}

/** Walks and flies at every tree of a kind; returns the tallies the assertions below read. */
function audit(biome, colliders, trees, { fpsList = [60, 24], sides = 8, flyAt = 0.9 } = {}) {
  const r = { walks: 0, through: [], held: [], flights: 0, flewThrough: [], around: 0, stuck: [], fell: 0 }
  for (const tree of trees) {
    for (let k = 0; k < sides; k += 1) {
      const angle = (k / sides) * Math.PI * 2
      for (const fps of fpsList) {
        const walk = approach(biome, colliders, tree, angle, { fps })
        if (!walk) continue
        r.walks += 1
        r.fell += walk.fell
        const label = `${tree.id} from ${k} at ${fps} fps: closest ${walk.closest.toFixed(2)} m, trunk ${tree.radius.toFixed(2)} m`
        if (walk.closest < tree.radius + BODY - 0.02) r.through.push(label)
        if (walk.closest > tree.reach + 0.05) r.held.push(label)
      }
      // flying level into the trunk, below its top
      const flight = approach(biome, colliders, tree, angle, { fly: Math.min(flyAt, tree.height * 0.6) })
      r.flights += 1
      if (flight.closest < tree.radius + BODY - 0.02) r.flewThrough.push(`${tree.id} flying from ${k}: closest ${flight.closest.toFixed(2)} m`)
      // a little to one side, Bulbuli brushes past and carries on: the trunk is not a wall
      const past = approach(biome, colliders, tree, angle, { offset: 0.3, seconds: 1.2 })
      // (only where there is level ground on the far side to carry on over)
      const beyond = [1, 2, 3, 4, 5.5].every((d) => Math.abs(landAt(colliders, tree.x - Math.sin(angle) * d + Math.cos(angle) * 0.3, tree.z - Math.cos(angle) * d - Math.sin(angle) * 0.3) - tree.y) < 0.3)
      if (past && beyond) {
        if (past.past > 0.8) r.around += 1
        else r.stuck.push(`${tree.id} from ${k}: got ${past.past.toFixed(1)} m past it`)
      }
    }
  }
  return r
}

const sample = (list) => list.slice(0, 3).join('; ')

test('sahara trees: every acacia has a solid trunk exactly as wide as the trunk that is drawn', () => {
  const biome = BIOMES.sahara
  const colliders = collidersFor(biome)
  const acacias = scatterBiomeAssets(biome).map((item, i) => ({ item, i })).filter(({ item }) => item.kind === 'acacia')
  assert.equal(acacias.length, 16)
  // the collider is built from the numbers the renderer draws the trunk with
  const scatter = readFileSync(new URL('../rendering/BiomeScatter.jsx', import.meta.url), 'utf8')
  assert.ok(scatter.includes('trunk: new CylinderGeometry(0.14, 0.22, 1, 12)'))
  assert.ok(scatter.includes('items={acacia} geometry={resources.trunk} material={resources.bark} offset={[0, 2.2, 0]} shapeScale={[0.75, 4.4, 0.75]}'))
  assert.ok(Math.abs(ACACIA_TRUNK.radius - 0.22 * 0.75) < 1e-12 && ACACIA_TRUNK.height === 4.4)
  const trees = acacias.map(({ item, i }) => {
    const collider = colliders.find((c) => c.id === `acacia-trunk-${i}`)
    assert.ok(collider, `acacia ${i} has no collider`)
    assert.equal(collider.walkable, false)
    assert.equal(collider.collisionKind, undefined, 'no padding round the trunk')
    assert.ok(collider.x === item.x && collider.z === item.z, 'centred on the trunk')
    assert.ok(Math.abs(collider.r - 0.165 * item.scale) < 1e-9, 'as wide as the trunk at its base')
    assert.ok(Math.abs(collider.top - (item.y + 4.4 * item.scale)) < 1e-9 && collider.bottom < item.y, 'as tall as the trunk')
    return { id: `acacia at (${item.x.toFixed(1)}, ${item.z.toFixed(1)})`, x: item.x, z: item.z, y: item.y, radius: collider.r, reach: collider.r + BODY, height: 4.4 * item.scale, collider }
  })
  const r = audit(biome, colliders, trees, { fpsList: [60, 37, 24] })
  assert.ok(r.walks >= 300, `${r.walks} walks`)
  assert.deepEqual(r.through, [], `walked into the trunk: ${sample(r.through)}`)
  assert.deepEqual(r.held, [], `stopped short of the trunk by an invisible wall: ${sample(r.held)}`)
  assert.deepEqual(r.flewThrough, [], `flew through the trunk: ${sample(r.flewThrough)}`)
  assert.deepEqual(r.stuck, [], `could not walk round: ${sample(r.stuck)}`)
  assert.ok(r.around >= 60, `${r.around} walks round a trunk`)
  assert.equal(r.fell, 0)
  // above the trunk the flat crown is soft, as tree crowns are everywhere in the game
  const over = approach(biome, colliders, trees[0], 0, { fly: trees[0].height + 0.6 })
  assert.ok(over.closest < 0.2)
})

test('sahara trees: the palms and the station poles stop Bulbuli at their surface too', () => {
  const biome = BIOMES.sahara
  const colliders = collidersFor(biome)
  const palms = biome.props.map((p, i) => ({ p, i })).filter(({ p }) => p.type === 'palm').map(({ p, i }) => {
    const collider = colliders.find((c) => c.id === `prop-${i}`)
    // drawn trunk: 0.2 m at the base, leaning to 0.4 m off-centre at its top (ExpeditionCanvas.jsx Palm)
    return { id: `palm at (${p.x}, ${p.z})`, x: p.x, z: p.z, y: p.y, radius: 0.2 * p.scale, reach: collider.r + BODY, height: 4 * p.scale, collider }
  })
  assert.equal(palms.length, 3)
  const palmAudit = audit(biome, colliders, palms)
  assert.deepEqual(palmAudit.through, [], sample(palmAudit.through))
  assert.deepEqual(palmAudit.flewThrough, [], sample(palmAudit.flewThrough))
  for (const palm of palms) assert.ok(palm.collider.r - palm.radius <= 0.12, 'no wide invisible wall round a palm')
  for (const id of ['sahara', 'sundarbans', 'amazon']) {
    const map = BIOMES[id]
    const cols = collidersFor(map)
    const poles = map.stations.map((s) => {
      const collider = cols.find((c) => c.id === `station-post-${s.n}`)
      return { id: `${id} station ${s.n} pole`, x: s.x, z: s.z, y: collider.bottom, radius: 0.08, reach: 0.08 + BODY, height: 2.2, collider }
    })
    const r = audit(map, cols, poles, { fpsList: [60], sides: 4, flyAt: 1 })
    assert.ok(r.walks >= 5, `${id}: ${r.walks} walks at the station poles`)
    assert.deepEqual(r.through, [], sample(r.through))
    assert.deepEqual(r.held, [], sample(r.held))
    assert.deepEqual(r.flewThrough, [], sample(r.flewThrough))
  }
})

test('sundarbans trees: every mangrove trunk and every young tree on the islands is solid; shrubs stay soft', () => {
  const biome = BIOMES.sundarbans
  const colliders = collidersFor(biome)
  const placed = scatterBiomeAssets(biome).map((item, i) => ({ item, i }))
  // the 33 grown mangroves
  const mangroves = placed.filter(({ item }) => item.kind === 'mangrove' && !item.background).map(({ item, i }) => {
    const collider = colliders.find((c) => c.id === `mangrove-trunk-${i}`)
    assert.ok(collider && !collider.walkable, `mangrove ${i} has no trunk collider`)
    return { id: `${item.variant} at (${item.x.toFixed(1)}, ${item.z.toFixed(1)})`, x: item.x, z: item.z, y: item.y, radius: collider.r, reach: collider.r + BODY, height: collider.top - item.y, collider }
  })
  assert.equal(mangroves.length, 33)
  const grown = audit(biome, colliders, mangroves, { fpsList: [60], flyAt: 0.6 })
  assert.ok(grown.walks >= 100, `${grown.walks} walks`)
  assert.deepEqual(grown.through, [], sample(grown.through))
  assert.deepEqual(grown.flewThrough, [], sample(grown.flewThrough))
  assert.equal(grown.fell, 0)
  // the young trees: gewa and garjan saplings stand 1 to 3.5 m tall on a single stem
  const saplings = placed.filter(({ item }) => item.kind === 'sapling')
  assert.equal(saplings.length, 42)
  const young = []
  for (const { item, i } of saplings) {
    const collider = colliders.find((c) => c.id === `sapling-trunk-${i}`)
    if (item.variant === 'goran') {
      assert.equal(collider, undefined, 'a goran sapling is a low shrub of thin stems: soft, like the undergrowth')
      continue
    }
    assert.ok(collider, `${item.variant} sapling ${i} has no collider`)
    assert.equal(collider.walkable, false)
    assert.ok(Math.abs(collider.r - SAPLING_STEM[item.variant] * item.scale) < 1e-9 && collider.r <= 0.15, 'as slim as the stem')
    assert.ok(collider.top - item.y >= 0.85, 'at least as tall as the bird can reach on foot')
    young.push({ id: `${item.variant} sapling at (${item.x.toFixed(1)}, ${item.z.toFixed(1)})`, x: item.x, z: item.z, y: item.y, radius: collider.r, reach: collider.r + BODY, height: collider.top - item.y, collider })
  }
  assert.equal(young.length, 23)
  const r = audit(biome, colliders, young, { fpsList: [60, 24], flyAt: 0.5 })
  assert.ok(r.walks >= 100, `${r.walks} walks`)
  assert.deepEqual(r.through, [], `walked into the stem: ${sample(r.through)}`)
  assert.deepEqual(r.held, [], `invisible wall: ${sample(r.held)}`)
  assert.deepEqual(r.flewThrough, [], sample(r.flewThrough))
  assert.deepEqual(r.stuck, [], `could not walk round: ${sample(r.stuck)}`)
  assert.equal(r.fell, 0)
  // no other tree stands on ground Bulbuli can walk on: the far forest is all beyond the water
  for (const { item } of placed) {
    if (!['backgroundMangrove', 'shoreNipa'].includes(item.kind)) continue
    assert.equal(landAt(colliders, item.x, item.z), -Infinity, `${item.kind} at (${item.x.toFixed(1)}, ${item.z.toFixed(1)}) stands on walkable ground without a collider`)
  }
})

test('amazon trees: all 905 forest trees and the giant tree have a solid trunk no slimmer than the one drawn', () => {
  const biome = BIOMES.amazon
  const colliders = collidersFor(biome)
  const drawn = { emergent: 0.28, canopy: 0.2, subcanopy: 0.16 } // amazonTrees.js trunkRadius
  const trees = []
  scatterAmazon(biome).forEach((item, index) => {
    if (!(item.kind in drawn)) return
    const collider = colliders.find((c) => c.id === `amazon-${item.kind}-trunk-${index}`)
    assert.ok(collider && !collider.walkable, `${item.kind} ${index} has no trunk collider`)
    assert.ok(collider.x === item.x && collider.z === item.z)
    assert.ok(Math.abs(collider.r - drawn[item.kind] * item.scale) < 1e-9)
    assert.ok(collider.top - item.y > 3, 'the whole trunk, not just its foot')
    trees.push({ id: `${item.kind} at (${item.x.toFixed(1)}, ${item.z.toFixed(1)})`, x: item.x, z: item.z, y: item.y, radius: collider.r, reach: collider.rootRadius + BODY + 0.2, height: collider.top - item.y, collider })
  })
  assert.equal(trees.length, 905)
  const tree = readFileSync(new URL('../rendering/amazonTrees.js', import.meta.url), 'utf8')
  assert.ok(tree.includes('const trunkRadius = isEmergent ? 0.28 : isSubcanopy ? 0.16 : 0.2'))
  // walk and fly at a spread of them (every 12th: the map has 1,800 colliders and each run steps through them)
  const r = audit(biome, colliders, trees.filter((_, i) => i % 12 === 0), { fpsList: [60], sides: 4, flyAt: 1.5 })
  assert.ok(r.walks >= 50, `${r.walks} walks`)
  assert.deepEqual(r.through, [], sample(r.through))
  assert.deepEqual(r.flewThrough, [], sample(r.flewThrough))
  assert.equal(r.fell, 0)
  const giant = biome.props.findIndex((p) => p.type === 'giantTree')
  const trunk = colliders.find((c) => c.id === `prop-${giant}`)
  assert.ok(trunk && !trunk.walkable && trunk.collisionRadius >= 1.2 * (biome.props[giant].scale ?? 1) - 1e-9)
})
