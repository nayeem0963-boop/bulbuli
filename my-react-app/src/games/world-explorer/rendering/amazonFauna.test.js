import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BIOMES, collidersFor } from '../biomes/index.js'
import { scatterAmazon } from './amazonScatter.js'
import { AMAZON_FAUNA, AMAZON_FAUNA_BUILDERS } from './amazonFauna.js'

const biome = BIOMES.amazon
const fauna = biome.fauna
const vertices = (geometry) => {
  const position = geometry.attributes.position
  return Array.from({ length: position.count }, (_, i) => [position.getX(i), position.getY(i), position.getZ(i)])
}
const triangles = (geometry) => (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3
const apart = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)

test('amazon fauna: fourteen kinds, as many animals as the forest has room for; only the Amazon has any', () => {
  assert.deepEqual(Object.keys(AMAZON_FAUNA_BUILDERS).sort(), Object.keys(AMAZON_FAUNA).sort())
  assert.equal(new Set(fauna.map((a) => a.type)).size, 14, 'every kind appears')
  for (const type of Object.keys(AMAZON_FAUNA)) assert.ok(fauna.filter((a) => a.type === type).length >= 2, `more than one ${type}`)
  assert.ok(fauna.length >= 38)
  for (const id of ['sundarbans', 'sahara']) assert.equal(BIOMES[id].fauna, undefined)
  const canvas = readFileSync(new URL('../ExpeditionCanvas.jsx', import.meta.url), 'utf8')
  assert.ok(canvas.includes('{biome.fauna ? <AmazonFauna fauna={biome.fauna} /> : null}'))
  // built in code: no model or image is fetched
  for (const file of ['./AmazonFauna.jsx', './amazonFauna.js']) assert.ok(!/useLoader|useGLTF|GLTFLoader|https?:\/\//.test(readFileSync(new URL(file, import.meta.url), 'utf8').replace(/^\/\*\*[\s\S]*?\*\//, '')))
})

test('amazon fauna: each model stands on the ground, within the size its collider says, and is always the same', () => {
  for (const [type, build] of Object.entries(AMAZON_FAUNA_BUILDERS)) {
    const spec = AMAZON_FAUNA[type]
    const geometry = build(5)
    const points = vertices(geometry)
    assert.ok(points.every((p) => p.every(Number.isFinite)), `${type} is finite`)
    assert.ok(geometry.attributes.color && geometry.attributes.normal, `${type} has colours and normals`)
    assert.ok(triangles(geometry) < 6500, `${type} has ${triangles(geometry)} triangles`)
    const ys = points.map((p) => p[1])
    assert.ok(Math.min(...ys) >= -0.02 && Math.min(...ys) < 0.06, `${type} stands on the ground (lowest ${Math.min(...ys).toFixed(3)})`)
    assert.ok(Math.max(...ys) <= spec.top + 0.12 && Math.max(...ys) >= spec.top - 0.3, `${type} is ${Math.max(...ys).toFixed(2)} m tall, collider ${spec.top} m`)
    const reach = Math.max(...points.map(([x, , z]) => Math.hypot(x, z)))
    assert.ok(reach <= spec.radius + 0.9 * (spec.length / 2) + 0.2, `${type} reaches ${reach.toFixed(2)} m`)
    assert.deepEqual(vertices(build(5)), points)
  }
  // length: along z, within the stated size
  const length = (type) => { const zs = vertices(AMAZON_FAUNA_BUILDERS[type](1)).map((p) => p[2]); return Math.max(...zs) - Math.min(...zs) }
  assert.ok(length('tapir') > 1.2 && length('anteater') > 1.6 && length('caiman') > 1.6 && length('capybara') > 0.9)
})

test('amazon fauna: every solid animal has a collider; the tiny ones have none', () => {
  const colliders = collidersFor(biome)
  fauna.forEach((animal, i) => {
    const collider = colliders.find((c) => c.id === `fauna-${i}`)
    if (!animal.solid) return assert.equal(collider, undefined, `${animal.type} is too small to bump into`)
    assert.ok(collider.x === animal.x && collider.z === animal.z && collider.r === animal.solid.r)
    assert.equal(collider.walkable, false)
    assert.ok(Math.abs(collider.top - (animal.y + animal.solid.top)) < 1e-9)
    // a perched animal's collider starts at its perch, not at the floor beneath
    assert.ok(collider.bottom > animal.y - 0.1)
  })
})

test('amazon fauna: every animal stands on its ground, clear of the stations, the paths, the props and the trees', () => {
  const trees = scatterAmazon(biome).filter((item) => ['emergent', 'canopy', 'subcanopy'].includes(item.kind))
  const floor = biome.discs.find((d) => d.id === 'floor')
  const ground = fauna.filter((a) => a.y === 0)
  assert.ok(ground.length >= 15)
  for (const animal of fauna) {
    const r = animal.solid?.r ?? 0.1
    const name = `${animal.type} at (${animal.x.toFixed(1)}, ${animal.z.toFixed(1)})`
    const disc = biome.discs.filter((d) => apart(animal, d) + r <= d.r && Math.abs(d.top - animal.y) < 1e-9)
    assert.ok(disc.length, `${name} stands on a disc, at its height`)
    for (const station of biome.stations) assert.ok(apart(animal, station) - r >= 1.2, `${name} crowds station ${station.n}`)
    for (const other of fauna) if (other !== animal && Math.abs(other.y - animal.y) < 1e-9) assert.ok(apart(animal, other) >= r + (other.solid?.r ?? 0.1) - 0.05 || !animal.solid || !other.solid, `${name} overlaps ${other.type}`)
    if (animal.y === 0) {
      assert.ok(apart(animal, floor) + r < floor.r - 1 || disc[0].id !== 'floor', `${name} is not well inside the floor`)
      assert.ok(apart(animal, { x: biome.spawn.position[0], z: biome.spawn.position[2] }) - r > 2.5, `${name} crowds the start`)
      for (const tree of trees) assert.ok(apart(animal, tree) > r + 0.9 * tree.scale, `${name} is in a ${tree.kind}`)
      for (const prop of biome.props) if (prop.block) assert.ok(apart(animal, prop) > prop.block + r, `${name} is in a ${prop.type}`)
      for (const [from, to] of biome.links) {
        const dx = to.x - from.x
        const dz = to.z - from.z
        const t = Math.max(0, Math.min(1, ((animal.x - from.x) * dx + (animal.z - from.z) * dz) / (dx * dx + dz * dz || 1)))
        assert.ok(Math.hypot(animal.x - from.x - dx * t, animal.z - from.z - dz * t) > r + 0.8, `${name} blocks a path`)
      }
    }
  }
  // perched animals keep off the way in: the stair lands on the near side of the platform
  for (const animal of fauna.filter((a) => a.y > 0)) assert.ok(animal.solid && animal.y >= 3.4)
})
