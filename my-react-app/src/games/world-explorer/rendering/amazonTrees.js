import { mulberry32 } from '../../../core/rng.js'
import { blob, createBuilder, cubic, leaf, linear, tube, v } from './mangroveGeometry.js'

const BARK = linear('#59412d')
const BARK_LIGHT = linear('#886344')
const LICHEN = linear('#778052')
const LEAF_DARK = linear('#1e4027')
const LEAF_LIGHT = linear('#4a7c36')

export function amazonTreeHeight(seed, layer = 'emergent') {
  const random = mulberry32(seed)
  if (layer === 'emergent') return 7.5 + random() * 1.2
  if (layer === 'subcanopy') return 4.1 + random() * 0.9
  return 5 + random()
}

function addLiana(builder, random, trunkHeight, angle, reach) {
  const dx = Math.cos(angle)
  const dz = Math.sin(angle)
  const start = v(dx * 0.36, trunkHeight * 0.94, dz * 0.36)
  const end = v(dx * reach, 0.12, dz * reach)
  const path = cubic(
    start,
    v(dx * reach * 0.55, trunkHeight * 0.72, dz * reach * 0.55),
    v(dx * reach * 1.15, trunkHeight * 0.34 + random() * 0.7, dz * reach * 1.15),
    end,
    7,
  )
  tube(builder, path, path.map((_, index) => 0.025 * (1 - 0.5 * index / (path.length - 1))), {
    segments: 4, base: linear('#45643a'), tip: linear('#718347'), cap: false,
  })
}

/**
 * Levels of detail for the near forest. Every level is the SAME tree (same seed, same trunk, limbs
 * and crown layout: the random stream is consumed identically), drawn with less:
 *   near   every leaf blade, cupped; full bark (the model the forest has always used)
 *   close  every leaf blade, flat; full bark. Nothing is missing, only the blades' curl
 *   mid    a third of the blades, each larger and flat; coarser bark; no lianas
 *   far    an eighth of the blades as large cards; trunk and main branches only
 * Larger blades keep the crown as full as it was, so a tree does not thin out as it recedes.
 */
export const AMAZON_TREE_LOD = Object.freeze({
  near: { every: 1, clusters: 1, leafScale: 1, leafSegments: 2, trunk: 7, limb: 5, tiers: true, roots: true, lianas: true },
  close: { every: 1, clusters: 1, leafScale: 1, leafSegments: 1, trunk: 7, limb: 5, tiers: true, roots: true, lianas: true },
  mid: { every: 3, clusters: 1, leafScale: 1.75, leafSegments: 1, trunk: 5, limb: 3, tiers: true, roots: true, lianas: false },
  far: { every: 4, clusters: 2, leafScale: 2.7, leafSegments: 1, trunk: 4, limb: 3, tiers: false, roots: false, lianas: false },
})

/** Draws bark at a level of detail without disturbing the random stream the full model uses. */
function bark(builder, random, detail, path, radii, options, kind = 'limb') {
  if (detail.every === 1) return tube(builder, path, radii, options)
  tube(createBuilder(), path, radii, options) // advance the stream exactly as the full model does
  const keep = kind === 'tier' ? detail.tiers : kind === 'root' ? detail.roots : true
  if (!keep) return undefined
  return tube(builder, path, radii, { segments: kind === 'trunk' ? detail.trunk : detail.limb, base: options.base, tip: options.tip, cap: options.cap })
}

