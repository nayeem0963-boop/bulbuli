/**
 * Procedural low-poly Sundarbans models. Every model is ONE merged, non-indexed BufferGeometry
 * with per-vertex colours (bark, roots and leaves in the same mesh), so each (family, form) draws
 * with a single instanced call. Shapes are generated from fixed seeds: deterministic, asset-free.
 *
 * The mangrove trees themselves (five families, several seeded forms each, near / mid / far
 * detail) are built by mangroveTrees.js; this module adds the ground plants, breathing-root
 * fields, driftwood, leaf litter and boardwalk boards, and owns disposal.
 */
import { mulberry32 } from '../../../core/rng.js'
import { ConeGeometry } from 'three'
import { bezier, createBuilder, linear, strip, tube, v } from './mangroveGeometry.js'
import { FAR_FORM_OF, MANGROVE_FORMS, MANGROVE_SPECIES, buildFarMangrove, buildMangrove, createGolpattaPalm } from './mangroveTrees.js'

/* ---------------------------------------------------------------- ground plants */

function frondClump(builder, random, { count, length, width, rise, droop, base, tip, zigzag = 0, segments = 5, spread = 0.12, startY = 0.02 }) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.6
    const len = length * (0.75 + random() * 0.4)
    const up = rise * (0.8 + random() * 0.4)
    const dx = Math.cos(angle)
    const dz = Math.sin(angle)
    const start = v(dx * spread * random(), startY, dz * spread * random())
    const control = start.clone().add(v(dx * len * 0.35, len * up, dz * len * 0.35))
    const end = start.clone().add(v(dx * len * 0.85, len * up * (1 - droop), dz * len * 0.85))
    const path = bezier(start, control, end, segments)
    const widths = path.map((_, k) => {
      const t = k / segments
      return width * Math.sin(Math.min(1, t * 1.15) * Math.PI) * (t < 0.12 ? 0.35 : 1)
    })
    strip(builder, path, widths, { base, tip, normalHint: v(-dz, 0, dx).cross(v(0, 1, 0)).normalize().add(v(0, 0.6, 0)), zigzag })
  }
}

function buildPlant(variant) {
  const random = mulberry32(variant.length * 131 + 7)
  const builder = createBuilder()
  if (variant === 'fern') {
    frondClump(builder, random, { count: 9, length: 1.15, width: 0.11, rise: 0.95, droop: 0.55, base: linear('#3e5f27'), tip: linear('#8aa84a'), zigzag: 0.45, segments: 6 })
  } else if (variant === 'reed') {
    frondClump(builder, random, { count: 16, length: 1.05, width: 0.028, rise: 1.9, droop: 0.12, base: linear('#4f6a2d'), tip: linear('#b9b979'), segments: 4, spread: 0.18 })
  } else if (variant === 'broadleaf') {
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2 + random() * 0.4
      const dx = Math.cos(a)
      const dz = Math.sin(a)
      const stemTop = v(dx * 0.22, 0.32 + random() * 0.18, dz * 0.22)
      tube(builder, [v(0, 0, 0), stemTop], [0.018, 0.012], { segments: 3, base: linear('#4c6b2a'), cap: false })
      const path = bezier(stemTop, stemTop.clone().add(v(dx * 0.3, 0.16, dz * 0.3)), stemTop.clone().add(v(dx * 0.62, -0.02, dz * 0.62)), 5)
      strip(builder, path, path.map((_, k) => 0.2 * Math.sin((k / 5) * Math.PI) + 0.01), { base: linear('#2f5f2c'), tip: linear('#5f9a45'), normalHint: v(0, 1, 0) })
    }
  } else if (variant === 'hantal') {
    tube(builder, [v(0, 0, 0), v(0.02, 0.32, 0), v(0, 0.5, 0.02)], [0.09, 0.08, 0.06], { segments: 5, base: linear('#4d3f30'), tip: linear('#6a5a44') })
    frondClump(builder, random, { count: 11, length: 1.2, width: 0.07, rise: 0.75, droop: 0.65, base: linear('#3f5a2a'), tip: linear('#7f9a4a'), zigzag: 0.6, segments: 6, startY: 0.48 })
  } else if (variant === 'nipa') {
    frondClump(builder, random, { count: 9, length: 3.1, width: 0.2, rise: 1.25, droop: 0.42, base: linear('#4b6a2c'), tip: linear('#8fae55'), zigzag: 0.55, segments: 8, spread: 0.3 })
  }
  return builder.build()
}

