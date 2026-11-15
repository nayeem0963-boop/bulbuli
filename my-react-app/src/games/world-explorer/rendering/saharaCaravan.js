/**
 * Life round the Sahara's oasis, as asset-free meshes with per-vertex colours: a caravan of
 * loaded camels and its driver, market stalls under striped awnings, and a mud-brick fort
 * (a ksar) out in the desert beyond the map.
 *
 * Where each piece stands, and how solid it is, is the map's business (biomes/sahara.js
 * `decor`, biomes/common.js); the sizes the colliders rely on are exported here (PACK_CAMEL,
 * STALL, TRADER) and checked in saharaCaravan.test.js.
 *
 * Pure geometry, deterministic (seeded): rendering/SaharaLandmarks.jsx draws it.
 */
import { mulberry32 } from '../../../core/rng.js'
import { bezier, blob, createBuilder, cubic, leaf, linear, tube, v } from './mangroveGeometry.js'
import { finish } from './saharaLandmarks.js'

const turn = (p, rot) => v(p.x * Math.cos(rot) + p.z * Math.sin(rot), p.y, -p.x * Math.sin(rot) + p.z * Math.cos(rot))

/**
 * A box with flat faces: lit top, shaded sides (each face its own tone, so welding the mesh
 * never rounds its corners). `taper` narrows the top (mud-brick walls lean in).
 */
function box(b, centre, size, colour, { rot = 0, taper = 0 } = {}) {
  const [w, h, d] = size.map((n) => n / 2)
  const corner = (sx, sy, sz) => {
    const k = sy > 0 ? 1 - taper : 1
    return turn(v(sx * w * k, sy * h, sz * d * k), rot).add(centre)
  }
  const face = (p, tone) => { const c = colour.clone().multiplyScalar(tone); b.triangle(p[0], p[1], p[2], c); b.triangle(p[0], p[2], p[3], c) }
  face([corner(-1, 1, -1), corner(-1, 1, 1), corner(1, 1, 1), corner(1, 1, -1)], 1.08)
  face([corner(-1, -1, 1), corner(1, -1, 1), corner(1, 1, 1), corner(-1, 1, 1)], 0.97)
  face([corner(1, -1, -1), corner(-1, -1, -1), corner(-1, 1, -1), corner(1, 1, -1)], 0.8)
  face([corner(1, -1, 1), corner(1, -1, -1), corner(1, 1, -1), corner(1, 1, 1)], 0.9)
  face([corner(-1, -1, -1), corner(-1, -1, 1), corner(-1, 1, 1), corner(-1, 1, -1)], 0.86)
}

/* ------------------------------------------------------------------ pack camel */

/**
 * A dromedary on its feet under a load, facing +z. Its body is the cylinder the map makes
 * solid: `radius` round its middle, `top` at the load.
 */
export const PACK_CAMEL = Object.freeze({ radius: 0.8, top: 2.45, headTop: 2.8, length: 3.3 })

const FUR = { light: linear('#dcb882'), mid: linear('#c59759'), dark: linear('#9c7340'), tuft: linear('#8a6234'), pad: linear('#6f5131'), eye: linear('#1c1410') }
const CLOTHS = [linear('#b3402e'), linear('#2f5d8c'), linear('#c98a2b'), linear('#7a2f52'), linear('#3f7a5a')]
const SACK = linear('#cdb48a')
const CRATE = linear('#8a6540')
const ROPE = linear('#d2bf96')

