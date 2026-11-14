import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Object3D, Vector3 } from 'three'
import { BIOMES, collidersFor } from './index.js'
import { BOUGH, amazonPlacement, boughColliders, sundarbansPlacement } from './boughs.js'
import { COLLIDER_INDEX, createColliderIndex } from './colliderIndex.js'
import { scatterBiomeAssets } from '../rendering/scattering.js'
import { scatterAmazon } from '../rendering/amazonScatter.js'
import { amazonBoughs, createAmazonTree } from '../rendering/amazonTrees.js'
import { MANGROVE_FORMS, MANGROVE_SPECIES, buildMangrove, mangroveBoughs } from '../rendering/mangroveTrees.js'
import { mulberry32 } from '../../../core/rng.js'
import { createPlayer, stepPlayer } from '../../skyward-explorer/physics.js'
import { createInputState } from '../../skyward-explorer/input.js'
import { readExplorerControls, rescueFromWater, stayOnDunes } from '../drive.js'

const BODY = 0.35 // Bulbuli's body radius (PHYS.radius)
const TALL = 1.05 // and height (PHYS.height)
const AMAZON_SEEDS = { emergent: 11, canopy: 23, subcanopy: 37 }
const IDENTITY = { x: 0, y: 0, z: 0, yaw: 0, scale: [1, 1, 1] }

const world = Object.fromEntries(['sahara', 'sundarbans', 'amazon'].map((id) => {
  const biome = BIOMES[id]
  const colliders = collidersFor(biome)
  return [id, { biome, colliders, index: createColliderIndex(colliders), boughs: colliders.filter((c) => c.bough) }]
}))

/**
 * Flies Bulbuli level (Space held, height kept) from `start` on heading `angle` for `seconds`,
 * exactly as ExplorerController steps it, and reports every frame to `watch`.
 */
function fly({ biome, index }, start, angle, { fps = 60, seconds = 1.5, keys = ['back'], level = true, watch = null } = {}) {
  const p = createPlayer({ position: start, facing: 0 })
  p.grounded = false
  const input = createInputState()
  for (const key of keys) input.held.add(key)
  let yaw = angle + Math.PI // camera behind the heading: "back" flies along it
  let lastJumps = null
  let fell = 0
  for (let frame = 0; frame < seconds * fps; frame += 1) {
    const controls = readExplorerControls(input, { active: true, yaw, lastJumps, dt: 1 / fps })
    yaw = controls.yaw
    lastJumps = controls.lastJumps
    if (level) { p.grounded = false; p.vel[1] = 0; p.pos[1] = start[1] }
    const events = stepPlayer(p, controls.step, 1 / fps, index.near(p.pos[0], p.pos[2]))
    rescueFromWater(p, biome, events)
    stayOnDunes(p, biome)
    if (events.fell) fell += 1
    watch?.(p, frame)
  }
  return { p, fell, travelled: Math.hypot(p.pos[0] - start[0], p.pos[2] - start[2]) }
}

/** How deep Bulbuli's body is inside the wood of any branch piece near it (0 when clear). */
function insideWood(pieces, p) {
  let deepest = 0
  for (const c of pieces) {
    if (!(p.pos[1] < c.top - 0.05 && p.pos[1] + TALL > c.bottom)) continue
    deepest = Math.max(deepest, c.r + BODY - Math.hypot(p.pos[0] - c.x, p.pos[2] - c.z))
  }
  return deepest
}
const piecesNear = (pieces, x, z, reach) => pieces.filter((c) => Math.hypot(c.x - x, c.z - z) < reach)
/** Whether a level flight along the segment would touch anything solid or any perch. */
function lineIsClear({ colliders }, a, b, y, margin = 0.1) {
  const sx = b[0] - a[0]
  const sz = b[1] - a[1]
  const len2 = sx * sx + sz * sz
  return colliders.every((c) => {
    if (c.kind === 'land' || c.supportOnly || !(y < c.top + (c.walkable ? 0.1 : 0) && y + TALL > c.bottom - 0.01)) return true // (a perch holds a bird 6 cm above its top)
    const t = Math.max(0, Math.min(1, ((c.x - a[0]) * sx + (c.z - a[1]) * sz) / len2))
    return Math.hypot(a[0] + sx * t - c.x, a[1] + sz * t - c.z) > Math.max(c.r, c.supportRadius ?? 0, c.rootRadius ?? 0) + BODY + margin
  })
}

