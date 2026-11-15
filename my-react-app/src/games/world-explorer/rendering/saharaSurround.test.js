import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BIOMES, collidersFor } from '../biomes/index.js'
import { createColliderIndex } from '../biomes/colliderIndex.js'
import { SURROUND, createSurroundGeometry, distantDunes, surroundHeightAt } from './saharaSurround.js'
import { createTerrainGeometry } from './terrain.js'
import { RECOVERY, createRecovery, distanceOutside, updateRecovery } from '../recovery.js'
import { createPlayer, stepPlayer } from '../../skyward-explorer/physics.js'
import { stayOnDunes } from '../drive.js'

const biome = BIOMES.sahara
const plain = biome.discs.find((d) => d.id === 'plain')

/** Nearest and furthest points of the plain's drawn (wavy) edge from the middle of the map. */
function plainEdge() {
  const position = createTerrainGeometry(plain, biome.id).attributes.position
  let far = 0
  for (let i = 0; i < position.count; i += 1) far = Math.max(far, Math.hypot(position.getX(i), position.getZ(i)))
  // the outer ring is the last full ring of top vertices: every vertex beyond 90% of the furthest
  let near = Infinity
  for (let i = 0; i < position.count; i += 1) {
    const r = Math.hypot(position.getX(i), position.getZ(i))
    if (r > far * 0.9 && position.getY(i) > -0.3) near = Math.min(near, r)
  }
  return { near: Math.min(near, far * 0.9), far }
}

test('sahara surround: the sand carries on from under the plain to beyond the haze, facing up, with no gap', () => {
  const edge = plainEdge()
  assert.ok(plain.x === 0 && plain.z === 0 && plain.top === 0)
  // it starts well under the plain and ends far past what the fog lets through (1% at about 100 m)
  assert.ok(SURROUND.inner < edge.near - 2, `skirt starts at ${SURROUND.inner} m, the plain's edge comes in to ${edge.near.toFixed(1)} m`)
  assert.ok(SURROUND.outer >= 200)
  const geometry = createSurroundGeometry()
  const position = geometry.attributes.position
  const normal = geometry.attributes.normal
  const uv = geometry.attributes.uv
  let inner = Infinity
  let outer = 0
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const r = Math.hypot(x, z)
    inner = Math.min(inner, r)
    outer = Math.max(outer, r)
    assert.ok(Number.isFinite(y) && Math.abs(y - surroundHeightAt(x, z)) < 1e-6)
    assert.ok(normal.getY(i) > 0.5, 'faces up')
    // the plain's own texture scale, so the sand pattern carries on without a seam
    assert.ok(Math.abs(uv.getX(i) - (0.5 + x / 8)) < 1e-6 && Math.abs(uv.getY(i) - (0.5 + z / 8)) < 1e-6)
  }
  assert.ok(Math.abs(inner - SURROUND.inner) < 1e-3 && Math.abs(outer - SURROUND.outer) < 1e-3)
  assert.ok(createTerrainGeometry(plain, biome.id).attributes.uv.getX(1) !== undefined)
  // a hand's width below the plain where they meet: under it, never poking through it
  assert.ok(SURROUND.base < 0 && SURROUND.base >= -0.15)
  for (let r = SURROUND.inner; r <= SURROUND.flatUntil; r += 0.7) {
    for (let k = 0; k < 12; k += 1) assert.equal(surroundHeightAt(Math.cos(k) * r, Math.sin(k) * r), SURROUND.base)
  }
  // further out: long low dunes, never a wall and never a pit
  let highest = -Infinity
  let lowest = Infinity
  for (let r = SURROUND.flatUntil; r <= SURROUND.outer; r += 3) {
    for (let k = 0; k < 40; k += 1) {
      const h = surroundHeightAt(Math.cos(k * 0.157) * r, Math.sin(k * 0.157) * r)
      highest = Math.max(highest, h)
      lowest = Math.min(lowest, h)
    }
  }
  assert.ok(highest > 1.5 && highest <= SURROUND.base + SURROUND.swell + 1e-9 && lowest >= SURROUND.base - 1e-9, `swell from ${lowest.toFixed(2)} to ${highest.toFixed(2)} m`)
  // cheap: one mesh of a few thousand triangles
  assert.ok(geometry.index.count / 3 <= 4000, `${geometry.index.count / 3} triangles`)
})

test('sahara surround: thirty far dunes ring the horizon, always the same, all beyond where the bird can go', () => {
  const dunes = distantDunes()
  assert.equal(dunes.length, SURROUND.dunes)
  assert.deepEqual(distantDunes(), dunes, 'the same dunes every time')
  const reach = plainEdge().far + RECOVERY.limitBeyond
  const sectors = new Set()
  for (const dune of dunes) {
    const r = Math.hypot(dune.x, dune.z)
    assert.ok(r - dune.length > reach, `a dune ${r.toFixed(0)} m out reaches in to ${(r - dune.length).toFixed(0)} m; the bird gets to ${reach.toFixed(0)} m`)
    assert.ok(r - dune.length > SURROUND.support, 'clear of the strip that carries the bird')
    assert.ok(r + dune.length < SURROUND.outer, 'standing on the skirt')
    // sunk a little into the sand it stands on, like the four dunes on the plain: never floating
    assert.ok(dune.y < surroundHeightAt(dune.x, dune.z) && dune.y + dune.height > surroundHeightAt(dune.x, dune.z) + 1)
    assert.ok(dune.height >= 2 && dune.height <= 12 && dune.length > dune.width)
    sectors.add(Math.floor(((Math.atan2(dune.z, dune.x) + Math.PI) / (Math.PI * 2)) * 8) % 8)
  }
  assert.equal(sectors.size, 8, 'dunes all the way round')
})

