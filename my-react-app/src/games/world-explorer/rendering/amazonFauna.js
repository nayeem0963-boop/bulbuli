/**
 * Rainforest animals for the Amazon map, as asset-free, vertex-coloured meshes (no model files,
 * nothing to download or license): capybara, jaguar, tapir, giant anteater, coati, black caiman,
 * green anaconda, red-footed tortoise, poison dart frog, blue morpho butterfly, capuchin monkey,
 * three-toed sloth, scarlet macaw, toco toucan, agouti, giant armadillo, goliath tarantula,
 * red howler monkey and harpy eagle.
 *
 * They are statues: smooth, finely modelled, each caught in a pose. Every model faces +z with its feet (or
 * belly) on y = 0 and is built in metres at life size. Where each one stands, and how solid it is,
 * is the map's business (biomes/amazon.js `fauna`, biomes/common.js); the sizes the colliders rely
 * on are in AMAZON_FAUNA and checked in amazonFauna.test.js.
 *
 * Pure geometry, deterministic (seeded): rendering/AmazonFaunaView.jsx draws it.
 */
import { mulberry32 } from '../../../core/rng.js'
import { bezier, blob, createBuilder, cubic, leaf, linear, tube, v } from './mangroveGeometry.js'
import { finish } from './saharaLandmarks.js'

/**
 * `radius`/`top`: the cylinder the map makes solid (centred on the model's origin).
 * `ground`: stands on the forest floor; `perch`: sits on a branch or platform.
 */
export const AMAZON_FAUNA = Object.freeze({
  capybara: { radius: 0.5, top: 0.55, length: 1.1, perch: false },
  jaguar: { radius: 0.62, top: 0.78, length: 1.5, perch: false },
  tapir: { radius: 0.62, top: 1.0, length: 1.9, perch: false },
  anteater: { radius: 0.6, top: 0.78, length: 2.1, perch: false },
  coati: { radius: 0.38, top: 0.6, length: 1.0, perch: false },
  caiman: { radius: 0.62, top: 0.34, length: 2.6, perch: false },
  anaconda: { radius: 0.62, top: 0.34, length: 2.2, perch: false },
  tortoise: { radius: 0.3, top: 0.3, length: 0.5, perch: false },
  frog: { radius: 0.1, top: 0.1, length: 0.12, perch: false },
  morpho: { radius: 0.12, top: 0.14, length: 0.15, perch: false },
  capuchin: { radius: 0.24, top: 0.5, length: 0.6, perch: true },
  sloth: { radius: 0.3, top: 0.62, length: 0.7, perch: true },
  macaw: { radius: 0.2, top: 0.82, length: 0.85, perch: true },
  toucan: { radius: 0.2, top: 0.6, length: 0.62, perch: true },
  agouti: { radius: 0.3, top: 0.42, length: 0.55, perch: false },
  armadillo: { radius: 0.5, top: 0.5, length: 1.3, perch: false },
  tarantula: { radius: 0.12, top: 0.09, length: 0.2, perch: false },
  howler: { radius: 0.3, top: 0.72, length: 0.8, perch: true },
  harpyEagle: { radius: 0.3, top: 1.0, length: 0.9, perch: true },
})

const C = {
  fur: { capy: linear('#8a6a45'), capyDark: linear('#5e4630'), capyBelly: linear('#b89a6e') },
  jag: { gold: linear('#d79a3a'), dark: linear('#2a1a0e'), belly: linear('#f1e2c0') },
  tapir: { grey: linear('#4a4640'), pale: linear('#d9d3c4'), dark: linear('#2c2a27') },
  ant: { grey: linear('#7d756a'), dark: linear('#1f1a17'), pale: linear('#d8d2c2'), claw: linear('#e8e0cf') },
  coati: { rust: linear('#9a5a2c'), dark: linear('#3a2616'), pale: linear('#efe3c8') },
  caiman: { dark: linear('#2d3a2a'), mid: linear('#4a5a3a'), belly: linear('#b5b58a'), eye: linear('#d6a21e') },
  snake: { green: linear('#4a6a2a'), dark: linear('#1f3516'), spot: linear('#16200f'), belly: linear('#b5b070') },
  tort: { shell: linear('#5a3a26'), plate: linear('#8a6542'), skin: linear('#a39a82'), red: linear('#c33a2a') },
  frog: { blue: linear('#2f6bc4'), black: linear('#101216'), yellow: linear('#f0c43a') },
  morpho: { blue: linear('#2f8cff'), edge: linear('#0b1b33'), body: linear('#2a1b12') },
  monkey: { cream: linear('#e6d6b0'), brown: linear('#4a3322'), cap: linear('#2a1d14') },
  sloth: { fur: linear('#9b8d6f'), dark: linear('#5a4d3a'), face: linear('#d8cdb0'), mask: linear('#3a2e22'), claw: linear('#e8e0cf') },
  macaw: { red: linear('#d9261c'), yellow: linear('#f2c21f'), blue: linear('#1f5fc4'), white: linear('#f2eee4'), beak: linear('#efe6d2'), beakDark: linear('#241c18'), leg: linear('#4a4440') },
  toucan: { black: linear('#14120f'), white: linear('#f4efe2'), bill: linear('#f08a1c'), billTip: linear('#1a1410'), blue: linear('#4aa3d6'), red: linear('#d6321e') },
  agouti: { orange: linear('#b8742a'), dark: linear('#5a3a1c'), pale: linear('#e8d3a0') },
  arma: { shell: linear('#4a3a30'), band: linear('#7a6252'), skin: linear('#b09a88'), claw: linear('#efe6d2') },
  tarantula: { brown: linear('#4a3322'), dark: linear('#241810'), hair: linear('#8a5a30') },
  howler: { black: linear('#1c1410'), red: linear('#8a3a1a'), face: linear('#2a1d16') },
  harpy: { grey: linear('#6a707a'), dark: linear('#262a30'), white: linear('#eeeae0'), beak: linear('#2a2a2c'), leg: linear('#d8c24a'), claw: linear('#1a1a1c') },
  eye: linear('#100c0a'),
  shine: linear('#ffffff'),
}

const mirror = [-1, 1]

/** Cheap smooth 3-D value noise in 0..1, from a hash of the lattice corners. */
function noise3(x, y, z) {
  const h = (i, j, k) => { const n = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return n - Math.floor(n) }
  const [ix, iy, iz] = [Math.floor(x), Math.floor(y), Math.floor(z)]
  const [fx, fy, fz] = [x - ix, y - iy, z - iz].map((t) => t * t * (3 - 2 * t))
  const lerp = (a, b, t) => a + (b - a) * t
  const plane = (dz) => lerp(lerp(h(ix, iy, iz + dz), h(ix + 1, iy, iz + dz), fx), lerp(h(ix, iy + 1, iz + dz), h(ix + 1, iy + 1, iz + dz), fx), fy)
  return lerp(plane(0), plane(1), fz)
}

/**
 * Fur and skin are never one flat colour: patches of lighter and darker (smooth noise, a few per
 * body length), and a soft shade towards the ground, as under a belly. Applied to the vertex
 * colours of a finished model; shape and size are untouched.
 */
function polish(geometry, { patch = 1, shade = 0.22 } = {}) {
  geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox
  const span = Math.max(1e-3, max.y - min.y)
  const scale = patch * 5 / Math.max(0.12, Math.max(span, max.z - min.z, max.x - min.x))
  const position = geometry.attributes.position
  const colour = geometry.attributes.color
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const patchy = 0.88 + 0.24 * noise3(x * scale, y * scale, z * scale) + 0.08 * (noise3(x * scale * 3.1, y * scale * 3.1, z * scale * 3.1) - 0.5)
    const low = 1 - shade * (1 - Math.sqrt(Math.max(0, Math.min(1, (y - min.y) / span))))
    const k = patchy * low
    colour.setXYZ(i, Math.min(1, colour.getX(i) * k), Math.min(1, colour.getY(i) * k), Math.min(1, colour.getZ(i) * k))
  }
  colour.needsUpdate = true
  return geometry
}