function buildPneumatophoreField(lod = 'near') {
  const random = mulberry32(lod === 'near' ? 4421 : 4422)
  const builder = createBuilder()
  const count = lod === 'near' ? 30 : 18
  const baseColor = linear('#4f4436')
  const tipColor = linear('#8d826c')
  for (let i = 0; i < count; i += 1) {
    const r = Math.sqrt(random()) * 1.15
    const a = random() * Math.PI * 2
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const h = (0.12 + random() * 0.24) * (1.1 - r * 0.35)
    const w = 0.022 + random() * 0.016
    const lean = v((random() - 0.5) * 0.06, 0, (random() - 0.5) * 0.06)
    const top = v(x, h, z).add(lean)
    // a 4-sided spike
    const corners = [0, 1, 2, 3].map((k) => v(x + Math.cos(k * Math.PI / 2 + a) * w, -0.03, z + Math.sin(k * Math.PI / 2 + a) * w))
    for (let k = 0; k < 4; k += 1) builder.triangle(corners[k], corners[(k + 1) % 4], top, baseColor, baseColor, tipColor)
  }
  return builder.build()
}

function buildLog() {
  const random = mulberry32(5150)
  const builder = createBuilder()
  const path = Array.from({ length: 7 }, (_, i) => v(-1.5 + i * 0.5, 0.05 + Math.sin(i * 0.9) * 0.04, (random() - 0.5) * 0.12))
  tube(builder, path, [0.19, 0.18, 0.17, 0.16, 0.15, 0.13, 0.11], { segments: 6, base: linear('#7d6f5d'), tip: linear('#9b8d78') })
  tube(builder, [v(-0.3, 0.12, 0.05), v(-0.1, 0.35, 0.45), v(0.05, 0.42, 0.8)], [0.07, 0.05, 0.03], { segments: 4, base: linear('#7a6c5a'), tip: linear('#93856f') })
  // root plate at the thick end
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2
    tube(builder, [v(-1.5, 0.08, 0), v(-1.75, 0.1 + Math.sin(a) * 0.25, Math.cos(a) * 0.3)], [0.06, 0.02], { segments: 3, base: linear('#6f604f') })
  }
  return builder.build()
}

function buildDebris() {
  const random = mulberry32(6262)
  const builder = createBuilder()
  for (let i = 0; i < 3; i += 1) {
    const a = random() * Math.PI
    const len = 0.5 + random() * 0.5
    const c = v((random() - 0.5) * 0.6, 0.025, (random() - 0.5) * 0.6)
    tube(builder, [c.clone().add(v(-Math.cos(a) * len / 2, 0, -Math.sin(a) * len / 2)), c.clone().add(v(Math.cos(a) * len / 2, 0.01, Math.sin(a) * len / 2))], [0.022, 0.014], { segments: 3, base: linear('#5e4c3a'), cap: false })
  }
  const leafColors = [linear('#7a6233'), linear('#8c7a3c'), linear('#5f6a32'), linear('#6e4f2c')]
  for (let i = 0; i < 9; i += 1) {
    const c = v((random() - 0.5) * 0.9, 0.012 + i * 0.001, (random() - 0.5) * 0.9)
    const a = random() * Math.PI
    const ax = v(Math.cos(a) * 0.07, 0, Math.sin(a) * 0.07)
    const sx = v(-Math.sin(a) * 0.03, 0, Math.cos(a) * 0.03)
    const color = leafColors[i % leafColors.length]
    builder.triangle(c.clone().sub(ax), c.clone().add(sx), c.clone().add(ax), color)
    builder.triangle(c.clone().sub(ax), c.clone().add(ax), c.clone().sub(sx), color)
  }
  return builder.build()
}

/**
 * A drift of fallen mangrove leaves lying flat on the mud (no twigs): yellowed, brown and a few
 * still olive. Two seeded variants, so neighbouring drifts differ. About 1.5 m across.
 */