export function createAmazonTree(seed = 1, layer = 'emergent', lod = 'near') {
  const random = mulberry32(seed)
  const builder = createBuilder()
  const detail = AMAZON_TREE_LOD[lod] ?? AMAZON_TREE_LOD.near
  const isEmergent = layer === 'emergent'
  const isSubcanopy = layer === 'subcanopy'
  const height = amazonTreeHeight(seed, layer)
  const trunkRadius = isEmergent ? 0.28 : isSubcanopy ? 0.16 : 0.2
  const trunkPath = cubic(
    v(0, -0.08, 0),
    v(-0.06, height * 0.32, 0.02),
    v(0.08, height * 0.72, -0.03),
    v(0, height, 0),
    8,
  )
  bark(builder, random, detail, trunkPath, trunkPath.map((_, index) => trunkRadius * (1 - 0.62 * index / 8)), {
    segments: 7, base: BARK, tip: BARK_LIGHT, random, noise: 0.12, mottle: 0.12, lichen: LICHEN,
  }, 'trunk')

  const branchCount = isEmergent ? 8 : isSubcanopy ? 5 : 6
  const crownY = height * (isEmergent ? 0.73 : isSubcanopy ? 0.64 : 0.67)
  const crownRadius = isEmergent ? 3.15 : isSubcanopy ? 1.95 : 2.4
  const tierCount = isEmergent ? 5 : 4
  const tierHeight = height * (isEmergent ? 0.095 : isSubcanopy ? 0.135 : 0.12)

  for (let tier = 0; tier < tierCount; tier += 1) {
    const tierY = crownY + tier * tierHeight + (random() - 0.5) * 0.35
    const tierRadius = crownRadius * (1 - tier * 0.2)
    for (let limb = 0; limb < 4; limb += 1) {
      const angle = limb * Math.PI / 2 + tier * 0.7 + random() * 0.22
      const direction = v(Math.cos(angle), 0, Math.sin(angle))
      const start = v(0, tierY, 0)
      const end = start.clone().addScaledVector(direction, tierRadius * 0.72)
        .add(v(0, 0.15 + random() * 0.2, 0))
      const limbPath = cubic(
        start,
        start.clone().addScaledVector(direction, tierRadius * 0.28).add(v(0, 0.12, 0)),
        start.clone().addScaledVector(direction, tierRadius * 0.56).add(v(0, 0.22, 0)),
        end,
        4,
      )
      bark(builder, random, detail, limbPath, limbPath.map((_, index) => 0.065 * (1 - 0.62 * index / 4)), {
        segments: 5, base: BARK, tip: BARK_LIGHT, random, noise: 0.1,
      }, 'tier')
    }
  }

  for (let index = 0; index < branchCount; index += 1) {
    const angle = index * Math.PI * 2 / branchCount + random() * 0.28
    const direction = v(Math.cos(angle), 0, Math.sin(angle))
    const tier = index % tierCount
    const startY = crownY + tier * tierHeight + (random() - 0.5) * 0.7
    const branchReach = crownRadius * (1 - tier * 0.16) * (0.82 + random() * 0.3)
    const start = v(0, startY, 0)
    const end = start.clone().addScaledVector(direction, branchReach).add(v(0, 0.35 + random() * 0.75, 0))
    const branch = cubic(
      start,
      start.clone().addScaledVector(direction, branchReach * 0.32).add(v(0, 0.14, 0)),
      start.clone().addScaledVector(direction, branchReach * 0.68).add(v(0, 0.32, 0)),
      end,
      4,
    )
    bark(builder, random, detail, branch, branch.map((_, i) => (isEmergent ? 0.13 : 0.095) * (1 - 0.65 * i / 4)), {
      segments: 5, base: BARK, tip: BARK_LIGHT, random, noise: 0.08,
    })
    const leafCount = isEmergent ? 20 : isSubcanopy ? 14 : 17
    for (let leafIndex = 0; leafIndex < leafCount; leafIndex += 1) {
      const t = leafIndex / (leafCount - 1)
      const center = branch[Math.min(4, Math.round(t * 4))].clone().add(v(0, 0.18 + random() * 0.32, 0))
      const clusterRadius = (isEmergent ? 0.9 : isSubcanopy ? 0.7 : 0.8) * (0.82 + random() * 0.36)
      const bladeCount = isEmergent ? 13 : isSubcanopy ? 11 : 12
      for (let blade = 0; blade < bladeCount; blade += 1) {
        const azimuth = random() * Math.PI * 2
        const elevation = 0.12 + random() * 1.12
        const radial = Math.sqrt(random()) * clusterRadius
        const base = center.clone().add(v(
          Math.cos(azimuth) * radial,
          (random() - 0.38) * clusterRadius * 0.72,
          Math.sin(azimuth) * radial,
        ))
        const direction = v(
          Math.cos(azimuth) * Math.cos(elevation),
          Math.sin(elevation),
          Math.sin(azimuth) * Math.cos(elevation),
        )
        const shade = LEAF_DARK.clone().lerp(LEAF_LIGHT, random())
        const tip = shade.clone().lerp(LEAF_LIGHT, 0.28 + random() * 0.48)
        // every random draw is made for every blade, whether or not this level draws it
        const length = 0.3 + random() * 0.28
        const width = 0.065 + random() * 0.045
        const shape = {
          droop: 0.12 + random() * 0.2,
          fold: 0.32 + random() * 0.32,
          curl: 0.18 + random() * 0.28,
          segments: detail.leafSegments,
          roll: (random() - 0.5) * 1.1,
        }
        if (leafIndex % detail.clusters !== 0 || blade % detail.every !== 0) continue
        leaf(builder, base, direction, length * detail.leafScale, width * detail.leafScale, shade, tip, shape)
      }
    }
  }

  if (isEmergent) {
    for (let index = 0; index < 3; index += 1) addLiana(detail.lianas ? builder : createBuilder(), random, height, index * 2.2 + random(), 1.7 + random() * 0.8)
  }
  const rootCount = isEmergent ? 7 : isSubcanopy ? 4 : 5
  for (let index = 0; index < rootCount; index += 1) {
    const angle = index * Math.PI * 2 / rootCount + random() * 0.35
    const dx = Math.cos(angle)
    const dz = Math.sin(angle)
    const reach = (isEmergent ? 1.15 : 0.72) * (0.72 + random() * 0.52)
    const rootPath = cubic(
      v(dx * trunkRadius * 0.55, 0.42, dz * trunkRadius * 0.55),
      v(dx * reach * 0.34, 0.27, dz * reach * 0.34),
      v(dx * reach * 0.7, 0.06, dz * reach * 0.7),
      v(dx * reach, -0.02, dz * reach),
      4,
    )
    bark(builder, random, detail, rootPath, rootPath.map((_, point) => 0.09 * (1 - 0.78 * point / 4)), {
      segments: 5, base: BARK, tip: BARK_LIGHT, random, noise: 0.12,
    }, 'root')
  }
  return builder.build({ smoothNormals: true })
}