test('boughs: the colliders lie on the branches the tree models draw, as thick as the bark, with no padding', () => {
  const onModel = (name, geometry, boughs) => {
    const position = geometry.attributes.position
    // a) the recorded branch is the drawn one: at each point of its path the model has a ring of
    //    bark vertices at about the recorded radius
    let rings = 0
    for (const bough of boughs) {
      bough.path.forEach(([x, y, z], k) => {
        const radius = bough.radii[k]
        if (radius < BOUGH.minRadius || k === 0) return // (a branch's first ring is buried in its trunk)
        let ring = 0
        for (let i = 0; i < position.count; i += 1) {
          const d = Math.hypot(position.getX(i) - x, position.getY(i) - y, position.getZ(i) - z)
          if (d >= radius * 0.55 && d <= radius * 1.6 + 0.02) ring += 1
        }
        rings += 1
        assert.ok(ring >= 3, `${name}: no bark ${radius.toFixed(2)} m round the ${bough.kind} at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`)
      })
    }
    assert.ok(rings >= 4, `${name}: ${rings} rings checked`)
    // b) every collider sits on that path, between two of its points, exactly as thick as the
    //    branch is there (a trunk only above 1.2 m: below that the tree's own trunk collider stands)
    const pieces = boughColliders('t', boughs, IDENTITY, { above: 1.2 })
    assert.ok(pieces.length > 0, `${name}: no thick wood at all`)
    for (const piece of pieces) {
      const bough = boughs[Number(piece.id.split('-')[1])]
      const cy = (piece.top + piece.bottom) / 2
      let best = Infinity
      let radius = 0
      for (let k = 1; k < bough.path.length; k += 1) {
        const a = bough.path[k - 1]
        const b = bough.path[k]
        const len2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2
        const t = Math.max(0, Math.min(1, ((piece.x - a[0]) * (b[0] - a[0]) + (cy - a[1]) * (b[1] - a[1]) + (piece.z - a[2]) * (b[2] - a[2])) / len2))
        const d = Math.hypot(a[0] + (b[0] - a[0]) * t - piece.x, a[1] + (b[1] - a[1]) * t - cy, a[2] + (b[2] - a[2]) * t - piece.z)
        if (d < best) { best = d; radius = bough.radii[k - 1] + (bough.radii[k] - bough.radii[k - 1]) * t }
      }
      assert.ok(best < 1e-6, `${name}: a collider ${best.toFixed(3)} m off its branch`)
      assert.ok(Math.abs(piece.r - radius) < 1e-6, `${name}: collider radius ${piece.r.toFixed(3)}, branch radius ${radius.toFixed(3)}`)
      assert.equal(piece.bough, bough.kind)
      assert.ok(piece.r >= BOUGH.minRadius && piece.r <= 0.4 && !piece.walkable && piece.collisionKind === undefined)
      // only as tall as that piece of branch (thickness, plus the rise to the next piece)
      assert.ok(piece.top - piece.bottom <= 2 * piece.r + BOUGH.spacing + 1e-9)
    }
    return pieces.length
  }
  for (const species of MANGROVE_SPECIES) {
    for (let form = 0; form < MANGROVE_FORMS.near[species]; form += 1) {
      const boughs = mangroveBoughs(species, form)
      assert.equal(mangroveBoughs(species, form), boughs, 'worked out once')
      if (species === 'goran') {
        // the goran shrub is all finger-thin stems: nothing of it is solid
        assert.equal(boughColliders('t', boughs, IDENTITY, { above: 0.5 }).length, 0)
        continue
      }
      onModel(`${species} ${form}`, buildMangrove(species, form, 'near'), boughs)
    }
  }
  for (const [layer, seed] of Object.entries(AMAZON_SEEDS)) {
    const boughs = amazonBoughs(seed, layer)
    assert.equal(boughs.length, layer === 'emergent' ? 8 : layer === 'subcanopy' ? 5 : 6, 'the main branches only: not the thin crown tiers')
    for (const level of ['near', 'far']) onModel(`amazon ${layer} ${level}`, createAmazonTree(seed, layer, level), boughs)
  }
  // recording the branches does not change a model
  const before = buildMangrove('sundari', 0, 'near').attributes.position.array
  mangroveBoughs('sundari', 1)
  assert.deepEqual(buildMangrove('sundari', 0, 'near').attributes.position.array, before)
})

