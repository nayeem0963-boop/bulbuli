/**
 * The Sahara's station landmarks as asset-free meshes with per-vertex colours: the oasis (a pool
 * with a damp shore and grass, date palms and a stone well with its bucket), the resting camel,
 * and the dry river bed. Each replaces a handful of boxes and flat rectangles.
 *
 * Scenery only: every landmark keeps the place and the solid size the map gives it
 * (biomes/sahara.js, biomes/common.js). The numbers the colliders depend on are exported here
 * (DATE_PALM, WELL) and checked in saharaLandmarks.test.js.
 *
 * Pure geometry, deterministic (seeded): rendering/SaharaLandmarks.jsx draws it.
 */
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mulberry32 } from '../../../core/rng.js'
import { bezier, blob, createBuilder, cubic, leaf, linear, strip, tube, v } from './mangroveGeometry.js'

/** Welds shared corners so the mesh shades smoothly (as giantTree.js does). */
export function finish(builder) {
  const geometry = builder.build()
  geometry.deleteAttribute('normal')
  const welded = mergeVertices(geometry, 1e-4)
  welded.computeVertexNormals()
  welded.computeBoundingSphere()
  welded.computeBoundingBox()
  geometry.dispose()
  return welded
}

const smooth = (t) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c) }

/** Catmull-Rom through [x, z] control points, t in 0..1. */
function along(points, t) {
  const n = points.length - 1
  const f = Math.min(n - 1e-9, Math.max(0, t) * n)
  const i = Math.floor(f)
  const u = f - i
  const p = (k) => points[Math.max(0, Math.min(n, k))]
  const axis = (a) => {
    const [p0, p1, p2, p3] = [p(i - 1)[a], p(i)[a], p(i + 1)[a], p(i + 2)[a]]
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)
  }
  return [axis(0), axis(1)]
}

/* ------------------------------------------------------------------ date palm */

/**
 * Per unit of the palm's scale. The trunk is the one the map's collider was sized for: 4 m tall,
 * 0.2 m at the base, its top 0.4 m off-centre (towards +x).
 */
export const DATE_PALM = Object.freeze({ height: 4, baseRadius: 0.2, topRadius: 0.13, lean: 0.4, fronds: 24, frondLength: 2.3 })

const PALM_BARK = { base: linear('#7d6040'), tip: linear('#a08055'), dry: linear('#b39a6c') }
const FROND = { base: linear('#3f6a2c'), tip: linear('#86a352'), dead: linear('#a98a52'), deadTip: linear('#c2a66c') }
const DATES = { light: linear('#d0902f'), dark: linear('#8a4d1d') }

/** Centre of the palm's trunk at height y (0..height), per unit scale. */
export function datePalmTrunkAt(y) {
  const t = Math.max(0, Math.min(1, y / DATE_PALM.height))
  return DATE_PALM.lean * t ** 1.5
}