/**
 * What an emergent tree casts as a shadow: its trunk and four soft crown masses, about a hundred
 * triangles instead of the tree's eighteen thousand. Never drawn to the screen.
 */
export function createAmazonShadowProxy(seed = 11) {
  const builder = createBuilder()
  const height = amazonTreeHeight(seed, 'emergent')
  const grey = linear('#808080')
  tube(builder, [v(0, 0, 0), v(0, height * 0.5, 0), v(0, height, 0)], [0.28, 0.2, 0.1], { segments: 4, base: grey, tip: grey })
  const crownY = height * 0.73
  const options = { detail: 0, random: mulberry32(seed + 900), light: grey, dark: grey, lumpy: 0.2 }
  blob(builder, v(0, crownY + height * 0.2, 0), 2.1, [1, 0.5, 1], options)
  for (let index = 0; index < 3; index += 1) {
    const angle = index * 2.094 + 0.4
    blob(builder, v(Math.cos(angle) * 1.7, crownY + height * 0.08, Math.sin(angle) * 1.7), 1.7, [1, 0.45, 1], options)
  }
  return builder.build()
}

/**
 * A tree of the forest beyond the playable floor. `lod` 'horizon' is the same tree for the far
 * rings, where fog has taken most of the detail: half of the leaf cards, each larger, so the crown
 * covers as much as it did.
 */
export function createAmazonDistantTree(seed = 1, form = 'canopy', lod = 'distant') {
  const random = mulberry32(seed)
  const builder = createBuilder()
  const horizon = lod === 'horizon'
  const isEmergent = form === 'emergent'
  const isSubcanopy = form === 'subcanopy'
  const height = isEmergent ? 5.8 : isSubcanopy ? 3.2 : 4.5
  const crownY = height * (isEmergent ? 0.66 : 0.62)
  const crownRadius = isEmergent ? 1.9 : isSubcanopy ? 1.1 : 1.55
  const branchCount = isEmergent ? 7 : isSubcanopy ? 6 : 5
  const leafColor = linear('#1e4027')
  const leafLight = linear('#4a7c36')

  const trunk = cubic(
    v(0, -0.08, 0),
    v(-0.035, height * 0.35, 0.02),
    v(0.05, height * 0.72, -0.02),
    v(0, height, 0),
    5,
  )
  tube(builder, trunk, trunk.map((_, index) => (
    (isEmergent ? 0.15 : 0.105) * (1 - 0.72 * index / (trunk.length - 1))
  )), {
    segments: horizon ? 3 : 5,
    base: linear('#51432e'),
    tip: linear('#80603c'),
  })

  const clusterCount = isEmergent ? 7 : 6
  for (let index = 0; index < branchCount; index += 1) {
    const angle = index * Math.PI * 2 / branchCount + random() * 0.38
    const direction = v(Math.cos(angle), 0, Math.sin(angle))
    const tier = index % clusterCount
    const start = v(0, crownY + (random() - 0.5) * height * 0.12, 0)
    const reach = crownRadius * (0.72 + random() * 0.38)
    const end = start.clone().addScaledVector(direction, reach).add(v(0, 0.2 + random() * 0.35, 0))
    const branch = cubic(
      start,
      start.clone().addScaledVector(direction, reach * 0.34).add(v(0, 0.12, 0)),
      start.clone().addScaledVector(direction, reach * 0.72).add(v(0, 0.2, 0)),
      end,
      3,
    )
    tube(horizon ? createBuilder() : builder, branch, branch.map((_, point) => 0.055 * (1 - 0.72 * point / 3)), {
      segments: 4,
      base: linear('#59412d'),
      tip: linear('#886344'),
    })

    const cards = isEmergent ? 24 : 18
    for (let card = 0; card < cards; card += 1) {
      const azimuth = random() * Math.PI * 2
      const elevation = 0.16 + random() * 1.05
      const radial = Math.sqrt(random()) * crownRadius * 0.52
      const base = end.clone().add(v(
        Math.cos(azimuth) * radial,
        (random() - 0.45) * crownRadius * 0.34 + tier * 0.025,
        Math.sin(azimuth) * radial,
      ))
      const leafDirection = v(
        Math.cos(azimuth) * Math.cos(elevation),
        Math.sin(elevation),
        Math.sin(azimuth) * Math.cos(elevation),
      )
      const color = leafColor.clone().lerp(leafLight, random())
      const length = 0.38 + random() * 0.28
      const width = 0.09 + random() * 0.055
      const shape = {
        droop: 0.14 + random() * 0.2,
        fold: 0.35 + random() * 0.3,
        curl: 0.2 + random() * 0.3,
        segments: horizon ? 1 : 2,
        roll: (random() - 0.5) * 1.2,
      }
      if (horizon && card % 2 !== 0) continue
      const size = horizon ? 1.5 : 1
      leaf(builder, base, leafDirection, length * size, width * size, color, color.clone().lerp(leafLight, 0.45), shape)
    }
  }
  return builder.build({ smoothNormals: true })
}