function buildLeafLitter(variant = 0) {
  const random = mulberry32(7411 + variant * 97)
  const builder = createBuilder()
  // the same dull browns and olives as the twig debris: fallen leaves, not petals
  const colors = ['#7a6233', '#8c7a3c', '#5f6a32', '#6e4f2c', '#84703a', '#57452a', '#6f6a35'].map(linear)
  const count = 14
  for (let i = 0; i < count; i += 1) {
    // denser in the middle, a few strays at the rim
    const r = (random() ** 1.4) * 0.85
    const at = random() * Math.PI * 2
    const c = v(Math.cos(at) * r, 0.014 + i * 0.0012, Math.sin(at) * r)
    const a = random() * Math.PI
    // stylised, like the trees: larger than life so a drift reads from the follow camera
    const length = 0.12 + random() * 0.08
    const width = length * (0.36 + random() * 0.16)
    const ax = v(Math.cos(a) * length, 0, Math.sin(a) * length)
    const sx = v(-Math.sin(a) * width, 0, Math.cos(a) * width)
    const color = colors[Math.floor(random() * colors.length)]
    const shade = color.clone().multiplyScalar(0.8)
    // a slightly curled blade: the two halves meet along the midrib, one edge lifted
    const lift = v(0, 0.015 + random() * 0.025, 0)
    builder.triangle(c.clone().sub(ax), c.clone().add(sx).add(lift), c.clone().add(ax), color)
    builder.triangle(c.clone().sub(ax), c.clone().add(ax), c.clone().sub(sx), shade)
  }
  return builder.build()
}

/** A fallen branch lying on the mud: a bent, forked limb about 1.6 m long, bark weathered grey. */
function buildFallenBranch() {
  const random = mulberry32(8089)
  const builder = createBuilder()
  const base = linear('#6f6354')
  const tip = linear('#93866f')
  const main = Array.from({ length: 6 }, (_, i) => v(-0.8 + i * 0.32, 0.045 + Math.sin(i * 1.1) * 0.025, Math.sin(i * 0.8) * 0.1 + (random() - 0.5) * 0.04))
  tube(builder, main, [0.05, 0.047, 0.042, 0.036, 0.028, 0.018], { segments: 5, base, tip })
  tube(builder, [main[2].clone(), v(0.02, 0.07, 0.34), v(0.22, 0.05, 0.62)], [0.03, 0.022, 0.012], { segments: 4, base, tip })
  tube(builder, [main[3].clone(), v(0.36, 0.09, -0.26), v(0.5, 0.06, -0.5)], [0.026, 0.018, 0.01], { segments: 4, base, tip })
  tube(builder, [main[4].clone(), v(0.66, 0.1, 0.2)], [0.02, 0.009], { segments: 3, base, tip })
  return builder.build()
}

/**
 * A length of surface root showing through the mud between trees: it rises out of the ground,
 * snakes along for a metre or two, forks and dives back in. Mostly buried, so it is never more
 * than a few centimetres proud of the mud. Two seeded variants.
 */
function buildSurfaceRoot(variant = 0) {
  const random = mulberry32(9173 + variant * 131)
  const builder = createBuilder()
  const base = linear('#5f5141')
  const tip = linear('#8b7c65')
  const bend = variant === 0 ? 0.22 : -0.3
  const steps = 8
  const main = Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1)
    // buried at both ends, humped in between, with a second low hump so it is not one even arc
    const rise = Math.sin(t * Math.PI) * (0.02 + 0.012 * Math.sin(t * Math.PI * 3 + variant))
    return v(-0.95 + t * 1.9, -0.035 + rise * 2.4, Math.sin(t * Math.PI * (1.3 + variant * 0.5)) * bend + (random() - 0.5) * 0.05)
  })
  tube(builder, main, [0.03, 0.042, 0.046, 0.044, 0.04, 0.034, 0.026, 0.016], { segments: 5, base, tip })
  const fork = main[variant === 0 ? 3 : 4]
  tube(builder, [fork.clone(), v(fork.x + 0.3, 0.0, fork.z + (variant === 0 ? 0.32 : -0.3)), v(fork.x + 0.62, -0.04, fork.z + (variant === 0 ? 0.5 : -0.56))], [0.028, 0.022, 0.012], { segments: 4, base, tip })
  if (variant === 1) tube(builder, [main[2].clone(), v(main[2].x - 0.1, 0.0, main[2].z + 0.3), v(main[2].x - 0.05, -0.04, main[2].z + 0.55)], [0.024, 0.018, 0.01], { segments: 4, base, tip })
  return builder.build()
}