test('boughs: each tree\'s colliders are placed exactly as the renderer places its model', () => {
  const probe = [{ kind: 'limb', path: [[1.3, 2.1, -0.7], [1.3, 2.1, -0.68]], radii: [0.1, 0.1] }]
  const helper = new Object3D()
  const check = (placement) => {
    helper.position.set(placement.x, placement.y, placement.z)
    helper.rotation.set(0, placement.yaw, 0)
    helper.scale.set(...placement.scale)
    helper.updateMatrix()
    const drawn = new Vector3(1.3, 2.1, -0.7).applyMatrix4(helper.matrix)
    const [piece] = boughColliders('t', probe, placement)
    assert.ok(Math.hypot(piece.x - drawn.x, (piece.top + piece.bottom) / 2 - drawn.y, piece.z - drawn.z) < 1e-6)
  }
  const sundarbans = scatterBiomeAssets(BIOMES.sundarbans).filter((item) => item.kind === 'mangrove' && !item.background)
  for (const item of sundarbans) {
    assert.ok(item.tiltX === undefined && item.tiltZ === undefined)
    check(sundarbansPlacement(item))
  }
  for (const item of scatterAmazon(BIOMES.amazon).filter((item) => item.kind in AMAZON_SEEDS).slice(0, 200)) check(amazonPlacement(item))
  // the same numbers the renderers use
  const scenery = readFileSync(new URL('../rendering/SundarbansScenery.jsx', import.meta.url), 'utf8')
  assert.ok(scenery.includes('const widen = 0.92 + jitter(item.x, item.z, 1) * 0.16'))
  assert.ok(scenery.includes('const yaw = (item.rot ?? 0) + (jitter(item.x, item.z, 4) - 0.5) * 0.22'))
  assert.ok(scenery.includes('helper.scale.set(size * widen, size * (item.stretch ?? 1), size * widen * (0.94 + jitter(item.x, item.z, 2) * 0.12))'))
  assert.ok(scenery.includes("trees: byForm(byKind.mangrove ?? EMPTY, 'near')"))
  const amazon = readFileSync(new URL('../rendering/AmazonScenery.jsx', import.meta.url), 'utf8')
  assert.ok(amazon.includes('dummy.rotation.set(0, item.rot ?? 0, 0)') && amazon.includes('dummy.scale.set(size, size, size)'))
  assert.ok(amazon.includes('createAmazonTree(seed, layer, level)'))
})

test('boughs: only substantial wood is solid; leaves, twigs, crown tiers and whole crowns are not', () => {
  assert.equal(BOUGH.minRadius, 0.06)
  assert.equal(world.sahara.boughs.length, 0, 'the acacias and palms draw no branches: a trunk and a soft crown')
  for (const id of ['sundarbans', 'amazon']) {
    const { boughs, colliders } = world[id]
    assert.ok(boughs.length > 150)
    for (const c of boughs) {
      assert.ok(c.r >= BOUGH.minRadius && c.r <= 0.3, `${c.id}: radius ${c.r}`)
      assert.equal(c.walkable, false)
      assert.ok(c.top - c.bottom <= 1, `${c.id}: ${(c.top - c.bottom).toFixed(2)} m tall`)
    }
    // nothing new is as wide as a crown
    assert.ok(colliders.every((c) => !c.id.includes('bough') || c.bough))
  }
  // twigs (3.5 to 4 cm) and the thin ends of limbs are in the models but not in the colliders
  let twigs = 0
  for (const species of MANGROVE_SPECIES) {
    for (let form = 0; form < MANGROVE_FORMS.near[species]; form += 1) {
      for (const bough of mangroveBoughs(species, form)) {
        if (Math.max(...bough.radii) > 0.045) continue
        twigs += 1
        assert.equal(boughColliders('t', [bough], { ...IDENTITY, scale: [1.3, 1.3, 1.3] }).length, 0)
      }
    }
  }
  assert.ok(twigs >= 20, `${twigs} twigs checked`)
  // young trees keep their Pass 3 stem and nothing else
  assert.ok(world.sundarbans.colliders.filter((c) => c.id.startsWith('sapling-')).every((c) => c.id.startsWith('sapling-trunk-')))
  // the Amazon's thin crown tiers (6.5 cm at the trunk, drawn at a single scale) are not recorded
  assert.ok(Object.entries(AMAZON_SEEDS).every(([layer, seed]) => amazonBoughs(seed, layer).every((b) => b.radii[0] >= 0.09)))
})