export function createAmazonUnderstory(seed = 1, kind = 'broadleaf') {
  const random = mulberry32(seed)
  const builder = createBuilder()
  const color = kind === 'bromeliad' ? linear('#4c8748') : linear('#397e3e')
  const tip = kind === 'bromeliad' ? linear('#a1b84c') : linear('#78a94a')
  const count = kind === 'bromeliad' ? 12 : kind === 'fern' ? 22 : kind === 'heliconia' ? 11 : 15
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.39996 + random() * 0.3
    const direction = v(
      Math.cos(angle),
      kind === 'fern' ? 0.75 + random() * 0.4 : kind === 'heliconia' ? 0.85 + random() * 0.35 : 0.55 + random() * 0.35,
      Math.sin(angle),
    )
    const length = kind === 'bromeliad'
      ? 0.42 + random() * 0.22
      : kind === 'fern' ? 0.34 + random() * 0.2
        : kind === 'heliconia' ? 0.78 + random() * 0.4
          : 0.58 + random() * 0.3
    const width = kind === 'bromeliad' ? 0.11 : kind === 'fern' ? 0.065 : kind === 'heliconia' ? 0.26 : 0.2
    const shade = kind === 'bromeliad'
      ? color.clone().lerp(tip, random() * 0.5)
      : LEAF_DARK.clone().lerp(LEAF_LIGHT, 0.22 + random() * 0.68)
    const leafTip = shade.clone().lerp(kind === 'bromeliad' ? tip : LEAF_LIGHT, 0.25 + random() * 0.45)
    leaf(builder, v(0, 0.08, 0), direction, length, width, shade, leafTip, {
      droop: kind === 'fern' ? 0.28 : kind === 'heliconia' ? 0.08 : 0.18,
      fold: kind === 'fern' ? 0.18 : kind === 'heliconia' ? 0.42 : 0.32,
      curl: 0.14 + random() * 0.2,
      segments: 4,
      roll: (random() - 0.5) * 0.38,
    })
  }
  return builder.build({ smoothNormals: true })
}

export function createAmazonRootCluster(seed = 1) {
  const random = mulberry32(seed)
  const builder = createBuilder()
  for (let index = 0; index < 7; index += 1) {
    const angle = index * Math.PI * 2 / 7 + random() * 0.3
    const dx = Math.cos(angle)
    const dz = Math.sin(angle)
    const reach = 0.48 + random() * 0.72
    const path = cubic(
      v(dx * 0.08, 0.18, dz * 0.08),
      v(dx * reach * 0.35, 0.14, dz * reach * 0.35),
      v(dx * reach * 0.72, 0.045, dz * reach * 0.72),
      v(dx * reach, 0.012, dz * reach),
      4,
    )
    tube(builder, path, path.map((_, point) => 0.095 * (1 - 0.8 * point / 4)), {
      segments: 5, base: BARK, tip: BARK_LIGHT, random, noise: 0.08,
    })
  }
  return builder.build({ smoothNormals: true })
}

export function createAmazonLog() {
  const builder = createBuilder()
  tube(builder, [v(-0.9, 0.18, 0), v(-0.3, 0.22, 0.04), v(0.35, 0.2, -0.03), v(0.9, 0.16, 0)], [0.2, 0.23, 0.19, 0.12], {
    segments: 7, base: BARK, tip: BARK_LIGHT,
  })
  return builder.build()
}
