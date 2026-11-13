/**
 * Small tileable canvas textures for the Sundarbans ground and water (no image files).
 * Detail is restrained on purpose: large-scale colour comes from the ground mesh's vertex
 * colours, so these only add fine grain, crab burrows and soft ripples, with no stripes.
 */
import { CanvasTexture, EquirectangularReflectionMapping, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three'

function hash(x, y, seed) {
  let h = Math.imul(x ^ seed, 0x45d9f3b)
  h = Math.imul(h ^ y, 0x45d9f3b)
  h ^= h >>> 16
  return (h >>> 0) / 0xffffffff
}

function smoothstep(low, high, value) {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)))
  return t * t * (3 - 2 * t)
}

/** Periodic value noise in [0, 1] with `cells` cells across the tile. */
function tileNoise(u, v, cells, seed) {
  const x = u * cells
  const y = v * cells
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const x1 = (x0 + 1) % cells
  const y1 = (y0 + 1) % cells
  const a = hash(x0 % cells, y0 % cells, seed)
  const b = hash(x1, y0 % cells, seed)
  const c = hash(x0 % cells, y1, seed)
  const d = hash(x1, y1, seed)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

function canvasTexture(size, fill, colorSpace) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to create a Sundarbans texture.')
  const image = context.createImageData(size, size)
  fill(image.data, size)
  context.putImageData(image, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = colorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.anisotropy = 4
  return texture
}

/** Mud detail: albedo multiplier (near white) + normal map from the same relief. */
export function createMudTextures() {
  const size = 256
  const relief = new Float32Array(size * size)
  // brightness uses only the fine grain: the coarse 5-cell layer repeats every tile (6.5 m) and
  // showed as blocky dark patches across open mud; large-scale colour comes from the ground mesh
  const grain = new Float32Array(size * size)
  const burrows = new Float32Array(size * size)
  const puddles = new Float32Array(size * size)
  // crab burrows: a few small, dark round holes with a raised rim
  const holes = Array.from({ length: 9 }, (_, i) => [hash(i, 1, 77) * size, hash(i, 2, 77) * size, 1.1 + hash(i, 3, 77) * 0.9])
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size
      const v = y / size
      const fine = tileNoise(u, v, 13, 29) * 0.3 + tileNoise(u, v, 31, 47) * 0.18 + tileNoise(u, v, 64, 71) * 0.1
      let h = tileNoise(u, v, 5, 11) * 0.42 + fine
      grain[y * size + x] = fine / 0.58
      let hole = 0
      for (const [hx, hy, r] of holes) {
        let dx = Math.abs(x - hx)
        let dy = Math.abs(y - hy)
        dx = Math.min(dx, size - dx)
        dy = Math.min(dy, size - dy)
        const d = Math.hypot(dx, dy)
        if (d < r) hole = Math.max(hole, 1 - d / r)
        else if (d < r * 1.9) h += (1 - (d - r) / (r * 0.9)) * 0.05
      }
      relief[y * size + x] = h - hole * 0.35
      burrows[y * size + x] = hole
      const moisture = tileNoise(u, v, 4, 103) * 0.58
        + tileNoise(u, v, 11, 109) * 0.3
        + tileNoise(u, v, 29, 127) * 0.12
      puddles[y * size + x] = smoothstep(0.58, 0.72, moisture) * (1 - hole * 0.7)
    }
  }
  const map = canvasTexture(size, (data) => {
    for (let i = 0; i < size * size; i += 1) {
      const x = i % size
      const y = Math.floor(i / size)
      const speck = hash(x, y, 913) > 0.9975 ? 0.12 : 0
      const shade = 0.9 + (grain[i] - 0.5) * 0.2 - burrows[i] * 0.28 - puddles[i] * 0.035 + speck
      data[i * 4] = Math.max(0, Math.min(255, shade * 255))
      data[i * 4 + 1] = Math.max(0, Math.min(255, shade * 0.985 * 255))
      data[i * 4 + 2] = Math.max(0, Math.min(255, shade * 0.95 * 255))
      data[i * 4 + 3] = 255
    }
  }, SRGBColorSpace)
  const roughnessMap = canvasTexture(size, (data) => {
    for (let i = 0; i < size * size; i += 1) {
      const micro = tileNoise((i % size) / size, Math.floor(i / size) / size, 47, 151)
      // Damp pockets are a little smoother, so they read as wet. They stay well short of a mirror:
      // at 0.24 the low sun was reflected off the flat mud as a long white streak towards the camera.
      const roughness = Math.max(0.56, Math.min(0.98, 0.93 - puddles[i] * 0.4 + (micro - 0.5) * 0.08))
      const value = roughness * 255
      data[i * 4] = value
      data[i * 4 + 1] = value
      data[i * 4 + 2] = value
      data[i * 4 + 3] = 255
    }
  }, NoColorSpace)
  const normalMap = canvasTexture(size, (data) => {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const i = y * size + x
        const l = relief[y * size + ((x + size - 1) % size)]
        const r = relief[y * size + ((x + 1) % size)]
        const u = relief[((y + size - 1) % size) * size + x]
        const d = relief[((y + 1) % size) * size + x]
        data[i * 4] = Math.max(0, Math.min(255, 128 - (r - l) * 260))
        data[i * 4 + 1] = Math.max(0, Math.min(255, 128 - (d - u) * 260))
        data[i * 4 + 2] = 248
        data[i * 4 + 3] = 255
      }
    }
  }, NoColorSpace)
  return { map, normalMap, roughnessMap }
}

/** Soft, non-directional ripples for the tidal water. */
export function createRippleNormalMap() {
  const size = 128
  const height = new Float32Array(size * size)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size
      const v = y / size
      height[y * size + x] = tileNoise(u, v, 6, 5) * 0.5 + tileNoise(u, v, 14, 9) * 0.32 + tileNoise(u, v, 29, 13) * 0.18
    }
  }
  return canvasTexture(size, (data) => {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const i = y * size + x
        const l = height[y * size + ((x + size - 1) % size)]
        const r = height[y * size + ((x + 1) % size)]
        const u = height[((y + size - 1) % size) * size + x]
        const d = height[((y + 1) % size) * size + x]
        data[i * 4] = Math.max(0, Math.min(255, 128 - (r - l) * 420))
        data[i * 4 + 1] = Math.max(0, Math.min(255, 128 - (d - u) * 420))
        data[i * 4 + 2] = 250
        data[i * 4 + 3] = 255
      }
    }
  }, NoColorSpace)
}

/**
 * A tiny equirectangular "sky + forest horizon" for the water's reflections only: the water
 * picks up the sky tint and a dark band of forest at the horizon, no real-time reflection pass.
 */
export function createReflectionTexture({ top, horizon, forest }) {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 32
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to create the Sundarbans reflection texture.')
  const gradient = context.createLinearGradient(0, 0, 0, 32)
  gradient.addColorStop(0, top)
  gradient.addColorStop(0.42, horizon)
  gradient.addColorStop(0.47, forest)
  gradient.addColorStop(0.53, forest)
  gradient.addColorStop(1, forest)
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 32)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.mapping = EquirectangularReflectionMapping
  return texture
}
