import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BIOMES, collidersFor } from '../biomes/index.js'
import { scatterAmazon } from './amazonScatter.js'
import { AMAZON_FAUNA, AMAZON_FAUNA_MODELS, AMAZON_MODEL_CREDITS, flightAt, roamAt, roamLoop, GAITS } from './amazonFauna.js'

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
  const ground = fauna.filter((a) => a.y === 0 && !a.roam)
  assert.ok(ground.length >= 3)
  for (const animal of fauna.filter((a) => !a.fly && !a.roam)) {
    const r = animal.solid?.r ?? 0.1
    const name = `${animal.type} at (${animal.x.toFixed(1)}, ${animal.z.toFixed(1)})`
    const disc = biome.discs.filter((d) => apart(animal, d) + r <= d.r && Math.abs(d.top - animal.y) < 1e-9)
    assert.ok(disc.length, `${name} stands on a disc, at its height`)
    for (const station of biome.stations) assert.ok(apart(animal, station) - r >= 1.2, `${name} crowds station ${station.n}`)
    for (const other of fauna.filter((a) => !a.fly && !a.roam)) if (other !== animal && Math.abs(other.y - animal.y) < 1e-9) assert.ok(apart(animal, other) >= r + (other.solid?.r ?? 0.1) - 0.05 || !animal.solid || !other.solid, `${name} overlaps ${other.type}`)
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

test('amazon fauna: the standing models stay put, the flyers circle, and each flight is a closed loop', () => {
  const files = ['./AmazonFauna.jsx'].map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
  // only the flyer is moved, and only by its position and heading
  assert.equal((files[0].match(/useFrame\(/g) ?? []).length, 3, 'the flyer, the roamer and the fixed animal')
  assert.ok(!/requestAnimationFrame/.test(files[0]))
  assert.ok(fauna.every((animal) => animal.route === undefined && !(animal.roam && animal.fly)))
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

test('amazon fauna: the roamers walk closed loops on the forest floor, clear of everything, facing the way they go', () => {
  const trees = scatterAmazon(biome).filter((item) => ['emergent', 'canopy', 'subcanopy'].includes(item.kind))
  const floor = biome.discs.find((d) => d.id === 'floor')
  const roamers = fauna.filter((a) => a.roam)
  assert.ok(roamers.length >= 12, 'plenty roam')
  assert.ok(new Set(roamers.map((a) => a.type)).size >= 6, 'of several kinds')
  for (const a of roamers) assert.ok(GAITS[AMAZON_FAUNA[a.type].gait], `${a.type} has a gait`)
  assert.ok(fauna.filter((a) => a.fly).length >= 17, 'and plenty fly')
  for (const animal of roamers) {
    const { roam } = animal
    const r = AMAZON_FAUNA[animal.type].radius
    const name = `${animal.type} roaming at (${roam.x}, ${roam.z})`
    assert.ok(!animal.solid, `${name} is not solid (it walks on)`)
    assert.ok(roam.speed > 0.3 && roam.speed < 1.5, `${name} walks, not runs`)
    for (const spot of roamLoop(roam, 48)) {
      assert.ok(Math.hypot(spot.x - floor.x, spot.z - floor.z) + r < floor.r - 1, `${name} stays well inside the floor`)
      for (const station of biome.stations) assert.ok(apart(spot, station) - r >= 1.2, `${name} crowds station ${station.n}`)
      assert.ok(apart(spot, { x: biome.spawn.position[0], z: biome.spawn.position[2] }) - r > 2.5, `${name} crowds the start`)
      for (const tree of trees) {
      // (a tucked armadillo rests against a trunk: it only keeps off the trunk itself)
      const trunk = tree.kind === 'emergent' ? 0.28 : tree.kind === 'subcanopy' ? 0.16 : 0.2
      assert.ok(apart(spot, tree) > (animal.tucked ? trunk * tree.scale + 0.45 : r + 0.9 * tree.scale), `${name} walks into a ${tree.kind}`)
      }
      for (const prop of biome.props) if (prop.block) assert.ok(apart(spot, prop) > prop.block + r, `${name} walks into a ${prop.type}`)
      for (const [from, to] of biome.links) {
        const dx = to.x - from.x, dz = to.z - from.z
        const t = Math.max(0, Math.min(1, ((spot.x - from.x) * dx + (spot.z - from.z) * dz) / (dx * dx + dz * dz || 1)))
        assert.ok(Math.hypot(spot.x - from.x - dx * t, spot.z - from.z - dz * t) > r + 0.8, `${name} blocks a path`)
      }
      for (const other of fauna.filter((a) => !a.fly && !a.roam && a.y === 0)) assert.ok(apart(spot, other) > r + (other.solid?.r ?? 0.1) + 0.2, `${name} walks into a ${other.type}`)
    }
    // a closed loop, at a walking pace, facing the way it goes
    const period = (2 * Math.PI * (roam.rx + roam.rz) / 2) / roam.speed
    const a = roamAt(roam, 1.3), b = roamAt(roam, 1.3 + period)
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1e-6, `${name} comes back round`)
    for (let t = 0; t < period; t += period / 40) {
      const p = roamAt(roam, t), q = roamAt(roam, t + 0.01)
      const dx = q.x - p.x, dz = q.z - p.z
      assert.ok(Math.hypot(dx, dz) / 0.01 < roam.speed * 1.7, `${name} never lurches`)
      assert.ok(Math.sin(p.heading) * dx + Math.cos(p.heading) * dz > 0, `${name} faces forwards`)
      assert.ok(p.walk > 0.2 && p.walk <= 1.0001)
    }
  }
  // and no two roamers share a stretch of floor
  for (const [i, a] of roamers.entries()) for (const b of roamers.slice(i + 1)) {
    for (const p of roamLoop(a.roam, 24)) for (const q of roamLoop(b.roam, 24)) assert.ok(apart(p, q) > 0.9, `${a.type} and ${b.type} cross paths`)
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
  dolphin: { meshes: 1, images: 1, maxBytes: 300 * 1024, maxTriangles: 2500 },
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

test('amazon pools: the fish and the dolphins swim in pools clear of the trees, the stations and the paths', () => {
  const { pools } = biome
  const trees = scatterAmazon(biome).filter((item) => ['emergent', 'canopy', 'subcanopy'].includes(item.kind))
  assert.deepEqual(pools.map((p) => p.kind), ['fish', 'dolphin'])
  assert.ok(pools.every((pool) => pool.swimmers.length >= 3), 'a few of each')
  for (const pool of pools) {
    for (const swimmer of pool.swimmers) {
      const length = AMAZON_FAUNA[pool.kind].length * (swimmer.scale ?? pool.scale)
      assert.ok(swimmer.r * (1 + (swimmer.wobble ?? 0.12)) + length / 2 < 1.6, `a ${pool.kind} stays inside the water (radius 1.6 m): ${swimmer.r} m out, ${length.toFixed(2)} m long`)
    }
    assert.ok(biome.props.some((p) => p.type === 'rainPool' && p.x === pool.x && p.z === pool.z && p.block >= 1.8), 'the bank is solid')
    for (const tree of trees) assert.ok(apart(pool, tree) > 1.8 + 0.2, `the ${pool.kind} pool is in a ${tree.kind}`)
    for (const station of biome.stations) assert.ok(apart(pool, station) > 1.8 + 1.2, `the ${pool.kind} pool crowds station ${station.n}`)
    assert.ok(apart(pool, { x: biome.spawn.position[0], z: biome.spawn.position[2] }) > 4)
    for (const [from, to] of biome.links) {
      const dx = to.x - from.x, dz = to.z - from.z
      const t = Math.max(0, Math.min(1, ((pool.x - from.x) * dx + (pool.z - from.z) * dz) / (dx * dx + dz * dz || 1)))
      assert.ok(Math.hypot(pool.x - from.x - dx * t, pool.z - from.z - dz * t) > 1.8 + 0.5, `the ${pool.kind} pool blocks a path`)
    }
    for (const fauna of biome.fauna.filter((a) => !a.fly && a.y === 0)) assert.ok(apart(pool, fauna) > 1.8 + 0.5, `the ${pool.kind} pool is on a ${fauna.type}`)
  }
  assert.ok(apart(pools[0], pools[1]) > 1.8 + 1.8 + 1, 'room to walk between the two banks')
  const ExpeditionCanvas = readFileSync(new URL('../ExpeditionCanvas.jsx', import.meta.url), 'utf8')
  assert.ok(ExpeditionCanvas.includes('biome.pools.map((pool, index) => <AmazonPool key={index} pool={pool} />)'))
})

test('amazon pools: the water ripples (a shader, with rings from each swimmer), the dolphins leap, and the numbers agree', async () => {
  const { POOL_BANK, POOL_WATER_R, RIPPLE_NORMAL, RIPPLE_FRAGMENT_HEAD, swimAt } = await import('./amazonPool.js')
  assert.ok(POOL_WATER_R > 1.22, 'bigger than the first pool')
  assert.equal(Math.max(...POOL_BANK.map(([r]) => r)), 2.35, 'the low skirt ends at 2.35 m')
  assert.ok(POOL_BANK.find(([, y]) => y === 0.33)[0] <= 1.9, 'the crest is about where the solid collider (1.8 m) ends')
  assert.match(RIPPLE_NORMAL, /uF|ring\(vWaterXZ, uF0\)/)
  assert.match(RIPPLE_FRAGMENT_HEAD, /uniform float uT/)
  for (const pool of biome.pools) {
    const a = swimAt(pool.swimmers[0], 0), b = swimAt(pool.swimmers[0], 5)
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 0.2, `a ${pool.kind} moves`)
    for (let t = 0; t < 80; t += 0.25) for (const s of pool.swimmers) {
      const p = swimAt(s, t)
      assert.ok(Math.hypot(p.x, p.z) + AMAZON_FAUNA[pool.kind].length * (s.scale ?? pool.scale) / 2 < 1.6, `a ${pool.kind} never leaves the water`)
      if (!s.leap) assert.equal(p.y, 0)
      else assert.ok(p.y >= 0 && p.y <= s.leap + 1e-9)
    }
  }
  // a dolphin leaps: it is clear of the water for part of its circuit, nose up on the way up and down on the way down
  const dolphin = biome.pools[1].swimmers[0]
  const track = Array.from({ length: 400 }, (_, i) => swimAt(dolphin, i * 0.05))
  assert.ok(track.some((p) => p.y > 0.2), 'a dolphin leaps')
  assert.ok(track.some((p) => p.y > 0.05 && p.pitch < -0.1) && track.some((p) => p.y > 0.05 && p.pitch > 0.1), 'nose up, then nose down')
})

test('amazon pool: the water disc is built lying flat once, not turned from a draw callback', () => {
  const source = readFileSync(new URL('./AmazonPool.jsx', import.meta.url), 'utf8')
  assert.match(source, /new CircleGeometry\(POOL_WATER_R, 56\)\.rotateX\(-Math\.PI \/ 2\)/)
  assert.ok(!/onUpdate/.test(source), 'a draw callback runs more than once and would stand the water on its edge')
})
