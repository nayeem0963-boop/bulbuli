import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BIOMES, collidersFor } from '../biomes/index.js'
import { WALKING_CAT, WALKING_CAT_PATH, SUNDARBANS_MODEL_CREDITS } from './sundarbansCredits.js'
import { catAt, catCircuit } from './sundarbansCat.js'
import { LEG_MOTION, IDLE_MOTION, motionGlsl } from './amazonMotion.js'

const biome = BIOMES.sundarbans
const credit = SUNDARBANS_MODEL_CREDITS.cat
const asset = (name) => new URL(`../assets/${name}`, import.meta.url)

function readGlb(name) {
  const data = readFileSync(asset(`${name}.glb`))
  assert.equal(data.toString('ascii', 0, 4), 'glTF')
  const jsonLength = data.readUInt32LE(12)
  return { json: JSON.parse(data.toString('utf8', 20, 20 + jsonLength)), bytes: data.length }
}

test('sundarbans cat: credited as CC BY 4.0 (author, licence link, source, and a note of the changes)', () => {
  const { json } = readGlb(credit.file)
  assert.match(json.asset.extras.license, /CC-BY-4\.0/)
  assert.ok(json.asset.extras.author.includes(credit.authorUrl))
  assert.equal(json.asset.extras.source, credit.source)
  assert.equal(json.asset.extras.title, credit.title)
  assert.equal(credit.license, 'CC BY 4.0')
  const note = readFileSync(asset(`${credit.file}.LICENSE.md`), 'utf8')
  for (const needle of [credit.source, credit.authorUrl, 'CC BY 4.0', 'creativecommons.org/licenses/by/4.0', 'Changes made']) assert.ok(note.includes(needle), `the licence note names ${needle}`)
  const preview = readFileSync(new URL('../../../../dev-preview/phase-2a/PreviewApp.jsx', import.meta.url), 'utf8')
  assert.ok(preview.includes('SUNDARBANS_MODEL_CREDITS') && preview.includes('c.source') && preview.includes('c.author'), 'the review page credits it')
})

test('sundarbans cat: a light static model, centred, paws on the ground, life size, facing +z', () => {
  const { json, bytes } = readGlb(credit.file)
  assert.ok(bytes < 700 * 1024, `${bytes} bytes`)
  assert.ok(!json.skins && !json.animations, 'no skeleton, no animation')
  assert.ok(json.nodes.every((node) => !node.translation && !node.rotation && !node.scale && !node.matrix), 'every transform is baked into the vertices')
  assert.equal(json.images.length, 1)
  assert.equal(json.images[0].mimeType, 'image/jpeg')
  assert.equal(json.meshes.length, 1)
  const primitive = json.meshes[0].primitives[0]
  assert.ok(!primitive.targets, 'the mouth morph target is gone')
  assert.ok(json.accessors[primitive.indices].count / 3 < 20000)
  const { min, max } = json.accessors[primitive.attributes.POSITION]
  assert.ok(Math.abs(min[1]) < 0.01, `paws at y = ${min[1]}`)
  assert.ok(max[1] > 0.3 && max[1] < 0.5, `${max[1]} m tall: a cat`)
  assert.ok(max[2] - min[2] > 0.6 && max[2] - min[2] < 0.85, 'about 0.7 m from nose to tail tip')
  assert.ok(Math.abs(min[0] + max[0]) < 0.05 && Math.abs(min[2] + max[2]) < 0.05, 'centred on its place')
})

test('sundarbans cat: its line is on the home island, in sight and clear of everything, and it is not solid', () => {
  const home = biome.discs.find((d) => d.id === 'home')
  const props = biome.props.filter((p) => p.type === 'walkingCat')
  const { x, z0, z1, scale } = WALKING_CAT_PATH
  assert.equal(props.length, 1)
  assert.deepEqual([props[0].x, props[0].z, props[0].scale], [x, (z0 + z1) / 2, scale])
  const spawn = { x: biome.spawn.position[0], z: biome.spawn.position[2] }
  for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z += 0.25) {
    assert.ok(Math.hypot(x - home.x, z - home.z) + 0.8 < home.r, `(${x}, ${z}) is well inside the island`)
    assert.ok(Math.hypot(x - spawn.x, z - spawn.z) > 2.5, 'not on top of the start')
    for (const station of biome.stations) assert.ok(Math.hypot(x - station.x, z - station.z) > 3.8, `clear of station ${station.n}`)
    for (const other of biome.props) if (other.type !== 'walkingCat' && other.block) assert.ok(Math.hypot(x - other.x, z - other.z) > other.block + 0.8, 'clear of solid props')
  }
  assert.equal(props[0].block, undefined, 'a decoration: no collider')
  assert.ok(!collidersFor(biome).some((c) => c.kind === 'prop' && Math.hypot(c.x - x, c.z - (z0 + z1) / 2) < Math.abs(z1 - z0) / 2 + 0.3), 'nothing solid on its line')
  const canvas = readFileSync(new URL('../ExpeditionCanvas.jsx', import.meta.url), 'utf8')
  assert.ok(canvas.includes("case 'walkingCat': body = <SundarbansCat scale={scale} />"))
  const source = readFileSync(new URL('./SundarbansCat.jsx', import.meta.url), 'utf8')
  assert.ok(source.includes('oiiaioooooiai-cat.glb') && source.includes('catAt(') && !/rotation\.y = t \*/.test(source), 'it walks, it does not spin')
})