export function createDatePalmGeometry(seed = 1) {
  const random = mulberry32(seed)
  const b = createBuilder()
  const { height: h, baseRadius, topRadius, fronds, frondLength } = DATE_PALM

  // trunk: a gentle curve, ringed with the stubs of old leaf bases
  const steps = 18
  const path = []
  const radii = []
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const y = -0.15 + t * (h + 0.15)
    path.push(v(datePalmTrunkAt(y), y, 0))
    const taper = baseRadius + (topRadius - baseRadius) * t
    radii.push(taper * (i % 2 ? 0.86 : 1))
  }
  tube(b, path, radii, { segments: 9, base: PALM_BARK.base, tip: PALM_BARK.tip, random, mottle: 0.22, lichen: PALM_BARK.dry, twist: 0.35 })

  const crown = v(datePalmTrunkAt(h), h, 0)
  blob(b, crown.clone().add(v(0, 0.02, 0)), 0.24, [1, 1.25, 1], { detail: 1, random, light: PALM_BARK.tip, dark: PALM_BARK.base, lumpy: 0.1 })

  // living fronds: each springs up and out, then arches over under its own weight
  for (let k = 0; k < fronds; k += 1) {
    const a = k * 2.39996 + random() * 0.4
    const out = v(Math.cos(a), 0, Math.sin(a))
    const rise = 0.15 + ((k * 7) % fronds) / fronds * 0.8 // 0.15 (nearly level) to 0.95 (nearly upright)
    const length = frondLength * (0.82 + random() * 0.3)
    const reach = length * (1 - rise * 0.45)
    const control = crown.clone().addScaledVector(out, reach * 0.5).add(v(0, length * (0.2 + rise * 0.55), 0))
    const end = crown.clone().addScaledVector(out, reach).add(v(0, length * (rise * 0.55 - 0.5), 0))
    const tone = 0.85 + random() * 0.3
    strip(b, bezier(crown, control, end, 8), [0.04, 0.12, 0.165, 0.18, 0.175, 0.16, 0.13, 0.085, 0.015], {
      base: FROND.base.clone().multiplyScalar(tone), tip: FROND.tip.clone().multiplyScalar(tone), zigzag: 0.3,
    })
  }
  // a skirt of dry fronds hanging against the trunk
  for (let k = 0; k < 6; k += 1) {
    const a = k * 1.047 + random() * 0.5
    const out = v(Math.cos(a), 0, Math.sin(a))
    const length = 1.1 + random() * 0.5
    const control = crown.clone().addScaledVector(out, 0.55).add(v(0, -0.05, 0))
    const end = crown.clone().addScaledVector(out, 0.5 + random() * 0.25).add(v(0, -length, 0))
    strip(b, bezier(crown.clone().add(v(0, -0.12, 0)), control, end, 5), [0.04, 0.13, 0.16, 0.14, 0.09, 0.02], { base: FROND.dead, tip: FROND.deadTip, normalHint: out, zigzag: 0.25 })
  }
  // bunches of dates on drooping stalks
  for (let k = 0; k < 3; k += 1) {
    const a = 0.9 + k * 2.2 + random() * 0.5
    const out = v(Math.cos(a), 0, Math.sin(a))
    const hang = crown.clone().addScaledVector(out, 0.42).add(v(0, -0.5 - random() * 0.15, 0))
    tube(b, bezier(crown, crown.clone().addScaledVector(out, 0.4).add(v(0, 0.05, 0)), hang, 4), [0.03, 0.028, 0.025, 0.022, 0.02], { segments: 4, base: DATES.dark, cap: false })
    blob(b, hang.clone().add(v(0, -0.12, 0)), 0.11, [0.9, 1.6, 0.9], { detail: 1, random, light: DATES.light, dark: DATES.dark, lumpy: 0.2 })
  }
  return finish(b)
}

/* ------------------------------------------------------------------ well */

/**
 * The stone ring is the well's collider (biomes/sahara.js: `block: 0.9, blockTop: 0.8`): 0.9 m
 * across at the foot and 0.8 m tall, so Bulbuli stops at the stones and can stand on the rim.
 */
export const WELL = Object.freeze({ radius: 0.9, rimRadius: 0.84, inner: 0.6, height: 0.8, courses: 2, stones: 11, water: 0.42, beam: 1.62 })

const STONE = [linear('#b79a75'), linear('#a58763'), linear('#c6ab86'), linear('#9c8262')]
const MORTAR = linear('#6a5740')
const WELL_WATER = { deep: linear('#1d4a63'), edge: linear('#2f6f88') }
const WOOD = { base: linear('#6e4f31'), tip: linear('#8a6843') }
const ROPE = linear('#c9b48a')