test('boughs: flying into a thick branch stops Bulbuli at the bark, at 60, 37 and 24 fps alike', () => {
  for (const id of ['sundarbans', 'amazon']) {
    const w = world[id]
    const every = Math.ceil(w.boughs.length / 90)
    const picked = w.boughs.filter((_, i) => i % every === 2 % every)
    let met = 0
    let held = 0
    let same = 0
    const different = []
    const spread = []
    let flights = 0
    for (const piece of picked) {
      const near = piecesNear(w.colliders.filter((c) => c.kind === 'prop' && !c.walkable), piece.x, piece.z, 5)
      // (the trees' perch discs, which the game already had, also turn Bulbuli aside)
      const anything = piecesNear(w.colliders.filter((c) => c.kind === 'prop' && !c.supportOnly), piece.x, piece.z, 6)
      for (let k = 0; k < 4; k += 1) {
        const angle = k * Math.PI / 2 + 0.3
        const y = (piece.top + piece.bottom) / 2 - TALL / 2 // the branch at chest height
        const start = [piece.x + Math.sin(angle) * 3, y, piece.z + Math.cos(angle) * 3]
        if (insideWood(near, { pos: start }) > 0) continue
        // how close the body came to any bark (0 = touching), and how far along its heading it got
        const gap = {}
        const along = {}
        const heldBy = {}
        const path = { 60: [], 37: [], 24: [] }
        const touched = {}
        for (const fps of [60, 37, 24]) {
          gap[fps] = Infinity
          let deepest = 0
          const flight = fly(w, start, angle, { fps, watch: (p) => {
            deepest = Math.max(deepest, insideWood(near, p))
            for (const c of anything) {
              if (p.pos[1] < c.top - 0.05 && p.pos[1] + TALL > c.bottom) gap[fps] = Math.min(gap[fps], Math.hypot(p.pos[0] - c.x, p.pos[2] - c.z) - c.r - BODY)
            }
            path[fps].push([p.pos[0], p.pos[2]])
            if (near.some((c) => c.bough && p.pos[1] < c.top - 0.05 && p.pos[1] + TALL > c.bottom && Math.hypot(p.pos[0] - c.x, p.pos[2] - c.z) < c.r + BODY + 0.06)) touched[fps] = true
          } })
          along[fps] = (flight.p.pos[0] - start[0]) * -Math.sin(angle) + (flight.p.pos[2] - start[2]) * -Math.cos(angle)
          // what holds it at the end: a branch, or (as before this pass) a trunk or a perch disc
          const touching = anything.filter((c) => flight.p.pos[1] < c.top - 0.05 && flight.p.pos[1] + TALL > c.bottom && Math.hypot(flight.p.pos[0] - c.x, flight.p.pos[2] - c.z) < c.r + BODY + 0.03)
          heldBy[fps] = touching.length > 0 && touching.every((c) => c.bough)
          flights += 1
          assert.equal(flight.fell, 0)
          assert.ok(Number.isFinite(flight.p.pos[0]) && Number.isFinite(flight.p.pos[2]))
          // never inside the wood of this branch or of any other on the way
          assert.ok(deepest <= 0.02, `${id} ${piece.id} from ${k} at ${fps} fps: body ${deepest.toFixed(2)} m inside wood`)
          // and it does come up to the bark: nothing invisible holds it off
          assert.ok(gap[fps] <= 0.05 + (id === 'amazon' ? 0.3 : 0), `${id} ${piece.id} from ${k} at ${fps} fps: never came nearer than ${gap[fps].toFixed(2)} m to any bark`)
        }
        // frame-rate consistency: the route flown at 37 and at 24 fps is the route flown at 60 fps
        // (every point of it lies on the 60 fps route), up to and along the bark
        if (touched[60] || touched[37] || touched[24]) {
          met += 1
          let apart = 0
          for (const fps of [37, 24]) {
            for (const [x, z] of path[fps]) apart = Math.max(apart, Math.min(...path[60].map(([qx, qz]) => Math.hypot(x - qx, z - qz))))
          }
          spread.push(apart)
          if (apart <= 0.4) same += 1
          else different.push(`${piece.id} from ${k}: ${apart.toFixed(2)} m apart`)
        }
        if (heldBy[60] && heldBy[37] && heldBy[24]) held += 1
      }
    }
    assert.ok(flights >= 600, `${id}: ${flights} flights`)
    assert.ok(met >= 60, `${id}: ${met} headings met a branch`)
    // (the few that differ are where Bulbuli is pressed head-on against a trunk or a branch end
    // and slips off it to one side at one frame rate before it does at another)
    spread.sort((a, b) => a - b)
    console.log(`  ${id}: routes at 60/37/24 fps — ${same} of ${met} within 0.4 m of each other; median ${spread[spread.length >> 1].toFixed(2)} m, 90th percentile ${spread[Math.floor(spread.length * 0.9)].toFixed(2)} m`)
    assert.ok(same >= met * 0.85, `${id}: only ${same} of ${met} routes are the same at 60, 37 and 24 fps; e.g. ${different.slice(0, 3).join('; ')}`)
    assert.ok(held >= 20, `${id}: ${held} headings ended held by a branch alone`)
  }
})