export function createPackCamelGeometry(seed = 1) {
  const random = mulberry32(seed)
  const b = createBuilder()
  const fur = (center, radius, scale, { light = FUR.light, dark = FUR.dark, detail = 2, lumpy = 0.03 } = {}) => blob(b, center, radius, scale, { detail, random, light, dark, lumpy })
  const stride = (random() - 0.5) * 0.5 // where this camel is in its step

  // barrel, shoulders, haunches, hump (mostly under the load)
  fur(v(0, 1.62, -0.05), 1, [0.47, 0.5, 1.02])
  fur(v(0, 1.66, 0.66), 0.46, [0.95, 1.05, 0.95], { lumpy: 0.02 })
  fur(v(0, 1.62, -0.72), 0.47, [0.98, 1.0, 0.95], { lumpy: 0.02 })
  fur(v(0, 2.02, -0.1), 0.42, [0.8, 0.9, 1.1], { light: FUR.mid, dark: FUR.mid })

  // legs: long, knobbly at the knee, broad soft feet; a walking pair is one forward, one back
  const leg = (side, z, swing) => {
    const hip = v(side * 0.27, 1.35, z)
    const knee = v(side * 0.28, 0.72, z + swing * 0.5 + 0.03)
    const foot = v(side * 0.28, 0.07, z + swing)
    tube(b, [hip, knee, foot], [0.18, 0.105, 0.08], { segments: 6, base: FUR.mid, tip: FUR.dark, random, mottle: 0.05, cap: false })
    fur(knee, 0.12, [1, 1, 1], { light: FUR.dark, dark: FUR.dark, detail: 1, lumpy: 0 })
    fur(v(foot.x, 0.06, foot.z + 0.04), 0.11, [1, 0.55, 1.3], { light: FUR.pad, dark: FUR.pad, detail: 1, lumpy: 0 })
  }
  leg(-1, 0.72, stride)
  leg(1, 0.72, -stride)
  leg(-1, -0.78, -stride)
  leg(1, -0.78, stride)

  // neck and head, carried high
  const neck = cubic(v(0, 1.72, 0.9), v(0, 1.5, 1.5), v(0, 2.05, 1.78), v(0, 2.52, 1.55), 9)
  tube(b, neck, [0.26, 0.24, 0.21, 0.19, 0.17, 0.155, 0.145, 0.138, 0.132, 0.126], { segments: 9, base: FUR.mid, tip: FUR.light, random, mottle: 0.05 })
  fur(v(0, 2.56, 1.67), 0.2, [0.78, 0.82, 1.4], { detail: 1 })
  fur(v(0, 2.49, 1.93), 0.13, [0.9, 0.85, 1.15], { light: FUR.mid, dark: FUR.dark, detail: 1 })
  for (const side of [-1, 1]) {
    leaf(b, v(side * 0.11, 2.67, 1.55), v(side * 0.6, 1, -0.4), 0.11, 0.04, FUR.mid, FUR.dark, { droop: 0 })
    blob(b, v(side * 0.135, 2.61, 1.77), 0.034, [0.6, 1, 1], { detail: 0, random, light: FUR.eye, dark: FUR.eye, lumpy: 0 })
  }
  tube(b, bezier(v(0, 1.8, -1.12), v(0.02, 1.7, -1.34), v(0.06, 1.2, -1.3), 5), [0.05, 0.045, 0.04, 0.035, 0.03, 0.028], { segments: 5, base: FUR.mid, tip: FUR.dark })
  fur(v(0.065, 1.14, -1.29), 0.06, [0.8, 1.5, 0.8], { light: FUR.tuft, dark: FUR.tuft, detail: 0, lumpy: 0 })

  // the load: a woven blanket over the hump, a bundle each side, a roll on top, tied with rope
  const cloth = CLOTHS[Math.floor(random() * CLOTHS.length)]
  const trim = CLOTHS[Math.floor(random() * CLOTHS.length)]
  blob(b, v(0, 1.98, -0.1), 0.62, [0.92, 0.72, 1.12], { detail: 2, random, light: cloth, dark: cloth.clone().multiplyScalar(0.55), lumpy: 0.03 })
  for (const side of [-1, 1]) {
    if (random() < 0.5) {
      box(b, v(side * 0.66, 1.68, -0.12), [0.34, 0.5, 0.8], CRATE, { rot: (random() - 0.5) * 0.1 })
      box(b, v(side * 0.66, 1.68, -0.12), [0.36, 0.06, 0.82], CRATE.clone().multiplyScalar(0.7))
    } else {
      blob(b, v(side * 0.66, 1.66, -0.02 - random() * 0.2), 0.34, [0.75, 1, 1.15], { detail: 1, random, light: SACK, dark: SACK.clone().multiplyScalar(0.6), lumpy: 0.12 })
    }
    tube(b, [v(side * 0.52, 2.25, -0.1), v(side * 0.86, 1.7, -0.1), v(side * 0.6, 1.36, -0.1)], [0.022, 0.022, 0.022], { segments: 4, base: ROPE, cap: false })
  }
  tube(b, [v(-0.5, 2.36, -0.12), v(0.5, 2.36, -0.12)], [0.15, 0.15], { segments: 8, base: trim, tip: trim.clone().multiplyScalar(0.8) })
  // halter and lead rope hanging from the muzzle
  tube(b, [v(0, 2.44, 1.9), v(0, 2.0, 1.98), v(0, 1.72, 2.1)], [0.016, 0.016, 0.016], { segments: 4, base: ROPE, cap: false })
  return finish(b)
}

