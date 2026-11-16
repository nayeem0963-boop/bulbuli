import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BIOMES, collidersFor } from '../biomes/index.js'
import { SPINNING_CAT, SPINNING_CAT_PLACE, SUNDARBANS_MODEL_CREDITS } from './sundarbansCredits.js'

const biome = BIOMES.sundarbans
const credit = SUNDARBANS_MODEL_CREDITS.spinningCat
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

test('sundarbans cat: it spins on the home island, a few paces from the start, and is not solid', () => {
  const home = biome.discs.find((d) => d.id === 'home')
  const props = biome.props.filter((p) => p.type === 'spinCat')
  assert.equal(props.length, 1)
  assert.deepEqual([props[0].x, props[0].z], [SPINNING_CAT_PLACE.x, SPINNING_CAT_PLACE.z])
  assert.ok(Math.hypot(props[0].x - home.x, props[0].z - home.z) + 1 < home.r, 'well inside the island')
  const spawn = { x: biome.spawn.position[0], z: biome.spawn.position[2] }
  const away = Math.hypot(props[0].x - spawn.x, props[0].z - spawn.z)
  assert.ok(away > 2.5 && away < 8, `${away.toFixed(1)} m from the start: in sight, not in the way`)
  for (const station of biome.stations) assert.ok(Math.hypot(props[0].x - station.x, props[0].z - station.z) > 3.8, `clear of station ${station.n}`)
  assert.equal(props[0].block, undefined, 'a decoration: no collider')
  assert.ok(!collidersFor(biome).some((c) => Math.hypot(c.x - props[0].x, c.z - props[0].z) < 0.3 && c.kind === 'prop'), 'nothing solid under it')
  assert.ok(SPINNING_CAT.turnsPerSecond > 0.5 && SPINNING_CAT.turnsPerSecond < 3 && SPINNING_CAT.bob < 0.1)
  const canvas = readFileSync(new URL('../ExpeditionCanvas.jsx', import.meta.url), 'utf8')
  assert.ok(canvas.includes("case 'spinCat': body = <SundarbansCat scale={scale} />"))
  assert.equal(props[0].scale, SPINNING_CAT_PLACE.scale)
  const source = readFileSync(new URL('./SundarbansCat.jsx', import.meta.url), 'utf8')
  assert.ok(source.includes('oiiaioooooiai-cat.glb') && /rotation\.y = /.test(source))
})