test('sahara surround: scenery only: one strip of support under the bird, no walls, nothing to explore', () => {
  const colliders = collidersFor(biome)
  const added = colliders.filter((c) => c.id.includes('skirt') || c.id.includes('surround') || c.id.includes('desert'))
  assert.deepEqual(added.map((c) => c.id), ['desert-skirt'])
  const [strip] = added
  assert.ok(strip.walkable && strip.supportOnly, 'it carries the bird and never pushes it')
  assert.equal(strip.top, SURROUND.base)
  assert.equal(strip.r, SURROUND.support)
  // wide enough that the bird is carried back before it could reach the strip's end, and flat all the way
  assert.ok(strip.r > plainEdge().far + RECOVERY.limitBeyond + 2, `the strip ends at ${strip.r} m; the bird gets to ${(plainEdge().far + RECOVERY.limitBeyond).toFixed(1)} m`)
  assert.ok(strip.r <= SURROUND.flatUntil, 'the sand drawn over the strip is flat, at the strip\'s height')
  // nothing else of the expedition lies out there
  for (const c of colliders) {
    if (c === strip || c.x === undefined || c.kind === 'land') continue
    assert.ok(distanceOutside(biome, c.x, c.z) < 0, `${c.id} is outside the map`)
  }
  for (const station of biome.stations) assert.ok(distanceOutside(biome, station.x, station.z) < 0)
  // only the Sahara has it
  for (const id of ['sundarbans', 'amazon']) assert.ok(collidersFor(BIOMES[id]).every((c) => !c.id.includes('skirt')))
  const canvas = readFileSync(new URL('../ExpeditionCanvas.jsx', import.meta.url), 'utf8')
  assert.ok(canvas.includes("const sand = biome.id === 'sahara'"))
  assert.ok(canvas.includes('sand ? <SaharaSurround key="surround"'))
  // drawn in the plain's own material (and darkened with it at night); no shadows cast
  const surround = canvas.slice(canvas.indexOf('function SaharaSurround'), canvas.indexOf('function Water'))
  assert.ok(surround.includes('map={textures.map}') && surround.includes('color={colour}'))
  assert.equal((surround.match(/emissive=\{dark \? '#111111' : '#000000'\}/g) ?? []).length, 2)
  assert.ok(!surround.includes('castShadow'))
  assert.equal((surround.match(/<mesh |<instancedMesh /g) ?? []).length, 2, 'two draw calls')
})

test('sahara surround: a bird that walks out past the plain stands on the sand it sees, and is carried back', () => {
  const colliders = collidersFor(biome)
  const index = createColliderIndex(colliders)
  for (let k = 0; k < 12; k += 1) {
    const a = (k / 12) * Math.PI * 2
    // start on the plain 5 m inside its edge, and walk straight out
    let r = 20
    while (distanceOutside(biome, Math.sin(a) * (r + 5), Math.cos(a) * (r + 5)) < 0) r += 0.25
    const p = createPlayer({ position: [Math.sin(a) * r, 0.05, Math.cos(a) * r], facing: 0 })
    const state = createRecovery(biome)
    let carrying = false
    let carried = 0
    let furthest = -Infinity
    let lowest = Infinity
    let offSand = 0
    for (let frame = 0; frame < 60 * 14; frame += 1) {
      const nearby = index.near(p.pos[0], p.pos[2])
      const walking = carried === 0
      const events = carrying ? { fell: false } : stepPlayer(p, { moveX: walking ? Math.sin(a) : 0, moveZ: walking ? Math.cos(a) : 0, jumpHeld: false, jumpPressed: false, flightHeld: false }, 1 / 60, nearby)
      if (!carrying) stayOnDunes(p, biome)
      assert.ok(!events.fell)
      const result = updateRecovery(state, p, biome, 1 / 60, { colliders: nearby, events })
      if (result.carrying && !carrying) carried += 1
      carrying = result.carrying
      const out = distanceOutside(biome, p.pos[0], p.pos[2])
      if (!carrying && carried === 0) {
        furthest = Math.max(furthest, out)
        lowest = Math.min(lowest, p.pos[1])
        // beyond the plain's edge: feet on the skirt that is drawn
        if (out > 0.5 && p.grounded) offSand = Math.max(offSand, Math.abs(p.pos[1] - surroundHeightAt(p.pos[0], p.pos[2])))
      }
    }
    assert.equal(carried, 1, `heading ${k}: carried back ${carried} times (got ${furthest.toFixed(1)} m out)`)
    assert.ok(furthest > RECOVERY.limitBeyond - 0.3 && furthest < RECOVERY.limitBeyond + 0.5)
    assert.ok(lowest > SURROUND.base - 0.05, `heading ${k}: sank to ${lowest.toFixed(2)} m`)
    assert.ok(offSand < 0.02, `heading ${k}: stood ${offSand.toFixed(2)} m off the sand that is drawn`)
    // set down back on the plain, never left on the skirt
    assert.ok(p.grounded && distanceOutside(biome, p.pos[0], p.pos[2]) <= -RECOVERY.safeInside + 0.2)
    assert.notEqual(p.groundId, 'desert-skirt')
  }
})
