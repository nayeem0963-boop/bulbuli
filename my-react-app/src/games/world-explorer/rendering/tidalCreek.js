/**
 * Station 1 dressing ("Where three rivers meet"): three small tidal channels of brown-green
 * water winding across the mud, joining, and running on as one wider channel.
 *
 * One flat mesh laid on the ground. Each channel is a strip of water (deeper and greener in the
 * middle, browner in the shallows) inside a band of dark wet mud whose outer edge fades to
 * nothing, so the banks melt into the ground instead of ending in an outline. Vertex colours
 * carry the fade (RGBA), so the material must be transparent.
 *
 * Local coordinates: x runs downstream (towards the station), within about ±3 m by ±1.6 m.
 */
import { BufferGeometry, Color, Float32BufferAttribute } from 'three'

// silty tidal water: brown-green in the middle, browner where it is shallow
const DEEP = new Color('#5e6146')
const SHALLOW = new Color('#84744f')
const WET_MUD = new Color('#4c4033')

/** Where the three channels meet. */
const MEET = [0.35, -0.05]
/** [control points, water half-width at the start, at the end, fades in at the start, fades out at the end] */
export const CREEK_CHANNELS = Object.freeze([
  { points: [[-2.7, -1.15], [-1.6, -0.98], [-0.6, -0.5], MEET], from: 0.07, to: 0.2, source: true },
  { points: [[-2.9, 0.08], [-1.85, 0.24], [-0.75, 0.06], MEET], from: 0.08, to: 0.22, source: true },
  { points: [[-2.4, 1.25], [-1.5, 1.0], [-0.55, 0.52], MEET], from: 0.06, to: 0.19, source: true },
  { points: [MEET, [1.15, -0.22], [2.0, 0.06], [2.8, -0.02]], from: 0.27, to: 0.4, mouth: true },
])

const STEPS = 14
/** Across a channel: [offset in water half-widths, offset in bank widths, colour, opacity]. */
const SECTION = [
  [-1, -1, WET_MUD, 0], [-1, -0.35, WET_MUD, 0.8], [-1, 0, SHALLOW, 0.96], [-0.45, 0, DEEP, 1],
  [0.45, 0, DEEP, 1], [1, 0, SHALLOW, 0.96], [1, 0.35, WET_MUD, 0.8], [1, 1, WET_MUD, 0],
]

/** Catmull-Rom through the control points, t in 0..1. */
function along(points, t) {
  const n = points.length - 1
  const f = Math.min(n - 1e-9, t * n)
  const i = Math.floor(f)
  const u = f - i
  const p = (k) => points[Math.max(0, Math.min(n, k))]
  const axis = (a) => {
    const [p0, p1, p2, p3] = [p(i - 1)[a], p(i)[a], p(i + 1)[a], p(i + 2)[a]]
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)
  }
  return [axis(0), axis(1)]
}

const ripple = (x, z) => Math.sin(x * 7.3 + z * 4.1) * 0.5 + Math.sin(x * 3.1 - z * 8.7) * 0.5

export function createTidalCreekGeometry() {
  const positions = []
  const colors = []
  const indices = []
  for (const channel of CREEK_CHANNELS) {
    const start = positions.length / 3
    for (let i = 0; i <= STEPS; i += 1) {
      const t = i / STEPS
      const [x, z] = along(channel.points, t)
      const [ax, az] = along(channel.points, Math.min(1, t + 0.02))
      const [bx, bz] = along(channel.points, Math.max(0, t - 0.02))
      const length = Math.hypot(ax - bx, az - bz) || 1
      const nx = -(az - bz) / length
      const nz = (ax - bx) / length
      // the banks are irregular: the water and the wet mud each wander a little
      const half = (channel.from + (channel.to - channel.from) * t) * (1 + ripple(x, z) * 0.14)
      const bank = 0.3 + ripple(z + 1.7, x - 0.4) * 0.09
      // a source seeps out of the mud; the mouth spreads and thins towards the station
      const fade = Math.min(channel.source ? Math.min(1, t / 0.22) : 1, channel.mouth ? Math.min(1, (1 - t) / 0.2) : 1)
      for (const [w, b, color, opacity] of SECTION) {
        const offset = w * half + b * bank
        // just proud of the mud, so the ground's own small relief never swallows it
        positions.push(x + nx * offset, b === 0 ? 0.024 : 0.016, z + nz * offset)
        const tone = 1 + ripple(x * 1.9 + w, z * 1.9 - w) * 0.06
        colors.push(color.r * tone, color.g * tone, color.b * tone, opacity * fade)
      }
      if (i > 0) {
        const row = start + i * SECTION.length
        const before = row - SECTION.length
        // wound so the faces look up (the normals point away from the mud)
        for (let k = 0; k < SECTION.length - 1; k += 1) indices.push(before + k, before + k + 1, row + k, before + k + 1, row + k + 1, row + k)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 4))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