export function createWellGeometry(seed = 77) {
  const random = mulberry32(seed)
  const b = createBuilder()
  const { radius, rimRadius, inner, height, courses, stones, water, beam } = WELL
  const outerAt = (y) => radius + (rimRadius - radius) * (y / height)
  const at = (r, a, y) => v(Math.cos(a) * r, y, Math.sin(a) * r)
  const quad = (p0, p1, p2, p3, c) => { b.triangle(p0, p1, p2, c); b.triangle(p0, p2, p3, c) }

  // dark core behind the joints, so the gaps between stones read as mortar and shadow
  tube(b, [v(0, 0, 0), v(0, height - 0.04, 0)], [outerAt(0) - 0.035, outerAt(height) - 0.035], { segments: 22, base: MORTAR, cap: false })

  const courseHeight = height / courses
  for (let course = 0; course < courses; course += 1) {
    const y0 = course * courseHeight
    for (let s = 0; s < stones; s += 1) {
      const width = (Math.PI * 2) / stones
      const a0 = (s + (course % 2) * 0.5) * width + 0.035
      const a1 = a0 + width - 0.07
      const am = (a0 + a1) / 2
      // never proud of the collider: stones only sit back from it, and the top course ends at `height`
      const set = random() * 0.025
      const top = course === courses - 1 ? height : y0 + courseHeight - 0.02 - random() * 0.015
      const bottom = y0 + (course ? 0.02 : -0.1)
      const colour = STONE[Math.floor(random() * STONE.length)].clone().multiplyScalar(0.92 + random() * 0.16)
      const shade = colour.clone().multiplyScalar(0.8)
      const ro0 = outerAt(Math.max(0, bottom)) - set
      const ro1 = outerAt(top) - set
      const outer = [a0, am, a1].map((a) => [at(ro0, a, bottom), at(ro1, a, top)])
      const inside = [a0, am, a1].map((a) => [at(inner, a, bottom), at(inner, a, top)])
      for (let k = 0; k < 2; k += 1) {
        quad(outer[k][0], outer[k][1], outer[k + 1][1], outer[k + 1][0], colour) // outer face
        quad(inside[k + 1][0], inside[k + 1][1], inside[k][1], inside[k][0], shade) // inner face
        quad(outer[k][1], inside[k][1], inside[k + 1][1], outer[k + 1][1], colour.clone().multiplyScalar(1.06)) // top
      }
      quad(inside[0][0], inside[0][1], outer[0][1], outer[0][0], shade) // ends
      quad(outer[2][0], outer[2][1], inside[2][1], inside[2][0], shade)
    }
  }

  // the water down inside
  const ring = 14
  for (let s = 0; s < ring; s += 1) {
    const a0 = (s / ring) * Math.PI * 2
    const a1 = ((s + 1) / ring) * Math.PI * 2
    b.triangle(v(0, water, 0), at(inner + 0.02, a1, water), at(inner + 0.02, a0, water), WELL_WATER.deep, WELL_WATER.edge, WELL_WATER.edge)
  }

  // two posts standing on the wall, a windlass with its crank, and the rope down to a full bucket
  const postX = (inner + rimRadius) / 2
  for (const side of [-1, 1]) {
    tube(b, [v(side * postX, height - 0.1, 0), v(side * postX, beam + 0.16, 0)], [0.06, 0.05], { segments: 6, base: WOOD.base, tip: WOOD.tip, random, mottle: 0.12 })
  }
  tube(b, [v(-postX - 0.16, beam, 0), v(postX + 0.2, beam, 0)], [0.05, 0.05], { segments: 7, base: WOOD.tip, random, mottle: 0.1 })
  tube(b, [v(-0.2, beam, 0), v(0.28, beam, 0)], [0.085, 0.085], { segments: 8, base: ROPE, random, mottle: 0.16 }) // rope wound on the beam
  tube(b, [v(postX + 0.2, beam, 0), v(postX + 0.2, beam - 0.22, 0), v(postX + 0.4, beam - 0.22, 0)], [0.025, 0.025, 0.025], { segments: 5, base: WOOD.base }) // crank
  const bucketTop = 1.02
  tube(b, [v(0.06, beam - 0.08, 0), v(0.06, bucketTop + 0.16, 0)], [0.016, 0.016], { segments: 4, base: ROPE, cap: false })
  // the bucket hangs above the rim, brim-full
  tube(b, [v(0.06, bucketTop, 0), v(0.06, bucketTop - 0.1, 0), v(0.06, bucketTop - 0.13, 0), v(0.06, bucketTop - 0.26, 0)], [0.17, 0.158, 0.162, 0.135], { segments: 10, base: WOOD.tip, tip: WOOD.base, random, mottle: 0.1 })
  for (let s = 0; s < 10; s += 1) {
    const a0 = (s / 10) * Math.PI * 2
    const a1 = ((s + 1) / 10) * Math.PI * 2
    const c = v(0.06, bucketTop - 0.015, 0)
    b.triangle(c, c.clone().add(at(0.155, a1, 0)), c.clone().add(at(0.155, a0, 0)), linear('#4f9bb8'), WELL_WATER.edge, WELL_WATER.edge)
  }
  // handle: an arc from brim to brim over the knot
  tube(b, bezier(v(-0.1, bucketTop, 0), v(0.06, bucketTop + 0.3, 0), v(0.22, bucketTop, 0), 6), [0.012, 0.012, 0.012, 0.012, 0.012, 0.012, 0.012], { segments: 4, base: MORTAR, cap: false })
  return finish(b)
}

