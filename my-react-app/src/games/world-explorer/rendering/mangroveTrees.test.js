import test from 'node:test'
import assert from 'node:assert/strict'
import { BIOMES } from '../biomes/index.js'
import { scatterBiomeAssets } from './scattering.js'
import { FAR_FORM_OF, MANGROVE_FORMS, MANGROVE_SPECIES, buildFarMangrove, buildMangrove, createGolpattaPalm } from './mangroveTrees.js'
import { createWetlandField } from './wetland.js'

const positions = (geometry) => geometry.getAttribute('position').array
const bounds = (geometry) => {
  geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox
  return { height: max.y, width: Math.max(max.x - min.x, max.z - min.z), bottom: min.y }
}
/** Ground-contact points (vertices at or below the mud) outside the trunk, as angular sectors. */
function groundContacts(geometry, minRadius = 0.35) {
  const p = geometry.getAttribute('position')
  const sectors = new Set()
  let reach = 0
  let contacts = 0
  for (let i = 0; i < p.count; i += 1) {
    if (p.getY(i) > -0.08) continue
    const r = Math.hypot(p.getX(i), p.getZ(i))
    if (r < minRadius) continue
    contacts += 1
    reach = Math.max(reach, r)
    sectors.add(Math.floor(((Math.atan2(p.getZ(i), p.getX(i)) + Math.PI) / (Math.PI * 2)) * 12) % 12)
  }
  return { sectors, reach, contacts }
}

test('mangroves: generation is deterministic (same family, form and detail → identical mesh)', () => {
  for (const species of MANGROVE_SPECIES) {
    const a = buildMangrove(species, 1, 'near')
    const b = buildMangrove(species, 1, 'near')
    assert.deepEqual(positions(a), positions(b), `${species} is reproducible`)
    assert.deepEqual(a.getAttribute('color').array, b.getAttribute('color').array)
  }
  assert.deepEqual(positions(buildFarMangrove(2)), positions(buildFarMangrove(2)))
})

test('golpatta: palm fronds grow from ground level without a trunk', () => {
  const first = createGolpattaPalm(7)
  const second = createGolpattaPalm(7)
  assert.deepEqual(positions(first), positions(second))
  assert.notDeepEqual(positions(first), positions(createGolpattaPalm(8)))
  first.computeBoundingBox()
  const { min, max } = first.boundingBox
  assert.ok(min.y > -0.1 && min.y < 0.1, `fronds emerge at ground level (${min.y.toFixed(2)} m)`)
  assert.ok(max.y > 2.2 && max.y < 4, `fronds arch above the mud (${max.y.toFixed(2)} m)`)
  assert.ok(Math.max(max.x - min.x, max.z - min.z) > 4, 'long fronds spread broadly')
})

test('mangroves: every family offers distinct seeded forms at each level of detail', () => {
  for (const lod of ['near', 'mid']) {
    for (const species of MANGROVE_SPECIES) {
      const forms = Array.from({ length: MANGROVE_FORMS[lod][species] }, (_, form) => buildMangrove(species, form, lod))
      assert.ok(forms.length >= 2)
      for (let i = 1; i < forms.length; i += 1) {
        const same = forms[i].getAttribute('position').count === forms[0].getAttribute('position').count
          && positions(forms[i]).every((value, k) => value === positions(forms[0])[k])
        assert.ok(!same, `${lod} ${species} form ${i} differs from form 0`)
      }
    }
  }
  for (const species of MANGROVE_SPECIES) assert.ok(FAR_FORM_OF[species] < MANGROVE_FORMS.far)
})

test('mangroves: families have distinguishable proportions (sundari tall and broad, goran a low shrub)', () => {
  const avg = (species, key) => {
    const forms = Array.from({ length: MANGROVE_FORMS.near[species] }, (_, form) => bounds(buildMangrove(species, form, 'near')))
    return forms.reduce((sum, b) => sum + b[key], 0) / forms.length
  }
  const h = Object.fromEntries(MANGROVE_SPECIES.map((s) => [s, avg(s, 'height')]))
  const w = Object.fromEntries(MANGROVE_SPECIES.map((s) => [s, avg(s, 'width')]))
  assert.ok(h.sundari > h.gewa + 1 && h.sundari > h.garjan, `sundari is a tall mature tree (${h.sundari.toFixed(2)} m)`)
  assert.ok(h.gewa > h.goran + 1.2, `gewa is a medium crown above the goran shrubs (${h.gewa.toFixed(2)} vs ${h.goran.toFixed(2)})`)
  assert.ok(h.goran < 2.6, `goran is short, bushy undergrowth (${h.goran.toFixed(2)} m)`)
  assert.ok(w.sundari > w.goran * 2, 'sundari crowns are much broader than goran')
  assert.ok(h.keora / w.keora > h.sundari / w.sundari, 'keora is the slender family')
})