function kit(seed) {
  const random = mulberry32(seed)
  const b = createBuilder()
  const out = b
  // big masses are finely subdivided (up to 1,280 faces) so bodies read as smooth sculpture; small details keep what they ask for
  const mass = (center, radius, scale, light, dark, { detail = 2, lumpy = 0.03 } = {}) => blob(out, center, radius, scale, { detail: radius >= 0.1 ? Math.min(3, detail + 1) : detail, random, light, dark, lumpy })
  const eye = (x, y, z, size = 0.016) => {
    mass(v(x, y, z), size, [1, 1, 0.8], C.eye, C.eye, { detail: 1, lumpy: 0 })
    mass(v(x + Math.sign(x) * size * 0.35, y + size * 0.4, z + size * 0.4), size * 0.28, [1, 1, 1], C.shine, C.shine, { detail: 0, lumpy: 0 })
  }
  /** A leg from the body down to a foot with a padded sole. */
  const leg = (hip, knee, foot, widths, base, tip, pad = tip.clone().multiplyScalar(0.7), padSize = 0.05) => {
    // a limb that tapers like a real one: stout at the hip, narrowest above the knee, a swell of
    // calf, slim at the ankle, then a padded paw with toes
    const upper = hip.clone().lerp(knee, 0.5)
    const lower = knee.clone().lerp(foot, 0.5)
    tube(out, [hip, upper, knee, lower, foot], [widths[0] * 1.32, widths[0] * 0.95, widths[1] * 1.0, widths[1] * 0.82, widths[2] * 0.95], { segments: 9, base, tip, random, mottle: 0.04, cap: false })
    mass(v(foot.x, Math.max(foot.y, padSize * 0.5), foot.z + padSize * 0.5), padSize, [1, 0.55, 1.3], pad, pad, { detail: 1, lumpy: 0 })
    for (const k of [-1, 0, 1]) mass(v(foot.x + k * padSize * 0.55, Math.max(foot.y, padSize * 0.4) * 0.55, foot.z + padSize * 1.15 - Math.abs(k) * padSize * 0.15), padSize * 0.3, [1, 0.8, 1.2], pad, pad.clone().multiplyScalar(0.8), { detail: 1, lumpy: 0 })
  }
  /** Where a toe or claw of the leg just made goes. */
  const limb = () => b
  return { random, b, mass, eye, leg, limb }
}

/** The finished model: one smooth, welded surface, its colours varied a little like a hand-painted sculpture. */
function model(b) {
  return polish(finish(b), { patch: 1.2, shade: 0.2 })
}

/* ------------------------------------------------------------------ lofted bodies */

/**
 * A body modelled as ONE smooth surface, not a heap of blobs: a sweep along the spine whose
 * cross-section is an ellipse that changes from station to station, so the haunch, waist, chest,
 * neck, skull and muzzle flow into one another with no step or crease. A station is
 * [z, y, halfWidth, halfHeight]: where along the body (+z is forward), how high its middle is, and
 * the size of its ellipse. A spline runs through the stations.
 */
const spline = (a, b, c, d, t) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)
function stationAt(stations, f) {
  const last = stations.length - 1
  const i = Math.max(0, Math.min(last - 1, Math.floor(f)))
  const u = f - i
  const at = (k) => stations[Math.max(0, Math.min(last, k))]
  return [0, 1, 2, 3].map((c) => spline(at(i - 1)[c], at(i)[c], at(i + 1)[c], at(i + 2)[c], u))
}

/** The body's middle height and half sizes at z (for putting spots and ridges on its skin). */
export function sectionAt(stations, z) {
  let best = stationAt(stations, 0)
  const last = stations.length - 1
  for (let f = 0; f <= last; f += 0.02) {
    const section = stationAt(stations, f)
    if (Math.abs(section[0] - z) < Math.abs(best[0] - z)) best = section
  }
  return { y: best[1], rx: best[2], ry: best[3] }
}

const smoothstep = (lo, hi, x) => { const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo))); return t * t * (3 - 2 * t) }

/**
 * `back` / `belly`: the colours of the top and underside, blended round the body; `paint(z, u, c)`
 * may change the colour `c` at a point (z along the body, u from -1 underneath to 1 on top).
 */
function loft(builder, stations, { back, belly, paint = null, segments = 20, steps = 3 }) {
  const rings = (stations.length - 1) * steps + 1
  const grid = []
  for (let r = 0; r < rings; r += 1) {
    const [z, y, rx0, ry0] = stationAt(stations, r / steps)
    const rx = Math.max(0.004, rx0)
    const ry = Math.max(0.004, ry0)
    const ahead = stationAt(stations, Math.min(stations.length - 1, (r + 1) / steps))
    const behind = stationAt(stations, Math.max(0, (r - 1) / steps))
    const ty = ahead[1] - behind[1]
    const tz = ahead[0] - behind[0]
    const length = Math.hypot(ty, tz) || 1
    // the ring stands square to the spine: its width is along x, its height along (0, tz, -ty)
    const upY = tz / length
    const upZ = -ty / length
    const ring = []
    for (let k = 0; k < segments; k += 1) {
      const a = (k / segments) * Math.PI * 2
      const u = Math.sin(a)
      const colour = belly.clone().lerp(back, smoothstep(-0.55, 0.35, u))
      if (paint) paint(z, u, colour)
      ring.push({ position: v(Math.cos(a) * rx, y + upY * u * ry, z + upZ * u * ry), colour })
    }
    grid.push({ ring, centre: v(0, y, z), colour: belly.clone().lerp(back, 0.5) })
  }
  for (let r = 1; r < rings; r += 1) {
    for (let k = 0; k < segments; k += 1) {
      const n = (k + 1) % segments
      const a = grid[r - 1].ring[k]
      const c = grid[r - 1].ring[n]
      const d = grid[r].ring[n]
      const e = grid[r].ring[k]
      builder.triangle(a.position, d.position, c.position, a.colour, d.colour, c.colour)
      builder.triangle(a.position, e.position, d.position, a.colour, e.colour, d.colour)
    }
  }
  // close both ends with a fan to the middle of the end ring
  for (const [index, flip] of [[0, false], [rings - 1, true]]) {
    const { ring, centre, colour } = grid[index]
    for (let k = 0; k < segments; k += 1) {
      const a = ring[k]
      const c = ring[(k + 1) % segments]
      if (flip) builder.triangle(a.position, c.position, centre, a.colour, c.colour, colour)
      else builder.triangle(a.position, centre, c.position, a.colour, colour, c.colour)
    }
  }
}

/**
 * The same smooth body for an animal that sits or stands upright (a monkey, a bird): the spine
 * runs up. A station is [height, depth, halfWidth, halfDepth]: how high, how far forward (+z) the
 * middle of its ellipse is, and its size. `paint(h, u, c, side)`: u runs from -1 at the front to 1
 * at the back; side from -1 (left) to 1 (right), so wings and flanks can be coloured.
 */
function uprightLoft(builder, stations, { back, belly, paint = null, segments = 20, steps = 3 }) {
  const rings = (stations.length - 1) * steps + 1
  const grid = []
  for (let r = 0; r < rings; r += 1) {
    const [h, depth, rx0, rd0] = stationAt(stations, r / steps)
    const rx = Math.max(0.004, rx0)
    const rd = Math.max(0.004, rd0)
    const ring = []
    for (let k = 0; k < segments; k += 1) {
      const a = (k / segments) * Math.PI * 2
      const u = -Math.sin(a)
      const colour = belly.clone().lerp(back, smoothstep(-0.55, 0.35, u))
      if (paint) paint(h, u, colour, Math.cos(a))
      ring.push({ position: v(Math.cos(a) * rx, h, depth + Math.sin(a) * rd), colour })
    }
    grid.push({ ring, centre: v(0, h, depth), colour: belly.clone().lerp(back, 0.5) })
  }
  for (let r = 1; r < rings; r += 1) {
    for (let k = 0; k < segments; k += 1) {
      const n = (k + 1) % segments
      const a = grid[r - 1].ring[k]
      const c = grid[r - 1].ring[n]
      const d = grid[r].ring[n]
      const e = grid[r].ring[k]
      builder.triangle(a.position, c.position, d.position, a.colour, c.colour, d.colour)
      builder.triangle(a.position, d.position, e.position, a.colour, d.colour, e.colour)
    }
  }
  for (const [index, flip] of [[0, false], [rings - 1, true]]) {
    const { ring, centre, colour } = grid[index]
    for (let k = 0; k < segments; k += 1) {
      const a = ring[k]
      const c = ring[(k + 1) % segments]
      if (flip) builder.triangle(a.position, centre, c.position, a.colour, colour, c.colour)
      else builder.triangle(a.position, c.position, centre, a.colour, c.colour, colour)
    }
  }
}

