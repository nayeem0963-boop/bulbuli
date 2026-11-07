import { mulberry32 } from '../../../core/rng.js'
import { terrainHeightAt, terrainSeed, TERRAIN_FOOTPRINT_SCALE } from './terrain.js'
import { scatterSundarbans } from './sundarbansScatter.js'

const ASSET_RULES = Object.freeze({
  amazon: [
    { kind: 'kapok', looks: ['floor'], density: 0.034, max: 48, minSpacing: 4.1, clearance: 4.5, scale: [0.82, 1.28] },
    { kind: 'understory', looks: ['floor'], density: 0.047, max: 110, minSpacing: 1.35, scale: [0.7, 1.3] },
  ],
  sahara: [
    { kind: 'acacia', looks: ['gravel', 'valley'], density: 0.008, max: 16, minSpacing: 6, clearance: 4.8, scale: [0.8, 1.2] },
    { kind: 'rock', looks: ['gravel', 'sand', 'ridge', 'valley'], density: 0.018, max: 72, minSpacing: 2.3, scale: [0.55, 1.25] },
  ],
})
const sundarbansPlacementCache = new WeakMap()

function hashSeed(value) {
  let seed = 0
  for (let i = 0; i < value.length; i += 1) seed = (Math.imul(seed, 31) + value.charCodeAt(i)) | 0
  return seed
}

function segmentDistance(x, z, a, b) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const length = dx * dx + dz * dz || 1
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length))
  return Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz))
}

function weightedDisc(discs, random) {
  const total = discs.reduce((sum, disc) => sum + Math.PI * disc.r * disc.r, 0)
  let value = random() * total
  for (const disc of discs) {
    value -= Math.PI * disc.r * disc.r
    if (value <= 0) return disc
  }
  return discs[discs.length - 1]
}

export function scatterBiomeAssets(biome, { densityScale = 1 } = {}) {
  // The Sundarbans has its own layered wetland composition (sundarbansScatter.js).
  if (biome.id === 'sundarbans') {
    if (!sundarbansPlacementCache.has(biome)) {
      sundarbansPlacementCache.set(biome, scatterSundarbans(biome))
    }
    return sundarbansPlacementCache.get(biome)
  }
  const rules = ASSET_RULES[biome.id]
  if (!rules) throw new Error(`No procedural asset rules for World Explorer biome: ${biome.id}`)

  const placements = []
  const seed = hashSeed(biome.id)

  rules.forEach((rule, ruleIndex) => {
    const reserved = [
      ...biome.stations.map((station) => ({ x: station.x, z: station.z, r: 2.8 })),
      { x: biome.spawn.position[0], z: biome.spawn.position[2], r: 3.2 },
      ...biome.props.filter((prop) => prop.block).map((prop) => ({ x: prop.x, z: prop.z, r: prop.block + 1.1 })),
    ]
    const eligible = biome.discs.filter((disc) => rule.looks.includes(disc.look))
    if (!eligible.length) return
    const area = eligible.reduce((sum, disc) => sum + Math.PI * disc.r * disc.r * TERRAIN_FOOTPRINT_SCALE ** 2, 0)
    const count = Math.min(rule.max, Math.max(0, Math.round(area * rule.density * densityScale)))
    const random = mulberry32(seed + ruleIndex * 7919)
    let attempts = 0
    let accepted = 0
    while (accepted < count && attempts < count * 70) {
      attempts += 1
      const disc = weightedDisc(eligible, random)
      const angle = random() * Math.PI * 2
      const radius = Math.sqrt(random()) * disc.r * TERRAIN_FOOTPRINT_SCALE * 0.96
      const x = disc.x + Math.cos(angle) * radius
      const z = disc.z + Math.sin(angle) * radius
      if (biome.links.some(([a, b]) => segmentDistance(x, z, a, b) < 1.8)) continue
      if (reserved.some((spot) => Math.hypot(x - spot.x, z - spot.z) < spot.r)) continue
      if (placements.some((item) => {
        const distance = Math.hypot(x - item.x, z - item.z)
        if (item.kind === rule.kind) return distance < Math.max(rule.minSpacing, item.clearance ?? 1.2)
        return item.kind === 'mangrove' && distance < 1.5
      })) continue
      const scale = rule.scale[0] + random() * (rule.scale[1] - rule.scale[0])
      placements.push({
        kind: rule.kind,
        x,
        z,
        y: terrainHeightAt(disc, x, z, terrainSeed(disc, biome.id), biome.id),
        scale,
        rot: random() * Math.PI * 2,
        clearance: rule.clearance ?? rule.minSpacing,
      })
      accepted += 1
    }
  })

  return placements
}
