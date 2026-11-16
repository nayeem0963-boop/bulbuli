/**
 * Sundarbans wetland height field (pure functions, no three.js, so the tests can use it).
 *
 * The playable land (the expanded island footprints) is surrounded by ONE continuous wetland:
 * a muddy shore that slopes under the water, shallow tidal flats with exposed mud bars, then
 * forested mud banks cut by winding, interconnected channels, closing into a continuous forest
 * wall at the horizon. Inside the walkable land the height is exactly the physics height
 * (sundarbansGroundHeight), so what the player sees is what they stand on.
 */
import { WALK_INSET } from '../biomes/common.js'
import { hasExpandedTerrainFootprint, sundarbansGroundHeight, terrainFootprintRadius } from './terrain.js'

export const WETLAND_CENTER = Object.freeze({ x: 0, z: 6 })
export const WETLAND_RADIUS = 172

function hash(ix, iz, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed, 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

export function smoothstep(low, high, value) {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)))
  return t * t * (3 - 2 * t)
}

/** Smooth value noise in [0, 1]. */
export function valueNoise(x, z, seed) {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const ux = fx * fx * (3 - 2 * fx)
  const uz = fz * fz * (3 - 2 * fz)
  const a = hash(ix, iz, seed)
  const b = hash(ix + 1, iz, seed)
  const c = hash(ix, iz + 1, seed)
  const d = hash(ix + 1, iz + 1, seed)
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz
}

/** Fractal value noise in [0, 1]. */
export function fbm(x, z, seed, octaves = 4) {
  let sum = 0
  let amp = 0.5
  let norm = 0
  let fx = x
  let fz = z
  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise(fx, fz, seed + i * 101) * amp
    norm += amp
    amp *= 0.5
    // rotate each octave a little so no axis-aligned pattern survives
    const nx = fx * 1.6 - fz * 1.2
    fz = fx * 1.2 + fz * 1.6
    fx = nx
  }
  return sum / norm
}

export function createWetlandField(biome) {
  const waterY = biome.water?.y ?? -0.35
  const islands = biome.discs
    .filter(hasExpandedTerrainFootprint)
    .map((d) => ({ x: d.x, z: d.z, r: terrainFootprintRadius(d) - WALK_INSET, top: d.top }))

  /** Signed distance to the walkable land edge: < 0 inside (walkable), > 0 outside. */
  const walkSD = (x, z) => {
    let best = Infinity
    for (const d of islands) best = Math.min(best, Math.hypot(x - d.x, z - d.z) - d.r)
    return best
  }

  /** Width of extra (non-walkable) mud crest beyond the walkable edge, then of the shore slope. */
  const shoreMargin = (x, z) => 0.45 + 1.7 * fbm(x * 0.085, z * 0.085, 11, 3)
  const shoreWidth = (x, z) => 2.1 + 2.4 * fbm(x * 0.06 + 5.3, z * 0.06 - 2.1, 23, 3)

  /** 1 inside a winding tidal channel, 0 on the banks. Channels are isolines of warped noise. */
  const channelAt = (x, z) => {
    const wx = x + (fbm(x * 0.011, z * 0.011, 61, 2) - 0.5) * 34
    const wz = z + (fbm(x * 0.011 + 7.7, z * 0.011, 67, 2) - 0.5) * 34
    const a = Math.abs(fbm(wx * 0.017, wz * 0.017, 71, 3) - 0.5)
    const b = Math.abs(fbm(wx * 0.026 + 3.1, wz * 0.026 - 1.9, 79, 3) - 0.5)
    const main = 1 - smoothstep(0.034, 0.064, a)
    const creek = (1 - smoothstep(0.014, 0.032, b)) * 0.85
    return Math.max(main, creek)
  }

  /** How much forested bank (0..1) rises at (x, z), before channels cut it. */
  const bankAt = (x, z, e) => {
    const dc = Math.hypot(x - WETLAND_CENTER.x, z - WETLAND_CENTER.z)
    const wx = x + (fbm(x * 0.02, z * 0.02, 91, 2) - 0.5) * 22
    const wz = z + (fbm(x * 0.02 - 4.2, z * 0.02 + 1.7, 97, 2) - 0.5) * 22
    let bank = smoothstep(0.46, 0.6, fbm(wx * 0.03, wz * 0.03, 51, 4))
    bank *= smoothstep(6, 15, e) // an open-water belt around the playable land
    bank = Math.max(bank, smoothstep(88, 118, dc)) // the forest closes in towards the horizon
    return bank
  }

  /** Height of the wetland floor away from the playable land. */
  const basinAt = (x, z, e = walkSD(x, z)) => {
    const bars = smoothstep(0.6, 0.76, fbm(x * 0.12 + 9.1, z * 0.12, 37, 3)) * 0.4 * smoothstep(1.5, 4, e)
    const shallows = -0.6 + bars
    const channel = channelAt(x, z)
    const dc = Math.hypot(x - WETLAND_CENTER.x, z - WETLAND_CENTER.z)
    const bank = bankAt(x, z, e) * (1 - channel * (dc > 112 ? 0.35 : 1))
    const bankTop = waterY + 0.32 + fbm(x * 0.07, z * 0.07, 83, 3) * 0.32
    return shallows * (1 - bank) + bankTop * bank - channel * 0.3 * (1 - bank)
  }

  /** The visual ground height everywhere (exact physics height on walkable land). */
  const heightAt = (x, z) => {
    const e = walkSD(x, z)
    const land = sundarbansGroundHeight(x, z, 0)
    if (e <= 0) return land
    const margin = shoreMargin(x, z)
    if (e <= margin) return land - (e / margin) ** 2 * 0.05
    const t = smoothstep(0, shoreWidth(x, z), e - margin)
    return (land - 0.05) * (1 - t) + basinAt(x, z, e) * t
  }

  return {
    waterY,
    islands,
    walkSD,
    channelAt,
    basinAt,
    heightAt,
    center: WETLAND_CENTER,
    radius: WETLAND_RADIUS,
  }
}