/* ------------------------------------------------------------------ people */

/** A robed, veiled figure about 1.7 m tall, facing +z; solid as a `radius`-wide post. */
export const TRADER = Object.freeze({ radius: 0.3, top: 1.75 })

const ROBES = [linear('#2b4f8a'), linear('#e8dcc2'), linear('#34597a'), linear('#8a5a34')]
const SKIN = linear('#8a5a3c')

/** `staff`: a camel driver walking with a stick; otherwise a stall-keeper with folded arms. */
export function createTraderGeometry(seed = 1, { staff = false } = {}) {
  const random = mulberry32(seed)
  const b = createBuilder()
  const robe = ROBES[Math.floor(random() * ROBES.length)]
  const veil = random() < 0.6 ? linear('#1f3a66') : linear('#efe6d2')
  const shade = robe.clone().multiplyScalar(0.62)
  // a long robe: wide at the hem, narrow at the shoulders
  tube(b, [v(0, 0.02, 0), v(0, 0.5, 0), v(0, 1.05, 0), v(0, 1.36, 0), v(0, 1.45, 0)], [0.3, 0.26, 0.21, 0.2, 0.1], { segments: 9, base: shade, tip: robe, random, mottle: 0.06 })
  for (const side of [-1, 1]) {
    const shoulder = v(side * 0.19, 1.36, 0)
    const hand = staff && side === 1 ? v(0.3, 1.02, 0.26) : v(side * 0.06, 1.0, 0.2)
    tube(b, [shoulder, v(side * 0.27, 1.12, 0.06), hand], [0.075, 0.065, 0.05], { segments: 6, base: robe, tip: robe, random, mottle: 0.05 })
    blob(b, hand, 0.05, [1, 1, 1], { detail: 0, random, light: SKIN, dark: SKIN, lumpy: 0 })
  }
  // head wrapped in a turban and veil: only a band round the eyes shows
  blob(b, v(0, 1.57, 0), 0.125, [1, 1.1, 1], { detail: 1, random, light: SKIN, dark: SKIN.clone().multiplyScalar(0.7), lumpy: 0 })
  blob(b, v(0, 1.66, -0.01), 0.155, [1.05, 0.62, 1.05], { detail: 1, random, light: veil, dark: veil.clone().multiplyScalar(0.7), lumpy: 0.08 })
  blob(b, v(0, 1.49, 0.02), 0.135, [1, 0.6, 1], { detail: 1, random, light: veil, dark: veil.clone().multiplyScalar(0.7), lumpy: 0.05 })
  if (staff) tube(b, [v(0.3, 0.02, 0.34), v(0.3, 1.5, 0.22)], [0.018, 0.016], { segments: 4, base: linear('#6e4f31') })
  return finish(b)
}

/* ------------------------------------------------------------------ market stall */

/**
 * A stall under a striped awning on four poles, goods laid out on a rug. Solid as one cylinder
 * (`radius`), up to the awning (`top`), which carries the bird like a roof.
 */