test('boughs: over and under a branch, through its leaves and twigs, and through open gaps, flight is untouched', () => {
  for (const id of ['sundarbans', 'amazon']) {
    const w = world[id]
    // a) the same headings as the blocking test, but with the branch above the head or below the feet
    let over = 0
    const ceiling = Math.max(...w.colliders.filter((c) => c.kind === 'land').map((c) => c.top))
    const every = Math.ceil(w.boughs.length / 160)
    const picked = w.boughs.filter((_, i) => i % every === 5 % every)
    for (const piece of picked) {
      // clear of the whole branch this piece belongs to (it rises along its length)
      const whole = w.boughs.filter((c) => c.id.startsWith(piece.id.slice(0, piece.id.lastIndexOf('-') + 1)))
      const high = Math.max(...whole.map((c) => c.top))
      const low = Math.min(...whole.map((c) => c.bottom))
      for (const [name, y] of [['over', high + 0.05], ['under', low - TALL - 0.05]]) {
        for (let k = 0; k < 2; k += 1) {
          const angle = k * Math.PI / 2 + 0.3
          const start = [piece.x + Math.sin(angle) * 3, y, piece.z + Math.cos(angle) * 3]
          const end = [piece.x - Math.sin(angle) * 5, piece.z - Math.cos(angle) * 5]
          if (y < ceiling + 0.1 || !lineIsClear(w, [start[0], start[2]], end, y)) continue // the ground, or other wood, on this line: not this test
          let aside = 0
          let last = start
          let jumped = false
          const flight = fly(w, start, angle, { seconds: 1.2, watch: (p) => {
            if (Math.hypot(p.pos[0] - last[0], p.pos[2] - last[2]) > 1) jumped = true
            last = [...p.pos]
            if (!jumped) aside = Math.max(aside, Math.abs((p.pos[0] - start[0]) * Math.cos(angle) - (p.pos[2] - start[2]) * Math.sin(angle)))
          } })
          if (jumped) continue // low over the water: carried back to the bank by the water rescue
          over += 1
          // (leaf clusters hang 0.2 to 0.5 m above each branch: this line passes straight through them)
          assert.ok(aside < 0.01, `${id} ${name} ${piece.id}: pushed ${aside.toFixed(2)} m aside`)
          assert.ok(flight.travelled > 6.5, `${id} ${name} ${piece.id}: slowed to ${flight.travelled.toFixed(1)} m`)
        }
      }
    }
    assert.ok(over >= 40, `${id}: ${over} flights over and under branches`)
  }
  // b) twigs and thin limb ends: fly through where the Sundarbans models draw them
  const w = world.sundarbans
  const trees = scatterBiomeAssets(w.biome).filter((item) => item.kind === 'mangrove' && !item.background)
  let twigs = 0
  for (const tree of trees) {
    const thin = mangroveBoughs(tree.variant, (tree.form ?? 0) % MANGROVE_FORMS.near[tree.variant]).filter((b) => Math.max(...b.radii) <= 0.045)
    for (const bough of thin) {
      const [piece] = boughColliders('probe', [{ ...bough, radii: bough.radii.map(() => 1) }], sundarbansPlacement(tree)).slice(1, 2)
      if (!piece) continue
      const y = (piece.top + piece.bottom) / 2 - TALL / 2
      for (const angle of [0.4, 2.0]) {
        const start = [piece.x + Math.sin(angle) * 2.5, y, piece.z + Math.cos(angle) * 2.5]
        if (!lineIsClear(w, [start[0], start[2]], [piece.x - Math.sin(angle) * 3, piece.z - Math.cos(angle) * 3], y)) continue
        let closest = Infinity
        const flight = fly(w, start, angle, { seconds: 1, watch: (p) => { closest = Math.min(closest, Math.hypot(p.pos[0] - piece.x, p.pos[2] - piece.z)) } })
        twigs += 1
        assert.ok(closest < 0.12, `a twig of the ${tree.variant} at (${tree.x.toFixed(1)}, ${tree.z.toFixed(1)}) turned Bulbuli aside by ${closest.toFixed(2)} m`)
        assert.ok(flight.travelled > 5)
      }
    }
  }
  assert.ok(twigs >= 8, `${twigs} flights through twigs`)
  // c) open gaps in the Amazon canopy: straight lines at crown height that touch no wood stay open,
  //    and there are plenty of them (the canopy is not walled up)
  const amazon = world.amazon
  const random = mulberry32(2024)
  const land = amazon.colliders.filter((c) => c.kind === 'land' && !c.surfaceOnly)
  let lines = 0
  let open = 0
  for (let n = 0; n < 500; n += 1) {
    const disc = land[Math.floor(random() * land.length)]
    const a0 = random() * Math.PI * 2
    const d = Math.sqrt(random()) * Math.min(disc.r, 30)
    const angle = random() * Math.PI * 2
    const y = disc.top + 3 + random() * 6 // the height band of the branches
    const start = [disc.x + Math.cos(a0) * d, y, disc.z + Math.sin(a0) * d]
    lines += 1
    if (!lineIsClear(amazon, [start[0], start[2]], [start[0] - Math.sin(angle) * 7, start[2] - Math.cos(angle) * 7], y)) continue
    open += 1
    if (open > 60) continue
    let aside = 0
    const flight = fly(amazon, start, angle, { seconds: 1, watch: (p) => {
      aside = Math.max(aside, Math.abs((p.pos[0] - start[0]) * Math.cos(angle) - (p.pos[2] - start[2]) * Math.sin(angle)))
    } })
    assert.ok(aside < 0.01 && flight.travelled > 5, `open line ${n}: pushed ${aside.toFixed(2)} m aside, went ${flight.travelled.toFixed(1)} m`)
  }
  assert.ok(open / lines >= 0.15, `only ${open} of ${lines} random 7 m lines through the Amazon canopy are free of wood`)
})

