import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BIOMES, collidersFor } from '../biomes/index.js'
import { duneReach } from '../biomes/sandShapes.js'
import { RECOVERY, distanceOutside } from '../recovery.js'
import { scatterBiomeAssets } from './scattering.js'
import { distantDunes } from './saharaSurround.js'
import { FORT, PACK_CAMEL, STALL, TRADER, createFortGeometry, createPackCamelGeometry, createStallGeometry, createTraderGeometry, stallRoofAt } from './saharaCaravan.js'

const biome = BIOMES.sahara
const decor = biome.decor
const solid = decor.filter((piece) => piece.solid)
const vertices = (geometry) => {
  const position = geometry.attributes.position
  return Array.from({ length: position.count }, (_, i) => [position.getX(i), position.getY(i), position.getZ(i)])
}
const triangles = (geometry) => (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3
const apart = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)

test('sahara decor: a caravan, stalls, palms and a fort; only the Sahara has any', () => {
  const count = (type) => decor.filter((piece) => piece.type === type).length
  assert.deepEqual([count('packCamel'), count('trader'), count('stall'), count('datePalm'), count('fort')], [3, 2, 2, 3, 1])
  for (const id of ['sundarbans', 'amazon']) assert.equal(BIOMES[id].decor, undefined)
  const canvas = readFileSync(new URL('../ExpeditionCanvas.jsx', import.meta.url), 'utf8')
  assert.ok(canvas.includes('{biome.decor ? <SaharaDecor decor={biome.decor} /> : null}'))
  // built in code: no model or image is fetched
  for (const file of ['./SaharaLandmarks.jsx', './saharaCaravan.js']) assert.ok(!/useLoader|useGLTF|GLTFLoader|https?:\/\//.test(readFileSync(new URL(file, import.meta.url), 'utf8')))
})

test('sahara decor: the models are the sizes their colliders say', () => {
  const camel = vertices(createPackCamelGeometry(11))
  const ys = camel.map(([, y]) => y)
  assert.ok(Math.min(...ys) >= 0 && Math.min(...ys) < 0.06, 'stands on the sand')
  assert.ok(Math.max(...ys) > 2.6 && Math.max(...ys) <= PACK_CAMEL.headTop)
  // the load and the back are under the collider's top; only the head and neck rise above it
  const body = camel.filter(([, , z]) => Math.abs(z) < 0.6)
  assert.ok(Math.max(...body.map(([, y]) => y)) <= PACK_CAMEL.top + 0.1)
  assert.ok(Math.max(...body.map(([x]) => Math.abs(x))) <= PACK_CAMEL.radius + 0.15, 'the load is no wider than the collider')
  assert.notDeepEqual(vertices(createPackCamelGeometry(12)), camel)
  assert.deepEqual(vertices(createPackCamelGeometry(11)), camel)

  const trader = vertices(createTraderGeometry(3))
  assert.ok(Math.max(...trader.map(([, y]) => y)) <= TRADER.top + 0.03)
  assert.ok(Math.max(...trader.map(([x, , z]) => Math.hypot(x, z))) <= TRADER.radius + 0.05)

  const stall = vertices(createStallGeometry(5))
  assert.ok(Math.max(...stall.map(([, y]) => y)) <= STALL.awning + 0.06)
  // the awning slopes forward and sags, and the collider's roof follows it
  assert.ok(stallRoofAt(0, -STALL.halfDepth) > stallRoofAt(0, STALL.halfDepth) + 0.2)
  assert.ok(stallRoofAt(0, 0) < (stallRoofAt(-STALL.halfWidth, 0) + stallRoofAt(STALL.halfWidth, 0)) / 2 - 0.05)
  for (const [x, y, z] of stall) if (y > 1.75 && Math.abs(x) < STALL.halfWidth - 0.2 && Math.abs(z) < STALL.halfDepth - 0.2) assert.ok(y <= stallRoofAt(x, z) + 0.06)

  const fort = createFortGeometry()
  const walls = vertices(fort)
  assert.ok(Math.max(...walls.map(([, y]) => y)) > FORT.keep)
  assert.ok(Math.min(...walls.map(([, y]) => y)) <= -2, 'sunk into the sand')
  for (const geometry of [createPackCamelGeometry(1), createTraderGeometry(1, { staff: true }), createStallGeometry(1), fort]) {
    assert.ok(vertices(geometry).every((p) => p.every(Number.isFinite)))
    assert.ok(triangles(geometry) < 2600)
  }
})

test('sahara decor: every solid piece has a collider, and nothing else on the map has moved', () => {
  const colliders = collidersFor(biome)
  decor.forEach((piece, i) => {
    const collider = colliders.find((c) => c.id === `decor-${i}`)
    if (!piece.solid) return assert.equal(collider, undefined)
    assert.ok(collider.x === piece.x && collider.z === piece.z && collider.r === piece.solid.r && collider.top === piece.solid.top)
    assert.equal(collider.walkable, Boolean(piece.solid.roof))
    if (piece.type === 'stall') {
      // a point on the stall's front edge is lower than one at its back, wherever the stall faces
      const front = [piece.x + Math.sin(piece.rot) * 0.9, piece.z + Math.cos(piece.rot) * 0.9]
      const back = [piece.x - Math.sin(piece.rot) * 0.9, piece.z - Math.cos(piece.rot) * 0.9]
      assert.ok(collider.heightAt(...back) > collider.heightAt(...front) + 0.15)
    }
  })
  for (const piece of decor.filter((p) => p.type === 'datePalm')) assert.ok(Math.abs(piece.solid.top - 4 * piece.scale) < 1e-9 && piece.solid.r - 0.2 * piece.scale <= 0.13)
  // the scenery scatter and the prop colliders are built without the decor: both are as they were
  const bare = { ...biome, decor: undefined }
  assert.deepEqual(scatterBiomeAssets(biome), scatterBiomeAssets(bare))
  assert.deepEqual(collidersFor(bare).map((c) => c.id), colliders.filter((c) => !c.id.startsWith('decor-')).map((c) => c.id))
})

test('sahara decor: every solid piece stands on bare sand, clear of everything else', () => {
  const plain = biome.discs.find((d) => d.id === 'plain')
  const scattered = scatterBiomeAssets(biome)
  for (const piece of solid) {
    const r = piece.solid.r
    const name = `${piece.type} at (${piece.x}, ${piece.z})`
    assert.ok(Math.hypot(piece.x, piece.z) + r < 30, `${name} is not well inside the plain`)
    for (const disc of biome.discs) if (disc !== plain) assert.ok(apart(piece, disc) > disc.r + r + 0.5, `${name} is on ${disc.id}`)
    for (const station of biome.stations) assert.ok(apart(piece, station) - r >= 1.5, `${name} crowds station ${station.n}`)
    assert.ok(apart(piece, { x: biome.spawn.position[0], z: biome.spawn.position[2] }) - r > 3, `${name} crowds the start`)
    for (const prop of biome.props) {
      if (prop.type === 'dune') assert.ok(apart(piece, prop) > duneReach(prop) + r, `${name} is in a dune`)
      else if (prop.block) assert.ok(apart(piece, prop) > prop.block + r + 0.3, `${name} is in a ${prop.type}`)
      else assert.ok(apart(piece, prop) > r + 0.3 || prop.type === 'pool', `${name} is on the ${prop.type}`)
    }
    const pool = biome.props.find((p) => p.type === 'pool')
    assert.ok(apart(piece, pool) > 2.6 + r, `${name} is in the pool`)
    for (const item of scattered) assert.ok(apart(piece, item) > r + (item.kind === 'acacia' ? 0.7 : 0.95 * item.scale), `${name} is in a scattered ${item.kind}`)
    for (const other of solid) if (other !== piece) assert.ok(apart(piece, other) >= r + other.solid.r, `${name} overlaps ${other.type}`)
  }
  // the caravan walks in line towards the oasis, its driver in front
  const camels = decor.filter((p) => p.type === 'packCamel')
  const driver = decor.find((p) => p.staff)
  assert.ok(driver.x < Math.min(...camels.map((c) => c.x)))
  for (let i = 1; i < camels.length; i += 1) assert.ok(camels[i].x - camels[i - 1].x > PACK_CAMEL.length - 0.4 && Math.abs(camels[i].z - camels[i - 1].z) < 0.6)
})

test('sahara decor: the fort is beyond where the bird can go, and clear of the far dunes', () => {
  const fort = decor.find((p) => p.type === 'fort')
  assert.equal(fort.solid, undefined)
  const cos = Math.cos(fort.rot)
  const sin = Math.sin(fort.rot)
  for (const [x, , z] of vertices(createFortGeometry())) {
    const wx = fort.x + x * cos + z * sin
    const wz = fort.z - x * sin + z * cos
    assert.ok(distanceOutside(biome, wx, wz) > RECOVERY.limitBeyond + 1, 'the bird could reach the fort')
  }
  for (const dune of distantDunes()) assert.ok(apart(fort, dune) > 20 + dune.length, 'a far dune runs through the fort')
  // its gate looks back towards the oasis
  const oasis = biome.props.find((p) => p.type === 'pool')
  const gate = [Math.sin(fort.rot), Math.cos(fort.rot)]
  const toOasis = [oasis.x - fort.x, oasis.z - fort.z]
  assert.ok((gate[0] * toOasis[0] + gate[1] * toOasis[1]) / Math.hypot(...toOasis) > 0.9)
})