/* ------------------------------------------------------------------ ground mammals */

export function createCapybaraGeometry(seed = 1) {
  const { b, mass, eye, leg } = kit(seed)
  const { capy, capyDark, capyBelly } = C.fur
  // a big barrel on short legs, one smooth line from the rump over the shoulders to a blunt, square muzzle
  const S = [[-0.54, 0.3, 0.03, 0.03], [-0.47, 0.31, 0.14, 0.16], [-0.28, 0.33, 0.235, 0.25], [0, 0.34, 0.255, 0.275], [0.25, 0.35, 0.245, 0.265],
    [0.42, 0.38, 0.205, 0.235], [0.55, 0.42, 0.165, 0.19], [0.66, 0.43, 0.145, 0.165], [0.77, 0.405, 0.125, 0.135], [0.87, 0.385, 0.1, 0.105], [0.92, 0.375, 0.06, 0.065], [0.945, 0.37, 0.02, 0.02]]
  loft(b, S, { back: capy, belly: capyBelly.clone().lerp(capy, 0.35), paint: (z, u, c) => { if (z > 0.8) c.lerp(capyDark, 0.55 * smoothstep(0.8, 0.92, z)) } })
  for (const s of mirror) {
    leg(v(s * 0.15, 0.27, 0.3), v(s * 0.17, 0.15, 0.32), v(s * 0.18, 0.02, 0.34), [0.075, 0.055, 0.045], capy, capyDark)
    leg(v(s * 0.15, 0.27, -0.4), v(s * 0.17, 0.14, -0.42), v(s * 0.18, 0.02, -0.4), [0.085, 0.06, 0.045], capy, capyDark)
    eye(s * 0.125, 0.49, 0.62, 0.018)
    mass(v(s * 0.085, 0.585, 0.5), 0.032, [0.6, 1, 0.8], capy, capyDark, { detail: 1, lumpy: 0 })
    mass(v(s * 0.04, 0.47, 0.9), 0.014, [1, 0.8, 1], C.eye, C.eye, { detail: 0, lumpy: 0 })
  }
  return model(b)
}

export function createJaguarGeometry(seed = 2) {
  const { b, mass, eye, leg, random } = kit(seed)
  const { gold, dark, belly } = C.jag
  // a muscular cat standing, head low: haunch, waist, deep chest, neck, skull and muzzle are one surface
  const S = [[-0.7, 0.56, 0.03, 0.03], [-0.62, 0.58, 0.12, 0.13], [-0.45, 0.59, 0.165, 0.185], [-0.2, 0.585, 0.15, 0.175], [0.05, 0.585, 0.155, 0.185],
    [0.3, 0.6, 0.17, 0.21], [0.5, 0.62, 0.145, 0.185], [0.66, 0.63, 0.11, 0.14], [0.8, 0.6, 0.115, 0.125], [0.93, 0.565, 0.112, 0.112],
    [1.03, 0.53, 0.07, 0.072], [1.1, 0.515, 0.045, 0.048], [1.13, 0.51, 0.02, 0.02]]
  loft(b, S, { back: gold, belly: belly.clone().lerp(gold, 0.15), paint: (z, u, c) => { if (z > 1.0) c.lerp(belly, 0.7 * smoothstep(1.0, 1.1, z)) } })
  for (const s of mirror) {
    leg(v(s * 0.13, 0.52, 0.36), v(s * 0.16, 0.27, 0.38), v(s * 0.16, 0.03, 0.4), [0.095, 0.07, 0.06], gold, gold.clone().lerp(belly, 0.25), dark.clone().lerp(gold, 0.4), 0.06)
    leg(v(s * 0.14, 0.53, -0.46), v(s * 0.2, 0.29, -0.52), v(s * 0.17, 0.03, -0.44), [0.105, 0.07, 0.06], gold, gold.clone().lerp(belly, 0.25), dark.clone().lerp(gold, 0.4), 0.06)
    mass(v(s * 0.088, 0.705, 0.82), 0.04, [0.9, 1, 0.6], gold, dark, { detail: 1, lumpy: 0 })
    eye(s * 0.094, 0.585, 0.965, 0.016)
  }
  mass(v(0, 0.515, 1.1), 0.026, [1.2, 0.8, 0.8], C.eye, C.eye, { detail: 0, lumpy: 0 })
  tube(b, cubic(v(0, 0.6, -0.66), v(0, 0.5, -1.0), v(0, 0.2, -1.1), v(0, 0.5, -1.3), 8), [0.06, 0.055, 0.05, 0.048, 0.045, 0.042, 0.04, 0.036, 0.034], { segments: 9, base: gold, tip: dark })
  // rosettes on the flank and back: rings of dark spots, a dark spot in the middle of some
  for (let i = 0; i < 22; i += 1) {
    const z = -0.62 + random() * 1.05
    const side = random() < 0.5 ? -1 : 1
    const around = (random() - 0.15) * 1.3
    const { y, rx, ry } = sectionAt(S, z)
    const cx = side * Math.sin(around) * rx * 1.005
    const cy = y + Math.cos(around) * ry * 1.005
    const tx = side * Math.cos(around) * rx
    const ty = -Math.sin(around) * ry
    const tl = Math.hypot(tx, ty) || 1
    const radius = 0.036 + random() * 0.014
    for (let k = 0; k < 6; k += 1) {
      const a = (k / 6) * Math.PI * 2 + random() * 0.3
      const round = Math.cos(a) * radius
      mass(v(cx + (tx / tl) * round, cy + (ty / tl) * round, z + Math.sin(a) * radius * 1.15), 0.0115, [1, 1, 0.45], dark, dark, { detail: 0, lumpy: 0 })
    }
    if (i % 3 === 0) mass(v(cx, cy, z), 0.008, [1, 1, 0.45], dark, dark, { detail: 0, lumpy: 0 })
  }
  return model(b)
}

export function createTapirGeometry(seed = 3) {
  const { b, mass, eye, leg } = kit(seed)
  const { grey, pale, dark } = C.tapir
  // a pig-like barrel with a high rump, a short neck and a head that runs on into the short trunk-like snout
  const S = [[-0.8, 0.7, 0.04, 0.04], [-0.72, 0.72, 0.16, 0.18], [-0.5, 0.74, 0.27, 0.3], [-0.2, 0.74, 0.27, 0.31], [0.1, 0.73, 0.26, 0.31],
    [0.38, 0.74, 0.235, 0.29], [0.58, 0.78, 0.195, 0.245], [0.74, 0.82, 0.165, 0.2], [0.88, 0.84, 0.155, 0.185], [1.0, 0.8, 0.12, 0.15],
    [1.1, 0.74, 0.085, 0.1], [1.2, 0.68, 0.055, 0.062], [1.245, 0.66, 0.025, 0.03]]
  loft(b, S, { back: grey, belly: grey.clone().multiplyScalar(0.72), paint: (z, u, c) => { if (z > 1.1) c.lerp(dark, 0.6 * smoothstep(1.1, 1.22, z)) } })
  for (const s of mirror) {
    leg(v(s * 0.17, 0.52, 0.42), v(s * 0.21, 0.27, 0.45), v(s * 0.22, 0.03, 0.47), [0.105, 0.075, 0.065], grey, dark, dark, 0.07)
    leg(v(s * 0.17, 0.52, -0.5), v(s * 0.21, 0.29, -0.55), v(s * 0.22, 0.03, -0.52), [0.115, 0.08, 0.065], grey, dark, dark, 0.07)
    mass(v(s * 0.13, 1.0, 0.8), 0.06, [0.6, 1, 0.8], grey, pale, { detail: 1, lumpy: 0 })
    eye(s * 0.14, 0.89, 0.98, 0.017)
  }
  mass(v(0, 0.655, 1.24), 0.032, [1, 0.8, 1], dark, dark, { detail: 1, lumpy: 0 })
  mass(v(0, 0.69, -0.8), 0.04, [1, 1.4, 1], dark, dark, { detail: 0, lumpy: 0 })
  return model(b)
}