test('boughs: Bulbuli is never trapped among branches, in flight, hovering, rising or dropping', () => {
  for (const id of ['sundarbans', 'amazon']) {
    const w = world[id]
    const random = mulberry32(id.length * 7919)
    const solid = w.colliders.filter((c) => c.kind === 'prop' && !c.walkable)
    const without = { biome: w.biome, index: createColliderIndex(w.colliders.filter((c) => !c.bough)) }
    let starts = 0
    let embedded = 0
    let open = 0
    let pinned = 0
    for (let n = 0; n < (id === 'amazon' ? 140 : 110); n += 1) {
      // somewhere in a crown: beside a random branch piece, at its height
      const piece = w.boughs[Math.floor(random() * w.boughs.length)]
      const a = random() * Math.PI * 2
      const d = random() * 1.2
      const start = [piece.x + Math.cos(a) * d, piece.bottom - random() * TALL, piece.z + Math.sin(a) * d]
      const near = piecesNear(solid, start[0], start[2], 8)
      if (insideWood(near, { pos: start }) > 0) embedded += 1
      starts += 1
      // hovering with no key held: pushed clear of any wood it started in, then perfectly still
      const still = []
      const hover = fly(w, start, 0, { keys: [], seconds: 1, watch: (p, frame) => { if (frame >= 30) still.push([...p.pos]) } })
      const drift = Math.max(...still.map((s) => Math.hypot(s[0] - still[0][0], s[2] - still[0][2])))
      assert.ok(drift < 1e-6, `${id} at ${start.map((v) => v.toFixed(1))}: jitters ${drift.toFixed(3)} m while hovering`)
      // (a start in the open stays in the open; one wedged where several branches meet a trunk
      // has no clear spot within reach and rests between them until it flies out)
      if (insideWood(near, { pos: start }) === 0) assert.ok(insideWood(near, hover.p) <= 0.02)
      assert.ok(Math.hypot(hover.p.pos[0] - start[0], hover.p.pos[2] - start[2]) < 1.6, 'pushed clear by a short way, not thrown')
      // from there: level ways out (counted below), and always up with Space or down by letting go
      const from = [...hover.p.pos]
      let ways = 0
      for (let k = 0; k < 8; k += 1) {
        const out = fly(w, from, (k * Math.PI) / 4, { seconds: 1.5, fps: k % 2 ? 37 : 60 })
        assert.equal(out.fell, 0)
        if (out.travelled > 3) ways += 1
      }
      open += ways
      if (ways === 0) pinned += 1
      const rise = fly(w, from, 0, { keys: ['jump'], level: false, seconds: 2.5, fps: 37 })
      assert.ok(rise.p.pos[1] > from[1] + 3, `${id} at ${from.map((v) => v.toFixed(1))}: rose only ${(rise.p.pos[1] - from[1]).toFixed(1)} m in 2.5 s`)
      const rest = []
      const drop = fly(w, from, 0, { keys: [], level: false, seconds: 2.5, fps: 24, watch: (p, frame) => { if (frame >= 48) rest.push([...p.pos]) } })
      assert.ok(Number.isFinite(drop.p.pos[1]))
      // let go, it comes down: onto a perch or the ground, at rest there, or on down past the branches
      const settled = Math.max(...rest.map((r) => Math.hypot(r[0] - rest[0][0], r[1] - rest[0][1], r[2] - rest[0][2]))) < 1e-6
      assert.ok((drop.p.grounded && settled) || drop.p.pos[1] < from[1] - 2 || drop.fell > 0, `${id} at ${from.map((v) => v.toFixed(1))}: hangs in the branches at ${drop.p.pos[1].toFixed(2)}`)
      // and from where it landed it can take off again
      if (drop.p.grounded) {
        const off = fly(w, [...drop.p.pos], 0, { keys: ['jump'], level: false, seconds: 2.5, fps: 60 })
        // (unless it is under a canopy deck, where there never was a way straight up)
        const bare = fly(without, [...drop.p.pos], 0, { keys: ['jump'], level: false, seconds: 2.5, fps: 60 })
        assert.ok(off.p.pos[1] > drop.p.pos[1] + 3 || bare.p.pos[1] <= drop.p.pos[1] + 3, `${id}: cannot take off from ${drop.p.groundId}`)
      }
    }
    assert.ok(starts >= 100 && embedded >= 10, `${id}: ${starts} starts, ${embedded} of them inside wood`)
    assert.ok(open / starts >= 4, `${id}: on average only ${(open / starts).toFixed(1)} of 8 level ways out of a crown`)
    // where branches of neighbouring trees cross at body height there may be no level way: rare,
    // and the way out there is up or down (checked above for every start)
    assert.ok(pinned <= starts * 0.08, `${id}: ${pinned} of ${starts} starts beside a branch have no level way out`)
  }
})

