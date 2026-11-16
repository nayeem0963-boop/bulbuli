import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BIOMES, collidersFor } from '../biomes/index.js'
import { scatterAmazon } from './amazonScatter.js'
import { AMAZON_FAUNA, AMAZON_FAUNA_MODELS, AMAZON_MODEL_CREDITS, flightAt } from './amazonFauna.js'

const biome = BIOMES.amazon
const fauna = biome.fauna
const apart = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)

test('amazon fauna: twelve kinds in the forest and one in the gallery, all model files; only the Amazon has any', () => {
  assert.deepEqual([...AMAZON_FAUNA_MODELS].sort(), Object.keys(AMAZON_FAUNA).sort())
  assert.deepEqual(Object.keys(AMAZON_MODEL_CREDITS).sort(), Object.keys(AMAZON_FAUNA).sort())
  const inForest = Object.keys(AMAZON_FAUNA).filter((type) => !AMAZON_FAUNA[type].gallery)
  assert.deepEqual([...new Set(fauna.map((a) => a.type))].sort(), inForest.sort(), 'every forest kind appears, and only those')
  for (const type of inForest) assert.ok(fauna.filter((a) => a.type === type).length >= 2, `more than one ${type}`)
  assert.ok(fauna.length >= 25)
  for (const id of ['sundarbans', 'sahara']) assert.equal(BIOMES[id].fauna, undefined)
  const canvas = readFileSync(new URL('../ExpeditionCanvas.jsx', import.meta.url), 'utf8')
  assert.ok(canvas.includes('{biome.fauna ? <AmazonFauna fauna={biome.fauna} /> : null}'))
  // clean-up: nothing is built in code any more; the models are loaded only by AmazonModel.jsx
  for (const file of ['./AmazonFauna.jsx', './amazonFauna.js']) assert.ok(!/useLoader|useGLTF|GLTFLoader|https?:\/\/|createBuilder|BufferGeometry|MeshPhysicalMaterial/.test(readFileSync(new URL(file, import.meta.url), 'utf8').replace(/^\/\*\*[\s\S]*?\*\//, '').replace(/^ {2}\w+: \{ file:.*$/gm, '')))
  assert.ok(/useLoader\(GLTFLoader, url\)/.test(readFileSync(new URL('./AmazonModel.jsx', import.meta.url), 'utf8')))
})

test('amazon fauna: every solid animal has a collider; the tiny ones have none', () => {
  const colliders = collidersFor(biome)
  fauna.forEach((animal, i) => {
    const collider = colliders.find((c) => c.id === `fauna-${i}`)
    if (!animal.solid) return assert.equal(collider, undefined, `${animal.type} is not solid`)
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
  assert.ok(ground.length >= 8)
  for (const animal of fauna.filter((a) => !a.fly)) {
    const r = animal.solid?.r ?? 0.1
    const name = `${animal.type} at (${animal.x.toFixed(1)}, ${animal.z.toFixed(1)})`
    const disc = biome.discs.filter((d) => apart(animal, d) + r <= d.r && Math.abs(d.top - animal.y) < 1e-9)
    assert.ok(disc.length, `${name} stands on a disc, at its height`)
    for (const station of biome.stations) assert.ok(apart(animal, station) - r >= 1.2, `${name} crowds station ${station.n}`)
    for (const other of fauna.filter((a) => !a.fly)) if (other !== animal && Math.abs(other.y - animal.y) < 1e-9) assert.ok(apart(animal, other) >= r + (other.solid?.r ?? 0.1) - 0.05 || !animal.solid || !other.solid, `${name} overlaps ${other.type}`)
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
  for (const animal of fauna.filter((a) => a.y > 0 && !a.fly)) assert.ok(animal.solid && animal.y >= 3.4)
  // a flyer is not solid and is up in the air (the butterflies low, the birds high)
  for (const animal of fauna.filter((a) => a.fly)) assert.ok(!animal.solid && animal.fly.y >= 1 && animal.fly.r >= 1.2)
})

test('amazon fauna: the models stand still, the macaws circle, and each flight is a closed loop', () => {
  const files = ['./AmazonFauna.jsx'].map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
  // only the flyer is moved, and only by its position and heading
  assert.equal((files[0].match(/useFrame\(/g) ?? []).length, 1)
  assert.ok(!/requestAnimationFrame/.test(files[0]))
  assert.ok(fauna.every((animal) => animal.roam === undefined && animal.route === undefined))
  for (const animal of fauna.filter((a) => a.fly)) {
    const start = flightAt(animal.fly, 0)
    assert.ok(Math.abs(start.x - animal.x) < 1e-9 && Math.abs(start.z - animal.z) < 1e-9 || animal.fly.phase !== 0, 'starts on its circle')
    for (let t = 0; t < 60; t += 3.7) {
      const p = flightAt(animal.fly, t)
      assert.ok(Math.abs(Math.hypot(p.x - animal.fly.x, p.z - animal.fly.z) - animal.fly.r) < 1e-9, 'stays on its circle')
      assert.ok(Math.abs(p.y - animal.fly.y) <= 0.19)
      // it heads along the circle: its heading is the direction of travel
      const q = flightAt(animal.fly, t + 0.01)
      const dx = q.x - p.x, dz = q.z - p.z
      assert.ok(Math.abs(Math.sin(p.heading) * dz - Math.cos(p.heading) * dx) < 1e-3 * Math.hypot(dx, dz) * 100, 'faces the way it flies')
      assert.ok(Math.sin(p.heading) * dx + Math.cos(p.heading) * dz > 0, 'forwards')
    }
  }
})

/** The parts of a .glb the tests need: its JSON chunk and its size. */
function readGlb(name) {
  const data = readFileSync(new URL(`../assets/${name}.glb`, import.meta.url))
  assert.equal(data.toString('ascii', 0, 4), 'glTF')
  const jsonLength = data.readUInt32LE(12)
  return { json: JSON.parse(data.toString('utf8', 20, 20 + jsonLength)), bytes: data.length }
}

// what each model file must say and be: its credit, its parts and its size
const MODEL_FILES = {
  jaguar: { meshes: 2, images: 1, maxBytes: 1.2 * 1024 * 1024, maxTriangles: 23000 },
  ocelot: { meshes: 3, images: 3, maxBytes: 400 * 1024, maxTriangles: 4000 },
  armadillo: { meshes: 1, images: 1, maxBytes: 900 * 1024, maxTriangles: 20000 },
  capuchin: { meshes: 1, images: 1, maxBytes: 600 * 1024, maxTriangles: 15000 },
  anaconda: { meshes: 1, images: 1, maxBytes: 600 * 1024, maxTriangles: 16000 },
  harpyEagle: { meshes: 1, images: 1, maxBytes: 1.4 * 1024 * 1024, maxTriangles: 19000 },
  hoatzin: { meshes: 4, images: 4, maxBytes: 900 * 1024, maxTriangles: 28000 },
  macaw: { meshes: 1, images: 1, maxBytes: 700 * 1024, maxTriangles: 16000 },
  blueMacaw: { meshes: 1, images: 1, maxBytes: 1.2 * 1024 * 1024, maxTriangles: 16000 },
  scarletMacaw: { meshes: 1, images: 1, maxBytes: 300 * 1024, maxTriangles: 1500 },
  toucan: { meshes: 1, images: 1, maxBytes: 1.2 * 1024 * 1024, maxTriangles: 18000 },
  morpho: { meshes: 3, images: 3, maxBytes: 1.2 * 1024 * 1024, maxTriangles: 23000 },
  fish: { meshes: 1, images: 1, maxBytes: 800 * 1024, maxTriangles: 16000 },
}

test('amazon models: credited, light, static, and the size their colliders say', () => {
  assert.deepEqual(Object.keys(MODEL_FILES).sort(), [...AMAZON_FAUNA_MODELS].sort())
  for (const [name, want] of Object.entries(MODEL_FILES)) {
    const credit = AMAZON_MODEL_CREDITS[name]
    const { json, bytes } = readGlb(credit.file)
    // credited (CC BY 4.0 asks for the author, the licence and a note of the changes)
    assert.match(json.asset.extras.license, /CC-BY-4\.0/, name)
    assert.ok(json.asset.extras.author.includes(credit.authorUrl), name)
    assert.equal(json.asset.extras.source, credit.source, name)
    assert.equal(credit.license, 'CC BY 4.0')
    const note = readFileSync(new URL(`../assets/${credit.file}.LICENSE.md`, import.meta.url), 'utf8')
    for (const needle of [credit.source, 'CC BY 4.0', 'Changes made']) assert.ok(note.includes(needle), `${name}: the licence note names ${needle}`)
    const preview = readFileSync(new URL('../../../../dev-preview/phase-2a/PreviewApp.jsx', import.meta.url), 'utf8')
    assert.ok(preview.includes('AMAZON_MODEL_CREDITS') && preview.includes('c.source') && preview.includes('c.author'), 'the review page credits every model from the credits table')
    const gallery = readFileSync(new URL('../../../../dev-preview/phase-2a/WildlifeGallery.jsx', import.meta.url), 'utf8')
    assert.ok(gallery.includes('credit.source') && gallery.includes('credit.author') && gallery.includes('AMAZON_FAUNA_MODELS'), `${name} is in the gallery, credited`)
    // light and static: no skeleton, no animation
    assert.ok(bytes < want.maxBytes, `${name}: ${bytes} bytes`)
    assert.ok(!json.skins && !json.animations, `${name}: static: no skeleton, no animation`)
    // the sizes below are read from the vertices, so no node may move, turn or scale them
    assert.ok(json.nodes.every((node) => !node.translation && !node.rotation && !node.scale && !node.matrix), `${name}: every transform is baked into the vertices`)
    assert.equal(json.images.length, want.images, name)
    assert.equal(json.meshes.length, want.meshes, name)
    let triangles = 0
    const box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
    for (const mesh of json.meshes) for (const primitive of mesh.primitives) {
      triangles += json.accessors[primitive.indices].count / 3
      const position = json.accessors[primitive.attributes.POSITION]
      for (let a = 0; a < 3; a += 1) { box.min[a] = Math.min(box.min[a], position.min[a]); box.max[a] = Math.max(box.max[a], position.max[a]) }
      assert.ok(!primitive.attributes.JOINTS_0 && !primitive.attributes.WEIGHTS_0, name)
    }
    assert.ok(triangles < want.maxTriangles, `${name}: ${triangles} triangles`)
    // standing on the ground, centred, within the collider's size
    const spec = AMAZON_FAUNA[name]
    assert.ok(Math.abs(box.min[1]) < 0.01, `${name}: feet at y = ${box.min[1]}`)
    assert.ok(box.max[1] <= spec.top + 0.05 && box.max[1] >= spec.top - 0.1, `${name}: ${box.max[1]} m tall, collider ${spec.top} m`)
    assert.ok(Math.abs(box.max[2] - box.min[2] - spec.length) < 0.2, `${name}: ${(box.max[2] - box.min[2]).toFixed(2)} m long, spec ${spec.length} m`)
    assert.ok(Math.abs(box.min[0] + box.max[0]) < 0.05 && Math.abs(box.min[2] + box.max[2]) < 0.05, `${name}: centred on its place`)
    assert.ok(Math.hypot(box.max[0], box.max[2]) <= spec.radius + 0.9 * (spec.length / 2) + 0.2 + 0.3, `${name}: within reach of its place`)
  }
  // the ocelot's and the capuchin's coats are shaders: each keeps the model's own eyes, nose and face where the file puts them
  const ocelot = readFileSync(new URL('./amazonOcelotCoat.js', import.meta.url), 'utf8')
  assert.ok(ocelot.includes('OCELOT_EYES') && ocelot.includes('OCELOT_NOSE'))
  assert.ok(readFileSync(new URL('./amazonCapuchinCoat.js', import.meta.url), 'utf8').includes('CAPUCHIN_FACE'))
})