export const STALL = Object.freeze({ radius: 1.5, top: 2.1, halfWidth: 1.3, halfDepth: 1.0, awning: 2.1 })

/** Height of the awning's cloth above the stall's foot at (x, z) in the stall's own coordinates. */
export function stallRoofAt(x, z) {
  const { halfWidth: w, halfDepth: d, awning } = STALL
  const s = Math.max(0, Math.min(1, (x + w + 0.12) / (2 * w + 0.24)))
  const t = Math.max(0, Math.min(1, (z + d + 0.12) / (2 * d + 0.3)))
  return awning - t * 0.3 - Math.sin(s * Math.PI) * Math.sin(t * Math.PI) * 0.16
}

const WOOD = { base: linear('#6e4f31'), tip: linear('#8a6843') }
const CLAY = [linear('#b5653a'), linear('#c98450'), linear('#9a5230')]
const FRUIT = [linear('#d0902f'), linear('#c9612a'), linear('#8a4d1d')]

export function createStallGeometry(seed = 1) {
  const random = mulberry32(seed)
  const b = createBuilder()
  const { halfWidth: w, halfDepth: d, awning } = STALL
  const stripeA = CLOTHS[Math.floor(random() * CLOTHS.length)]
  const stripeB = linear('#efe2c4')

  // poles: the back pair taller, so the cloth slopes forward (+z is the front)
  const poleTop = (z) => awning - 0.08 - (z > 0 ? 0.3 : 0)
  for (const [x, z] of [[-w, -d], [w, -d], [-w, d], [w, d]]) {
    tube(b, [v(x, -0.05, z), v(x, poleTop(z) + 0.12, z)], [0.05, 0.04], { segments: 6, base: WOOD.base, tip: WOOD.tip, random, mottle: 0.1 })
  }
  // awning: striped cloth sagging between the poles, a scalloped edge hanging at the front
  const columns = 12
  const rows = 5
  const clothAt = (i, j) => {
    const x = -w - 0.12 + (i / columns) * (2 * w + 0.24)
    const z = -d - 0.12 + (j / rows) * (2 * d + 0.3)
    return v(x, stallRoofAt(x, z), z)
  }
  for (let i = 0; i < columns; i += 1) {
    const colour = i % 2 ? stripeB : stripeA
    for (let j = 0; j < rows; j += 1) {
      const tone = colour.clone().multiplyScalar(0.9 + 0.1 * (j / rows))
      b.triangle(clothAt(i, j), clothAt(i, j + 1), clothAt(i + 1, j + 1), tone)
      b.triangle(clothAt(i, j), clothAt(i + 1, j + 1), clothAt(i + 1, j), tone)
    }
    const a = clothAt(i, rows)
    const c = clothAt(i + 1, rows)
    b.triangle(a, v((a.x + c.x) / 2, a.y - 0.2, a.z + 0.02), c, colour.clone().multiplyScalar(0.85))
  }

  // a rug on the sand and a low table at the back
  box(b, v(0, 0.015, 0.1), [2 * w - 0.3, 0.03, 2 * d - 0.3], CLOTHS[Math.floor(random() * CLOTHS.length)].clone().multiplyScalar(0.8))
  box(b, v(0, 0.02, 0.1), [2 * w - 0.7, 0.032, 2 * d - 0.7], stripeB.clone().multiplyScalar(0.85))
  box(b, v(0, 0.34, -d + 0.38), [2 * w - 0.5, 0.06, 0.6], WOOD.tip)
  for (const x of [-w + 0.4, w - 0.4]) box(b, v(x, 0.16, -d + 0.38), [0.08, 0.32, 0.5], WOOD.base)

  // clay pots: a belly, a neck and a lip
  const pot = (x, y, z, size) => {
    const clay = CLAY[Math.floor(random() * CLAY.length)]
    const r = [0.5, 0.95, 1, 0.8, 0.45, 0.55].map((k) => k * 0.2 * size)
    const h = [0, 0.12, 0.3, 0.46, 0.56, 0.62].map((k) => y + k * size)
    tube(b, h.map((py) => v(x, py, z)), r, { segments: 9, base: clay.clone().multiplyScalar(0.75), tip: clay, cap: false })
    blob(b, v(x, y + 0.56 * size, z), 0.085 * size, [1, 0.3, 1], { detail: 0, random, light: linear('#2a1c12'), dark: linear('#2a1c12'), lumpy: 0 })
  }
  pot(-w + 0.35, 0, d - 0.25, 1.2)
  pot(-w + 0.8, 0, d - 0.45, 0.85)
  pot(w - 0.4, 0, d - 0.3, 1)
  pot(-0.55, 0.37, -d + 0.4, 0.55)
  pot(-0.2, 0.37, -d + 0.3, 0.45)
  // baskets heaped with dates and oranges
  const basket = (x, y, z, fruit) => {
    tube(b, [v(x, y, z), v(x, y + 0.16, z)], [0.17, 0.23], { segments: 9, base: linear('#a8844c'), tip: linear('#c9a866'), random, mottle: 0.15, cap: false })
    blob(b, v(x, y + 0.16, z), 0.2, [1, 0.5, 1], { detail: 1, random, light: fruit, dark: fruit.clone().multiplyScalar(0.6), lumpy: 0.25 })
  }
  basket(0.4, 0.37, -d + 0.4, FRUIT[0])
  basket(0.85, 0.37, -d + 0.36, FRUIT[1])
  basket(0.15, 0.03, d - 0.35, FRUIT[2])
  // sacks and a crate
  blob(b, v(w - 0.45, 0.2, -0.1), 0.3, [0.9, 0.85, 0.9], { detail: 1, random, light: SACK, dark: SACK.clone().multiplyScalar(0.6), lumpy: 0.14 })
  blob(b, v(w - 0.85, 0.17, 0.15), 0.25, [0.9, 0.85, 0.9], { detail: 1, random, light: SACK, dark: SACK.clone().multiplyScalar(0.6), lumpy: 0.14 })
  box(b, v(-w + 0.45, 0.2, -0.05), [0.5, 0.4, 0.45], CRATE, { rot: 0.3 })
  return finish(b)
}