export function createAnteaterGeometry(seed = 4) {
  const { b, mass, eye, leg, limb, random } = kit(seed)
  const { grey, dark, pale, claw } = C.ant
  // one long taper from the rump over the shoulders and the head into the tube of a snout
  const S = [[-0.52, 0.55, 0.04, 0.04], [-0.45, 0.55, 0.1, 0.12], [-0.25, 0.56, 0.19, 0.2], [0, 0.57, 0.2, 0.23], [0.25, 0.57, 0.19, 0.23],
    [0.42, 0.56, 0.17, 0.21], [0.58, 0.55, 0.12, 0.15], [0.72, 0.53, 0.1, 0.12], [0.85, 0.5, 0.085, 0.095], [1.05, 0.43, 0.06, 0.065],
    [1.25, 0.36, 0.04, 0.042], [1.36, 0.32, 0.018, 0.018]]
  loft(b, S, {
    back: grey,
    belly: grey.clone().multiplyScalar(0.72),
    // the black band that runs from the throat up over the shoulder, and a darker head and snout
    paint: (z, u, c) => {
      const centre = 0.52 - 0.3 * Math.max(-1, Math.min(1, u))
      const band = 1 - smoothstep(0.05, 0.1, Math.abs(z - centre))
      c.lerp(dark, Math.max(band, 0.6 * smoothstep(0.7, 1.0, z)))
      if (band < 0.1 && Math.abs(z - centre) < 0.15 && u > -0.2) c.lerp(pale, 0.5)
    },
  })
  for (const s of mirror) {
    leg(v(s * 0.12, 0.42, 0.42), v(s * 0.14, 0.2, 0.44), v(s * 0.14, 0.03, 0.5), [0.08, 0.06, 0.05], dark, pale, pale, 0.06)
    leg(v(s * 0.13, 0.42, -0.4), v(s * 0.15, 0.2, -0.44), v(s * 0.15, 0.03, -0.42), [0.08, 0.06, 0.05], dark, pale, pale, 0.06)
    for (const k of [-1, 0, 1]) tube(limb(), [v(s * 0.14 + k * 0.016, 0.05, 0.52), v(s * 0.14 + k * 0.02, 0.012, 0.6)], [0.011, 0.003], { segments: 4, base: claw })
    eye(s * 0.088, 0.565, 0.74, 0.013)
    mass(v(s * 0.07, 0.655, 0.66), 0.035, [0.8, 1, 0.8], grey, dark, { detail: 0, lumpy: 0 })
  }
  // bushy tail: a smooth sweep, widest a third of the way along, drooping to a dark tip
  tube(b, cubic(v(0, 0.53, -0.45), v(0, 0.5, -0.75), v(0, 0.36, -1.05), v(0, 0.28, -1.3), 8), [0.08, 0.115, 0.14, 0.15, 0.145, 0.125, 0.095, 0.06, 0.02], { segments: 9, base: grey, tip: dark, random, mottle: 0.1 })
  return model(b)
}

export function createCoatiGeometry(seed = 5) {
  const { b, mass, eye, leg } = kit(seed)
  const { rust, dark, pale } = C.coati
  // slender: one line from the rump to a long, flexible, pale snout; ringed tail held straight up
  const S = [[-0.32, 0.27, 0.03, 0.03], [-0.27, 0.27, 0.07, 0.08], [-0.12, 0.28, 0.095, 0.1], [0.08, 0.285, 0.095, 0.105], [0.2, 0.29, 0.085, 0.1],
    [0.28, 0.31, 0.07, 0.085], [0.35, 0.33, 0.065, 0.075], [0.42, 0.33, 0.055, 0.06], [0.5, 0.31, 0.04, 0.04], [0.58, 0.29, 0.026, 0.026], [0.605, 0.285, 0.011, 0.011]]
  loft(b, S, { back: rust, belly: rust.clone().lerp(pale, 0.45), paint: (z, u, c) => { if (z > 0.44) c.lerp(pale, 0.85 * smoothstep(0.44, 0.52, z)); if (z > 0.575) c.lerp(dark, smoothstep(0.575, 0.6, z)) } })
  for (const s of mirror) {
    leg(v(s * 0.07, 0.22, 0.2), v(s * 0.09, 0.1, 0.22), v(s * 0.09, 0.015, 0.26), [0.042, 0.03, 0.028], dark, dark, dark, 0.035)
    leg(v(s * 0.07, 0.22, -0.22), v(s * 0.09, 0.1, -0.24), v(s * 0.09, 0.015, -0.22), [0.042, 0.03, 0.028], dark, dark, dark, 0.035)
    mass(v(s * 0.045, 0.385, 0.31), 0.028, [0.8, 1, 0.8], dark, dark, { detail: 0, lumpy: 0 })
    eye(s * 0.056, 0.352, 0.385, 0.011)
  }
  const rings = 9
  for (let i = 0; i < rings; i += 1) {
    const t = i / (rings - 1)
    const p = v(0, 0.3 + t * 0.3, -0.26 - Math.sin(t * 1.8) * 0.16)
    const colour = i % 2 ? dark : pale.clone().lerp(rust, 0.5)
    mass(p, 0.05 - t * 0.012, [1, 0.95, 1], colour, colour.clone().multiplyScalar(0.7), { detail: 1, lumpy: 0.01 })
  }
  return model(b)
}

/* ------------------------------------------------------------------ reptiles and amphibians */

export function createCaimanGeometry(seed = 6) {
  const { b, mass, leg, random } = kit(seed)
  const { dark, mid, belly, eye: gold } = C.caiman
  // low and long: back, neck, flat skull and broad snout are one surface; a tail ending in a gentle curve
  const S = [[-0.98, 0.1, 0.07, 0.07], [-0.8, 0.115, 0.08, 0.08], [-0.5, 0.14, 0.14, 0.12], [-0.2, 0.16, 0.19, 0.14], [0.1, 0.17, 0.2, 0.14],
    [0.35, 0.17, 0.17, 0.12], [0.5, 0.17, 0.14, 0.11], [0.62, 0.17, 0.14, 0.1], [0.75, 0.16, 0.12, 0.085], [0.95, 0.14, 0.095, 0.07],
    [1.1, 0.125, 0.075, 0.058], [1.22, 0.115, 0.06, 0.05], [1.265, 0.115, 0.02, 0.02]]
  loft(b, S, { back: mid, belly: belly.clone().lerp(mid, 0.3), paint: (z, u, c) => { c.lerp(dark, 0.45 * smoothstep(0.1, -0.9, z)) } })
  tube(b, cubic(v(0, 0.1, -0.95), v(0, 0.09, -1.3), v(0.25, 0.08, -1.5), v(0.5, 0.07, -1.75), 6), [0.07, 0.055, 0.045, 0.035, 0.025, 0.015, 0.006], { segments: 9, base: dark, tip: dark, random, mottle: 0.1 })
  for (const s of mirror) {
    // raised eyes on top of the skull, and the nostrils at the tip of the snout
    mass(v(s * 0.07, 0.262, 0.74), 0.034, [1, 0.8, 1.2], dark, mid, { detail: 1, lumpy: 0 })
    mass(v(s * 0.07, 0.278, 0.755), 0.016, [1, 1.5, 0.5], gold, gold, { detail: 0, lumpy: 0 })
    mass(v(s * 0.018, 0.158, 1.24), 0.012, [1, 0.7, 1], C.eye, C.eye, { detail: 0, lumpy: 0 })
    leg(v(s * 0.19, 0.15, 0.32), v(s * 0.38, 0.08, 0.38), v(s * 0.36, 0.015, 0.5), [0.06, 0.045, 0.035], mid, dark, dark, 0.05)
    leg(v(s * 0.2, 0.15, -0.4), v(s * 0.4, 0.08, -0.44), v(s * 0.36, 0.015, -0.56), [0.065, 0.05, 0.035], mid, dark, dark, 0.05)
  }
  // a row of bony ridges along the back
  for (let i = 0; i < 11; i += 1) {
    const z = 0.45 - (i / 10) * 1.35
    const { y, ry } = sectionAt(S, z)
    tube(b, [v(0, y + ry - 0.02, z), v(0, y + ry + 0.035, z - 0.01)], [0.035, 0.004], { segments: 4, base: mid, tip: dark })
  }
  return model(b)
}