/* ------------------------------------------------------------------ resting camel */

/** A dromedary lying down with its legs folded under it, head up; it faces +z. */
export const CAMEL = Object.freeze({ length: 3.2, humpTop: 1.55, headTop: 2.05 })

const FUR = { light: linear('#dcb882'), mid: linear('#c59759'), dark: linear('#9c7340'), tuft: linear('#8a6234'), pad: linear('#6f5131'), eye: linear('#1c1410') }

export function createCamelGeometry(seed = 31) {
  const random = mulberry32(seed)
  const b = createBuilder()
  const fur = (center, radius, scale, { light = FUR.light, dark = FUR.dark, detail = 2, lumpy = 0.04 } = {}) => blob(b, center, radius, scale, { detail, random, light, dark, lumpy })

  // barrel, shoulders, haunches and the single hump
  fur(v(0, 0.68, -0.05), 1, [0.56, 0.54, 1.08])
  fur(v(0, 0.74, 0.66), 0.5, [0.98, 1.0, 0.95], { lumpy: 0.02 })
  fur(v(0, 0.66, -0.7), 0.52, [1.0, 0.98, 0.95], { lumpy: 0.02 })
  fur(v(0, 1.08, -0.12), 0.46, [0.82, 0.92, 1.12], { light: FUR.mid, dark: FUR.mid, lumpy: 0.07 })
  fur(v(0, 1.36, -0.14), 0.2, [0.9, 0.7, 1.2], { light: FUR.tuft, dark: FUR.dark, detail: 1, lumpy: 0.12 })

  // neck: forward from the chest, then up in a long curve
  const neck = cubic(v(0, 0.82, 0.92), v(0, 0.72, 1.5), v(0, 1.3, 1.72), v(0, 1.8, 1.5), 9)
  tube(b, neck, [0.27, 0.25, 0.22, 0.195, 0.175, 0.16, 0.15, 0.142, 0.136, 0.13], { segments: 9, base: FUR.mid, tip: FUR.light, random, mottle: 0.05 })
  // head: a long skull, a soft muzzle, small ears, dark eyes
  fur(v(0, 1.84, 1.62), 0.2, [0.78, 0.82, 1.4], { detail: 1, lumpy: 0.03 })
  fur(v(0, 1.77, 1.88), 0.13, [0.9, 0.85, 1.15], { light: FUR.mid, dark: FUR.dark, detail: 1, lumpy: 0.03 })
  for (const side of [-1, 1]) {
    leaf(b, v(side * 0.11, 1.95, 1.5), v(side * 0.6, 1, -0.4), 0.11, 0.04, FUR.mid, FUR.dark, { droop: 0 })
    blob(b, v(side * 0.135, 1.89, 1.72), 0.034, [0.6, 1, 1], { detail: 0, random, light: FUR.eye, dark: FUR.eye, lumpy: 0 })
  }

  for (const side of [-1, 1]) {
    // front leg: folded at the knee, the shin tucked back along the body
    const knee = v(side * 0.36, 0.15, 1.28)
    tube(b, [v(side * 0.34, 0.5, 0.72), v(side * 0.36, 0.3, 1.02), knee], [0.14, 0.12, 0.1], { segments: 6, base: FUR.mid, random, mottle: 0.05 })
    tube(b, [knee, v(side * 0.42, 0.1, 0.92), v(side * 0.46, 0.09, 0.52)], [0.1, 0.085, 0.075], { segments: 6, base: FUR.mid, tip: FUR.dark, random, mottle: 0.05 })
    fur(knee, 0.115, [1, 0.9, 1], { light: FUR.pad, dark: FUR.pad, detail: 1, lumpy: 0 })
    fur(v(side * 0.47, 0.07, 0.44), 0.1, [0.95, 0.6, 1.25], { light: FUR.pad, dark: FUR.pad, detail: 1, lumpy: 0 })
    // hind leg: the thigh lies along the flank, the hock behind, the foot forward again
    fur(v(side * 0.4, 0.42, -0.55), 0.36, [0.6, 0.95, 1.15], { detail: 1 })
    const hock = v(side * 0.5, 0.14, -1.0)
    tube(b, [v(side * 0.46, 0.3, -0.5), hock], [0.12, 0.09], { segments: 6, base: FUR.mid, random, mottle: 0.05 })
    tube(b, [hock, v(side * 0.54, 0.09, -0.6), v(side * 0.56, 0.08, -0.22)], [0.09, 0.078, 0.072], { segments: 6, base: FUR.mid, tip: FUR.dark, random, mottle: 0.05 })
    fur(v(side * 0.56, 0.07, -0.14), 0.1, [0.95, 0.6, 1.25], { light: FUR.pad, dark: FUR.pad, detail: 1, lumpy: 0 })
  }
  // tail with a dark tuft
  tube(b, bezier(v(0, 0.86, -1.2), v(0.03, 0.75, -1.42), v(0.08, 0.32, -1.36), 5), [0.055, 0.048, 0.042, 0.036, 0.032, 0.03], { segments: 5, base: FUR.mid, tip: FUR.dark })
  fur(v(0.085, 0.26, -1.35), 0.065, [0.8, 1.5, 0.8], { light: FUR.tuft, dark: FUR.tuft, detail: 0, lumpy: 0 })
  return finish(b)
}

