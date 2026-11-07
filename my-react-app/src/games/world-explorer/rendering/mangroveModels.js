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
    board: buildBoard(),
  }
  const all = [
    ...Object.values(models.tree).flat(), ...Object.values(models.treeMid).flat(), ...models.treeFar,
    ...Object.values(models.plant), models.roots, models.rootsFar, models.rootsCarpet, models.log, models.debris, models.board,
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
