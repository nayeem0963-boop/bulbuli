import { BufferGeometry, Float32BufferAttribute } from 'three'
import { SUNDARBANS_ISLANDS, SUNDARBANS_SPAWN, SUNDARBANS_STATIONS, SUNDARBANS_WALKS } from '../biomes/sundarbansLayout.js'

const SECTORS = 112
const RINGS = 20
const EDGE_EXPANSION = 1.018
export const TERRAIN_FOOTPRINT_SCALE = 2.55
const TERRAIN_BOUNDARY_MARGIN = 1.02
// 'sand', 'ridge' and 'valley' are the Sahara's steps and dry bed: drawn at exactly the size that is
// solid, so a step never buries the one below it and the plain's sand never covers them
const UNEXPANDED_SURFACES = new Set(['plank', 'branch', 'canopy', 'sand', 'ridge', 'valley'])

export function hasExpandedTerrainFootprint(disc) {
  return !UNEXPANDED_SURFACES.has(disc.look)
}

function footprintScale(disc) {
  return hasExpandedTerrainFootprint(disc) ? TERRAIN_FOOTPRINT_SCALE : 1
}

function terrainBoundary(angle, seed, biomeId) {
  if (biomeId === 'sundarbans') {
    return 1
      + Math.sin(angle * 3 + seed) * 0.025
      + Math.cos(angle * 5 - seed) * 0.018
      + Math.sin(angle * 9 + seed * 0.4) * 0.013
      + Math.cos(angle * 15 - seed * 0.6) * 0.008
      + Math.sin(angle * 23 + seed * 0.23) * 0.004
      + Math.sin(angle * 7 + seed * 0.6) * 0.012
  }
  return 1 + Math.sin(angle * 3 + seed) * 0.012 + Math.cos(angle * 5 - seed) * 0.008
}

function hash(value) {
  let out = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    out ^= value.charCodeAt(i)
    out = Math.imul(out, 16777619)
  }
  return out >>> 0
}

export function terrainSeed(disc, biomeId = '') {
  return hash(`${biomeId}:${disc.id}`)
}

export function terrainRelief(x, z, seed = 0) {
  const phase = (seed % 997) * 0.017
  return (
    Math.sin(x * 0.37 + phase) * Math.cos(z * 0.29 - phase) * 0.038
    + Math.sin((x + z) * 0.81 + phase) * 0.013
    + Math.sin((x * 1.7 - z * 1.3) + phase * 0.7) * 0.003
  )
}

/* ---------------------------------------------------------------- Sundarbans: one shared surface
 * Every Sundarbans island footprint overlaps its neighbours, and physics keeps the player on the
 * disc they first stood on. A per-disc relief therefore showed up as mismatched patches. Instead
 * the whole wetland uses ONE height field, so overlapping discs agree everywhere and the renderer
 * can draw a single continuous ground mesh. It stays exactly flat (y = top) at island centres,
 * stations, the spawn point and along the boardwalks, and undulates gently (±5 cm) elsewhere.
 */
const SUNDARBANS_FLAT_POINTS = [
  ...SUNDARBANS_ISLANDS.map(([, x, z]) => [x, z, 1.6, 4.2]),
  ...SUNDARBANS_STATIONS.map(({ x, z }) => [x, z, 2.2, 4.6]),
  [SUNDARBANS_SPAWN.position[0], SUNDARBANS_SPAWN.position[2], 2.4, 5],
]
const SUNDARBANS_ISLAND_BY_ID = Object.fromEntries(SUNDARBANS_ISLANDS.map(([id, x, z]) => [id, { x, z }]))
const SUNDARBANS_FLAT_SEGMENTS = SUNDARBANS_WALKS.map(([, a, b]) => [SUNDARBANS_ISLAND_BY_ID[a], SUNDARBANS_ISLAND_BY_ID[b]])
export const SUNDARBANS_RELIEF = 0.05

function smoothstep(low, high, value) {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)))
  return t * t * (3 - 2 * t)
}

function segmentDistance(x, z, a, b) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const length = dx * dx + dz * dz || 1
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length))
  return Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz))
}

/** 0 on flat gameplay ground (stations, spawn, boardwalks, island centres) → 1 in open mud. */
export function sundarbansReliefWeight(x, z) {
  let weight = 1
  for (const [px, pz, inner, outer] of SUNDARBANS_FLAT_POINTS) {
    weight = Math.min(weight, smoothstep(inner, outer, Math.hypot(x - px, z - pz)))
  }
  for (const [a, b] of SUNDARBANS_FLAT_SEGMENTS) {
    weight = Math.min(weight, smoothstep(1.2, 2.8, segmentDistance(x, z, a, b)))
  }
  return weight
}

/** Gentle, non-repeating undulation in [-1, 1] (no grid-aligned stripes). */
export function sundarbansReliefNoise(x, z) {
  const wx = x + Math.sin(z * 0.11 + 1.3) * 2.6
  const wz = z + Math.sin(x * 0.13 - 0.7) * 2.6
  return (
    Math.sin(wx * 0.29 + 0.4) * Math.cos(wz * 0.23 - 1.1) * 0.55
    + Math.sin((wx * 0.53 - wz * 0.41) + 2.1) * 0.27
    + Math.cos((wx * 0.17 + wz * 0.37) - 0.6) * 0.18
  )
}

