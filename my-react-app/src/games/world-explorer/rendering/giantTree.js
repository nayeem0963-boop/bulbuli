/**
 * The Amazon station's giant tree (biomes/amazon.js `giantTree`), as one asset-free mesh with
 * per-vertex colours: a buttressed, tapering trunk, curved limbs and a broad, lumpy crown in
 * layered greens with leaf tufts, so it belongs to the same forest as the generated trees
 * (amazonTrees.js) instead of a cylinder topped with smooth balls.
 *
 * It keeps the old proportions exactly, because the map is built around them: the trunk is 12 m
 * tall, 1.2 m wide at the base and 0.8 m at the top (the physics trunk collider and the spiral
 * stair of branch steps st1–st6 wrap it), and the five crown masses sit where they always did.
 * Deterministic (seeded); smooth-shaded by welding shared corners.
 */
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mulberry32 } from '../../../core/rng.js'
import { blob, createBuilder, cubic, leaf, linear, tube, v } from './mangroveGeometry.js'

export const GIANT_TREE = Object.freeze({
  height: 12,
  baseRadius: 1.2,
  topRadius: 0.8,
  // [x, y offset, z, sx, sy, sz] of each crown mass, around (0, height + 0.6, 0); radius 3.2
  crowns: [
    [0, 0, 0, 1.25, 0.78, 1.2],
    [-2.4, -0.4, 0.4, 0.75, 0.72, 0.82],
    [2.1, -0.3, -0.2, 0.78, 0.76, 0.8],
    [-0.3, -0.15, 2.0, 0.8, 0.7, 0.82],
    [0.6, -0.5, -2.0, 0.74, 0.72, 0.78],
  ],
  crownRadius: 3.2,
})

const BARK = { base: linear('#4f3a27'), tip: linear('#6e5238'), lichen: linear('#8b8a6c') }
const LEAF_DARK = linear('#1f4a26')
const LEAF_MID = linear('#2f6a33')
const LEAF_LIGHT = linear('#5b8f3e')
const LEAF_SUN = linear('#86ad4f')

export function createGiantTreeGeometry(seed = 4242) {
  const random = mulberry32(seed)
  const b = createBuilder()
  const { height: h, baseRadius, topRadius, crownRadius } = GIANT_TREE

  // trunk: flared at the foot, a gentle lean and wobble, faceted bark with lichen flecks
  const steps = 14
  const path = []
  const radii = []
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const y = -0.25 + t * (h + 0.5)
    path.push(v(Math.sin(t * 2.1) * 0.12, y, Math.cos(t * 1.7) * 0.1 - 0.05))
    const flare = (1 - Math.min(1, t / 0.14)) ** 2 * 0.55
    radii.push(baseRadius + (topRadius - baseRadius) * t + flare)
  }
  tube(b, path, radii, { segments: 14, base: BARK.base, tip: BARK.tip, random, noise: 0.08, mottle: 0.14, lichen: BARK.lichen, twist: 0.05 })

  // buttress roots: thin fins running out and down; kept low and short so the first branch step
  // (0.65–1.0 m up, ~3 m out) stays clear
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + 0.3 + random() * 0.25
    const out = v(Math.cos(a), 0, Math.sin(a))
    const top = path[0].clone().addScaledVector(out, baseRadius * 0.82).add(v(0, 1.7 + random() * 0.5, 0))
    const foot = path[0].clone().addScaledVector(out, baseRadius + 0.75 + random() * 0.35).add(v(0, -0.15, 0))
    const mid = top.clone().lerp(foot, 0.5).addScaledVector(out, 0.18).add(v(0, -0.25, 0))
    tube(b, cubic(top, top.clone().lerp(mid, 0.6), mid, foot, 6), [0.3, 0.27, 0.23, 0.19, 0.15, 0.12, 0.08], { segments: 5, base: BARK.base, tip: BARK.base.clone().multiplyScalar(0.85), random, noise: 0.06 })
  }

  // limbs from the upper trunk to each crown mass
  const crownCenters = GIANT_TREE.crowns.map(([x, y, z, sx, sy, sz]) => ({ c: v(x, h + 0.6 + y, z), s: [sx, sy, sz] }))
  for (const { c } of crownCenters.slice(1)) {
    const start = v(0, h - 1.6 - random() * 0.8, 0)
    const dir = c.clone().sub(start)
    const end = start.clone().addScaledVector(dir, 0.82)
    const c1 = start.clone().addScaledVector(dir, 0.3).add(v(0, 0.6, 0))
    const c2 = start.clone().addScaledVector(dir, 0.62).add(v(0, 0.9, 0))
    tube(b, cubic(start, c1, c2, end, 6), [0.42, 0.36, 0.3, 0.24, 0.19, 0.15, 0.11], { segments: 6, base: BARK.base, tip: BARK.tip, random, noise: 0.06 })
  }

  // crown: each mass is a lumpy core plus smaller lobes round its upper rim, shaded darker
  // underneath and lighter on top, ringed by leaf tufts so the outline reads leafy
  for (const [index, { c, s }] of crownCenters.entries()) {
    const r = crownRadius
    const tone = 0.85 + random() * 0.3
    blob(b, c, r * 0.86, s, { detail: 2, random, light: LEAF_LIGHT.clone().multiplyScalar(tone), dark: LEAF_DARK, lumpy: 0.2 })
    const lobes = index === 0 ? 7 : 4
    for (let k = 0; k < lobes; k += 1) {
      const a = (k / lobes) * Math.PI * 2 + random() * 0.6
      const up = 0.15 + random() * 0.45
      const ring = Math.sqrt(1 - up * up)
      const p = v(c.x + Math.cos(a) * ring * r * s[0] * 0.62, c.y + up * r * s[1] * 0.7, c.z + Math.sin(a) * ring * r * s[2] * 0.62)
      blob(b, p, r * (0.34 + random() * 0.12), [1.1, 0.8, 1.1], { detail: 1, random, light: LEAF_MID.clone().lerp(LEAF_SUN, 0.35 + random() * 0.3), dark: LEAF_DARK.clone().lerp(LEAF_MID, 0.4), lumpy: 0.24 })
    }
    const tufts = index === 0 ? 22 : 12
    for (let k = 0; k < tufts; k += 1) {
      const a = (k / tufts) * Math.PI * 2 + random() * 0.5
      const up = -0.1 + random() * 0.8
      const ring = Math.sqrt(Math.max(0, 1 - up * up))
      const p = v(c.x + Math.cos(a) * ring * r * s[0] * 0.78, c.y + up * r * s[1] * 0.72, c.z + Math.sin(a) * ring * r * s[2] * 0.78)
      const dir = v(Math.cos(a), 0.25 + up * 0.6, Math.sin(a))
      const tip = random() < 0.35 ? LEAF_SUN : LEAF_LIGHT
      leaf(b, p, dir, 0.9 + random() * 0.5, 0.42, LEAF_MID, tip, { droop: 0.18 })
    }
  }

  const geometry = b.build()
  geometry.deleteAttribute('normal')
  const welded = mergeVertices(geometry, 1e-4)
  welded.computeVertexNormals()
  welded.computeBoundingSphere()
  welded.computeBoundingBox()
  geometry.dispose()
  return welded
}
