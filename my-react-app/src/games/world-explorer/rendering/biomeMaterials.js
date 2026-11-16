import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three'

export const SURFACE_PROFILES = Object.freeze({
  sundarbans: {
    roughness: 0.91, metalness: 0, detail: 0.68, normalScale: 0.34,
    colors: [0.78, 0.7, 0.58], wetness: 0.6,
  },
  amazon: {
    roughness: 0.94, metalness: 0, detail: 0.72, normalScale: 0.38,
    colors: [0.73, 0.69, 0.57], wetness: 0.12,
  },
  sahara: {
    roughness: 0.97, metalness: 0, detail: 0.9, normalScale: 0.68,
    colors: [0.83, 0.76, 0.62], wetness: 0,
  },
})

const SIZE = 128

function hash2(x, y, seed) {
  let value = Math.imul(x ^ seed, 0x45d9f3b)
  value = Math.imul(value ^ y, 0x45d9f3b)
  value ^= value >>> 16
  return (value >>> 0) / 0xffffffff
}

function fade(value) {
  return value * value * (3 - 2 * value)
}

function periodicNoise(u, v, cells, seed) {
  const x = u * cells
  const y = v * cells
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = (x0 + 1) % cells
  const y1 = (y0 + 1) % cells
  const fx = fade(x - x0)
  const fy = fade(y - y0)
  const a = hash2(x0, y0, seed)
  const b = hash2(x1, y0, seed)
  const c = hash2(x0, y1, seed)
  const d = hash2(x1, y1, seed)
  const top = a + (b - a) * fx
  const bottom = c + (d - c) * fx
  return top + (bottom - top) * fy
}

function smoothstep(low, high, value) {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)))
  return t * t * (3 - 2 * t)
}

function makeTexture(pixels, colorSpace) {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to create procedural World Explorer material texture.')
  const image = context.createImageData(SIZE, SIZE)
  image.data.set(pixels)
  context.putImageData(image, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = colorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.anisotropy = 4
  return texture
}

export function createBiomeSurfaceTextures(biomeId) {
  const profile = SURFACE_PROFILES[biomeId]
  if (!profile) throw new Error(`Unknown World Explorer surface profile: ${biomeId}`)

  const albedo = new Uint8Array(SIZE * SIZE * 4)
  const normal = new Uint8Array(SIZE * SIZE * 4)
  const roughness = new Uint8Array(SIZE * SIZE * 4)
  const ambientOcclusion = new Uint8Array(SIZE * SIZE * 4)
  const relief = new Float32Array(SIZE * SIZE)
  const puddles = new Float32Array(SIZE * SIZE)
  const seed = biomeId.length * 313

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const u = x / SIZE
      const v = y / SIZE
      const broad = periodicNoise(u, v, 3, seed + 11)
      const medium = periodicNoise(u, v, 11, seed + 29)
      const fine = periodicNoise(u, v, 37, seed + 47)
      const grain = periodicNoise(u, v, 63, seed + 71)
      const rootRidge = 1 - Math.abs(Math.sin(v * 16 * Math.PI + Math.sin(u * 6 * Math.PI) * 1.4))
      const windRipple = Math.sin((u * 18 + v * 3.2) * Math.PI * 2 + medium * 1.5)
      const mossPatch = smoothstep(0.57, 0.84, medium * 0.64 + broad * 0.36)
      const leafLitter = hash2(Math.floor(u * 48), Math.floor(v * 48), seed + 97)
      let height = broad * 0.46 + medium * 0.32 + fine * 0.16 + grain * 0.06
      if (biomeId === 'sundarbans') height += rootRidge * 0.12
      if (biomeId === 'sahara') height = broad * 0.2 + medium * 0.22 + windRipple * 0.45 + fine * 0.13
      relief[y * SIZE + x] = height

      const puddle = biomeId === 'sundarbans'
        ? smoothstep(0.62, 0.82, broad * 0.68 + medium * 0.32) * (1 - smoothstep(0.76, 0.92, rootRidge))
        : 0
      puddles[y * SIZE + x] = puddle

      let brightness = (biomeId === 'sundarbans' ? 0.81 : 0.76) + broad * 0.055 + medium * 0.045 + fine * 0.025 + grain * 0.012
      let redTint = 1
      let greenTint = 1
      let blueTint = 1
      if (biomeId === 'sundarbans') {
        brightness -= puddle * 0.08 + rootRidge * 0.035
        redTint = 1
        greenTint = 0.91 + medium * 0.025
        blueTint = 0.76 + medium * 0.025
      } else if (biomeId === 'amazon') {
        const litter = leafLitter > 0.955 ? 0.13 : 0
        brightness -= mossPatch * 0.06 + litter
        redTint = 0.91 + litter * 0.65
        greenTint = 0.97 + mossPatch * 0.05
        blueTint = 0.78 + litter * 0.2
      } else {
        brightness += windRipple * 0.025
        redTint = 1
        greenTint = 0.97
        blueTint = 0.9
      }

      const i = (y * SIZE + x) * 4
      albedo[i] = Math.max(0, Math.min(255, brightness * redTint * 255))
      albedo[i + 1] = Math.max(0, Math.min(255, brightness * greenTint * 255))
      albedo[i + 2] = Math.max(0, Math.min(255, brightness * blueTint * 255))
      albedo[i + 3] = 255

      const puddleHeight = puddles[y * SIZE + x]
      const rough = biomeId === 'sundarbans'
        ? 0.94 - puddleHeight * 0.72 + rootRidge * 0.035
        : biomeId === 'amazon'
          ? 0.82 + mossPatch * 0.1 + (fine - 0.5) * 0.08
          : 0.96 + Math.abs(windRipple) * 0.035 + (grain - 0.5) * 0.035
      const roughByte = Math.max(0, Math.min(255, rough * 255))
      roughness[i] = roughByte
      roughness[i + 1] = roughByte
      roughness[i + 2] = roughByte
      roughness[i + 3] = 255

      const ao = biomeId === 'sundarbans'
        ? 0.93 - rootRidge * 0.13 - puddleHeight * 0.08
        : biomeId === 'amazon'
          ? 0.91 - mossPatch * 0.08 - (leafLitter > 0.955 ? 0.1 : 0)
          : 0.95 - Math.abs(windRipple) * 0.035
      const aoByte = Math.max(0, Math.min(255, ao * 255))
      ambientOcclusion[i] = aoByte
      ambientOcclusion[i + 1] = aoByte
      ambientOcclusion[i + 2] = aoByte
      ambientOcclusion[i + 3] = 255
    }
  }

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const i = (y * SIZE + x) * 4
      const left = relief[y * SIZE + ((x + SIZE - 1) % SIZE)]
      const right = relief[y * SIZE + ((x + 1) % SIZE)]
      const up = relief[((y + SIZE - 1) % SIZE) * SIZE + x]
      const down = relief[((y + 1) % SIZE) * SIZE + x]
      const strength = profile.normalScale * 92
      normal[i] = Math.max(0, Math.min(255, 128 - (right - left) * strength))
      normal[i + 1] = Math.max(0, Math.min(255, 128 - (down - up) * strength))
      normal[i + 2] = 250
      normal[i + 3] = 255
    }
  }

  return {
    map: makeTexture(albedo, SRGBColorSpace),
    normalMap: makeTexture(normal, NoColorSpace),
    roughnessMap: makeTexture(roughness, NoColorSpace),
    aoMap: makeTexture(ambientOcclusion, NoColorSpace),
  }
}
