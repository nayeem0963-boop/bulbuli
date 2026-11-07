/**
 * Procedural Sundarbans mangrove trees: stylised low-poly, asset-free, deterministic.
 *
 * Every tree is built from five layers, all merged into ONE vertex-coloured geometry:
 *   1. trunk     irregular, curved, faceted bark tube with a flared base and mottled colour
 *   2. roots     the mangrove signature: arching (often branching) prop/stilt roots, buttress
 *                flares, snaking surface roots and aerial drop roots, each sunk into a small mud
 *                collar so it visibly enters the ground
 *   3. limbs     branches grown from the trunk, splitting into twigs
 *   4. foliage   leaf clusters at branch and twig tips: a small dark inner mass covered by
 *                individual folded leaf blades (darker inside, lighter olive/fresh outside, rare
 *                yellow-green highlights)
 *   5. variation several seeded "forms" per family (height, lean, limb layout, root spread)
 *
 * Families (stylised interpretations, not botanical reconstructions):
 *   sundari  Heritiera fomes: tall mature tree, buttressed base, broad layered (tiered) crown
 *   gewa     Excoecaria agallocha: low fork into 2–3 leaning stems, dense rounded yellow-green crown
 *   goran    Ceriops decandra: short multi-stemmed shrub on many thin stilt roots, small dense leaves
 *   garjan   Rhizophora: trunk raised on tiers of branching arched prop roots, glossy broad leaves
 *   keora    Sonneratia apetala: tall pale slender trunk, drooping grey-green leaf clusters
 *
 * Levels of detail: 'near' (full), 'mid' (fewer leaves/roots, coarser tubes) and a separate,
 * very cheap far-forest canopy (buildFarMangrove).
 */
import { IcosahedronGeometry } from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mulberry32 } from '../../../core/rng.js'
import { createBuilder, cubic, leaf, linear, tube, v } from './mangroveGeometry.js'
import { FAR_FORM_OF, MANGROVE_FORMS, MANGROVE_SPECIES } from './mangroveForms.js'

export { FAR_FORM_OF, MANGROVE_FORMS, MANGROVE_SPECIES }

const TAU = Math.PI * 2
const GOLDEN = 2.39996

/* ---------------------------------------------------------------- palettes */

const bark = (base, tip, lichen) => ({ base: linear(base), tip: linear(tip), lichen: linear(lichen) })
const BARK = {
  sundari: bark('#3e3128', '#5f4d3d', '#7f786a'),
  gewa: bark('#4d3e31', '#76634e', '#8c8471'),
  goran: bark('#4b3c30', '#705d48', '#857b69'),
  garjan: bark('#4a3a2d', '#6d5944', '#80766a'),
  keora: bark('#615a50', '#8f887b', '#a49d8e'),
}
/**
 * Roots: a weathered, slightly grey bark (lighter and greyer than the trunks and the reddish mud,
 * so they read against the ground), darkening to a mud-stained tone where they enter it.
 */
const ROOT = { top: linear('#8b7c65'), bottom: linear('#5f5141'), mud: linear('#4a3d30'), wet: linear('#5a4c3d') }

const leaves = (inner, main, outer, hi) => ({ inner: linear(inner), main: linear(main), outer: linear(outer), hi: linear(hi) })
const LEAF = {
  sundari: leaves('#2b4c31', '#44713f', '#6c9050', '#9cad64'),
  gewa: leaves('#34512b', '#557a37', '#80a043', '#b2b858'),
  goran: leaves('#304f2a', '#4d7634', '#739a43', '#a3b754'),
  garjan: leaves('#26482d', '#3a6d3e', '#56904a', '#86ad57'),
  keora: leaves('#3c5940', '#5c7c5d', '#83a07b', '#a7b98e'),
}
const FOLIAGE_DEEP = linear('#2e522b')
const FOLIAGE_SUNLIT = linear('#7ca942')

function varyFoliageColor(color, rng) {
  const hsl = {}
  color.getHSL(hsl)
  return color.clone().setHSL(
    (hsl.h + (rng() - 0.5) * 0.06 + 1) % 1,
    Math.max(0, Math.min(1, hsl.s + (rng() - 0.5) * 0.2)),
    Math.max(0, Math.min(1, hsl.l + (rng() - 0.5) * 0.16)),
  )
}

/* ---------------------------------------------------------------- organic crown masses */

/**
 * A seeded generator from a position. Crown variation draws from this instead of the tree's own
 * stream, so the trunk, limbs and roots of every form stay exactly as they were.
 */
function positionRng(p, salt = 0) {
  const q = (n) => Math.round(n * 1000)
  return mulberry32((Math.imul(q(p.x), 73856093) ^ Math.imul(q(p.y), 19349663) ^ Math.imul(q(p.z), 83492791) ^ salt) >>> 0)
}

const ICO_CACHE = new Map()
function icosahedron(detail) {
  if (!ICO_CACHE.has(detail)) ICO_CACHE.set(detail, new IcosahedronGeometry(1, detail).getAttribute('position'))
  return ICO_CACHE.get(detail)
}

/** Deterministic -1..1 from a unit-sphere corner, identical for every face sharing that corner. */
function cornerNoise(x, y, z, phase) {
  const s = Math.sin(x * 91.7 + y * 47.3 + z * 63.1 + phase * 3.1) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}

/** Shifts a colour's tone slightly (hue towards olive or blue-green, lightness up or down). */
function shiftTone(color, rng, { hue = 0.025, light = 0.07, sat = 0.08 } = {}) {
  const hsl = {}
  color.getHSL(hsl)
  return color.clone().setHSL(
    (hsl.h + (rng() - 0.5) * 2 * hue + 1) % 1,
    Math.max(0, Math.min(1, hsl.s + (rng() - 0.5) * 2 * sat)),
    Math.max(0, Math.min(1, hsl.l + (rng() - 0.5) * 2 * light)),
  )
}

/**
 * A leafy crown mass. Same triangle count as the old evenly lumped blob, but every mass gets its
 * own proportions, turn, corner displacement and tone, and a flatter underside, so neighbouring
 * masses no longer read as copies of one geometric block.
 */