export function createAnacondaGeometry(seed = 7) {
  const { b, mass, eye, random } = kit(seed)
  const { green, dark, spot, belly } = C.snake
  // a thick coil of three turns, the head resting on top with the neck raised a little
  const path = []
  const turns = 2.6
  const steps = 52
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const a = t * turns * Math.PI * 2
    const r = 0.5 - t * 0.12
    path.push(v(Math.cos(a) * r, 0.1 + t * 0.14 + Math.sin(t * 40) * 0.004, Math.sin(a) * r))
  }
  const girth = path.map((_, i) => 0.095 * (1 - Math.max(0, (i - 40) / 12) * 0.2))
  tube(b, path, girth, { segments: 9, base: dark, tip: green, random, mottle: 0.1 })
  // big dark blotches along the back
  for (let i = 2; i < path.length - 4; i += 3) {
    const p = path[i]
    mass(v(p.x, p.y + girth[i] * 0.85, p.z), 0.05, [1, 0.35, 1], spot, spot, { detail: 0, lumpy: 0 })
  }
  // head: lifted off the top of the coil, a flat wedge with a pale throat
  const tail = path[path.length - 1]
  const neck = [tail, v(tail.x * 0.6, tail.y + 0.13, tail.z * 0.6 + 0.12), v(0.04, 0.34, 0.1), v(0, 0.4, 0.22)]
  tube(b, neck, [0.09, 0.075, 0.065, 0.06], { segments: 9, base: green, tip: green, random, mottle: 0.08 })
  mass(v(0, 0.4, 0.3), 0.075, [0.95, 0.55, 1.45], green, dark, { detail: 2, lumpy: 0.02 })
  mass(v(0, 0.36, 0.32), 0.06, [0.9, 0.3, 1.4], belly, belly, { detail: 1, lumpy: 0 })
  for (const s of mirror) eye(s * 0.05, 0.43, 0.32, 0.013)
  // the start of the snake peeks from under the coil as the tail tip
  tube(b, [path[0], v(0.58, 0.06, 0.1), v(0.7, 0.04, 0.28)], [0.095, 0.05, 0.012], { segments: 9, base: green, tip: dark })
  return model(b)
}

export function createTortoiseGeometry(seed = 8) {
  const { b, mass, eye, leg, random, limb } = kit(seed)
  const { shell, plate, skin, red } = C.tort
  // a high domed shell of plates (scutes) with dark seams between them, a head with red scales
  // and four stout, scaly legs with red scales down the front
  mass(v(0, 0.17, 0), 0.2, [0.95, 0.8, 1.2], shell.clone().lerp(plate, 0.4), shell.clone().multiplyScalar(0.55), { detail: 3, lumpy: 0.008 })
  const rx = 0.19
  const ry = 0.16
  const rz = 0.24
  const scute = (x, z, size, tilt = 1) => {
    const lift = Math.sqrt(Math.max(0.02, 1 - (x / rx) ** 2 - (z / rz) ** 2))
    const tone = plate.clone().multiplyScalar(0.85 + random() * 0.3)
    mass(v(x, 0.17 + ry * lift + 0.003, z), size, [1, 0.3 * tilt, 1.12], tone, shell.clone().multiplyScalar(0.7), { detail: 1, lumpy: 0.01 })
  }
  scute(0, 0, 0.062)
  for (let k = 0; k < 5; k += 1) { const a = (k / 5) * Math.PI * 2 + 0.3; scute(Math.cos(a) * 0.095, Math.sin(a) * 0.12, 0.054) }
  for (let k = 0; k < 9; k += 1) { const a = (k / 9) * Math.PI * 2; scute(Math.cos(a) * 0.15, Math.sin(a) * 0.19, 0.044, 0.9) }
  for (const s of mirror) {
    for (const z of [0.14, -0.14]) {
      leg(v(s * 0.16, 0.12, z), v(s * 0.19, 0.07, z + 0.02), v(s * 0.19, 0.012, z + (z > 0 ? 0.04 : 0)), [0.05, 0.042, 0.038], skin, skin.clone().multiplyScalar(0.8), skin, 0.037)
      // scales: red on the foreleg's outer face
      if (z > 0) for (const [y, dz] of [[0.095, 0.02], [0.065, 0.03], [0.04, 0.038]]) blob(limb(), v(s * 0.215, y, z + dz), 0.016, [0.5, 0.9, 1], { detail: 0, random, light: red, dark: red.clone().multiplyScalar(0.7), lumpy: 0 })
    }
  }
  tube(b, [v(0, 0.12, 0.2), v(0, 0.14, 0.3), v(0, 0.15, 0.36)], [0.05, 0.04, 0.035], { segments: 9, base: skin, tip: skin, random })
  mass(v(0, 0.15, 0.38), 0.045, [0.9, 0.85, 1.15], red, skin, { detail: 2, lumpy: 0 })
  for (const s of mirror) eye(s * 0.028, 0.17, 0.4, 0.008)
  return model(b)
}

export function createFrogGeometry(seed = 9) {
  const { b, mass, eye, random } = kit(seed)
  const { blue, black, yellow } = C.frog
  // a blue-and-black dart frog crouched on a small leaf
  leaf(b, v(0, 0.004, -0.08), v(0, 0.05, 1), 0.2, 0.07, linear('#2f6a2a'), linear('#4a8a3a'), { droop: 0.05, fold: 0.2, curl: 0 })
  mass(v(0, 0.035, 0), 0.04, [0.9, 0.75, 1.25], blue, blue.clone().multiplyScalar(0.7), { detail: 2, lumpy: 0 })
  mass(v(0, 0.05, 0.035), 0.028, [1, 0.8, 1], blue, blue, { detail: 1, lumpy: 0 })
  for (let i = 0; i < 9; i += 1) mass(v((random() - 0.5) * 0.05, 0.06 + random() * 0.005, -0.02 + random() * 0.07), 0.007 + random() * 0.004, [1, 0.6, 1], black, black, { detail: 0, lumpy: 0 })
  for (const s of mirror) {
    mass(v(s * 0.02, 0.07, 0.06), 0.011, [1, 1, 1], yellow, yellow, { detail: 1, lumpy: 0 })
    eye(s * 0.022, 0.066, 0.062, 0.008)
    mass(v(s * 0.04, 0.014, -0.03), 0.022, [0.5, 0.5, 1.3], blue, black, { detail: 1, lumpy: 0 })
    mass(v(s * 0.03, 0.01, 0.07), 0.012, [1, 0.5, 1.4], black, black, { detail: 0, lumpy: 0 })
  }
  return model(b)
}

/* ------------------------------------------------------------------ insects */