/** The walkable Sundarbans ground height at (x, z), shared by every disc. */
export function sundarbansGroundHeight(x, z, top = 0) {
  return top + sundarbansReliefNoise(x, z) * SUNDARBANS_RELIEF * sundarbansReliefWeight(x, z)
}

export function terrainHeightAt(disc, x, z, seed = terrainSeed(disc), biomeId = '') {
  if (!hasExpandedTerrainFootprint(disc)) return disc.top
  if (biomeId === 'sundarbans') return sundarbansGroundHeight(x, z, disc.top)
  const phaseSeed = seed
  const dx = x - disc.x
  const dz = z - disc.z
  const distance = Math.hypot(dx, dz)
  if (distance < 1e-8) return disc.top
  const angle = Math.atan2(dz, dx)
  const boundary = terrainBoundary(angle, phaseSeed, biomeId)
  const baseRadius = disc.r * EDGE_EXPANSION * TERRAIN_FOOTPRINT_SCALE
  const radialBlend = Math.max(0, Math.min(1, distance / (baseRadius * boundary)))
  return disc.top + terrainRelief(x, z, phaseSeed) * radialBlend
}

export function terrainFootprintRadius(disc) {
  return disc.r * EDGE_EXPANSION * footprintScale(disc) * TERRAIN_BOUNDARY_MARGIN
}

export function createTerrainGeometry(disc, biomeId = '') {
  const seed = terrainSeed(disc, biomeId)
  const textureScale = biomeId === 'sundarbans' ? 18 : 8
  const positions = []
  const colors = []
  const uvs = []
  const indices = []
  const radius = disc.r * EDGE_EXPANSION * footprintScale(disc)
  const boundary = (angle) => terrainBoundary(angle, seed, biomeId)
  const addVertex = (x, y, z, color = [1, 1, 1]) => {
    positions.push(x, y, z)
    colors.push(color[0], color[1], color[2])
    uvs.push(0.5 + x / textureScale, 0.5 + z / textureScale)
    return positions.length / 3 - 1
  }

  const center = addVertex(0, 0, 0)
  const rings = []
  for (let ring = 1; ring <= RINGS; ring += 1) {
    const t = ring / RINGS
    const vertices = []
    for (let sector = 0; sector < SECTORS; sector += 1) {
      const angle = (sector / SECTORS) * Math.PI * 2
      const r = radius * t * boundary(angle)
      const x = Math.cos(angle) * r
      const z = Math.sin(angle) * r
      const height = hasExpandedTerrainFootprint(disc) ? terrainRelief(disc.x + x, disc.z + z, seed) * t : 0
      const shore = biomeId === 'sundarbans' && hasExpandedTerrainFootprint(disc)
        ? Math.max(0, Math.min(1, (t - 0.88) / 0.12))
        : 0
      vertices.push(addVertex(x, height, z, [1 - shore * 0.025, 1 - shore * 0.035, 1 - shore * 0.075]))
    }
    rings.push(vertices)
  }

  for (let sector = 0; sector < SECTORS; sector += 1) {
    const next = (sector + 1) % SECTORS
    indices.push(center, rings[0][next], rings[0][sector])
  }
  for (let ring = 1; ring < RINGS; ring += 1) {
    for (let sector = 0; sector < SECTORS; sector += 1) {
      const next = (sector + 1) % SECTORS
      const inner = rings[ring - 1]
      const outer = rings[ring]
      indices.push(inner[sector], inner[next], outer[next], inner[sector], outer[next], outer[sector])
    }
  }

  const outerTop = rings[RINGS - 1]
  const outerBottom = []
  for (let sector = 0; sector < SECTORS; sector += 1) {
    const angle = (sector / SECTORS) * Math.PI * 2
    const shoreline = biomeId === 'sundarbans' && hasExpandedTerrainFootprint(disc)
      ? 1.05
        + Math.sin(angle * 7 + seed) * 0.29
        + Math.cos(angle * 11 - seed) * 0.19
        + Math.sin(angle * 17 + seed * 0.37) * 0.11
        + Math.cos(angle * 23 + seed * 0.23) * 0.03
      : 0
    const r = radius * boundary(angle) + shoreline
    const bankColor = biomeId === 'sundarbans' && hasExpandedTerrainFootprint(disc)
      ? [0.92, 0.9, 0.8]
      : [1, 1, 1]
    outerBottom.push(addVertex(Math.cos(angle) * r, -disc.depth, Math.sin(angle) * r, bankColor))
  }
  for (let sector = 0; sector < SECTORS; sector += 1) {
    const next = (sector + 1) % SECTORS
    indices.push(outerTop[sector], outerTop[next], outerBottom[next], outerTop[sector], outerBottom[next], outerBottom[sector])
  }

  const bottomCenter = addVertex(0, -disc.depth, 0)
  for (let sector = 0; sector < SECTORS; sector += 1) {
    const next = (sector + 1) % SECTORS
    indices.push(bottomCenter, outerBottom[sector], outerBottom[next])
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('uv2', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