function crownMass(builder, center, radius, scale, { detail = 0, phase = 0, light, dark, lumpy = 0.3 }) {
  const rng = positionRng(center, 0x51)
  const sx = scale[0] * (0.82 + rng() * 0.4)
  const sy = scale[1] * (0.8 + rng() * 0.32)
  const sz = scale[2] * (0.82 + rng() * 0.4)
  const yaw = rng() * TAU
  const cy = Math.cos(yaw)
  const syaw = Math.sin(yaw)
  // a slight tilt, so stacked masses (sundari tiers) never lie in perfectly parallel plates
  const tiltX = (rng() - 0.5) * 0.4
  const tiltZ = (rng() - 0.5) * 0.4
  const lit = shiftTone(light, rng)
  const shadow = shiftTone(dark, rng, { light: 0.05 })
  const position = icosahedron(detail)
  const corners = []
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const bump = 1
      + Math.sin(x * 4.1 + phase) * Math.cos(z * 3.7 - phase) * lumpy
      + Math.sin(y * 5.3 + phase * 0.7) * lumpy * 0.5
      + cornerNoise(x, y, z, phase) * 0.17
    // a domed top and a softly flattened underside, as a leafy crown hangs
    const profile = y > 0.3 ? 1.12 : y < -0.35 ? 0.8 : 1
    let lx = x * radius * sx * bump
    let ly = y * radius * sy * bump * profile
    let lz = z * radius * sz * bump
    ;[ly, lz] = [ly - lz * tiltX, lz + ly * tiltX]
    ;[lx, ly] = [lx - ly * tiltZ, ly + lx * tiltZ]
    corners.push(v(center.x + lx * cy - lz * syaw, center.y + ly, center.z + lx * syaw + lz * cy))
  }
  const shade = (p) => {
    const t = Math.max(0, Math.min(1, (p.y - center.y) / (radius * sy) * 0.5 + 0.5))
    return shadow.clone().lerp(lit, t * t)
  }
  for (let i = 0; i < corners.length; i += 3) builder.triangle(corners[i], corners[i + 1], corners[i + 2], shade(corners[i]), shade(corners[i + 1]), shade(corners[i + 2]))
}

/** Clusters of the tree being built, so gaps between them can be bridged (see bridgeCrown). */
let crownLog = null

/**
 * Joins neighbouring leaf clusters that sit apart with a lower, darker mass between them, so a
 * crown reads as one irregular canopy with depth instead of separate floating blocks. Paid for by
 * the hidden inner leaves that cluster() no longer emits, so tree triangle budgets hold.
 */
function bridgeCrown(builder, clusters, { max, detail }) {
  const pairs = []
  for (let i = 0; i < clusters.length; i += 1) {
    let best = null
    for (let j = 0; j < clusters.length; j += 1) {
      if (i === j) continue
      const a = clusters[i]
      const b = clusters[j]
      const d = a.center.distanceTo(b.center)
      const reach = a.r + b.r
      if (d < reach * 0.62 || d > reach * 1.9) continue
      if (!best || d < best.d) best = { i, j, d }
    }
    if (best && best.i < best.j) pairs.push(best)
  }
  // the widest gaps first: those are what break a crown into blocks
  pairs.sort((p, q) => (q.d / (clusters[q.i].r + clusters[q.j].r)) - (p.d / (clusters[p.i].r + clusters[p.j].r)))
  for (const { i, j } of pairs.slice(0, max)) {
    const a = clusters[i]
    const b = clusters[j]
    const mid = a.center.clone().lerp(b.center, b.r / (a.r + b.r)).add(v(0, -0.12 * (a.r + b.r), 0))
    const rng = positionRng(mid, 0xb7)
    const pal = a.pal
    const lit = Math.max(0, Math.min(1, 0.4 + (a.shade + b.shade) * 0.5))
    crownMass(builder, mid, (a.r + b.r) * (0.36 + rng() * 0.08), [1.25, 0.72, 1.1], {
      detail,
      phase: rng() * 10,
      light: pal.inner.clone().lerp(pal.main, 0.25 + lit * 0.35),
      dark: pal.inner.clone().multiplyScalar(0.78).lerp(FOLIAGE_DEEP, 0.25),
      lumpy: 0.32,
    })
  }
}

/* ---------------------------------------------------------------- levels of detail */

/*
 * Foliage reads at gameplay distance (3–30 m from the follow camera), not at arm's length: each
 * cluster has a soft leafy core (`mass`, a lumpy volume in the cluster's shaded
 * colours) so crowns look full and connected instead of a speckle on bare limbs, and fewer,
 * larger leaf blades break up its outline. The triangle count stays inside the same budgets.
 */
const LOD = {
  near: { seg: 6, small: 4, steps: 6, leaves: 0.5, leafSize: 2.3, mass: 0.76, massDetailFrom: 0.9, crown: 1, roots: 1, subRoots: true, surface: true, collar: true, twigs: true, noise: 0.24 },
  // Mid LOD uses fewer clusters, larger blades and a fuller core (seen from further away).
  mid: { seg: 4, small: 3, steps: 3, leaves: 0.09, leafSize: 2.6, mass: 0.88, crown: 1.4, roots: 0.6, subRoots: false, surface: false, collar: false, twigs: false, noise: 0.16 },
}

/* ---------------------------------------------------------------- trunk */

/**
 * A curved, leaning trunk with a flared base. Rings crowd towards the base so the flare and
 * root junction stay smooth. Returns the path, radii and a lookup of point + radius at height y.
 */
function makeTrunk(rng, { height, steps, r0, rTop, lean, leanAngle, wobble, flare = 0, startY = -0.12 }) {
  const path = []
  const radii = []
  let wx = 0
  let wz = 0
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) ** 1.25
    if (i > 0) {
      wx += (rng() - 0.5) * wobble
      wz += (rng() - 0.5) * wobble
    }
    const l = lean * t ** 1.5
    path.push(v(Math.cos(leanAngle) * l + wx * t, startY + (height - startY) * t, Math.sin(leanAngle) * l + wz * t))
    radii.push(r0 + (rTop - r0) * t ** 0.85 + flare * r0 * Math.exp(-t * 9))
  }
  const at = (y) => {
    for (let i = 1; i < path.length; i += 1) {
      if (y <= path[i].y || i === path.length - 1) {
        const span = path[i].y - path[i - 1].y || 1
        const f = Math.max(0, Math.min(1, (y - path[i - 1].y) / span))
        return { point: path[i - 1].clone().lerp(path[i], f), radius: radii[i - 1] + (radii[i] - radii[i - 1]) * f }
      }
    }
    return { point: path[path.length - 1].clone(), radius: radii[radii.length - 1] }
  }
  return { path, radii, at, top: path[path.length - 1] }
}

function drawBark(builder, rng, path, radii, colors, L, segments, twist = 0.16) {
  tube(builder, path, radii, { segments, base: colors.base, tip: colors.tip, random: rng, noise: L.noise, mottle: 0.2, lichen: colors.lichen, twist })
}

/* ---------------------------------------------------------------- roots */

/** Root directions around the trunk: irregular spacing, and often an open sector. */
function spreadAngles(rng, count) {
  const base = rng() * TAU
  const span = rng() < 0.5 ? TAU * (0.68 + rng() * 0.2) : TAU
  return Array.from({ length: count }, (_, i) => base + (i + 0.5 + (rng() - 0.5) * 0.85) * (span / Math.max(1, count)))
}

/** A low mound of wet mud where a root enters the ground. */
function mudCollar(builder, rng, at, radius) {
  const n = 5
  const peak = v(at.x, 0.05 + radius * 0.2, at.z)
  const ring = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU + rng() * 0.6
    const r = radius * (0.8 + rng() * 0.5)
    return v(at.x + Math.cos(a) * r, -0.03, at.z + Math.sin(a) * r)
  })
  for (let i = 0; i < n; i += 1) builder.triangle(ring[i], peak, ring[(i + 1) % n], ROOT.mud, ROOT.wet, ROOT.mud)
}

