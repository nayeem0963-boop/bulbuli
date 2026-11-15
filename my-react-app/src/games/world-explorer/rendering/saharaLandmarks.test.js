import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BIOMES, collidersFor } from '../biomes/index.js'
import {
  CAMEL, DATE_PALM, DRY_RIVER, OASIS, WELL,
  crackPattern, createCamelGeometry, createDatePalmGeometry, createDryRiverGeometry, createDryRiverPebblesGeometry,
  createOasisPlantsGeometry, createOasisShoreGeometry, createOasisWaterGeometry, createWellGeometry,
  datePalmTrunkAt, dryRiverAt, dryRiverPebbles, oasisPlantSpots, oasisShoreAt,
} from './saharaLandmarks.js'

const biome = BIOMES.sahara
const prop = (type) => biome.props.find((p) => p.type === type)
const station = (n) => biome.stations.find((s) => s.n === n)

/** Every vertex of a geometry as [x, y, z, alpha]. */
function vertices(geometry) {
  const position = geometry.attributes.position
  const color = geometry.attributes.color
  return Array.from({ length: position.count }, (_, i) => [position.getX(i), position.getY(i), position.getZ(i), color.itemSize === 4 ? color.getW(i) : 1])
}
const triangles = (geometry) => (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3
/** A point in a prop's own coordinates, on the map (the prop is turned by `rot` about the vertical). */
function onMap(p, x, z) {
  const rot = p.rot ?? 0
  return [p.x + x * Math.cos(rot) + z * Math.sin(rot), p.z - x * Math.sin(rot) + z * Math.cos(rot)]
}
const finite = (geometry) => vertices(geometry).every((vertex) => vertex.every(Number.isFinite))

test('sahara landmarks: the canvas draws them in place of the old boxes and flat rectangles', () => {
  const canvas = readFileSync(new URL('../ExpeditionCanvas.jsx', import.meta.url), 'utf8')
  for (const use of ["case 'palm': body = <DatePalm", "case 'camel': body = <RestingCamel", "case 'well': body = <Well />", "case 'pool': body = <OasisPool />", "case 'dryRiver': body = <DryRiverBed"]) assert.ok(canvas.includes(use), use)
  assert.ok(!canvas.includes('function Palm(') && !canvas.includes('function Camel(') && !canvas.includes('function Well('))
  // only the Sahara uses these prop types, so no other map changes
  for (const id of ['sundarbans', 'amazon']) assert.ok(BIOMES[id].props.every((p) => !['palm', 'camel', 'well', 'pool', 'dryRiver'].includes(p.type)))
  // asset-free: geometry and one canvas texture, nothing fetched
  const view = readFileSync(new URL('./SaharaLandmarks.jsx', import.meta.url), 'utf8')
  assert.ok(!/useLoader|useGLTF|useTexture|\.(png|jpe?g|webp|glb)\b/.test(view))
})

test('sahara date palm: the trunk is the one its collider was sized for, under a crown of fronds', () => {
  assert.deepEqual({ height: DATE_PALM.height, baseRadius: DATE_PALM.baseRadius, lean: DATE_PALM.lean }, { height: 4, baseRadius: 0.2, lean: 0.4 })
  assert.equal(datePalmTrunkAt(0), 0)
  assert.ok(Math.abs(datePalmTrunkAt(4) - 0.4) < 1e-12)
  const geometry = createDatePalmGeometry(7)
  assert.ok(finite(geometry))
  const all = vertices(geometry)
  // below the hanging dry fronds there is only trunk: never wider than the 0.2 m the collider allows for
  const trunk = all.filter(([, y]) => y < 2.2)
  assert.ok(trunk.length > 50)
  for (const [x, y, z] of trunk) assert.ok(Math.hypot(x - datePalmTrunkAt(Math.max(0, y)), z) <= DATE_PALM.baseRadius + 1e-6, `trunk bulges at y=${y.toFixed(2)}`)
  assert.ok(Math.max(...trunk.filter(([, y]) => y < 0.3).map(([x, , z]) => Math.hypot(x, z))) > 0.17, 'full width at the foot')
  // fronds spread wide of the trunk and rise above it
  const reach = Math.max(...all.map(([x, , z]) => Math.hypot(x - DATE_PALM.lean, z)))
  assert.ok(reach > 1.5 && reach < 2.6, `fronds reach ${reach.toFixed(2)} m`)
  assert.ok(Math.max(...all.map(([, y]) => y)) > DATE_PALM.height + 0.4)
  assert.ok(triangles(geometry) < 2500)
  // always the same palm for a seed; a different one for another
  assert.deepEqual(vertices(createDatePalmGeometry(7)), all)
  assert.notDeepEqual(vertices(createDatePalmGeometry(8)), all)
  // the map's palms and their colliders are unchanged
  const colliders = collidersFor(biome)
  const palms = biome.props.map((p, i) => ({ p, collider: colliders.find((c) => c.id === `prop-${i}`) })).filter(({ p }) => p.type === 'palm')
  assert.equal(palms.length, 3)
  for (const { p, collider } of palms) {
    assert.ok(collider.r >= DATE_PALM.baseRadius * p.scale, 'the trunk is inside its collider')
    assert.ok(collider.r - DATE_PALM.baseRadius * p.scale <= 0.12, 'no wide invisible wall')
    assert.ok(Math.abs(collider.top - DATE_PALM.height * p.scale) < 1e-9)
  }
})

test('sahara well: the stone ring fills its collider exactly, with the frame and a full bucket above', () => {
  const well = prop('well')
  assert.ok(well.block === WELL.radius && well.blockTop === WELL.height)
  const geometry = createWellGeometry()
  assert.ok(finite(geometry))
  const all = vertices(geometry)
  const ring = all.filter(([, y]) => y <= WELL.height + 1e-6)
  for (const [x, y, z] of ring) assert.ok(Math.hypot(x, z) <= WELL.radius + 1e-6, `stone outside the collider at y=${y.toFixed(2)}`)
  assert.ok(Math.max(...ring.map(([x, , z]) => Math.hypot(x, z))) > WELL.radius - 0.03, 'and reaches it')
  assert.ok(Math.abs(Math.max(...ring.map(([, y]) => y)) - WELL.height) < 1e-6, 'the rim Bulbuli stands on is the top of the stones')
  // the frame stands on the wall, not outside it
  const frame = all.filter(([, y]) => y > WELL.height + 1e-6)
  assert.ok(frame.length > 100 && Math.max(...frame.map(([, y]) => y)) > 1.6)
  assert.ok(frame.every(([x, , z]) => Math.abs(z) < 0.3 && Math.abs(x) < 1.2))
  assert.ok(triangles(geometry) < 1200)
})

test('sahara camel: a dromedary lying down, one hump, head up, on the ground', () => {
  const geometry = createCamelGeometry()
  assert.ok(finite(geometry))
  const all = vertices(geometry)
  const ys = all.map(([, y]) => y)
  assert.ok(Math.min(...ys) >= 0 && Math.min(...ys) < 0.06, 'rests on the sand')
  const head = Math.max(...ys)
  assert.ok(head > 1.9 && head <= CAMEL.headTop + 0.05)
  // the head is at the front (+z); the highest point of the body behind the neck is the hump
  assert.ok(all.find(([, y]) => y === head)[2] > 1.2)
  const back = all.filter(([, , z]) => z < 0.5)
  const hump = Math.max(...back.map(([, y]) => y))
  assert.ok(hump > 1.3 && hump <= CAMEL.humpTop, `hump at ${hump.toFixed(2)} m`)
  assert.ok(Math.abs(back.find(([, y]) => y === hump)[2]) < 0.5, 'in the middle of the back')
  // lying: no body part hangs in the air on legs; the belly is low
  const flank = all.filter(([x, , z]) => Math.abs(z) < 0.3 && Math.abs(x) < 0.2)
  assert.ok(Math.min(...flank.map(([, y]) => y)) < 0.35)
  const zs = all.map(([, , z]) => z)
  assert.ok(Math.max(...zs) - Math.min(...zs) <= CAMEL.length + 0.4)
  assert.ok(triangles(geometry) < 2600)
  assert.ok(prop('camel').block === 0.8, 'its collider is unchanged')
})

test('sahara oasis: a pool with a soft shore and plants, clear of station 3 and the well', () => {
  const pool = prop('pool')
  const water = vertices(createOasisWaterGeometry())
  const shore = vertices(createOasisShoreGeometry())
  const spots = oasisPlantSpots()
  assert.ok(finite(createOasisPlantsGeometry()))
  // the water lies inside its shoreline, and is about the size the pool always was (3 m by 2 m)
  for (const [x, , z] of water) {
    const dx = x - OASIS.centre[0]
    const dz = z - OASIS.centre[1]
    assert.ok(Math.hypot(dx, dz) <= oasisShoreAt(Math.atan2(dz, dx)) + 1e-6)
  }
  const xs = water.map(([x]) => x)
  const zs = water.map(([, , z]) => z)
  assert.ok(Math.max(...xs) - Math.min(...xs) > 2.6 && Math.max(...xs) - Math.min(...xs) < 3.8)
  assert.ok(Math.max(...zs) - Math.min(...zs) > 1.8 && Math.max(...zs) - Math.min(...zs) < 2.8)
  // the shore is opaque at the water and fades to nothing
  assert.ok(shore.some(([, , , a]) => a === 1) && shore.filter(([, , , a]) => a === 0).length === shore.length / 4)
  // station 3's ring, the well and the palms stay clear of water and plants
  const s3 = station(3)
  const well = prop('well')
  const away = (x, z, target) => { const [wx, wz] = onMap(pool, x, z); return Math.hypot(wx - target.x, wz - target.z) }
  for (const [x, , z] of water) {
    assert.ok(away(x, z, s3) > 1.2, 'water at station 3')
    assert.ok(away(x, z, well) > well.block + 0.3, 'water under the well')
    for (const palm of biome.props.filter((p) => p.type === 'palm')) assert.ok(away(x, z, palm) > 0.5, 'a palm standing in the water')
  }
  // (damp sand may reach the foot of the well; it never reaches the station's ring)
  for (const [x, , z, a] of shore) if (a > 0.5) assert.ok(away(x, z, s3) > 0.8)
  assert.ok(spots.length >= 30 && spots.some((s) => s.reed) && spots.some((s) => !s.reed))
  for (const { x, z } of spots) assert.ok(away(x, z, s3) >= 1.1 - 1e-9 && away(x, z, well) >= well.block + 0.3)
  // the keep-clear circles in the pool's coordinates are where the map really puts them
  assert.ok(Math.hypot(pool.x + OASIS.keepClear[0].x - s3.x, pool.z + OASIS.keepClear[0].z - s3.z) < 1e-9)
  assert.ok(Math.hypot(pool.x + OASIS.keepClear[1].x - well.x, pool.z + OASIS.keepClear[1].z - well.z) < 1e-9)
})

test('sahara dry river: a winding bed of cracked clay and pebbles on the valley floor, round station 5', () => {
  const river = prop('dryRiver')
  const valley = biome.discs.find((d) => d.id === 's5')
  const s5 = station(5)
  const timeline = prop('timeline')
  const geometry = createDryRiverGeometry()
  assert.ok(finite(geometry))
  const bed = vertices(geometry)
  // it winds: the centre line swings both ways, and it is long
  const centre = Array.from({ length: 41 }, (_, i) => dryRiverAt(i / 40))
  assert.ok(Math.min(...centre.map((c) => c.x)) < -0.6 && Math.max(...centre.map((c) => c.x)) > 0.6)
  assert.ok(centre[40].z - centre[0].z > 11)
  let turns = 0
  for (let i = 2; i < centre.length; i += 1) if (Math.sign(centre[i].x - centre[i - 1].x) !== Math.sign(centre[i - 1].x - centre[i - 2].x)) turns += 1
  assert.ok(turns >= 3, `${turns} bends`)
  // all of it lies on the valley disc, and its ends and banks fade out
  for (const [x, , z] of bed) {
    const [wx, wz] = onMap(river, x, z)
    assert.ok(Math.hypot(wx - valley.x, wz - valley.z) < valley.r - 1, 'off the valley floor')
  }
  assert.ok(river.y > valley.top)
  const rows = DRY_RIVER.steps + 1
  const across = bed.length / rows
  assert.equal(across, 8)
  for (let row = 0; row < rows; row += 1) assert.ok(bed[row * across][3] === 0 && bed[row * across + across - 1][3] === 0, 'bank edge fades')
  assert.ok(bed.slice(0, across).every(([, , , a]) => a === 0) && bed.slice(-across).every(([, , , a]) => a === 0), 'ends fade')
  // the banks never fold over themselves: every face looks up
  const normal = geometry.attributes.normal
  for (let i = 0; i < normal.count; i += 1) assert.ok(normal.getY(i) > 0.99)
  const position = geometry.attributes.position
  const index = geometry.index
  for (let i = 0; i < index.count; i += 3) {
    const [a, b, c] = [index.getX(i), index.getX(i + 1), index.getX(i + 2)]
    const area = (position.getZ(b) - position.getZ(a)) * (position.getX(c) - position.getX(a)) - (position.getX(b) - position.getX(a)) * (position.getZ(c) - position.getZ(a))
    assert.ok(area > -1e-9, 'a folded face')
  }
  // station 5's ring and the timeline board stand beside the bed, not in it
  const away = (x, z, target) => { const [wx, wz] = onMap(river, x, z); return Math.hypot(wx - target.x, wz - target.z) }
  for (const [x, , z, a] of bed) if (a > 0.5) assert.ok(away(x, z, s5) > 1 && away(x, z, timeline) > 0.6)
  const pebbles = dryRiverPebbles()
  assert.ok(pebbles.length >= 60)
  for (const { x, z, r } of pebbles) {
    assert.ok(r <= 0.2, 'pebbles, not obstacles: nothing the bird would expect to stop at')
    assert.ok(away(x, z, s5) > 1.1 && away(x, z, timeline) > 0.55)
  }
  assert.ok(Math.abs(away(DRY_RIVER.keepClear[0].x, DRY_RIVER.keepClear[0].z, s5)) < 0.05)
  assert.ok(Math.abs(away(DRY_RIVER.keepClear[1].x, DRY_RIVER.keepClear[1].z, timeline)) < 0.05)
  assert.ok(triangles(createDryRiverPebblesGeometry()) < 4500)
})

test('sahara dry river: the clay is cracked into plates', () => {
  const size = 64
  const pattern = crackPattern(size)
  assert.equal(pattern.length, size * size)
  let cracks = 0
  for (const value of pattern) {
    assert.ok(value >= 0.5 && value <= 1)
    if (value < 0.7) cracks += 1
  }
  const share = cracks / pattern.length
  assert.ok(share > 0.04 && share < 0.35, `${(share * 100).toFixed(0)}% cracks`)
  assert.deepEqual(crackPattern(size), pattern)
})
