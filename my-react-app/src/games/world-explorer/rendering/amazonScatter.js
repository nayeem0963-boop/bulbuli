import { mulberry32 } from '../../../core/rng.js'

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)

function segmentDistance(point, start, end) {
  const dx = end.x - start.x
  const dz = end.z - start.z
  const lengthSquared = dx * dx + dz * dz || 1
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared))
  return Math.hypot(point.x - start.x - dx * t, point.z - start.z - dz * t)
}

function eligiblePoint(random, disc, reserved, spacing, links) {
  const angle = random() * Math.PI * 2
  const radius = Math.sqrt(random()) * disc.r * 0.88
  const point = { x: disc.x + Math.cos(angle) * radius, z: disc.z + Math.sin(angle) * radius }
  if (reserved.some((spot) => distance(point, spot) < (spot.radius ?? spacing))) return null
  if (links.some(([start, end]) => segmentDistance(point, start, end) < 2.1)) return null
  return point
}

function distribute({ random, disc, reserved, links, count, spacing, kind, scale, y = disc.top }) {
  const items = []
  for (let attempt = 0; attempt < count * 120 && items.length < count; attempt += 1) {
    const point = eligiblePoint(random, disc, reserved, spacing, links)
    if (!point || items.some((other) => distance(point, other) < spacing)) continue
    items.push({
      kind,
      ...point,
      y,
      scale: scale[0] + random() * (scale[1] - scale[0]),
      rot: random() * Math.PI * 2,
    })
  }
  return items
}

/**
 * The forest beyond the playable floor, in six depth bands. Each tree is jittered within its band
 * (angle and radius) and its type is drawn at random, so from the air the background reads as one
 * irregular canopy rather than concentric rows of evenly spaced trees.
 */
function distantForest(random, floor, counts = [168, 208, 256, 312, 376, 440]) {
  const rings = [40, 49, 60, 73, 88, 106]
  const trees = []
  for (let ring = 0; ring < rings.length; ring += 1) {
    const count = counts[ring]
    const offset = random() * Math.PI * 2
    const inner = ring === 0 ? 1.5 : (rings[ring] - rings[ring - 1]) * 0.48
    const outer = ring === rings.length - 1 ? 7 : (rings[ring + 1] - rings[ring]) * 0.48
    for (let index = 0; index < count; index += 1) {
      const angle = offset + ((index + (random() - 0.5) * 0.95) / count) * Math.PI * 2
      const radius = rings[ring] - inner + random() * (inner + outer)
      const pick = random()
      const kind = pick < 0.2 ? 'distantEmergent' : pick < 0.4 ? 'distantSubcanopy' : 'distantCanopy'
      trees.push({
        kind,
        x: floor.x + Math.cos(angle) * radius,
        y: -0.05,
        z: floor.z + Math.sin(angle) * radius,
        scale: kind === 'distantEmergent'
          ? 0.82 + random() * 0.34
          : kind === 'distantSubcanopy'
            ? 0.68 + random() * 0.3
            : 0.72 + random() * 0.4,
        rot: random() * Math.PI * 2,
      })
    }
  }
  return trees
}

function trailItems(start, end, seed, width = 0.65) {
  const random = mulberry32(seed)
  const dx = end.x - start.x
  const dz = end.z - start.z
  const length = Math.hypot(dx, dz)
  const count = Math.ceil(length / 0.72)
  return Array.from({ length: count }, (_, index) => {
    const t = (index + 0.5) / count
    const bend = Math.sin(t * Math.PI * 2.2 + seed) * 0.75
    const x = start.x + dx * t - dz / length * bend
    const z = start.z + dz * t + dx / length * bend
    return {
      kind: 'trail',
      x,
      z,
      y: 0.012,
      scale: width * (0.78 + random() * 0.4),
      rot: Math.atan2(dx, dz) + Math.cos(t * 9 + seed) * 0.12,
    }
  })
}