/**
 * An arching prop (stilt) root: leaves the trunk at height h, bows outward and plunges into the mud
 * at `reach`. Slightly thinner mid-span and thicker where it anchors. May fork into a sub-root.
 */
function propRoot(builder, rng, L, trunk, { h, angle, reach, radius, arch, branch = 0 }) {
  const anchor = trunk.at(h)
  const dir = v(Math.cos(angle), 0, Math.sin(angle))
  const perp = v(-dir.z, 0, dir.x)
  const start = anchor.point.clone().addScaledVector(dir, anchor.radius * 0.5)
  const end = v(anchor.point.x + dir.x * reach, -0.16, anchor.point.z + dir.z * reach).addScaledVector(perp, (rng() - 0.5) * reach * 0.3)
  const c1 = start.clone().addScaledVector(dir, reach * 0.34).add(v(0, arch, 0)).addScaledVector(perp, (rng() - 0.5) * reach * 0.25)
  const c2 = v(start.x + dir.x * reach * 0.86, h * 0.5 + arch * 0.35, start.z + dir.z * reach * 0.86).addScaledVector(perp, (rng() - 0.5) * reach * 0.25)
  const steps = L.steps
  const path = cubic(start, c1, c2, end, steps)
  // flared where it leaves the trunk, slimmer mid-span, thicker again where it anchors
  const radii = path.map((_, k) => {
    const t = k / steps
    return radius * (1 - 0.32 * t + 0.4 * t ** 4) * (k === 0 ? 1.45 : k === 1 ? 1.15 : 1)
  })
  tube(builder, path, radii, { segments: L.small + (radius > 0.05 ? 1 : 0), base: ROOT.top, tip: ROOT.bottom, cap: false, random: rng, noise: L.noise, mottle: 0.14 })
  if (L.collar) mudCollar(builder, rng, end, radius * 2.8)
  if (branch && L.subRoots) {
    const from = path[Math.max(1, Math.round(steps * (0.42 + rng() * 0.2)))]
    const a2 = angle + (rng() < 0.5 ? -1 : 1) * (0.4 + rng() * 0.5)
    const d2 = v(Math.cos(a2), 0, Math.sin(a2))
    const r2 = reach * (0.35 + rng() * 0.35)
    const end2 = v(from.x + d2.x * r2, -0.16, from.z + d2.z * r2)
    const sub = cubic(
      from,
      from.clone().addScaledVector(d2, r2 * 0.35).add(v(0, arch * 0.3, 0)),
      v(from.x + d2.x * r2 * 0.9, from.y * 0.45, from.z + d2.z * r2 * 0.9),
      end2,
      Math.max(3, steps - 2),
    )
    tube(builder, sub, sub.map((_, k) => radius * 0.68 * (1 - 0.25 * k / sub.length)), { segments: L.small, base: ROOT.top, tip: ROOT.bottom, cap: false, random: rng, noise: L.noise, mottle: 0.14 })
    if (L.collar) mudCollar(builder, rng, end2, radius * 1.8)
  }
}

/** A buttress flare: thick at the trunk, sweeping down and out to a thin tip in the mud. */
function buttress(builder, rng, L, trunk, { h, angle, reach, thickness }) {
  const anchor = trunk.at(h)
  const dir = v(Math.cos(angle), 0, Math.sin(angle))
  const start = anchor.point.clone().addScaledVector(dir, anchor.radius * 0.3)
  const end = v(anchor.point.x + dir.x * reach, -0.1, anchor.point.z + dir.z * reach)
  const path = cubic(start, start.clone().addScaledVector(dir, reach * 0.18).add(v(0, -h * 0.45, 0)), v(start.x + dir.x * reach * 0.6, 0.08, start.z + dir.z * reach * 0.6), end, Math.max(3, L.steps - 2))
  tube(builder, path, path.map((_, k) => thickness * (1 - 0.72 * k / (path.length - 1))), { segments: L.small, base: ROOT.top, tip: ROOT.bottom, cap: false, random: rng, noise: L.noise, mottle: 0.14 })
}

/** A snaking root lying along (and partly sunk into) the mud surface. */
function surfaceRoot(builder, rng, L, trunk, { angle, length, radius }) {
  const base = trunk.at(0.12)
  const steps = 4
  const wiggle = (rng() - 0.5) * 0.9
  const path = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    const a = angle + Math.sin(t * 3.1 + wiggle * 3) * 0.28 * t
    const r = base.radius * 0.6 + length * t
    return v(base.point.x + Math.cos(a) * r, 0.1 - t * 0.17, base.point.z + Math.sin(a) * r)
  })
  tube(builder, path, path.map((_, k) => radius * (1 - 0.6 * k / steps)), { segments: L.small, base: ROOT.top, tip: ROOT.bottom, cap: false, random: rng, noise: L.noise, mottle: 0.14 })
}

/** An aerial root dropping from a branch straight-ish into the mud. */
function dropRoot(builder, rng, L, from, outward, radius) {
  const ground = from.clone().addScaledVector(outward, 0.35 + rng() * 0.35)
  ground.y = -0.16
  const path = cubic(from, from.clone().addScaledVector(outward, 0.15).add(v(0, -from.y * 0.25, 0)), v(ground.x, from.y * 0.35, ground.z), ground, L.steps)
  tube(builder, path, path.map((_, k) => radius * (0.8 + 0.35 * k / L.steps)), { segments: Math.max(3, L.small - 1), base: ROOT.top, tip: ROOT.bottom, cap: false, random: rng, noise: 0.1 })
  if (L.collar) mudCollar(builder, rng, ground, radius * 2.6)
}

/* ---------------------------------------------------------------- limbs and leaves */