test('boughs: the branch perches, the stations and walking on the ground are as they were', () => {
  for (const id of ['sundarbans', 'amazon']) {
    const w = world[id]
    // the perches take landings as they did without the branches, and hold Bulbuli at rest
    const perches = w.colliders.filter((c) => /-branch-\d+$/.test(c.id)).filter((_, i) => id === 'sundarbans' || i % 9 === 0)
    const without = { biome: w.biome, index: createColliderIndex(w.colliders.filter((c) => !c.bough)) }
    const landings = (scene) => {
      let landed = 0
      for (const perch of perches) {
        const reach = Math.min(1, (perch.supportRadius ?? perch.r) * 0.6)
        for (const [dx, dz] of [[0, 0], [reach, 0], [0, reach], [-reach, 0], [0, -reach]]) {
          const x = perch.x + dx
          const z = perch.z + dz
          const top = perch.heightAt ? perch.heightAt(x, z) : perch.top
          const rest = []
          const flight = fly(scene, [x, top + 1.6, z], 0, { keys: [], level: false, seconds: 2.5, watch: (p, frame) => { if (frame >= 120) rest.push([...p.pos]) } })
          const moved = Math.max(...rest.map((r) => Math.hypot(r[0] - rest[0][0], r[1] - rest[0][1], r[2] - rest[0][2])))
          assert.ok(moved < 1e-6 || flight.fell > 0, `${perch.id}: Bulbuli keeps moving after landing (${moved.toFixed(3)} m)`)
          if (flight.p.grounded && flight.p.groundId === perch.id) landed += 1
        }
      }
      return landed
    }
    const before = landings(without)
    const now = landings(w)
    assert.ok(now >= before * 0.93, `${id}: ${now} perch landings with the branches, ${before} without`)
    // no branch piece is left in the space where Bulbuli stands on a perch, a log, a roof or a stump
    // (there the perch is what it always was; a branch across its rim once held the bird in mid-air)
    const stands = w.colliders.filter((c) => c.walkable && c.kind === 'prop' && !c.bough)
    for (const c of w.boughs) {
      for (const perch of stands) {
        const gap = perch.shape === 'aabb'
          ? Math.hypot(Math.max(perch.minX - c.x, 0, c.x - perch.maxX), Math.max(perch.minZ - c.z, 0, c.z - perch.maxZ))
          : Math.hypot(c.x - perch.x, c.z - perch.z) - (perch.supportRadius ?? perch.r)
        if (gap >= c.r + BODY) continue
        assert.ok(c.bottom >= perch.top + TALL || c.top <= (perch.heightAt ? Math.min(perch.top, perch.heightAt(perch.x, perch.z)) : perch.top) - 0.55, `${c.id} crosses the standing space of ${perch.id}`)
      }
    }
    // no branch reaches down to where Bulbuli stands at a station or the spawn point
    const tops = Object.fromEntries(w.biome.discs.map((d) => [d.id, d.top]))
    const spots = [...w.biome.stations.map((s) => [s.x, tops[s.disc], s.z]), [...w.biome.spawn.position]]
    for (const [x, y, z] of spots) {
      for (const c of w.boughs) assert.ok(c.bottom > y + TALL + 0.3 || Math.hypot(c.x - x, c.z - z) > c.r + BODY + 1, `${c.id} hangs over a station at head height`)
    }
  }
})