/* ------------------------------------------------------------------ oasis pool */

/**
 * The pool, in the oasis prop's own coordinates (biomes/sahara.js `pool`). Station 3's ring is
 * 2 m east and the well 2 m east and 1.6 m north of the prop: the water and its plants keep
 * clear of both.
 */
export const OASIS = Object.freeze({
  centre: [-0.35, 0.1],
  halfLength: 1.55,
  halfWidth: 1.15,
  shore: 0.75,
  keepClear: [{ x: 2, z: -1.2, r: 1.1 }, { x: 2, z: 1.6, r: 1.25 }],
})

/** Distance from the pool's centre to the water's edge in direction `angle`. */
export function oasisShoreAt(angle) {
  const ellipse = 1 / Math.hypot(Math.cos(angle) / OASIS.halfLength, Math.sin(angle) / OASIS.halfWidth)
  return ellipse * (1 + 0.1 * Math.sin(angle * 2 + 0.6) + 0.07 * Math.sin(angle * 3 + 2.1) + 0.04 * Math.sin(angle * 5 + 0.3))
}

const POOL = { deep: linear('#1b6f8c'), mid: linear('#2f8fa6'), shallow: linear('#79bdb3') }
const DAMP = { wet: linear('#6a5234'), moss: linear('#73703c'), dry: linear('#c9a46f') }
const POOL_SECTORS = 48