/** A handful of mangrove seedlings: short stems with a few upright young leaves. */
function buildSeedlings() {
  const random = mulberry32(9421)
  const builder = createBuilder()
  const stem = linear('#6b5a3c')
  const greens = ['#4f6d34', '#5d7a36', '#6a8440', '#45602f'].map(linear)
  for (let i = 0; i < 5; i += 1) {
    const a = random() * Math.PI * 2
    const r = Math.sqrt(random()) * 0.42
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const h = 0.1 + random() * 0.14
    tube(builder, [v(x, -0.02, z), v(x + (random() - 0.5) * 0.03, h, z + (random() - 0.5) * 0.03)], [0.012, 0.007], { segments: 3, base: stem, tip: stem })
    const leaves = 2 + Math.floor(random() * 2)
    for (let k = 0; k < leaves; k += 1) {
      const la = a + (k / leaves) * Math.PI * 2 + random()
      const out = v(Math.cos(la), 0, Math.sin(la))
      const side = v(-Math.sin(la), 0, Math.cos(la))
      const from = v(x, h * (0.75 + k * 0.1), z)
      const length = 0.09 + random() * 0.05
      const end = from.clone().add(out.clone().multiplyScalar(length)).add(v(0, length * 0.7, 0))
      const mid = from.clone().lerp(end, 0.5)
      const color = greens[Math.floor(random() * greens.length)]
      builder.triangle(from, mid.clone().add(side.clone().multiplyScalar(0.028)), end, color)
      builder.triangle(from, end, mid.clone().sub(side.clone().multiplyScalar(0.028)), color.clone().multiplyScalar(0.82))
    }
  }
  return builder.build()
}

/** One boardwalk board: 1.6 m wide, 0.22 m deep, 5 cm thick. */
function buildBoard() {
  const builder = createBuilder()
  const top = linear('#8c7457')
  const side = linear('#5a4835')
  const w = 0.8
  const d = 0.11
  const y0 = -0.03
  const y1 = 0.025
  const p = (x, y, z) => v(x, y, z)
  // top
  builder.triangle(p(-w, y1, -d), p(-w, y1, d), p(w, y1, d), top)
  builder.triangle(p(-w, y1, -d), p(w, y1, d), p(w, y1, -d), top)
  // sides
  for (const [a, b] of [[[-w, -d], [w, -d]], [[w, d], [-w, d]], [[w, -d], [w, d]], [[-w, d], [-w, -d]]]) {
    builder.triangle(p(a[0], y0, a[1]), p(b[0], y0, b[1]), p(b[0], y1, b[1]), side, side, top)
    builder.triangle(p(a[0], y0, a[1]), p(b[0], y1, b[1]), p(a[0], y1, a[1]), side, top, top)
  }
  return builder.build()
}

/* ---------------------------------------------------------------- the model set */

export function createSundarbansModels() {
  const forms = (lod) => Object.fromEntries(MANGROVE_SPECIES.map((name) => [
    name, Array.from({ length: MANGROVE_FORMS[lod][name] }, (_, form) => buildMangrove(name, form, lod)),
  ]))
  const rootsCarpet = new ConeGeometry(0.32, 1, 5, 1)
  rootsCarpet.translate(0, 0.5, 0)
  rootsCarpet.computeBoundingBox()
  rootsCarpet.computeBoundingSphere()
  const models = {
    tree: forms('near'),
    treeMid: forms('mid'),
    treeFar: Array.from({ length: MANGROVE_FORMS.far }, (_, form) => buildFarMangrove(form)),
    farFormOf: FAR_FORM_OF,
    plant: Object.fromEntries(['fern', 'reed', 'broadleaf', 'hantal'].map((name) => [name, buildPlant(name)]).concat([['nipa', createGolpattaPalm(1)]])),
    roots: buildPneumatophoreField('near'),
    rootsFar: buildPneumatophoreField('far'),
    rootsCarpet,
    log: buildLog(),
    debris: buildDebris(),
    litter: [buildLeafLitter(0), buildLeafLitter(1)],
    branch: buildFallenBranch(),
    surfaceRoot: [buildSurfaceRoot(0), buildSurfaceRoot(1)],
    seedlings: buildSeedlings(),
    board: buildBoard(),
  }
  const all = [
    ...Object.values(models.tree).flat(), ...Object.values(models.treeMid).flat(), ...models.treeFar,
    ...Object.values(models.plant), models.roots, models.rootsFar, models.rootsCarpet, models.log, models.debris, ...models.litter, models.branch, ...models.surfaceRoot, models.seedlings, models.board,
  ]
  const triangles = (geometry) => geometry.getAttribute('position').count / 3
  models.dispose = () => all.forEach((geometry) => geometry.dispose())
  models.triangleCounts = Object.fromEntries([
    ...MANGROVE_SPECIES.flatMap((name) => models.tree[name].map((g, i) => [`tree:${name}:${i}`, triangles(g)])),
    ...MANGROVE_SPECIES.flatMap((name) => models.treeMid[name].map((g, i) => [`treeMid:${name}:${i}`, triangles(g)])),
    ...models.treeFar.map((g, i) => [`treeFar:${i}`, triangles(g)]),
  ])
  return models
}