/** A branch from `from` heading out at (azimuth, elevation), curving up (rise > 0) or drooping. */
function limb(builder, rng, L, colors, from, { azimuth, elevation, length, radius, rise = 0.15, segments }) {
  const dir = v(Math.cos(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.sin(azimuth) * Math.cos(elevation))
  const jitter = () => v((rng() - 0.5), (rng() - 0.5) * 0.6, (rng() - 0.5)).multiplyScalar(length * 0.16)
  const end = from.clone().addScaledVector(dir, length).add(v(0, length * rise, 0)).add(jitter())
  const c1 = from.clone().addScaledVector(dir, length * 0.38).add(jitter())
  const c2 = from.clone().addScaledVector(dir, length * 0.72).add(v(0, length * rise * 0.55, 0)).add(jitter())
  const steps = Math.max(2, Math.round(L.steps * 0.6))
  const path = cubic(from, c1, c2, end, steps)
  tube(builder, path, path.map((_, k) => radius * (1 - 0.58 * k / steps)), { segments: segments ?? L.small, base: colors.base.clone().lerp(colors.tip, 0.4), tip: colors.tip, random: rng, noise: L.noise * 0.7, mottle: 0.16 })
  return { path, end, at: (f) => path[Math.round(f * steps)], azimuth }
}

/**
 * A foliage cluster built only from leaf blades, in two layers:
 *   inner  larger, darker, randomly oriented leaves filling the core (the shaded depth of the crown)
 *   outer  lighter leaves laid shingle-like over the surface, tipped outward and up; sunlit
 *          top/outside leaves are lightest, with occasional yellow-green highlights
 * An optional small dark core (`mass`) can back very dense clusters.
 */
function cluster(builder, rng, L, pal, center, radius, { squash = 0.8, count = 20, leafLength = 0.3, leafWidth = 0.1, droop = 0.15, lift = 0.35, highlight = 0.12, mass = 0, inner = 0.55, shade = 0 }) {
  const core = Math.max(mass, L.mass ?? 0)
  if (core > 0) {
    // the leafy core takes the cluster's own light: darker underneath and deep in the crown
    const lit = Math.max(0, Math.min(1, 0.5 + shade))
    const massCenter = center.clone().add(v(0, -radius * 0.08 * squash, 0))
    crownMass(builder, massCenter, radius * L.crown * core, [1, squash, 1], {
      // the rounder core only where a cluster is big enough for its outline to show
      detail: radius * L.crown * core > (L.massDetailFrom ?? Infinity) ? 1 : 0,
      phase: rng() * 10, // the tree's stream advances exactly as it did for the old blob
      light: pal.inner.clone().lerp(pal.main, 0.3 + lit * 0.4).lerp(FOLIAGE_SUNLIT, 0.08),
      dark: pal.inner.clone().multiplyScalar(0.8).lerp(FOLIAGE_DEEP, 0.2),
      lumpy: 0.34,
    })
    crownLog?.push({ center: massCenter, r: radius * L.crown * core, pal, shade })
  }
  const size = L.leafSize
  radius *= L.crown
  const at = (d, depth) => v(center.x + d.x * radius * depth, center.y + d.y * radius * depth * squash, center.z + d.z * radius * depth)

  // inner layer: shaded core leaves. Inside a leafy core most of them are hidden, so only those
  // that poke out past the core are drawn; the stream still advances for every one, so the rest
  // of the tree is unchanged.
  const nInner = Math.max(2, Math.round(count * inner * 0.85 * L.leaves * 1.35))
  for (let k = 0; k < nInner; k += 1) {
    const d = v(rng() - 0.5, (rng() - 0.35) * 0.9, rng() - 0.5).normalize()
    const depth = 0.12 + rng() * 0.42
    if (core > 0 && depth < core * 0.62) {
      for (let skip = 0; skip < 9; skip += 1) rng()
      continue
    }
    const p = at(d, depth)
    const dir = d.clone().add(v(rng() - 0.5, rng() * 0.6 - 0.1 + lift * 0.3, rng() - 0.5)).normalize()
    const baseColor = pal.inner.clone().multiplyScalar(0.9 + Math.min(0, shade) * 0.4)
      .lerp(FOLIAGE_DEEP, 0.18)
    const tipColor = pal.inner.clone().lerp(pal.main, Math.max(0.1, 0.35 + rng() * 0.3 + shade * 0.6))
      .lerp(FOLIAGE_SUNLIT, 0.18)
    const hueShift = (rng() - 0.5) * 0.06
    const saturationShift = (rng() - 0.5) * 0.2
    const lightnessShift = (rng() - 0.5) * 0.16
    const vary = (color) => {
      const hsl = {}
      color.getHSL(hsl)
      return color.clone().setHSL(
        (hsl.h + hueShift + 1) % 1,
        Math.max(0, Math.min(1, hsl.s + saturationShift)),
        Math.max(0, Math.min(1, hsl.l + lightnessShift)),
      )
    }
    leaf(builder, p, dir, leafLength * size * (1.15 + rng() * 0.3), leafWidth * size * (1.1 + rng() * 0.25), vary(baseColor), vary(tipColor), { droop })
  }

  // outer layer: lit shingles
  const n = Math.max(4, Math.round(count * 1.08 * L.leaves * 1.45))
  for (let k = 0; k < n; k += 1) {
    const y = 1 - (1.78 * (k + 0.5)) / n // upper hemisphere dense, a few underneath
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const phi = k * GOLDEN + rng() * 0.8
    const d = v(Math.cos(phi) * ring, y, Math.sin(phi) * ring)
    const depth = 0.55 + rng() * 0.38
    const p = at(d, depth)
    const wander = v(rng() - 0.5, rng() - 0.5, rng() - 0.5)
    wander.addScaledVector(d, -wander.dot(d)).normalize()
    const out = d.clone().multiplyScalar(0.6).addScaledVector(wander, 0.7).add(v(0, lift * 0.5, 0)).normalize()
    // local light (top / outside of the cluster) plus the crown-level shade of this cluster
    const light = Math.max(0, Math.min(1, 0.45 + y * 0.42 + (depth - 0.7) * 1.1 + shade))
    const targetGreen = FOLIAGE_DEEP.clone().lerp(FOLIAGE_SUNLIT, light)
    const baseColor = pal.inner.clone().lerp(pal.main, 0.35 + light * 0.45).lerp(targetGreen, 0.18)
    const tipColor = (rng() < highlight ? pal.outer.clone().lerp(pal.hi, 0.75) : pal.main.clone().lerp(pal.outer, light))
      .lerp(targetGreen, 0.22)
    tipColor.multiplyScalar(0.92 + rng() * 0.16)
    leaf(builder, p, out, leafLength * size * (0.86 + rng() * 0.32), leafWidth * size * (0.88 + rng() * 0.26), varyFoliageColor(baseColor, rng), varyFoliageColor(tipColor, rng), { droop })
  }
}

/** Asset-free nipa palm with fronds rooted directly in the mud and no trunk. */
export function createGolpattaPalm(seed = 1) {
  const rng = mulberry32(0x6d2b79f5 + seed * 101)
  const builder = createBuilder()
  const frondCount = 5 + Math.floor(rng() * 3)
  const rachisBase = linear('#476b32')
  const rachisTip = linear('#718d3d')
  const leafletBase = linear('#365c2d')
  const leafletTip = linear('#7ca942')

  for (let frond = 0; frond < frondCount; frond += 1) {
    const angle = (frond / frondCount) * TAU + (rng() - 0.5) * 0.5
    const dx = Math.cos(angle)
    const dz = Math.sin(angle)
    const length = 2.8 + rng() * 0.9
    const height = 2.0 + rng() * 0.7
    const start = v(dx * 0.08, 0.025, dz * 0.08)
    const path = cubic(
      start,
      start.clone().add(v(dx * length * 0.22, height * 1.05, dz * length * 0.22)),
      start.clone().add(v(dx * length * 0.68, height * 1.35, dz * length * 0.68)),
      start.clone().add(v(dx * length, 0.65 + rng() * 0.35, dz * length)),
      10,
    )
    const radii = path.map((_, i) => 0.025 * (1 - 0.72 * i / (path.length - 1)))
    tube(builder, path, radii, { segments: 4, base: rachisBase, tip: rachisTip, cap: false })

    for (let i = 1; i < path.length - 1; i += 1) {
      const t = i / (path.length - 1)
      const leafletLength = (0.075 + Math.sin(t * Math.PI) * 0.035) * (0.9 + rng() * 0.2)
      const across = v(-dz, 0, dx)
      for (const side of [-1, 1]) {
        const base = path[i].clone().addScaledVector(across, side * 0.025)
        const direction = v(dx * 0.58 - dz * side * 0.62, -0.22 - t * 0.14, dz * 0.58 + dx * side * 0.62)
        const color = varyFoliageColor(leafletBase, rng)
        const tip = varyFoliageColor(leafletTip, rng)
        leaf(builder, base, direction, leafletLength, 0.018 + rng() * 0.01, color, tip, { droop: 0.2, fold: 0.22 })
      }
    }
  }
  return builder.build()
}

/**
 * Crown-level shading: clusters deep inside or low in the crown are darker, clusters on the
 * outer rim and the top are lighter (about -0.32 … +0.22, fed to cluster({ shade })).
 */
function crownShade(point, axis, crown) {
  const out = Math.hypot(point.x - axis.x, point.z - axis.z) / crown.radius
  const up = (point.y - crown.mid) / crown.half
  return Math.max(-0.32, Math.min(0.22, (out - 0.55) * 0.32 + up * 0.2))
}

/* ---------------------------------------------------------------- families */

/**
 * Sundari: the mature forest tree. Each form is a different crown architecture:
 *   0 spreading   lower, very broad tiers on long near-horizontal limbs
 *   1 tall        taller trunk, shorter upswept limbs: a narrower, deeper crown in three layers
 *   2 asymmetric  leaning trunk, most limbs (and the longest) reach towards one side
 * Foliage is strung along every limb (not only at its tip) and inner clusters bridge the trunk
 * and the limbs, so the canopy reads as one connected, layered crown with dark depth inside.
 */
function sundari(b, rng, L, form) {
  const colors = BARK.sundari
  const pal = LEAF.sundari
  const style = ['spreading', 'tall', 'asymmetric'][form] ?? 'spreading'
  const rootiness = [1, 0.55, 0.8][form]
  const H = style === 'tall' ? 6.4 + rng() * 0.6 : style === 'spreading' ? 5.1 + rng() * 0.6 : 5.6 + rng() * 0.6
  const leanAngle = rng() * TAU
  const trunk = makeTrunk(rng, { height: H, steps: L.steps + 1, r0: 0.25 + rng() * 0.05, rTop: 0.1, lean: style === 'asymmetric' ? 0.7 : 0.15 + rng() * 0.3, leanAngle, wobble: 0.16, flare: 0.8 })
  drawBark(b, rng, trunk.path, trunk.radii, colors, L, L.seg + 1)

  // spreading buttress roots, a few short stilts on the "prominent" forms, surface roots
  const buttresses = Math.max(3, Math.round((5 + rng() * 2) * (0.6 + 0.4 * rootiness) * (L.roots > 0.9 ? 1 : 0.7)))
  for (const angle of spreadAngles(rng, buttresses)) {
    buttress(b, rng, L, trunk, { h: 0.45 + rng() * 0.45, angle, reach: (0.8 + rng() * 0.6) * (0.75 + 0.45 * rootiness), thickness: 0.09 + rng() * 0.04 })
  }
  const stilts = Math.round(rootiness * 4 * L.roots) - 1
  for (const [i, angle] of spreadAngles(rng, Math.max(0, stilts)).entries()) {
    propRoot(b, rng, L, trunk, { h: 0.9 + rng() * 0.6, angle, reach: 1.1 + rng() * 0.6, radius: i === 0 ? 0.056 : 0.042, arch: 0.2 + rng() * 0.15, branch: rng() < 0.4 })
  }
  if (L.surface) for (const angle of spreadAngles(rng, 3 + Math.round(rng() * 2))) surfaceRoot(b, rng, L, trunk, { angle, length: (1.2 + rng() * 1.1) * (0.6 + 0.4 * rootiness), radius: 0.06 })

  // crown architecture
  const spec = {
    spreading: { K: 6, base: 0.44, span: 0.36, elev: [0.08, 0.2], grow: 0.2, len: [3.5, 1.2], squash: 0.5 },
    tall: { K: 7, base: 0.42, span: 0.5, elev: [0.38, 0.3], grow: 0.25, len: [2.0, 0.9], squash: 0.62 },
    asymmetric: { K: 6, base: 0.48, span: 0.42, elev: [0.16, 0.3], grow: 0.22, len: [2.7, 1.0], squash: 0.56 },
  }[style]
  const reach = spec.len[0] + 1
  const crown = { radius: reach, mid: H * (spec.base + spec.span * 0.5) + 0.4, half: H * spec.span * 0.5 + 0.9 }
  const axis = trunk.at(crown.mid).point
  const leafSpec = { squash: spec.squash, count: 30, leafLength: 0.1, leafWidth: 0.042, droop: 0.12, lift: 0.5 }
  const foliage = (center, radius, extra = {}) => cluster(b, rng, L, pal, center, radius, { ...leafSpec, ...extra, shade: crownShade(center, axis, crown) + (extra.shade ?? 0) })

  const az0 = style === 'asymmetric' ? leanAngle : rng() * TAU
  for (let k = 0; k < spec.K; k += 1) {
    const f = k / (spec.K - 1)
    const h = H * (spec.base + spec.span * f) + (rng() - 0.5) * 0.3
    // asymmetric crowns send most limbs (and the longest) towards the lean side
    const heavy = style === 'asymmetric' && k % 3 !== 2
    const azimuth = heavy ? az0 + (rng() - 0.5) * 2.2 : az0 + k * GOLDEN + (rng() - 0.5) * 0.5
    const length = (spec.len[0] - spec.len[1] * f) * (0.85 + rng() * 0.3) * (style === 'asymmetric' && !heavy ? 0.6 : 1)
    const branch = limb(b, rng, L, colors, trunk.at(h).point, {
      azimuth,
      elevation: spec.elev[0] + rng() * 0.18 + f * spec.elev[1],
      length,
      radius: 0.145 - 0.045 * f,
      rise: 0.12,
    })
    // foliage strung along the limb, overlapping, so leaves and branch read as one structure
    foliage(branch.end.clone().add(v(0, 0.15, 0)), 1.2 + rng() * 0.25)
    foliage(branch.at(0.62).clone().add(v(0, 0.32, 0)), 0.98 + rng() * 0.15, { count: 14 })
    if (length > 2.2 && L.twigs) foliage(branch.at(0.34).clone().add(v(0, 0.38, 0)), 0.85 + rng() * 0.12, { count: 11 })
    if (!L.twigs) continue
    const twig = limb(b, rng, L, colors, branch.at(0.7), { azimuth: branch.azimuth + (rng() < 0.5 ? -1 : 1) * (0.6 + rng() * 0.5), elevation: 0.3 + rng() * 0.3, length: 0.8 + rng() * 0.4, radius: 0.035, segments: 3 })
    foliage(twig.end.clone().add(v(0, 0.1, 0)), 0.98 + rng() * 0.15, { count: 14 })
  }
  // inner bridging foliage (dark) between the trunk and the limbs, and the crown top
  for (let i = 0; i < (L.twigs ? (style === 'tall' ? 3 : 2) : 1); i += 1) {
    const y = crown.mid + (i - 0.5) * crown.half * 0.6
    const a = az0 + i * 2.2 + rng()
    foliage(trunk.at(y).point.clone().add(v(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7)), 1.2 + rng() * 0.2, { count: 11, inner: 0.8 })
  }
  foliage(trunk.top.clone().add(v(0, 0.35, 0)), style === 'tall' ? 1.3 : 1.5, { count: 24, squash: spec.squash + 0.08 })
}

function gewa(b, rng, L, form) {
  const colors = BARK.gewa
  const pal = LEAF.gewa
  const rootiness = [0.75, 1, 0.5][form]
  const forkY = 0.7 + rng() * 0.45
  const trunk = makeTrunk(rng, { height: forkY + 0.15, steps: 3, r0: 0.2 + rng() * 0.03, rTop: 0.15, lean: 0.1, leanAngle: rng() * TAU, wobble: 0.06, flare: 0.55 })
  drawBark(b, rng, trunk.path, trunk.radii, colors, L, L.seg)

  const roots = Math.round((4 + rng() * 3) * rootiness * L.roots + 1)
  for (const angle of spreadAngles(rng, roots)) {
    propRoot(b, rng, L, trunk, { h: 0.3 + rng() * 0.4, angle, reach: 0.75 + rng() * 0.6, radius: 0.045 + rng() * 0.015, arch: 0.1 + rng() * 0.15, branch: rng() < 0.2 })
  }
  if (L.surface) for (const angle of spreadAngles(rng, 2 + Math.round(rng() * 2))) surfaceRoot(b, rng, L, trunk, { angle, length: 0.9 + rng() * 0.8, radius: 0.05 })

  // 2–3 leaning stems, each branching into limbs: a dense, rounded but irregular crown
  const stems = 2 + (form === 1 ? 1 : rng() < 0.5 ? 1 : 0)
  const az0 = rng() * TAU
  const fork = trunk.top
  const leafSpec = { squash: 0.85, count: 36, leafLength: 0.1, leafWidth: 0.04, droop: 0.15, highlight: 0.16 }
  const crown = { radius: 2.4, mid: 3.4, half: 1.6 }
  const shaded = (center, r, spec) => cluster(b, rng, L, pal, center, r, { ...spec, shade: crownShade(center, v(0, 0, 0), crown) })
  for (let s = 0; s < stems; s += 1) {
    const az = az0 + (s / stems) * TAU + (rng() - 0.5) * 0.6
    const lean = 0.3 + rng() * 0.32
    const len = 2.5 + rng() * 0.9
    const out = v(Math.cos(az), 0, Math.sin(az))
    const end = fork.clone().addScaledVector(out, Math.sin(lean) * len).add(v(0, Math.cos(lean) * len, 0))
    const path = cubic(fork, fork.clone().addScaledVector(out, 0.45 * Math.sin(lean) * len).add(v(0, 0.3 * len, 0)), end.clone().add(v(rng() - 0.5, -0.35 * len, rng() - 0.5).multiplyScalar(0.6)), end, L.steps - 1)
    tube(b, path, path.map((_, k) => 0.12 * (1 - 0.6 * k / (path.length - 1))), { segments: L.small + 1, base: colors.base, tip: colors.tip, random: rng, noise: L.noise, mottle: 0.2, lichen: colors.lichen, twist: 0.2 })
    shaded(end.clone().add(v(0, 0.2, 0)), 1.02 + rng() * 0.18, leafSpec)
    for (const at of [0.5 + rng() * 0.1, 0.72 + rng() * 0.12]) {
      const branch = limb(b, rng, L, colors, path[Math.round(at * (path.length - 1))], { azimuth: az + (rng() < 0.5 ? -1 : 1) * (0.8 + rng() * 0.7), elevation: 0.45 + rng() * 0.35, length: 0.9 + rng() * 0.5, radius: 0.065 })
      shaded(branch.end.clone().add(v(0, 0.12, 0)), 0.88 + rng() * 0.16, leafSpec)
      if (L.twigs && rng() < 0.6) {
        const twig = limb(b, rng, L, colors, branch.at(0.5), { azimuth: branch.azimuth + (rng() - 0.5) * 2, elevation: 0.5, length: 0.55 + rng() * 0.3, radius: 0.035, segments: 3 })
        shaded(twig.end, 0.7, { ...leafSpec, count: 16 })
      }
    }
  }
}

function goran(b, rng, L, form) {
  const colors = BARK.goran
  const pal = LEAF.goran
  const rootiness = [1, 0.55, 0.8][form]
  // a short hub perched on many thin stilt roots
  const hub = makeTrunk(rng, { height: 0.5, steps: 2, r0: 0.075, rTop: 0.065, lean: 0, leanAngle: 0, wobble: 0.02, flare: 0, startY: 0.12 })
  drawBark(b, rng, hub.path, hub.radii, colors, L, L.small)
  const roots = Math.round((7 + rng() * 4) * rootiness * L.roots)
  for (const angle of spreadAngles(rng, roots)) {
    propRoot(b, rng, L, hub, { h: 0.22 + rng() * 0.3, angle, reach: (0.45 + rng() * 0.4) * (0.7 + 0.35 * rootiness), radius: 0.026 + rng() * 0.01, arch: 0.08 + rng() * 0.1, branch: rng() < 0.25 })
  }

  const stems = 5 + Math.round(rng() * 2)
  const az0 = rng() * TAU
  const leafSpec = { squash: 0.85, count: 30, leafLength: 0.085, leafWidth: 0.035, droop: 0.12, lift: 0.4, highlight: 0.14 }
  for (let s = 0; s < stems; s += 1) {
    const az = az0 + s * GOLDEN + (rng() - 0.5) * 0.4
    const lean = 0.2 + rng() * 0.45
    const len = 0.85 + rng() * 0.6
    const out = v(Math.cos(az), 0, Math.sin(az))
    const from = hub.top.clone().addScaledVector(out, 0.05)
    const end = from.clone().addScaledVector(out, Math.sin(lean) * len).add(v(0, Math.cos(lean) * len, 0))
    const path = cubic(from, from.clone().addScaledVector(out, 0.15 * len).add(v(0, 0.3 * len, 0)), end.clone().add(v(0, -0.3 * len, 0)), end, 3)
    tube(b, path, path.map((_, k) => 0.055 * (1 - 0.5 * k / 3)), { segments: L.small, base: colors.base, tip: colors.tip, random: rng, noise: L.noise, mottle: 0.18 })
    cluster(b, rng, L, pal, end.clone().add(v(0, 0.08, 0)), 0.54 + rng() * 0.12, leafSpec)
    if (L.twigs || s % 2 === 0) {
      const side = out.clone().multiplyScalar(0.28).add(v(-out.z, 0, out.x).multiplyScalar((rng() - 0.5) * 0.5))
      cluster(b, rng, L, pal, path[2].clone().add(side), 0.46 + rng() * 0.1, leafSpec)
    }
  }
  cluster(b, rng, L, pal, v(0, 1.05 + rng() * 0.25, 0), 0.6, leafSpec)
}

function garjan(b, rng, L, form) {
  const colors = BARK.garjan
  const pal = LEAF.garjan
  const rootiness = [1, 0.72][form]
  const H = 3.9 + rng() * 0.7
  // the trunk stands on its roots: it ends just above the mud, where the root cage takes over
  const trunk = makeTrunk(rng, { height: H, steps: L.steps, r0: 0.15, rTop: 0.08, lean: 0.2 + rng() * 0.25, leanAngle: rng() * TAU, wobble: 0.12, flare: 0.15, startY: 0.45 })
  tube(b, [trunk.path[0].clone().add(v(0, -0.18, 0)), ...trunk.path], [0.06, ...trunk.radii], { segments: L.seg, base: colors.base, tip: colors.tip, random: rng, noise: L.noise, mottle: 0.2, lichen: colors.lichen, twist: 0.16 })

  const lower = Math.round((7 + rng() * 3) * rootiness * L.roots)
  for (const [i, angle] of spreadAngles(rng, lower).entries()) {
    // every third root is a major supporting root: thicker and clearly visible; the rest stay slim
    const major = i % 3 === 0
    propRoot(b, rng, L, trunk, { h: 0.7 + rng() * 0.6, angle, reach: (1.2 + rng() * 0.7) * (0.7 + 0.3 * rootiness), radius: (0.05 + rng() * 0.015) * (major ? 1.35 : 1), arch: 0.25 + rng() * 0.2, branch: rng() < (major ? 0.7 : 0.35) })
  }
  if (L.surface) for (const angle of spreadAngles(rng, 3)) surfaceRoot(b, rng, L, trunk, { angle, length: 0.8 + rng() * 0.7, radius: 0.028 })
  const upper = Math.round(4 * rootiness * L.roots)
  for (const angle of spreadAngles(rng, upper)) {
    propRoot(b, rng, L, trunk, { h: 1.4 + rng() * 0.7, angle, reach: (1.7 + rng() * 0.7) * (0.7 + 0.3 * rootiness), radius: 0.04, arch: 0.3 + rng() * 0.2, branch: rng() < 0.3 })
  }

  const K = 4 + (rng() < 0.5 ? 1 : 0)
  const az0 = rng() * TAU
  const leafSpec = { squash: 0.72, count: 32, leafLength: 0.1, leafWidth: 0.04, droop: 0.1, lift: 0.55, highlight: 0.08 }
  const crown = { radius: 2.2, mid: H * 0.8, half: 1.4 }
  const shaded = (center, r, spec) => cluster(b, rng, L, pal, center, r, { ...spec, shade: crownShade(center, v(0, 0, 0), crown) })
  let drops = L.subRoots ? 2 + Math.round(rng() * 1.4 * rootiness) : 1
  for (let k = 0; k < K; k += 1) {
    const f = k / (K - 1)
    const branch = limb(b, rng, L, colors, trunk.at(H * (0.55 + 0.35 * f)).point, {
      azimuth: az0 + k * GOLDEN + (rng() - 0.5) * 0.4,
      elevation: 0.5 + rng() * 0.4,
      length: 1.2 + rng() * 0.6,
      radius: 0.1,
      rise: 0.1,
    })
    shaded(branch.end.clone().add(v(0, 0.15, 0)), 1.0 + rng() * 0.18, leafSpec)
    if (L.twigs) {
      const twig = limb(b, rng, L, colors, branch.at(0.6), { azimuth: branch.azimuth + (rng() < 0.5 ? -1 : 1) * 0.9, elevation: 0.4, length: 0.6 + rng() * 0.3, radius: 0.04, segments: 3 })
      shaded(twig.end.clone().add(v(0, 0.08, 0)), 0.74, { ...leafSpec, count: 14 })
    }
    if (drops > 0 && f < 0.75) {
      dropRoot(b, rng, L, branch.at(0.6), v(Math.cos(branch.azimuth), 0, Math.sin(branch.azimuth)), 0.028)
      drops -= 1
    }
  }
  shaded(trunk.top.clone().add(v(0, 0.3, 0)), 1.2, { ...leafSpec, count: 26 })
}

function keora(b, rng, L, form) {
  const colors = BARK.keora
  const pal = LEAF.keora
  const rootiness = [1, 0.62][form]
  const H = 6 + rng() * 0.8
  const trunk = makeTrunk(rng, { height: H, steps: L.steps + 1, r0: 0.19 + rng() * 0.03, rTop: 0.06, lean: 0.2 + rng() * 0.3, leanAngle: rng() * TAU, wobble: 0.12, flare: 0.6 })
  drawBark(b, rng, trunk.path, trunk.radii, colors, L, L.seg)
  for (const angle of spreadAngles(rng, Math.round((4 + rng()) * (L.roots > 0.9 ? 1 : 0.75)))) {
    buttress(b, rng, L, trunk, { h: 0.35 + rng() * 0.3, angle, reach: (0.6 + rng() * 0.45) * (0.6 + 0.5 * rootiness), thickness: 0.07 })
  }
  if (L.surface) for (const angle of spreadAngles(rng, 3 + form)) surfaceRoot(b, rng, L, trunk, { angle, length: (1 + rng()) * (0.55 + 0.45 * rootiness), radius: 0.045 })

  // drooping limbs with hanging, narrow-leaved clusters
  const K = 7
  const az0 = rng() * TAU
  const leafSpec = { squash: 1.05, count: 34, leafLength: 0.1, leafWidth: 0.032, droop: 0.55, lift: -0.25, highlight: 0.1 }
  for (let k = 0; k < K; k += 1) {
    const f = k / (K - 1)
    const branch = limb(b, rng, L, colors, trunk.at(H * (0.42 + 0.46 * f)).point, {
      azimuth: az0 + k * GOLDEN + (rng() - 0.5) * 0.4,
      elevation: 0.15 + rng() * 0.25,
      length: (2 - 0.6 * f) * (0.85 + rng() * 0.3),
      radius: 0.095 - 0.025 * f,
      rise: -0.22,
    })
    cluster(b, rng, L, pal, branch.end.clone().add(v(0, -0.35, 0)), 0.85 + rng() * 0.18, leafSpec)
    if (L.twigs && k % 2 === 0) cluster(b, rng, L, pal, branch.at(0.55).clone().add(v(0, -0.35, 0)), 0.66, { ...leafSpec, count: 14 })
  }
  cluster(b, rng, L, pal, trunk.top.clone().add(v(0, 0.1, 0)), 1.0, { ...leafSpec, squash: 1.15, count: 26, lift: 0.05 })
}

const FAMILIES = { sundari, gewa, goran, garjan, keora }

/** One mangrove geometry for a family, seeded silhouette `form` and level of detail. */
export function buildMangrove(species, form = 0, lod = 'near') {
  const family = FAMILIES[species]
  if (!family) throw new Error(`Unknown mangrove family: ${species}`)
  const seed = 7349 * (MANGROVE_SPECIES.indexOf(species) + 1) + 977 * (form + 1) + (lod === 'near' ? 1 : 2)
  const builder = createBuilder()
  crownLog = []
  try {
    family(builder, mulberry32(seed), LOD[lod] ?? LOD.near, form)
    bridgeCrown(builder, crownLog, BRIDGES[lod] ?? BRIDGES.near)
  } finally {
    crownLog = null
  }
  return smoothShaded(builder.build())
}

/** Bridge masses per level of detail (kept within the triangle budgets in rendering.test.js). */
const BRIDGES = { near: { max: 9, detail: 0 }, mid: { max: 3, detail: 0 } }

/* ---------------------------------------------------------------- far forest */

const FAR_PALETTES = [
  [linear('#2a4a2f'), linear('#5b8547'), linear('#76984f')],
  [linear('#304c29'), linear('#668a45'), linear('#86a24d')],
  [linear('#37523d'), linear('#6c8c69'), linear('#8ba680')],
  [linear('#2f4d29'), linear('#5f8645'), linear('#879f4f')],
]

/**
 * Very cheap far-forest silhouettes (≈120 triangles): 0 broad tiered (sundari), 1 rounded
 * multi-lobed (gewa / garjan / goran), 2 tall and narrow (keora), 3 low bank shrubs.
 * Three dark low-poly lobes, each
 * ringed by large leaf tufts, so even at a distance the outline is leafy rather than faceted, and
 * wide, low crowns hide most of the trunk so neighbouring trees merge into one canopy.
 */
export function buildFarMangrove(form = 0) {
  const random = mulberry32(90211 + form * 101)
  const builder = createBuilder()
  const [dark, light, tuft] = FAR_PALETTES[form] ?? FAR_PALETTES[0]
  const lobes = []
  // crowns are wide and hang low so neighbouring trees merge into one canopy
  const lobe = (c, r, [sx, sy, sz]) => {
    const s = [sx * 1.25, sy, sz * 1.25]
    c = form === 3 ? c : c.clone().add(v(0, -0.7, 0))
    crownMass(builder, c, r * 0.72, s, { detail: 0, phase: random() * 10, light: dark.clone().lerp(light, 0.6), dark: dark.clone().multiplyScalar(0.85), lumpy: 0.26 })
    lobes.push([c, r, s])
  }
  if (form === 0) {
    tube(builder, [v(0, -0.2, 0), v(0.08, 1.6, 0), v(0, 3, 0.05)], [0.22, 0.15, 0.1], { segments: 4, base: linear('#4a3c2f'), tip: linear('#5f4e3c') })
    lobe(v(0, 4.1, 0), 1.6, [1.35, 0.78, 1.3])
    lobe(v(1.4, 3.2, 0.4), 1.3, [1.25, 0.75, 1.15])
    lobe(v(-1.2, 2.9, -0.6), 1.3, [1.25, 0.8, 1.15])
    lobe(v(0.1, 2.4, 1.1), 1.0, [1.3, 0.7, 1.1])
  } else if (form === 1) {
    tube(builder, [v(0, -0.2, 0), v(0.05, 1, 0), v(0.3, 2.2, 0.1)], [0.2, 0.15, 0.09], { segments: 4, base: linear('#4a3c2f'), tip: linear('#5f4e3c') })
    lobe(v(0.6, 2.8, 0.1), 1.35, [1.15, 0.9, 1.1])
    lobe(v(-0.7, 2.4, -0.3), 1.2, [1.15, 0.9, 1.1])
    lobe(v(0, 3.6, -0.1), 1.05, [1.1, 0.85, 1.05])
    lobe(v(0.2, 1.8, 0.8), 0.9, [1.2, 0.75, 1.1])
  } else if (form === 3) {
    // low, wide bank shrubs (goran / young growth): layered in front of the tall forest
    tube(builder, [v(0, -0.2, 0), v(0.05, 0.9, 0)], [0.12, 0.07], { segments: 4, base: linear('#4a3c2f'), tip: linear('#5f4e3c') })
    lobe(v(0, 1.3, 0), 1.15, [1.35, 0.7, 1.25])
    lobe(v(1.1, 1.0, 0.4), 0.85, [1.2, 0.7, 1.1])
    lobe(v(-0.9, 1.05, -0.5), 0.9, [1.2, 0.7, 1.1])
  } else {
    tube(builder, [v(0, -0.2, 0), v(0.1, 2.2, 0), v(0, 4.2, 0.05)], [0.18, 0.12, 0.07], { segments: 4, base: linear('#5e574d'), tip: linear('#857e72') })
    lobe(v(0, 4.8, 0), 1.05, [1.05, 1.2, 1.05])
    lobe(v(0.6, 3.7, 0.3), 1, [1.05, 1.15, 1])
    lobe(v(-0.55, 3.5, -0.35), 0.95, [1, 1.2, 1])
  }
  // large leaf tufts around each lobe's upper silhouette (drooping for keora)
  for (const [c, r, s] of lobes) {
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * TAU + random() * 0.9
      const up = 0.05 + random() * 0.55
      const ring = Math.sqrt(1 - up * up)
      const p = v(c.x + Math.cos(a) * ring * r * s[0] * 0.7, c.y + up * r * s[1] * 0.7, c.z + Math.sin(a) * ring * r * s[2] * 0.7)
      const dir = v(Math.cos(a), form === 2 ? -0.5 : 0.35 + up, Math.sin(a))
      const tip = random() < 0.3 ? tuft : light
      leaf(builder, p, dir, r * (0.6 + random() * 0.25), r * 0.32, dark.clone().lerp(light, 0.4), tip, { droop: form === 2 ? 0.4 : 0.15 })
    }
  }
  return smoothShaded(builder.build())
}

/**
 * Welds a geometry's shared corners and gives it smooth normals, so the far forest's low-poly
 * lobes read as soft rounded crowns in the haze instead of faceted gems (same triangles).
 * The colours are per-corner and depend only on position, so welding never mixes them.
 */
function smoothShaded(geometry) {
  geometry.deleteAttribute('normal')
  const welded = mergeVertices(geometry, 1e-4)
  welded.computeVertexNormals()
  welded.computeBoundingSphere()
  welded.computeBoundingBox()
  geometry.dispose()
  return welded
}