/** A blue morpho, wings open, resting on a leaf. */
export function createMorphoGeometry(seed = 10) {
  const { b, mass } = kit(seed)
  const { blue, edge, body } = C.morpho
  leaf(b, v(0, 0.002, -0.09), v(0, 0.05, 1), 0.2, 0.08, linear('#2f6a2a'), linear('#4a8a3a'), { droop: 0.04, fold: 0.2, curl: 0 })
  mass(v(0, 0.045, 0), 0.01, [1, 1, 4.5], body, body, { detail: 1, lumpy: 0 })
  for (const s of mirror) {
    // each side: a big forewing (up and back) and a smaller hindwing, with dark edges
    const wing = (root, tip, width, bend) => {
      const mid = v((root.x + tip.x) / 2, (root.y + tip.y) / 2 + bend, (root.z + tip.z) / 2)
      b.triangle(root, mid, v(tip.x, tip.y, tip.z + width), edge, blue, edge)
      b.triangle(root, v(tip.x, tip.y, tip.z - width), mid, edge, edge, blue)
      b.triangle(mid, v(tip.x, tip.y, tip.z + width), v(tip.x, tip.y, tip.z - width), blue, edge, edge)
    }
    wing(v(s * 0.004, 0.05, 0.012), v(s * 0.115, 0.1, 0.04), 0.045, 0.02)
    wing(v(s * 0.004, 0.05, -0.006), v(s * 0.09, 0.085, -0.06), 0.035, 0.015)
  }
  tube(b, [v(0.004, 0.05, 0.03), v(0.02, 0.07, 0.08)], [0.0012, 0.0008], { segments: 3, base: body })
  tube(b, [v(-0.004, 0.05, 0.03), v(-0.02, 0.07, 0.08)], [0.0012, 0.0008], { segments: 3, base: body })
  return model(b)
}

/* ------------------------------------------------------------------ perching animals */

export function createCapuchinGeometry(seed = 11) {
  const { b, mass, eye, random } = kit(seed)
  const { cream, brown, cap } = C.monkey
  // sitting on its haunches: one smooth body from the seat up through the shoulders into the head,
  // a cream face and chest, a dark cap, brown limbs, a long tail curling round
  const S = [[0.02, -0.03, 0.04, 0.04], [0.07, -0.03, 0.13, 0.13], [0.2, -0.01, 0.15, 0.14], [0.32, 0.02, 0.14, 0.13], [0.4, 0.05, 0.1, 0.1],
    [0.46, 0.07, 0.095, 0.1], [0.52, 0.07, 0.085, 0.09], [0.555, 0.065, 0.03, 0.03]]
  uprightLoft(b, S, {
    back: brown,
    belly: brown.clone().lerp(cream, 0.2),
    paint: (h, u, c, side) => {
      if (h > 0.2 && h < 0.42) c.lerp(cream, 0.85 * smoothstep(0.3, -0.5, u))
      if (h > 0.38 && u < 0.1) c.lerp(cream, 0.9)
      if (h > 0.49) c.lerp(cap, 0.95 * smoothstep(0.49, 0.52, h))
      if (h > 0.45 && Math.abs(side) > 0.55 && u > -0.4) c.lerp(cream, 0.5)
    },
  })
  for (const s of mirror) {
    tube(b, [v(s * 0.11, 0.34, 0.03), v(s * 0.16, 0.22, 0.12), v(s * 0.13, 0.1, 0.18)], [0.042, 0.034, 0.028], { segments: 9, base: brown, tip: brown, random, mottle: 0.05 })
    mass(v(s * 0.13, 0.085, 0.19), 0.03, [1, 0.7, 1.2], cap, cap, { detail: 1, lumpy: 0 })
    tube(b, [v(s * 0.1, 0.1, 0.0), v(s * 0.15, 0.06, 0.1), v(s * 0.13, 0.015, 0.16)], [0.05, 0.036, 0.03], { segments: 9, base: brown, tip: brown, random })
    eye(s * 0.04, 0.485, 0.155, 0.012)
    mass(v(s * 0.092, 0.47, 0.06), 0.027, [0.6, 1, 0.8], cream, cap, { detail: 1, lumpy: 0 })
  }
  mass(v(0, 0.435, 0.16), 0.036, [1, 0.8, 0.8], cream.clone().lerp(brown, 0.3), brown, { detail: 1, lumpy: 0 })
  tube(b, cubic(v(0, 0.12, -0.14), v(0, 0.06, -0.4), v(0.18, 0.03, -0.46), v(0.22, 0.16, -0.36), 8), [0.04, 0.038, 0.034, 0.031, 0.029, 0.026, 0.024, 0.02, 0.012], { segments: 9, base: brown, tip: cap })
  return model(b)
}

export function createSlothGeometry(seed = 12) {
  const { b, mass, eye, random } = kit(seed)
  const { fur, dark, face, mask, claw } = C.sloth
  // a shaggy round body hugging a bough, a pale face with the dark eye-stripe, long arms ending in hooked claws
  const S = [[0.02, 0, 0.08, 0.08], [0.08, 0, 0.19, 0.19], [0.22, -0.02, 0.23, 0.22], [0.36, 0, 0.2, 0.2], [0.45, 0.05, 0.14, 0.14],
    [0.5, 0.12, 0.12, 0.12], [0.52, 0.19, 0.105, 0.105], [0.5, 0.26, 0.08, 0.085], [0.47, 0.305, 0.03, 0.03]]
  uprightLoft(b, S, { back: fur, belly: fur.clone().lerp(dark, 0.3), paint: (h, u, c) => { if (h > 0.46 && u < 0.2) c.lerp(face, 0.9 * smoothstep(0.46, 0.5, h)) } })
  for (const s of mirror) {
    const hand = v(s * 0.2, 0.52, 0.34)
    tube(b, [v(s * 0.2, 0.36, 0.08), v(s * 0.3, 0.4, 0.22), hand], [0.075, 0.062, 0.05], { segments: 9, base: fur, tip: dark, random, mottle: 0.1 })
    for (const k of [-1, 0, 1]) tube(b, [v(hand.x + k * 0.025, hand.y, hand.z), v(hand.x + k * 0.03, hand.y + 0.09, hand.z + 0.07)], [0.012, 0.003], { segments: 4, base: claw })
    const foot = v(s * 0.18, 0.04, 0.2)
    tube(b, [v(s * 0.16, 0.18, -0.12), v(s * 0.24, 0.1, 0.05), foot], [0.075, 0.057, 0.045], { segments: 9, base: fur, tip: dark, random })
    for (const k of [-1, 0, 1]) tube(b, [v(foot.x + k * 0.025, foot.y, foot.z), v(foot.x + k * 0.03, 0.0, foot.z + 0.07)], [0.012, 0.003], { segments: 4, base: claw })
    mass(v(s * 0.045, 0.505, 0.285), 0.03, [1.3, 0.5, 0.5], mask, mask, { detail: 1, lumpy: 0 })
    eye(s * 0.05, 0.505, 0.29, 0.008)
  }
  mass(v(0, 0.468, 0.325), 0.022, [1, 0.8, 0.8], mask, mask, { detail: 1, lumpy: 0 })
  return model(b)
}

