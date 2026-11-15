/**
 * The Amazon Rainforest player bird, built in code: a small tanager with an orange-red head and
 * breast, an olive back, a dark tail and a short grey beak. It replaces a downloaded model, so
 * there is no file to fetch and no third-party licence (see AmazonBirdAvatar.jsx).
 *
 * Four vertex-coloured parts, so the avatar can move them: body (with legs), head (with beak and
 * eyes, turning on the neck), tail (wagging), and the wing shapes drawn in AmazonBirdAvatar.jsx.
 * Metres, feet on y = 0, facing +z, beak tip to tail tip about 0.44 m: Bulbuli's size, so the
 * camera framing and the map's scale fit. Pure and deterministic (seeded).
 */
import { mulberry32 } from '../../../core/rng.js'
import { blob, createBuilder, leaf, linear, tube, v } from './mangroveGeometry.js'
import { finish } from './saharaLandmarks.js'

export const RAINFOREST_BIRD = Object.freeze({
  length: 0.44,
  /** Top of the head above the feet. */
  height: 0.27,
  /** Where the head turns, and where the tail is hinged. */
  neck: [0, 0.2, 0.085],
  tailRoot: [0, 0.15, -0.095],
  /** Where each wing is hinged: x (per side), y, z. */
  shoulder: [0.062, 0.185, 0.01],
})

const C = {
  breast: linear('#e8742a'),
  breastLow: linear('#f0a24a'),
  head: linear('#d6381f'),
  headTop: linear('#ef5a2a'),
  back: linear('#6b7f2e'),
  backDark: linear('#4a5a22'),
  tail: linear('#1f4a3a'),
  tailTip: linear('#0f2a22'),
  beak: linear('#8d949a'),
  beakTip: linear('#4d5459'),
  leg: linear('#8a7a66'),
  eye: linear('#120e0c'),
  shine: linear('#ffffff'),
}

export function createRainforestBirdParts(seed = 3) {
  const random = mulberry32(seed)
  const fur = (b, center, radius, scale, light, dark, { detail = 2, lumpy = 0.02 } = {}) => blob(b, center, radius, scale, { detail, random, light, dark, lumpy })

  // body: an orange breast under an olive back, a rounded rump, soft shoulders
  const body = createBuilder()
  fur(body, v(0, 0.135, -0.005), 0.1, [0.68, 0.74, 1.12], C.back, C.back.clone().lerp(C.breast, 0.7))
  fur(body, v(0, 0.112, 0.05), 0.066, [0.88, 0.8, 0.95], C.breast, C.breastLow, { detail: 1 })
  fur(body, v(0, 0.15, -0.07), 0.07, [0.85, 0.75, 1], C.back, C.backDark, { detail: 1 })
  const parts = { body: finish(body) }

  // legs (their own part, hinged at the hips so they can tuck up in flight): thin, three forward toes and a short back one
  const legs = createBuilder()
  for (const side of [-1, 1]) {
    const hip = v(side * 0.03, 0.072, 0.005)
    const foot = v(side * 0.032, 0.006, 0.014)
    tube(legs, [hip, v(side * 0.032, 0.038, 0.01), foot], [0.0085, 0.0065, 0.006], { segments: 5, base: C.leg, cap: false })
    for (const [dx, dz] of [[0.012 * side, 0.034], [0, 0.04], [-0.012 * side, 0.032], [0, -0.016]]) tube(legs, [foot, v(foot.x + dx, 0.004, foot.z + dz)], [0.005, 0.0035], { segments: 4, base: C.leg })
  }
  parts.legs = finish(legs)

  // head: round, a short thick beak, two shining eyes; built round the neck pivot so it can turn
  const [, ny, nz] = RAINFOREST_BIRD.neck
  const head = createBuilder()
  fur(head, v(0, 0.215 - ny, 0.112 - nz), 0.062, [0.9, 0.92, 1], C.headTop, C.head, { detail: 2 })
  fur(head, v(0, 0.195 - ny, 0.1 - nz), 0.05, [0.9, 0.8, 1], C.head, C.breast, { detail: 1 })
  tube(head, [v(0, 0.208 - ny, 0.158 - nz), v(0, 0.202 - ny, 0.19 - nz), v(0, 0.196 - ny, 0.218 - nz)], [0.026, 0.017, 0.004], { segments: 6, base: C.beak, tip: C.beakTip })
  tube(head, [v(0, 0.2 - ny, 0.156 - nz), v(0, 0.193 - ny, 0.186 - nz), v(0, 0.19 - ny, 0.208 - nz)], [0.018, 0.012, 0.004], { segments: 5, base: C.beak.clone().multiplyScalar(0.85), tip: C.beakTip })
  for (const side of [-1, 1]) {
    fur(head, v(side * 0.047, 0.222 - ny, 0.138 - nz), 0.011, [1, 1, 0.7], C.eye, C.eye, { detail: 1, lumpy: 0 })
    fur(head, v(side * 0.0525, 0.2255 - ny, 0.1425 - nz), 0.0035, [1, 1, 1], C.shine, C.shine, { detail: 0, lumpy: 0 })
  }
  parts.head = finish(head)

  // tail: five long feathers fanned a little, dark, tipped darker; its origin is the hinge (tailRoot)
  const tail = createBuilder()
  for (let k = -2; k <= 2; k += 1) {
    const length = 0.135 - Math.abs(k) * 0.012 + random() * 0.006
    leaf(tail, v(k * 0.006, 0, 0), v(k * 0.1, -0.2, -1), length, 0.03, C.tail, C.tailTip, { droop: 0.04, fold: 0.15, curl: 0.12, roll: 0.1 * k })
  }
  parts.tail = finish(tail)
  return parts
}