/** The water: deep blue in the middle, pale turquoise where it shallows at the edge. */
export function createOasisWaterGeometry() {
  const positions = [OASIS.centre[0], 0.03, OASIS.centre[1]]
  const colors = [POOL.deep.r, POOL.deep.g, POOL.deep.b]
  const indices = []
  const rings = [[0.5, POOL.deep], [0.82, POOL.mid], [1, POOL.shallow]]
  for (let s = 0; s < POOL_SECTORS; s += 1) {
    const a = (s / POOL_SECTORS) * Math.PI * 2
    const r = oasisShoreAt(a)
    for (const [f, c] of rings) {
      positions.push(OASIS.centre[0] + Math.cos(a) * r * f, 0.03, OASIS.centre[1] + Math.sin(a) * r * f)
      colors.push(c.r, c.g, c.b)
    }
  }
  const n = rings.length
  for (let s = 0; s < POOL_SECTORS; s += 1) {
    const here = 1 + s * n
    const next = 1 + ((s + 1) % POOL_SECTORS) * n
    indices.push(0, next, here)
    for (let k = 0; k < n - 1; k += 1) indices.push(here + k, next + k, next + k + 1, here + k, next + k + 1, here + k + 1)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** The shore: dark wet sand at the water, a mossy band, fading out into the dry plain (RGBA). */
export function createOasisShoreGeometry() {
  const positions = []
  const colors = []
  const indices = []
  // [metres from the water's edge, colour, opacity]
  const section = [[-0.12, DAMP.wet, 1], [0.1, DAMP.wet, 0.95], [0.32, DAMP.moss, 0.7], [OASIS.shore, DAMP.dry, 0]]
  for (let s = 0; s < POOL_SECTORS; s += 1) {
    const a = (s / POOL_SECTORS) * Math.PI * 2
    const r = oasisShoreAt(a)
    const wander = 1 + 0.25 * Math.sin(a * 4 + 1.1) + 0.15 * Math.sin(a * 7 + 0.4)
    for (const [offset, c, opacity] of section) {
      const d = r + (offset > 0 ? offset * wander : offset)
      positions.push(OASIS.centre[0] + Math.cos(a) * d, 0.02, OASIS.centre[1] + Math.sin(a) * d)
      colors.push(c.r, c.g, c.b, opacity)
    }
  }
  const n = section.length
  for (let s = 0; s < POOL_SECTORS; s += 1) {
    const here = s * n
    const next = ((s + 1) % POOL_SECTORS) * n
    for (let k = 0; k < n - 1; k += 1) indices.push(here + k, next + k, next + k + 1, here + k, next + k + 1, here + k + 1)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 4))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const GRASS = { base: linear('#3d6a2a'), tip: linear('#8fae4d'), reed: linear('#5f8a3a'), reedTip: linear('#b9b46a') }

/** Where the oasis plants grow: [{ x, z, reed }] round the shore, clear of the station and the well. */
export function oasisPlantSpots(seed = 512) {
  const random = mulberry32(seed)
  const spots = []
  for (let i = 0; i < 46; i += 1) {
    const a = (i / 46) * Math.PI * 2 + (random() - 0.5) * 0.1
    const reed = i % 4 === 0
    const d = oasisShoreAt(a) + (reed ? 0.02 + random() * 0.1 : 0.12 + random() * 0.55)
    const x = OASIS.centre[0] + Math.cos(a) * d
    const z = OASIS.centre[1] + Math.sin(a) * d
    if (OASIS.keepClear.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue
    spots.push({ x, z, reed })
  }
  return spots
}

/** Grass tufts and taller reeds at the water's edge: the green of the oasis. */
export function createOasisPlantsGeometry(seed = 512) {
  const random = mulberry32(seed ^ 0x9e3779b9)
  const b = createBuilder()
  for (const spot of oasisPlantSpots(seed)) {
    const blades = spot.reed ? 6 : 5 + Math.floor(random() * 3)
    for (let k = 0; k < blades; k += 1) {
      const a = random() * Math.PI * 2
      const splay = spot.reed ? 0.12 + random() * 0.14 : 0.3 + random() * 0.5
      const base = v(spot.x + Math.cos(a) * 0.05, 0.01, spot.z + Math.sin(a) * 0.05)
      const dir = v(Math.cos(a) * splay, 1, Math.sin(a) * splay)
      if (spot.reed) leaf(b, base, dir, 0.5 + random() * 0.4, 0.03, GRASS.reed, GRASS.reedTip, { droop: 0.12, fold: 0.1, curl: 0.1, roll: random() * 3 })
      else leaf(b, base, dir, 0.2 + random() * 0.22, 0.035, GRASS.base, GRASS.tip, { droop: 0.25, fold: 0.15, curl: 0.1, roll: random() * 3 })
    }
  }
  return b.build()
}

/* ------------------------------------------------------------------ dry river bed */

/**
 * The dry bed, in the prop's own coordinates (it is turned by `rot`): z runs along the valley.
 * Station 5 stands at about (1.8, 0) and its timeline board at about (3.6, -0.9): the bed winds
 * past them on the far side.
 */
export const DRY_RIVER = Object.freeze({
  course: [[0.75, -6.2], [0.05, -4.65], [-0.8, -3.1], [-0.35, -1.55], [-0.85, 0], [-0.25, 1.55], [0.7, 3.1], [0.3, 4.65], [1.0, 6.2]],
  halfWidth: 0.72,
  bank: 0.42,
  steps: 44,
  keepClear: [{ x: 1.8, z: 0.02, r: 1.15 }, { x: 3.64, z: -0.9, r: 0.6 }],
})

const BED = { clay: linear('#c2ab85'), edge: linear('#a68a62'), bank: linear('#8a6e4c') }
const swell = (x, z) => Math.sin(x * 2.3 + z * 1.1) * 0.5 + Math.sin(x * 0.9 - z * 2.7) * 0.5

/**
 * Centre, unit normal and half-width of the bed at t (0..1 along it). `reach(offset)` pulls an
 * offset from the centre line in, on the inside of a bend, so the bank never folds over itself.
 */
export function dryRiverAt(t) {
  const [x, z] = along(DRY_RIVER.course, t)
  const [ax, az] = along(DRY_RIVER.course, Math.min(1, t + 0.01))
  const [bx, bz] = along(DRY_RIVER.course, Math.max(0, t - 0.01))
  const length = Math.hypot(ax - bx, az - bz) || 1
  const nx = (az - bz) / length
  const nz = -(ax - bx) / length
  // the circle through the three samples: its radius, and which side its centre is on
  const cross = (x - bx) * (az - z) - (z - bz) * (ax - x)
  const radius = Math.abs(cross) < 1e-9 ? Infinity : (Math.hypot(x - bx, z - bz) * Math.hypot(ax - x, az - z) * length) / (2 * Math.abs(cross))
  const inside = Math.sign(((ax + bx) / 2 - x) * nx + ((az + bz) / 2 - z) * nz)
  const reach = (offset) => (offset * inside > 0 ? inside * Math.min(Math.abs(offset), radius * 0.6) : offset)
  return { x, z, nx, nz, half: DRY_RIVER.halfWidth * (1 + swell(x, z) * 0.22), reach }
}

/**
 * The bed: pale, cracked clay between darker banks whose outer edges fade into the valley floor
 * (RGBA vertex colours; `uv` carries the crack pattern at one repeat per 1.3 m).
 */
export function createDryRiverGeometry() {
  const positions = []
  const colors = []
  const uvs = []
  const indices = []
  // [offset in half-widths, offset in bank widths, colour, opacity]
  const section = [[-1, -1, BED.bank, 0], [-1, -0.3, BED.bank, 0.85], [-1, 0, BED.edge, 1], [-0.5, 0, BED.clay, 1], [0.5, 0, BED.clay, 1], [1, 0, BED.edge, 1], [1, 0.3, BED.bank, 0.85], [1, 1, BED.bank, 0]]
  const { steps, bank } = DRY_RIVER
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const { x, z, nx, nz, half, reach } = dryRiverAt(t)
    const fade = smooth(Math.min(t, 1 - t) / 0.14)
    for (const [w, k, c, opacity] of section) {
      const offset = reach(w * half + k * bank * (1 + swell(z, x + w) * 0.2))
      const px = x + nx * offset
      const pz = z + nz * offset
      positions.push(px, 0, pz)
      const tone = 1 + swell(px * 1.7, pz * 1.7) * 0.05
      colors.push(c.r * tone, c.g * tone, c.b * tone, opacity * fade)
      uvs.push(px / 1.3, pz / 1.3)
    }
    if (i > 0) {
      const row = i * section.length
      const before = row - section.length
      for (let k = 0; k < section.length - 1; k += 1) indices.push(before + k, row + k, before + k + 1, before + k + 1, row + k, row + k + 1) // facing up
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 4))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  // flat on the valley floor: every normal is straight up (also where a clamped bank has no area)
  geometry.setAttribute('normal', new Float32BufferAttribute(positions.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3))
  geometry.setIndex(indices)
  return geometry
}

const PEBBLE = [linear('#9b8b74'), linear('#b3a184'), linear('#857663'), linear('#a6906c')]

/** Where the water-worn pebbles lie: [{ x, z, r }] along both banks, thinning towards the ends. */
export function dryRiverPebbles(seed = 905) {
  const random = mulberry32(seed)
  const pebbles = []
  for (let i = 0; i < 96; i += 1) {
    const t = 0.05 + random() * 0.9
    const side = random() < 0.5 ? -1 : 1
    const { x, z, nx, nz, half } = dryRiverAt(t)
    // most lie along the banks; a few were left out on the bed
    const offset = random() < 0.82 ? side * (half + (random() - 0.35) * 0.4) : (random() - 0.5) * half * 1.4
    const r = 0.05 + random() ** 2 * 0.14
    const px = x + nx * offset
    const pz = z + nz * offset
    if (DRY_RIVER.keepClear.some((c) => Math.hypot(px - c.x, pz - c.z) < c.r)) continue
    pebbles.push({ x: px, z: pz, r })
  }
  return pebbles
}

/** The pebbles: smooth, flattened stones, greyer than the desert's own broken rock. */
export function createDryRiverPebblesGeometry(seed = 905) {
  const random = mulberry32(seed ^ 0x51ed270b)
  const b = createBuilder()
  for (const pebble of dryRiverPebbles(seed)) {
    const colour = PEBBLE[Math.floor(random() * PEBBLE.length)]
    const wide = 0.9 + random() * 0.5
    blob(b, v(pebble.x, pebble.r * 0.3, pebble.z), pebble.r, [wide, 0.55, 2 - wide], { detail: pebble.r > 0.11 ? 1 : 0, random, light: colour, dark: colour.clone().multiplyScalar(0.62), lumpy: 0.05 })
  }
  return finish(b)
}

/**
 * The crack pattern of dried clay as greyscale rows (1 = clay, lower = a crack), `size` square
 * and tileable: plates are the cells of scattered points, cracks the lines between them.
 */
export function crackPattern(size = 128, cells = 26, seed = 4711) {
  const random = mulberry32(seed)
  const points = Array.from({ length: cells }, () => [random(), random(), 0.93 + random() * 0.07])
  const out = new Float32Array(size * size)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let first = Infinity
      let second = Infinity
      let tone = 1
      for (const [px, pz, shade] of points) {
        let dx = Math.abs(x / size - px)
        let dz = Math.abs(y / size - pz)
        if (dx > 0.5) dx = 1 - dx
        if (dz > 0.5) dz = 1 - dz
        const d = Math.hypot(dx, dz)
        if (d < first) { second = first; first = d; tone = shade } else if (d < second) second = d
      }
      const gap = second - first
      out[y * size + x] = gap < 0.012 ? 0.5 : gap < 0.026 ? 0.5 + (gap - 0.012) / 0.014 * (tone - 0.5) : tone
    }
  }
  return out
}