export function createMacawGeometry(seed = 13) {
  const { b, eye } = kit(seed)
  const { red, yellow, blue, white, beak, beakDark, leg } = C.macaw
  // a scarlet macaw perched upright: body, neck and head are one smooth form; the folded wings are
  // painted down its sides (yellow shoulders, blue flight feathers), and the tail is long and red
  const S = [[0.2, -0.06, 0.04, 0.04], [0.26, -0.05, 0.1, 0.1], [0.36, 0, 0.135, 0.13], [0.46, 0.015, 0.14, 0.135], [0.56, 0.03, 0.115, 0.115],
    [0.62, 0.05, 0.075, 0.08], [0.68, 0.075, 0.085, 0.09], [0.735, 0.09, 0.088, 0.09], [0.762, 0.095, 0.03, 0.03]]
  uprightLoft(b, S, {
    back: red,
    belly: red.clone().multiplyScalar(0.92),
    paint: (h, u, c, side) => {
      const flank = Math.abs(side) > 0.35 && u > -0.55
      if (flank && h > 0.42 && h < 0.58) c.lerp(red.clone().lerp(yellow, 0.7), 0.9)
      if (flank && h > 0.5 && h < 0.57) c.lerp(yellow, 0.95)
      if (flank && h < 0.46 && h > 0.24) c.lerp(blue, 0.92)
      if (u > 0.3 && h < 0.5 && h > 0.24) c.lerp(blue, 0.85)
      if (h > 0.62 && h < 0.74 && u < -0.1 && Math.abs(side) < 0.9) c.lerp(white, 0.9)
    },
  })
  for (const s of mirror) {
    tube(b, [v(s * 0.045, 0.22, 0.0), v(s * 0.047, 0.11, 0.02), v(s * 0.05, 0.03, 0.05)], [0.02, 0.014, 0.011], { segments: 6, base: leg, tip: leg })
    for (const dz of [0.02, 0.05]) tube(b, [v(s * 0.05, 0.03, 0.05), v(s * 0.06 + dz * s, 0.008, 0.09 + dz)], [0.008, 0.003], { segments: 4, base: leg })
    eye(s * 0.084, 0.705, 0.095, 0.013)
  }
  // tail: long red, blue tips
  for (const k of [-1, 0, 1]) leaf(b, v(k * 0.012, 0.25, -0.07), v(k * 0.06, -0.5, -1), 0.5 - Math.abs(k) * 0.06, 0.05, red, blue, { droop: 0.03, fold: 0.15, curl: 0.04, roll: k * 0.1 })
  tube(b, bezier(v(0, 0.7, 0.16), v(0, 0.77, 0.25), v(0, 0.64, 0.28), 5), [0.055, 0.05, 0.042, 0.032, 0.02, 0.01], { segments: 9, base: beak, tip: beak })
  tube(b, [v(0, 0.645, 0.17), v(0, 0.62, 0.225), v(0, 0.6, 0.245)], [0.034, 0.027, 0.01], { segments: 6, base: beakDark, tip: beakDark })
  return model(b)
}

export function createToucanGeometry(seed = 14) {
  const { b, mass, eye } = kit(seed)
  const { black, white, bill, billTip, blue, red } = C.toucan
  // toco toucan: a black body with a white throat and a red patch under the tail, all one smooth
  // form; a huge orange bill with a black tip
  const S = [[0.16, -0.05, 0.05, 0.05], [0.22, -0.04, 0.09, 0.09], [0.32, 0, 0.12, 0.115], [0.42, 0.02, 0.125, 0.12], [0.5, 0.04, 0.1, 0.1],
    [0.55, 0.07, 0.075, 0.08], [0.59, 0.09, 0.075, 0.08], [0.625, 0.1, 0.05, 0.055], [0.64, 0.1, 0.02, 0.02]]
  uprightLoft(b, S, {
    back: black,
    belly: black.clone().multiplyScalar(1.3),
    paint: (h, u, c) => {
      if (h > 0.4 && h < 0.62 && u < -0.1) c.lerp(white, 0.95 * smoothstep(0.4, 0.45, h))
      if (h < 0.24 && u < 0.4) c.lerp(red, 0.9)
    },
  })
  for (const s of mirror) {
    tube(b, [v(s * 0.045, 0.16, 0.0), v(s * 0.048, 0.07, 0.02), v(s * 0.05, 0.02, 0.04)], [0.016, 0.012, 0.01], { segments: 6, base: blue.clone().multiplyScalar(0.8), tip: blue })
    for (const dz of [0.02, 0.05]) tube(b, [v(s * 0.05, 0.02, 0.04), v(s * 0.06 + dz * s, 0.006, 0.08 + dz)], [0.007, 0.003], { segments: 4, base: blue })
    mass(v(s * 0.066, 0.585, 0.105), 0.024, [1, 1, 0.5], blue, blue, { detail: 1, lumpy: 0 })
    eye(s * 0.07, 0.585, 0.11, 0.011)
  }
  // the long tail, lifted so its tip stays above the perch
  tube(b, [v(0, 0.2, -0.06), v(0, 0.1, -0.2), v(0, 0.07, -0.36)], [0.065, 0.055, 0.05], { segments: 9, base: black, tip: white })
  tube(b, bezier(v(0, 0.58, 0.15), v(0, 0.63, 0.29), v(0, 0.52, 0.41), 6), [0.056, 0.052, 0.042, 0.034, 0.025, 0.016, 0.006], { segments: 9, base: bill, tip: billTip })
  return model(b)
}

/* ------------------------------------------------------------------ more ground animals */

export function createAgoutiGeometry(seed = 15) {
  const { b, mass, eye, leg } = kit(seed)
  const { orange, dark, pale } = C.agouti
  // a rabbit-sized rodent: a high rump sloping to a small head, all one surface
  const S = [[-0.3, 0.27, 0.03, 0.03], [-0.26, 0.29, 0.08, 0.1], [-0.14, 0.3, 0.1, 0.13], [0, 0.27, 0.09, 0.12], [0.1, 0.25, 0.075, 0.1],
    [0.2, 0.27, 0.06, 0.08], [0.28, 0.29, 0.05, 0.065], [0.36, 0.28, 0.04, 0.045], [0.43, 0.27, 0.028, 0.03], [0.465, 0.27, 0.01, 0.01]]
  loft(b, S, { back: orange, belly: pale.clone().lerp(orange, 0.25), paint: (z, u, c) => { if (z < -0.1) c.lerp(dark, 0.3 * smoothstep(-0.1, -0.26, z)) } })
  for (const s of mirror) {
    leg(v(s * 0.06, 0.23, 0.14), v(s * 0.075, 0.12, 0.16), v(s * 0.075, 0.015, 0.2), [0.036, 0.026, 0.022], dark, dark, dark, 0.03)
    leg(v(s * 0.07, 0.27, -0.22), v(s * 0.1, 0.13, -0.26), v(s * 0.09, 0.015, -0.2), [0.052, 0.03, 0.022], orange, dark, dark, 0.035)
    mass(v(s * 0.04, 0.37, 0.24), 0.03, [0.45, 1, 0.8], orange, dark, { detail: 1, lumpy: 0 })
    eye(s * 0.047, 0.305, 0.3, 0.012)
  }
  mass(v(0, 0.27, 0.465), 0.014, [1, 0.8, 0.8], C.eye, C.eye, { detail: 0, lumpy: 0 })
  return model(b)
}

export function createArmadilloGeometry(seed = 16) {
  const { b, mass, eye, leg, random, limb } = kit(seed)
  const { shell, band, skin, claw } = C.arma
  // a giant armadillo: a long domed back of overlapping bands, big front claws, a thick tapering tail
  for (let i = 0; i < 9; i += 1) {
    const t = i / 8
    const z = 0.34 - t * 0.74
    const r = 0.27 - Math.abs(t - 0.45) * 0.1
    mass(v(0, 0.28 + (r - 0.2) * 0.6, z), r, [0.9, 0.85, 0.36], i % 2 ? band : shell, shell.clone().multiplyScalar(0.7), { detail: 1, lumpy: 0.012 })
  }
  for (const s of mirror) {
    leg(v(s * 0.2, 0.2, 0.26), v(s * 0.22, 0.1, 0.3), v(s * 0.22, 0.015, 0.36), [0.075, 0.055, 0.045], skin, skin, skin, 0.05)
    for (const k of [-1, 0, 1]) tube(limb(), [v(s * 0.22 + k * 0.03, 0.03, 0.4), v(s * 0.22 + k * 0.04, 0.012, 0.5)], [0.016, 0.004], { segments: 4, base: claw })
    leg(v(s * 0.2, 0.2, -0.26), v(s * 0.22, 0.1, -0.28), v(s * 0.22, 0.015, -0.3), [0.07, 0.05, 0.04], skin, skin, skin, 0.05)
  }
  mass(v(0, 0.2, 0.52), 0.1, [0.75, 0.75, 1.3], skin, skin.clone().multiplyScalar(0.8), { detail: 2 })
  tube(b, [v(0, 0.19, 0.6), v(0, 0.16, 0.7), v(0, 0.13, 0.76)], [0.045, 0.032, 0.014], { segments: 9, base: skin, tip: skin.clone().multiplyScalar(0.7) })
  for (const s of mirror) {
    eye(s * 0.06, 0.24, 0.5, 0.01)
    mass(v(s * 0.07, 0.3, 0.44), 0.03, [0.6, 1, 0.8], shell, skin, { detail: 0, lumpy: 0 })
  }
  tube(b, bezier(v(0, 0.24, -0.38), v(0, 0.2, -0.7), v(0, 0.05, -0.92), 5), [0.1, 0.085, 0.07, 0.055, 0.04, 0.025], { segments: 9, base: shell, tip: skin, random, mottle: 0.08 })
  return model(b)
}

