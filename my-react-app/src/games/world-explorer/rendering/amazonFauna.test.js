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

test('amazon fauna: nineteen kinds, as many animals as the forest has room for; only the Amazon has any', () => {
  assert.deepEqual(Object.keys(AMAZON_FAUNA_BUILDERS).sort(), Object.keys(AMAZON_FAUNA).sort())
  assert.equal(new Set(fauna.map((a) => a.type)).size, 19, 'every kind appears')
  for (const type of Object.keys(AMAZON_FAUNA)) assert.ok(fauna.filter((a) => a.type === type).length >= 2, `more than one ${type}`)
  assert.ok(fauna.length >= 51)
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

test('amazon fauna: every kind moves, within bounds that keep it on its spot, and never below the ground', async () => {
  const { poseAt, MOVING_KINDS } = await import('./amazonFaunaMotion.js')
  assert.deepEqual([...MOVING_KINDS].sort(), Object.keys(AMAZON_FAUNA).sort())
  for (const [type, spec] of Object.entries(AMAZON_FAUNA)) {
    const seen = { y: 0, yaw: 0, pitch: 0, sy: 0, sx: 0 }
    const first = poseAt(type, 0, 1)
    let changed = false
    for (let t = 0; t < 60; t += 0.05) {
      const pose = poseAt(type, t, 1)
      assert.ok(Object.values(pose).every(Number.isFinite), `${type} is finite`)
      assert.ok(pose.y >= 0, `${type} never sinks into the ground`)
      assert.ok(Math.abs(pose.sx - 1) <= 0.8 && pose.sy > 0.7 && pose.sy < 1.5 && pose.sz > 0.5, `${type} stays its shape`)
      // a nose-down sniff must not push the front through the ground: its length times the angle stays small
      assert.ok(pose.pitch * spec.length / 2 <= 0.18 + 1e-9, `${type} nods ${pose.pitch.toFixed(2)} rad`)
      // it stays within reach of the clearing kept round it (flying butterflies a little further)
      assert.ok(Math.hypot(pose.x, pose.z) <= (type === 'morpho' ? 0.45 : 0.1), `${type} strays`)
      seen.y = Math.max(seen.y, pose.y); seen.yaw = Math.max(seen.yaw, Math.abs(pose.yaw)); seen.pitch = Math.max(seen.pitch, Math.abs(pose.pitch)); seen.sy = Math.max(seen.sy, Math.abs(pose.sy - 1))
      if (JSON.stringify(pose) !== JSON.stringify(first)) changed = true
    }
    assert.ok(changed, `${type} moves`)
    assert.ok(seen.y + seen.yaw + seen.pitch + seen.sy > 0.01, `${type} moves visibly`)
    // deterministic, and animals of a kind are out of step with each other
    assert.deepEqual(poseAt(type, 3.3, 2), poseAt(type, 3.3, 2))
  }
  assert.notDeepEqual(poseAt('capybara', 5, 0), poseAt('capybara', 5, 2))
})

test('amazon fauna: a walker is the whole model in parts: a body and four legs, hinged at the hips', async () => {
  const { createAnimalParts } = await import('./amazonFauna.js')
  const { WALKERS } = await import('./amazonFaunaWalk.js')
  for (const type of Object.keys(WALKERS)) {
    const whole = AMAZON_FAUNA_BUILDERS[type](7)
    const parts = createAnimalParts(type, 7)
    assert.equal(parts.legs.length, 4, `${type} has four legs`)
    assert.deepEqual(parts.legs.map((l) => `${l.front ? 'f' : 'h'}${l.side}`).sort(), ['f-1', 'f1', 'h-1', 'h1'])
    // the parts add up to the model that is drawn when it stands still (same triangles, same size)
    const count = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3
    assert.equal(count(parts.body) + parts.legs.reduce((n, l) => n + count(l.geometry), 0), count(whole), `${type}: no triangle lost or doubled`)
    const all = [...vertices(parts.body), ...parts.legs.flatMap((l) => vertices(l.geometry).map(([x, y, z]) => [x + l.pivot[0], y + l.pivot[1], z + l.pivot[2]]))]
    const box = (points, axis) => [Math.min(...points.map((p) => p[axis])), Math.max(...points.map((p) => p[axis]))]
    const target = vertices(whole)
    for (const axis of [0, 1, 2]) {
      const [a0, a1] = box(all, axis)
      const [b0, b1] = box(target, axis)
      assert.ok(Math.abs(a0 - b0) < 1e-3 && Math.abs(a1 - b1) < 1e-3, `${type}: put together, the parts are the model`)
    }
    // a leg hangs from its hip: its feet are below the pivot, near the ground
    for (const leg of parts.legs) {
      assert.ok(leg.pivot[1] > 0.05 && Math.min(...vertices(leg.geometry).map((p) => p[1])) < -leg.pivot[1] + 0.06, `${type}: leg reaches the ground`)
      assert.ok(Math.abs(leg.length - leg.pivot[1]) < 1e-9)
    }
    assert.deepEqual(vertices(createAnimalParts(type, 7).body), vertices(parts.body), 'always the same')
  }
  assert.equal(createAnimalParts('macaw', 1), null, 'a bird has no legs to swing')
})

test('amazon fauna: walkers stay inside their walk, keep their pace, pause, and face the way they go', async () => {
  const { walkState, gait, WALKERS, MIN_ROAM } = await import('./amazonFaunaWalk.js')
  const walkers = fauna.filter((a) => a.roam)
  assert.ok(walkers.length >= 9, `${walkers.length} animals walk`)
  assert.deepEqual([...new Set(walkers.map((a) => a.type))].every((t) => WALKERS[t]), true)
  for (const animal of fauna) assert.equal(Boolean(animal.roam), animal.roam >= MIN_ROAM && Boolean(WALKERS[animal.type]) && animal.y === 0)
  for (const animal of walkers) {
    const kind = WALKERS[animal.type]
    let walked = 0
    let stood = 0
    let previous = walkState(animal, 0)
    for (let t = 0.1; t < 120; t += 0.1) {
      const now = walkState(animal, t)
      assert.ok([now.x, now.z, now.yaw, now.amp, now.wt].every(Number.isFinite))
      assert.ok(Math.abs(Math.hypot(now.x - animal.x, now.z - animal.z) - animal.roam) < 1e-9, `${animal.type} stays on its walk`)
      const step = Math.hypot(now.x - previous.x, now.z - previous.z)
      if (now.moving && previous.moving) {
        walked += 1
        assert.ok(Math.abs(step / 0.1 - kind.speed) < 0.02 * kind.speed + 0.01, `${animal.type} walks at ${(step / 0.1).toFixed(2)} m/s, not ${kind.speed}`)
        // faces along its path
        const heading = Math.atan2(now.x - previous.x, now.z - previous.z)
        const off = Math.abs(((heading - now.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
        assert.ok(off < 0.15, `${animal.type} walks sideways (${off.toFixed(2)} rad off)`)
      } else if (!now.moving && !previous.moving) { stood += 1; assert.ok(step < 1e-9, `${animal.type} slides while standing`) }
      previous = now
    }
    assert.ok(walked > 200 && stood > 100, `${animal.type} both walks and stands`)
    // legs: diagonal pairs swing together, within their swing; still when it stands
    const legs = [{ front: true, side: -1, length: 0.3 }, { front: true, side: 1, length: 0.3 }, { front: false, side: -1, length: 0.3 }, { front: false, side: 1, length: 0.3 }]
    let moving = null
    for (let t = 0; t < 40 && !moving; t += 0.1) { const s = walkState(animal, t); if (s.amp > 0.99) moving = s }
    const [fl, fr, hl, hr] = legs.map((l) => gait(animal, l, moving).swing)
    assert.ok(Math.abs(fl - hr) < 1e-9 && Math.abs(fr - hl) < 1e-9 && Math.abs(fl + fr) < 1e-9, `${animal.type}: diagonal gait`)
    for (let t = 0; t < 60; t += 0.1) for (const l of legs) assert.ok(Math.abs(gait(animal, l, walkState(animal, t)).swing) <= kind.swing + 1e-9)
    const standing = (() => { for (let t = 0; t < 40; t += 0.1) { const s = walkState(animal, t); if (!s.moving) return s } })()
    assert.ok(gait(animal, legs[0], standing).swing === 0)
  }
})

test('amazon fauna: however long the game runs, a walking animal clears the trees, stations, paths, the start and every other animal', () => {
  const trees = scatterAmazon(biome).filter((item) => ['emergent', 'canopy', 'subcanopy'].includes(item.kind))
  const floor = biome.discs.find((d) => d.id === 'floor')
  const reach = (a) => (a.solid?.r ?? 0.1) + (a.type === 'morpho' ? 0.45 : 0)
  const walkers = fauna.filter((a) => a.roam)
  for (const animal of walkers) {
    const r = animal.solid.r
    const name = `${animal.type} at (${animal.x}, ${animal.z}) walking ${animal.roam} m`
    for (const tree of trees) assert.ok(apart(animal, tree) >= r + animal.roam + 0.9 * tree.scale, `${name} walks into a ${tree.kind}`)
    for (const station of biome.stations) assert.ok(apart(animal, station) - r - animal.roam >= 1.2, `${name} walks onto station ${station.n}`)
    assert.ok(apart(animal, { x: biome.spawn.position[0], z: biome.spawn.position[2] }) - r - animal.roam >= 5, `${name} walks into the start`)
    assert.ok(apart(animal, floor) + r + animal.roam <= 12.1, `${name} walks out towards the edge`)
    for (const prop of biome.props) if (prop.block) assert.ok(apart(animal, prop) > prop.block + r + animal.roam, `${name} walks into the ${prop.type}`)
    for (const [from, to] of biome.links) {
      const dx = to.x - from.x
      const dz = to.z - from.z
      const t = Math.max(0, Math.min(1, ((animal.x - from.x) * dx + (animal.z - from.z) * dz) / (dx * dx + dz * dz || 1)))
      assert.ok(Math.hypot(animal.x - from.x - dx * t, animal.z - from.z - dz * t) > r + animal.roam + 0.8, `${name} walks onto a path`)
    }
    for (const other of fauna) if (other !== animal && other.y === 0) assert.ok(apart(animal, other) >= r + animal.roam + reach(other) + (other.roam ?? 0), `${name} meets a ${other.type}`)
  }
})

test('amazon fauna: a walking animal\'s solid body goes where it is drawn, and the collider grid still finds it', async () => {
  const { walkState, moveFauna } = await import('./amazonFaunaWalk.js')
  const { createColliderIndex } = await import('../biomes/colliderIndex.js')
  const index = createColliderIndex(collidersFor(biome))
  const walkers = index.all.filter((c) => c.walker)
  assert.equal(walkers.length, fauna.filter((a) => a.roam).length)
  for (const t of [0, 7.3, 31, 99.9, 400]) {
    moveFauna(walkers, t)
    for (const c of walkers) {
      const state = walkState(c.walker, t)
      assert.ok(c.x === state.x && c.z === state.z)
      // the grid cell that holds the animal, and the ones round it a step away, list it
      assert.ok(index.near(c.x, c.z).includes(c), 'found where it stands')
      assert.ok(index.near(c.x + c.r, c.z).includes(c) && index.near(c.x - c.r, c.z - c.r).includes(c))
    }
  }
  // nothing but animals moved: a static animal and every tree stay put
  assert.ok(index.all.filter((c) => c.id.startsWith('fauna-') && !c.walker).every((c) => { const a = fauna[Number(c.id.slice(6))]; return c.x === a.x && c.z === a.z }))
  const controller = readFileSync(new URL('../ExplorerController.jsx', import.meta.url), 'utf8')
  assert.ok(controller.includes('moveFauna(walkers, state.clock.elapsedTime)'))
  const view = readFileSync(new URL('./AmazonFauna.jsx', import.meta.url), 'utf8')
  assert.ok(view.includes('walkState(animal, t)') && view.includes('clock.elapsedTime'), 'the view uses the same clock and the same walk')
})