export function scatterAmazon(biome) {
  const random = mulberry32(0xa4a20f31)
  const floor = biome.discs.find((disc) => disc.id === 'floor')
  if (!floor) throw new Error('Amazon biome requires its forest-floor disc.')
  const reserved = [
    ...biome.stations.map((station) => ({ ...station, radius: 3.5 })),
    { x: biome.spawn.position[0], z: biome.spawn.position[2], radius: 4.2 },
    { x: 0, z: 12, radius: 5.2 },
  ]
  const placements = []
  const forestDisc = { ...floor, r: floor.r * 2.35 }
  const interiorDisc = { ...floor, r: floor.r * 1.08 }
  const emergent = distribute({
    random, disc: interiorDisc, reserved, links: biome.links, count: 96, spacing: 4.0, kind: 'emergent', scale: [0.86, 1.16],
  })
  const outerEmergent = distribute({
    random, disc: forestDisc, reserved: [...reserved, ...emergent.map((tree) => ({ ...tree, radius: 2.0 }))],
    links: biome.links, count: 200, spacing: 2.6, kind: 'emergent', scale: [0.82, 1.12],
  })
  emergent.push(...outerEmergent)
  placements.push(...emergent)
  const canopyReserved = [...reserved, ...emergent.map((tree) => ({ ...tree, radius: 1.25 }))]
  const canopy = distribute({
    random, disc: forestDisc, reserved: canopyReserved, links: biome.links, count: 320, spacing: 1.35, kind: 'canopy', scale: [0.8, 1.18],
  })
  placements.push(...canopy)
  const subcanopyReserved = [...reserved, ...emergent.map((tree) => ({ ...tree, radius: 1.8 }))]
  placements.push(...distribute({
    random, disc: forestDisc, reserved: subcanopyReserved, links: biome.links, count: 360, spacing: 1.5,
    kind: 'subcanopy', scale: [0.76, 1.12],
  }))

  const understoryReserved = [...reserved, ...emergent.map((tree) => ({ ...tree, radius: 1.15 }))]
  placements.push(...distribute({
    random, disc: interiorDisc, reserved: understoryReserved, links: biome.links, count: 260, spacing: 0.62, kind: 'understory', scale: [0.75, 1.3],
  }))
  placements.push(...distribute({
    random, disc: interiorDisc, reserved: understoryReserved, links: biome.links, count: 240, spacing: 0.6, kind: 'fern', scale: [0.75, 1.25],
  }))
  placements.push(...distribute({
    random, disc: interiorDisc, reserved: understoryReserved, links: biome.links, count: 120, spacing: 0.9,
    kind: 'heliconia', scale: [0.68, 1.18],
  }))
  placements.push(...distribute({
    random, disc: interiorDisc, reserved: understoryReserved, links: biome.links, count: 72, spacing: 1.05,
    kind: 'roots', scale: [0.8, 1.25],
  }))
  emergent.forEach((tree, index) => {
    const count = index % 2 === 0 ? 2 : 1
    for (let bromeliad = 0; bromeliad < count; bromeliad += 1) {
      const angle = random() * Math.PI * 2
      placements.push({
        kind: 'bromeliad',
        x: tree.x + Math.cos(angle) * 0.3,
        z: tree.z + Math.sin(angle) * 0.3,
        y: 0.8 + random() * 1.1,
        scale: 0.7 + random() * 0.5,
        rot: angle,
      })
    }
  })

  const logs = distribute({
    random, disc: interiorDisc, reserved, links: biome.links, count: 14, spacing: 2.1, kind: 'log', scale: [0.8, 1.25],
  })
  logs.forEach((log) => { log.rot = random() * Math.PI * 2 })
  placements.push(...logs)

  const stationOne = biome.stations.find((station) => station.n === 1)
  const stationThree = biome.stations.find((station) => station.n === 3)
  placements.push(...trailItems(
    { x: biome.spawn.position[0], z: biome.spawn.position[2] + 1 },
    stationOne ? { x: stationOne.x, z: stationOne.z } : { x: 0, z: 5 },
    21,
  ))
  if (stationThree) {
    placements.push(...trailItems(
      { x: 1.5, z: 1 },
      { x: stationThree.x, z: stationThree.z },
      42,
      0.5,
    ))
  }
  placements.push(...distantForest(mulberry32(0x5a17f0), floor))
  return placements
}