test('mangroves: roots visibly reach the mud around (but not symmetrically around) every tree', () => {
  const reachOf = {}
  for (const species of MANGROVE_SPECIES) {
    const reaches = []
    for (let form = 0; form < MANGROVE_FORMS.near[species]; form += 1) {
      const geometry = buildMangrove(species, form, 'near')
      assert.ok(bounds(geometry).bottom <= -0.1, `${species}:${form} is sunk into the ground`)
      const { sectors, reach, contacts } = groundContacts(geometry, species === 'goran' ? 0.2 : 0.35)
      assert.ok(contacts > 0 && sectors.size >= 3, `${species}:${form} roots anchor on several sides (${sectors.size}/12 sectors)`)
      reaches.push(reach)
    }
    reachOf[species] = reaches
    // root spread differs between forms of the same family (prominent vs modest root systems)
    assert.ok(Math.max(...reaches) - Math.min(...reaches) > 0.05, `${species} forms vary their root spread`)
  }
  // Rhizophora-style garjan has the most prominent prop-root cage; goran's stilts stay short
  assert.ok(Math.max(...reachOf.garjan) > Math.max(...reachOf.goran) + 0.6)
  assert.ok(Math.min(...reachOf.garjan) > 1.3)
})

test('mangroves: foliage is made of many leaf blades in varied greens, not a few flat-coloured blobs', () => {
  const geometry = buildMangrove('sundari', 0, 'near')
  const color = geometry.getAttribute('color')
  const greens = new Set()
  // count triangle corners (trees are welded/indexed for smooth shading)
  const corners = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: color.count }, (_, i) => i)
  let leafy = 0
  for (const i of corners) {
    const r = color.getX(i)
    const g = color.getY(i)
    const b = color.getZ(i)
    if (g > r * 1.15 && g > b) {
      leafy += 1
      greens.add(`${Math.round(r * 400)},${Math.round(g * 400)},${Math.round(b * 400)}`)
    }
  }
  assert.ok(leafy / 3 > 800, `sundari carries a dense canopy of leaf triangles (${Math.round(leafy / 3)})`)
  assert.ok(greens.size > 40, `foliage uses many shades of green (${greens.size})`)
  // no excessively bright or saturated green anywhere in the palette
  for (let i = 0; i < color.count; i += 1) assert.ok(color.getY(i) < 0.6, 'greens stay natural, not neon')
})