export function createTarantulaGeometry(seed = 17) {
  const { b, mass, eye } = kit(seed)
  const { brown, dark, hair } = C.tarantula
  // a goliath birdeater: fat body, eight long bent legs, hairy
  mass(v(0, 0.045, -0.035), 0.04, [1, 0.75, 1.3], brown, dark, { detail: 1, lumpy: 0.04 })
  mass(v(0, 0.045, 0.03), 0.03, [1, 0.7, 1], hair, brown, { detail: 1, lumpy: 0.03 })
  for (const s of mirror) {
    eye(s * 0.01, 0.065, 0.055, 0.004)
    for (let k = 0; k < 4; k += 1) {
      const z = 0.045 - k * 0.028
      const reach = 0.095 + (k === 0 || k === 3 ? 0.02 : 0)
      const fwd = (1.5 - k) * 0.035
      tube(b, [v(s * 0.02, 0.05, z), v(s * reach * 0.65, 0.085, z + fwd * 0.5), v(s * reach, 0.015, z + fwd)], [0.008, 0.0065, 0.004], { segments: 4, base: brown, tip: dark })
    }
  }
  return model(b)
}

/* ------------------------------------------------------------------ more perching animals */

export function createHowlerGeometry(seed = 18) {
  const { b, mass, eye, random } = kit(seed)
  const { black, red, face } = C.howler
  // a red howler monkey sitting hunched: a rust-red body and one smooth line up into a bearded black face; a long tail
  const S = [[0.03, -0.03, 0.05, 0.05], [0.09, -0.03, 0.16, 0.15], [0.25, 0, 0.19, 0.17], [0.4, 0.03, 0.17, 0.16], [0.5, 0.05, 0.12, 0.12],
    [0.56, 0.08, 0.1, 0.11], [0.62, 0.1, 0.1, 0.11], [0.68, 0.1, 0.07, 0.08], [0.71, 0.1, 0.02, 0.02]]
  uprightLoft(b, S, {
    back: red,
    belly: red.clone().multiplyScalar(0.75),
    paint: (h, u, c) => {
      if (h > 0.5 && u < 0.15) c.lerp(face, 0.95 * smoothstep(0.5, 0.56, h))
      if (h > 0.46 && h < 0.58 && u < 0.4) c.lerp(black, 0.7)
    },
  })
  for (const s of mirror) {
    tube(b, [v(s * 0.14, 0.42, 0.04), v(s * 0.21, 0.28, 0.1), v(s * 0.16, 0.1, 0.18)], [0.055, 0.042, 0.034], { segments: 9, base: red, tip: black, random, mottle: 0.06 })
    tube(b, [v(s * 0.11, 0.12, 0.0), v(s * 0.18, 0.07, 0.12), v(s * 0.15, 0.015, 0.2)], [0.06, 0.047, 0.036], { segments: 9, base: red, tip: black, random })
    eye(s * 0.05, 0.605, 0.185, 0.012)
  }
  mass(v(0, 0.5, 0.15), 0.06, [1, 1.3, 0.8], black, black, { detail: 1, lumpy: 0.03 })
  tube(b, cubic(v(0, 0.12, -0.18), v(0, 0.1, -0.45), v(0.05, 0.02, -0.4), v(0.12, 0.06, -0.34), 7), [0.055, 0.05, 0.046, 0.042, 0.038, 0.033, 0.028, 0.022], { segments: 9, base: red, tip: black })
  return model(b)
}

export function createHarpyEagleGeometry(seed = 19) {
  const { b, eye } = kit(seed)
  const { grey, dark, white, beak, leg, claw } = C.harpy
  // a harpy eagle: upright, a slate back and folded wings (painted dark down the sides), a white
  // front, a grey head with a split crest, huge yellow legs and black talons: one smooth body
  const S = [[0.24, -0.08, 0.05, 0.05], [0.32, -0.07, 0.11, 0.11], [0.45, -0.02, 0.16, 0.15], [0.6, 0, 0.19, 0.17], [0.72, 0.02, 0.17, 0.15],
    [0.8, 0.05, 0.12, 0.11], [0.88, 0.08, 0.1, 0.1], [0.95, 0.1, 0.1, 0.1], [1.0, 0.11, 0.04, 0.04], [1.02, 0.11, 0.01, 0.01]]
  uprightLoft(b, S, {
    back: grey,
    belly: white,
    paint: (h, u, c, side) => {
      if (h > 0.78) c.lerp(grey.clone().lerp(white, 0.2), 0.8)
      if (h > 0.64 && h < 0.8 && u < 0.2) c.lerp(dark, 0.55 * smoothstep(0.64, 0.7, h))
      if (Math.abs(side) > 0.4 && u > -0.4 && h < 0.74 && h > 0.26) c.lerp(dark, 0.7)
      if (h < 0.35) c.lerp(grey, 0.5)
    },
  })
  for (const s of mirror) {
    tube(b, [v(s * 0.08, 0.32, 0.02), v(s * 0.085, 0.16, 0.04), v(s * 0.09, 0.03, 0.06)], [0.04, 0.03, 0.026], { segments: 9, base: leg, tip: leg })
    for (const dx of [-0.03, 0, 0.03]) tube(b, [v(s * 0.09, 0.03, 0.06), v(s * 0.09 + dx, 0.012, 0.13)], [0.02, 0.007], { segments: 4, base: claw, tip: claw })
    eye(s * 0.097, 0.945, 0.14, 0.013)
  }
  tube(b, [v(0, 0.3, -0.08), v(0, 0.12, -0.17), v(0, 0.06, -0.3)], [0.075, 0.068, 0.058], { segments: 9, base: dark, tip: grey })
  for (const k of [-1, 0, 1]) leaf(b, v(0, 1.0, 0.05), v(k * 0.4, 0.5, -1), 0.14, 0.032, dark, grey, { droop: 0.05, fold: 0.1, curl: 0.05 })
  tube(b, bezier(v(0, 0.92, 0.19), v(0, 0.97, 0.27), v(0, 0.85, 0.3), 5), [0.045, 0.042, 0.035, 0.026, 0.015, 0.005], { segments: 9, base: beak, tip: beak })
  return model(b)
}


export const AMAZON_FAUNA_BUILDERS = Object.freeze({
  capybara: createCapybaraGeometry,
  jaguar: createJaguarGeometry,
  tapir: createTapirGeometry,
  anteater: createAnteaterGeometry,
  coati: createCoatiGeometry,
  caiman: createCaimanGeometry,
  anaconda: createAnacondaGeometry,
  tortoise: createTortoiseGeometry,
  frog: createFrogGeometry,
  morpho: createMorphoGeometry,
  capuchin: createCapuchinGeometry,
  sloth: createSlothGeometry,
  macaw: createMacawGeometry,
  toucan: createToucanGeometry,
  agouti: createAgoutiGeometry,
  armadillo: createArmadilloGeometry,
  tarantula: createTarantulaGeometry,
  howler: createHowlerGeometry,
  harpyEagle: createHarpyEagleGeometry,
})