test('collider index: a step taken with the colliders near Bulbuli is the step taken with the whole map', () => {
  assert.ok(COLLIDER_INDEX.margin >= 3 + 2 * 9.5 / 30, 'covers the physics broad phase plus two capped frames at top speed')
  for (const id of ['sahara', 'sundarbans', 'amazon']) {
    const { biome, colliders, index } = world[id]
    assert.equal(index.all, colliders)
    // in the map's own order (the order decides which ground wins)
    const order = new Map(colliders.map((c, i) => [c, i]))
    const sample = index.near(biome.spawn.position[0], biome.spawn.position[2])
    assert.ok(sample.length > 0 && sample.length <= colliders.length)
    for (let i = 1; i < sample.length; i += 1) assert.ok(order.get(sample[i]) > order.get(sample[i - 1]))
    // every collider within reach of a point is in its cell's list
    const random = mulberry32(id.length)
    for (let n = 0; n < 300; n += 1) {
      const c = colliders[Math.floor(random() * colliders.length)]
      if (c.shape === 'aabb') continue
      const extent = Math.max(c.r ?? 0, c.collisionRadius ?? 0, c.rootRadius ?? 0, c.supportRadius ?? 0)
      const a = random() * Math.PI * 2
      const d = random() * (extent + COLLIDER_INDEX.margin)
      assert.ok(index.near(c.x + Math.cos(a) * d, c.z + Math.sin(a) * d).includes(c), `${c.id} missing ${d.toFixed(1)} m from its centre`)
    }
    // a long mixed session: walking, jumping, flying and falling, at mixed frame rates
    const steps = id === 'amazon' ? 2500 : 6000
    const run = (pick) => {
      const p = createPlayer(biome.spawn)
      const trace = []
      for (let i = 0; i < steps; i += 1) {
        const input = { moveX: Math.sin(i / 50), moveZ: Math.cos(i / 70), jumpHeld: i % 300 < 200, jumpPressed: i % 97 === 0, flightHeld: i % 300 < 200 }
        const events = stepPlayer(p, input, 1 / (i % 3 === 0 ? 30 : 60), pick(p))
        rescueFromWater(p, biome, events)
        trace.push(p.pos[0], p.pos[1], p.pos[2], p.grounded ? 1 : 0)
      }
      return trace
    }
    assert.deepEqual(run((p) => index.near(p.pos[0], p.pos[2])), run(() => colliders), `${id}: the indexed session diverged`)
  }
  // the controller uses it, with its frame time capped as the margin assumes
  const controller = readFileSync(new URL('../ExplorerController.jsx', import.meta.url), 'utf8')
  assert.ok(controller.includes('createColliderIndex(collidersFor(biome))'))
  assert.ok(controller.includes('stepPlayer(p, controls.step, dt, colliders.near(p.pos[0], p.pos[2]))'))
  assert.ok(controller.includes('const dt = Math.min(dtRaw, 1 / 30)'))
})

test('boughs: the map still builds quickly and the physics step is not slower than before the branches', () => {
  const { biome, colliders, index } = world.amazon
  const before = colliders.filter((c) => !c.bough)
  const time = (pick) => {
    const p = createPlayer(biome.spawn)
    const t = process.hrtime.bigint()
    for (let i = 0; i < 1500; i += 1) {
      stepPlayer(p, { moveX: Math.sin(i / 50), moveZ: Math.cos(i / 70), jumpHeld: i % 300 < 200, jumpPressed: false, flightHeld: i % 300 < 200 }, 1 / 60, pick(p))
    }
    return Number(process.hrtime.bigint() - t) / 1500 / 1000
  }
  time(() => before) // warm up
  const old = Math.min(time(() => before), time(() => before))
  const now = Math.min(time((p) => index.near(p.pos[0], p.pos[2])), time((p) => index.near(p.pos[0], p.pos[2])))
  assert.ok(now <= old * 1.1, `Amazon physics step: ${now.toFixed(0)} µs with branches and the index, ${old.toFixed(0)} µs before`)
  let most = 0
  for (const c of colliders.filter((_, i) => i % 40 === 0)) most = Math.max(most, index.near(c.x, c.z).length)
  assert.ok(most < 2600, `${most} colliders in the busiest cell`)
  const t = Date.now()
  createColliderIndex(collidersFor(biome))
  assert.ok(Date.now() - t < 3000, `building the Amazon colliders and index took ${Date.now() - t} ms`)
})