test('sundarbans: tree layout assigns valid forms and avoids identical neighbours', () => {
  const placements = scatterBiomeAssets(BIOMES.sundarbans)
  const trees = placements.filter((item) => item.kind === 'mangrove')
  const saplings = placements.filter((item) => item.kind === 'sapling')
  const background = placements.filter((item) => item.kind === 'backgroundMangrove')
  const rootCarpet = placements.filter((item) => item.kind === 'shorePneumatophore')
  assert.ok(rootCarpet.length > 100, 'shore banks receive a dense pneumatophore carpet')
  assert.ok(rootCarpet.every((item) => item.background && item.scale >= 0.2 && item.scale <= 0.4))
  const shoreField = createWetlandField(BIOMES.sundarbans)
  for (const root of rootCarpet.slice(0, 20)) {
    assert.ok(root.y >= shoreField.waterY - 0.12 && root.y <= shoreField.waterY + 0.46)
  }
  for (const item of trees) assert.ok(Number.isInteger(item.form) && item.form >= 0 && item.form < MANGROVE_FORMS.near[item.variant])
  for (const item of saplings) assert.ok(item.form >= 0 && item.form < MANGROVE_FORMS.mid[item.variant])
  for (const item of background) {
    const limit = item.lod === 'far' ? MANGROVE_FORMS.far : MANGROVE_FORMS.mid[item.variant]
    assert.ok(item.form >= 0 && item.form < limit)
  }
  // each tree's nearest same-family neighbour (within 12 m) almost always has another silhouette
  let pairs = 0
  let twins = 0
  for (const a of trees) {
    let nearest = null
    for (const b of trees) {
      if (a === b || a.variant !== b.variant) continue
      const d = Math.hypot(a.x - b.x, a.z - b.z)
      if (d < 12 && (!nearest || d < nearest.d)) nearest = { d, b }
    }
    if (!nearest) continue
    pairs += 1
    if (nearest.b.form === a.form) twins += 1
  }
  assert.ok(pairs > 5 && twins / pairs <= 0.15, `neighbouring trees use different silhouettes (${twins}/${pairs} twins)`)
  const count = (variant) => trees.filter((t) => t.variant === variant).length
  assert.ok(count('sundari') >= count('goran') * 0.7, 'mature sundari trees anchor the forest structure')
  assert.ok(new Set(trees.map((t) => t.variant)).size === 5, 'all five families grow on the islands')
  assert.ok(new Set(saplings.map((t) => t.variant)).size >= 3, 'young growth mixes several families')
  assert.ok(new Set(background.filter((t) => t.lod === 'far').map((t) => t.form)).size === MANGROVE_FORMS.far, 'the far forest mixes silhouettes')
  // veteran (enlarged) sundari stay away from the spawn view corridor and every station
  const biome = BIOMES.sundarbans
  for (const t of trees.filter((tree) => tree.variant === 'sundari' && tree.scale > 1.25)) {
    assert.ok(Math.hypot(t.x - biome.spawn.position[0], t.z - biome.spawn.position[2]) > 9.5)
    for (const s of biome.stations) assert.ok(Math.hypot(t.x - s.x, t.z - s.z) >= 9, `veteran tree clear of station ${s.n}`)
  }
  // the background is grouped into stands: far trees are denser where the stand field is high
  assert.ok(background.filter((t) => t.lod === 'far' && t.form === 3).length > 40, 'low bank shrubs layer the forest edge')
})

test('mangroves: sundari forms are distinct crown architectures (spreading, tall, asymmetric)', () => {
  const shape = (form) => {
    const geometry = buildMangrove('sundari', form, 'near')
    geometry.computeBoundingBox()
    const { min, max } = geometry.boundingBox
    // crown centre of mass (leaf-coloured vertices) relative to the trunk base
    const p = geometry.getAttribute('position')
    const c = geometry.getAttribute('color')
    let sx = 0
    let sz = 0
    let n = 0
    for (let i = 0; i < p.count; i += 1) {
      if (c.getY(i) > c.getX(i) * 1.15 && p.getY(i) > 2) {
        sx += p.getX(i)
        sz += p.getZ(i)
        n += 1
      }
    }
    return { width: Math.max(max.x - min.x, max.z - min.z), height: max.y, offset: Math.hypot(sx / n, sz / n) }
  }
  const [spreading, tall, asymmetric] = [0, 1, 2].map(shape)
  assert.ok(spreading.width > tall.width + 1, `spreading crown is broader (${spreading.width.toFixed(1)} vs ${tall.width.toFixed(1)})`)
  assert.ok(tall.height > spreading.height + 0.6, 'tall form is taller')
  assert.ok(tall.height / tall.width > spreading.height / spreading.width, 'tall form is the narrower silhouette')
  assert.ok(asymmetric.offset > Math.max(spreading.offset, tall.offset) + 0.3, `asymmetric crown is off-centre (${asymmetric.offset.toFixed(2)} m)`)
})

test('mangroves: roots are a lighter, greyer tone than trunks so they read against the mud', () => {
  const geometry = buildMangrove('garjan', 0, 'near')
  const p = geometry.getAttribute('position')
  const c = geometry.getAttribute('color')
  const avg = (filter) => {
    let sum = 0
    let n = 0
    for (let i = 0; i < p.count; i += 1) {
      if (!filter(i)) continue
      sum += c.getX(i) + c.getY(i) + c.getZ(i)
      n += 1
    }
    return sum / n
  }
  const brownish = (i) => c.getX(i) >= c.getY(i) * 0.95
  const roots = avg((i) => brownish(i) && p.getY(i) > 0.2 && p.getY(i) < 1.2 && Math.hypot(p.getX(i), p.getZ(i)) > 0.6)
  const trunk = avg((i) => brownish(i) && p.getY(i) > 2 && p.getY(i) < 3 && Math.hypot(p.getX(i), p.getZ(i)) < 0.5)
  assert.ok(roots > trunk * 1.1, `roots (${roots.toFixed(3)}) are lighter than the trunk (${trunk.toFixed(3)})`)
})