/* ------------------------------------------------------------------ desert fort */

/**
 * A ksar: a walled, mud-brick fort with corner towers, a gate and a tall watchtower. It stands
 * in the open desert beyond the map, where the bird never goes, so it is not solid.
 * Local coordinates: the gate faces +z.
 */
export const FORT = Object.freeze({ halfWidth: 14, halfDepth: 10, wall: 7, tower: 10.5, keep: 17 })

const MUD = { wall: linear('#c9995f'), light: linear('#d8ad74'), dark: linear('#3a2a1c'), wood: linear('#6b4a2c') }

export function createFortGeometry(seed = 7) {
  const random = mulberry32(seed)
  const b = createBuilder()
  const { halfWidth: w, halfDepth: d, wall, tower, keep } = FORT
  const mud = () => MUD.wall.clone().multiplyScalar(0.94 + random() * 0.12)
  // crenellations along a wall top, from (x0, z0) to (x1, z1)
  const battlements = (x0, z0, x1, z1, y, size = 0.9) => {
    const length = Math.hypot(x1 - x0, z1 - z0)
    const count = Math.max(2, Math.round(length / (size * 2)))
    const rot = Math.atan2(-(z1 - z0), x1 - x0)
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count
      box(b, v(x0 + (x1 - x0) * t, y + size * 0.45, z0 + (z1 - z0) * t), [size, size * 0.9, 0.9], mud(), { rot })
    }
  }
  const slits = (x, z, y, rot, count, spacing) => {
    for (let i = 0; i < count; i += 1) {
      const off = (i - (count - 1) / 2) * spacing
      box(b, turn(v(off, 0, 0), rot).add(v(x, y, z)), [0.35, 1.1, 0.2], MUD.dark, { rot })
    }
  }

  // curtain walls, sunk well into the sand so the swell of the ground never shows under them
  const sink = 3
  const walls = [[-w, d, w, d], [-w, -d, w, -d], [-w, -d, -w, d], [w, -d, w, d]]
  for (const [x0, z0, x1, z1] of walls) {
    const length = Math.hypot(x1 - x0, z1 - z0)
    const rot = Math.atan2(-(z1 - z0), x1 - x0)
    box(b, v((x0 + x1) / 2, (wall - sink) / 2, (z0 + z1) / 2), [length, wall + sink, 1.6], mud(), { rot, taper: 0.02 })
    battlements(x0, z0, x1, z1, wall)
  }
  slits(-w * 0.5, d + 0.75, wall - 1.6, 0, 3, 2.2)
  slits(w * 0.5, d + 0.75, wall - 1.6, 0, 3, 2.2)

  // gatehouse: taller than the wall, a dark doorway with wooden doors standing open
  box(b, v(0, (wall + 2 - sink) / 2, d), [7, wall + 2 + sink, 2.6], mud(), { taper: 0.03 })
  battlements(-3.3, d, 3.3, d, wall + 2, 0.8)
  box(b, v(0, 2.3, d + 1.28), [3.2, 4.6, 0.2], MUD.dark)
  box(b, v(0, 4.85, d + 1.28), [2.2, 0.6, 0.2], MUD.dark)
  for (const side of [-1, 1]) box(b, v(side * 2.3, 2.2, d + 2.0), [0.16, 4.4, 1.5], MUD.wood, { rot: side * 0.5 })

  // corner towers, square and leaning in, with their own battlements
  for (const [x, z] of [[-w, -d], [w, -d], [-w, d], [w, d]]) {
    box(b, v(x, (tower - sink) / 2, z), [4.2, tower + sink, 4.2], mud(), { taper: 0.12 })
    const top = 4.2 * 0.88 / 2
    battlements(x - top, z + top, x + top, z + top, tower, 0.7)
    battlements(x - top, z - top, x + top, z - top, tower, 0.7)
    slits(x, z + 2.0, tower - 2.4, 0, 1, 1)
  }

  // inside: flat-roofed houses showing above the wall, and the watchtower
  for (const [x, z, sx, h, sz] of [[-7, -3, 6, wall + 1.2, 5], [6.5, 2, 5, wall + 2.4, 6], [-2, 3, 4.5, wall + 0.6, 4]]) {
    box(b, v(x, (h - sink) / 2, z), [sx, h + sink, sz], MUD.light.clone().multiplyScalar(0.92 + random() * 0.1), { taper: 0.04 })
    slits(x, z + sz / 2 - 0.05, h - 1.3, 0, 2, 1.6)
  }
  const kx = 4
  const kz = -4.5
  box(b, v(kx, (keep - sink) / 2, kz), [4.6, keep + sink, 4.6], mud(), { taper: 0.16 })
  box(b, v(kx, keep + 0.25, kz), [4.6, 0.5, 4.6], MUD.light)
  for (const [x0, z0, x1, z1] of [[-2.1, 2.1, 2.1, 2.1], [-2.1, -2.1, 2.1, -2.1], [-2.1, -2.1, -2.1, 2.1], [2.1, -2.1, 2.1, 2.1]]) battlements(kx + x0, kz + z0, kx + x1, kz + z1, keep + 0.5, 0.7)
  slits(kx, kz + 2.05, keep - 2.2, 0, 2, 1.3)
  slits(kx, kz + 2.2, keep - 7, 0, 1, 1)
  // roof beams poking out below the tower's top, as mud-brick towers have
  for (let i = 0; i < 4; i += 1) tube(b, [v(kx - 1.4 + i * 0.93, keep - 4.2, kz + 1.9), v(kx - 1.4 + i * 0.93, keep - 4.2, kz + 2.9)], [0.09, 0.09], { segments: 4, base: MUD.wood })
  return b.build()
}