test('sundarbans cat: it walks a straight line at a steady pace, turns right round at each end, and comes back', () => {
  const { x, z0, z1 } = WALKING_CAT_PATH
  const { leg, period } = catCircuit()
  const dir = Math.sign(z1 - z0)
  // straight: x never changes and z stays between the ends; heading is exactly along the line while walking
  for (let t = 0; t < 2 * period; t += 0.05) {
    const p = catAt(t)
    assert.equal(p.x, x)
    assert.ok(p.z >= Math.min(z0, z1) - 1e-9 && p.z <= Math.max(z0, z1) + 1e-9, `z ${p.z} stays on the line`)
  }
  const out = catAt(leg * 0.5), back = catAt(leg + WALKING_CAT.turnSeconds + leg * 0.5)
  assert.ok(Math.abs(out.heading - (dir > 0 ? 0 : Math.PI)) < 1e-9 && Math.abs(back.heading - (dir > 0 ? Math.PI : 0)) < 1e-9, 'faces the way it goes')
  // a steady pace: the same speed all along each leg
  const a = catAt(1), b = catAt(2)
  assert.ok(Math.abs(Math.abs(b.z - a.z) - WALKING_CAT.speed) < 1e-9, 'its walking speed')
  const c = catAt(leg + WALKING_CAT.turnSeconds + 3), d = catAt(leg + WALKING_CAT.turnSeconds + 4)
  assert.ok(Math.abs(Math.abs(d.z - c.z) - WALKING_CAT.speed) < 1e-9, 'the same coming back')
  // it reaches both ends, turning on the spot (z stays put while the heading swings through 180 degrees)
  assert.ok(Math.abs(catAt(leg).z - z1) < 1e-9 && Math.abs(catAt(2 * leg + WALKING_CAT.turnSeconds).z - z0) < 1e-9)
  const mid = catAt(leg + WALKING_CAT.turnSeconds / 2)
  assert.equal(mid.z, z1)
  assert.ok(Math.abs(Math.abs(catAt(leg + WALKING_CAT.turnSeconds).heading - catAt(leg).heading) - Math.PI) < 1e-9, 'a half turn at the end')
  assert.equal(mid.walking, 0.5, 'it steps gently while it turns')
  // a closed circuit: the same place and heading (mod 2 pi) one period on, and the legs have kept stepping
  const e = catAt(3.3), f = catAt(3.3 + period)
  assert.ok(Math.abs(e.z - f.z) < 1e-9 && Math.abs(Math.cos(e.heading) - Math.cos(f.heading)) < 1e-9 && Math.abs(Math.sin(e.heading) - Math.sin(f.heading)) < 1e-9)
  assert.ok(f.gait > e.gait + 10, 'the gait runs on, it never rewinds')
  // legs: one leg cycle for every `stride` metres of walking
  const g1 = catAt(1).gait, g2 = catAt(1 + WALKING_CAT.stride / WALKING_CAT.speed).gait
  assert.ok(Math.abs(g2 - g1 - Math.PI * 2) < 1e-9, 'a stride is a whole leg cycle')
})

test('sundarbans cat: the legs swing and the tail swishes in the shader, like the Amazon animals', () => {
  assert.ok(LEG_MOTION.cat && IDLE_MOTION.cat?.tail)
  const glsl = motionGlsl('cat')
  assert.match(glsl, /transformed\.xz \+= mA/)
  assert.match(glsl, /iTail/)
  // the legs sit where the model's paws are: front pair near z = 0.26, back pair near z = -0.06, so the middle is near 0.1
  assert.ok(Math.abs(LEG_MOTION.cat.cz - 0.1) < 0.05 && LEG_MOTION.cat.hip > 0.1 && LEG_MOTION.cat.hip < 0.25)
})
