/**
 * Shared helpers for the three expedition maps. A map is pure data (no three.js), so the
 * reachability tests can prove every station can be reached with the real movement rules of
 * skyward-explorer/physics.js (imported unchanged, design 1.4).
 *
 * The world is a set of upright cylinders, exactly as physics.js expects:
 *   discs   walkable ground pieces { id, x, z, r, top, depth, look }
 *   props   scenery; a prop with `block` gets a matching horizontal collider, and walkable
 *           prop tops / roofs get a support collider
 */
import { mulberry32 } from '../../../core/rng.js'
import { hasExpandedTerrainFootprint, terrainFootprintRadius, terrainHeightAt, terrainSeed } from '../rendering/terrain.js'
import { scatterAmazon } from '../rendering/amazonScatter.js'
import { amazonTreeHeight } from '../rendering/amazonTrees.js'
import { scatterBiomeAssets } from '../rendering/scattering.js'

/** How far (metres) inside a disc's drawn edge the walkable edge sits, so feet never hang over air. */
export const WALK_INSET = 0.3

export function disc(id, x, z, r, top, look, depth = 0.6) {
  return { id, x, z, r, top, depth, look }
}

/** Colliders in the physics.js format. */
export function collidersFor(biome) {
  const out = biome.discs.flatMap((d) => {
    const seed = terrainSeed(d, biome.id)
    const heightAt = (x, z) => terrainHeightAt(d, x, z, seed, biome.id)
    const core = {
      id: d.id,
      kind: 'land',
      x: d.x,
      z: d.z,
      r: d.r - WALK_INSET,
      top: d.top,
      bottom: d.top - d.depth,
      walkable: true,
      surfaceType: d.look === 'branch' ? 'branch' : d.look === 'plank' ? 'boardwalk' : undefined,
      heightAt,
    }
    const apron = {
      id: `${d.id}-apron`,
      groundId: d.id,
      kind: 'land',
      x: d.x,
      z: d.z,
      r: terrainFootprintRadius(d) - WALK_INSET,
      innerRadius: core.r,
      top: d.top,
      bottom: d.top - d.depth,
      walkable: true,
      surfaceOnly: true,
      surfaceType: d.look === 'branch' ? 'branch' : d.look === 'plank' ? 'boardwalk' : undefined,
      heightAt,
    }
    return hasExpandedTerrainFootprint(d) ? [core, apron] : [core]
  })
  biome.props.forEach((p, i) => {
    const boxSize = p.collisionBox ?? ({
      waveTank: [2, 0.7, 0.8],
      leafBag: [0.35, 0.5, 0.2],
      crate: [0.7, 0.6, 0.6],
      woodenCrate: [0.7, 0.6, 0.6],
      utilityBox: [0.6, 0.5, 0.45],
    })[p.type]
    if (boxSize) {
      const [width, height, depth] = boxSize
      const centerY = (p.y ?? 0) + height / 2
      out.push({
        id: `box-prop-${i}`,
        kind: 'prop',
        shape: 'aabb',
        minX: p.x - width / 2,
        maxX: p.x + width / 2,
        minZ: p.z - depth / 2,
        maxZ: p.z + depth / 2,
        x: p.x,
        z: p.z,
        top: centerY + height / 2,
        bottom: centerY - height / 2,
        walkable: true,
        surfaceType: 'prop',
      })
    }
    if (p.block) {
      const scale = p.scale ?? 1
      const topByType = {
        giantTree: 12 * scale,
        rainTree: 7 * scale,
        mangrove: 3.1 * scale,
        palm: 4 * scale,
        rock: 1.04 * scale,
        stump: 0.5 * scale,
        well: 0.8,
      }
      const top = p.blockTop ?? (p.y ?? 0) + (topByType[p.type] ?? 2)
      const walkable = p.walkable ?? ['rock', 'stump', 'well'].includes(p.type)
      out.push({
        id: `prop-${i}`,
        kind: 'prop',
        collisionKind: p.type === 'giantTree' || p.type === 'rainTree' ? 'tree-trunk' : undefined,
        collisionRadius: p.type === 'giantTree' ? Math.max(p.block, 1.2 * scale) : p.block,
        x: p.x,
        z: p.z,
        r: p.block,
        supportRadius: walkable ? (p.supportRadius ?? p.block + 0.2) : p.block,
        top,
        bottom: p.blockBottom ?? -5,
        walkable,
        surfaceType: walkable ? 'prop' : undefined,
      })
    }

    if (p.type === 'village') {
      for (let house = 0; house < 3; house += 1) {
        const x = p.x + house * 2.4
        const z = p.z + house % 2
        const roofRadius = 0.95
        const roofTop = (p.y ?? 0) + 1.95
        out.push({
          id: `village-roof-${house}`,
          kind: 'prop',
          x,
          z,
          r: 0.7,
          supportRadius: roofRadius,
          top: roofTop,
          bottom: (p.y ?? 0) + 0.6,
          walkable: true,
          surfaceType: 'roof',
          heightAt: (px, pz) => roofTop - 0.4 * Math.min(1, Math.hypot(px - x, pz - z) / roofRadius),
        })
      }
    }
  })
  const scatteredAssets = scatterBiomeAssets(biome)
  scatteredAssets.forEach((asset, i) => {
    if (asset.kind !== 'rock') return
    const height = 0.94 * asset.scale
    out.push({
      id: `scattered-rock-${i}`,
      kind: 'prop',
      x: asset.x,
      z: asset.z,
      r: 0.76 * asset.scale,
      supportRadius: 0.95 * asset.scale,
      top: asset.y + height,
      bottom: asset.y + height - 0.36 * asset.scale,
      walkable: true,
      surfaceType: 'prop',
    })
  })
  if (biome.id === 'sundarbans') {
    const branchHeight = { sundari: 3.4, gewa: 2.8, keora: 3.2, garjan: 3.1, goran: 1.1 }
    scatteredAssets.forEach((tree, i) => {
      if (tree.kind !== 'mangrove' || tree.background) return
      const height = branchHeight[tree.variant] * tree.scale * (tree.stretch ?? 1)
      out.push({
        id: `mangrove-trunk-${i}`,
        kind: 'prop',
        x: tree.x,
        z: tree.z,
        r: 0.22 * tree.scale,
        top: tree.y + height,
        bottom: tree.y - 0.2,
        walkable: false,
      })
      out.push({
        id: `mangrove-branch-${i}`,
        kind: 'prop',
        x: tree.x,
        z: tree.z,
        r: 0.92 * tree.scale,
        supportRadius: 1.15 * tree.scale,
        top: tree.y + height,
        bottom: tree.y + height - 0.28,
        walkable: true,
        surfaceType: 'branch',
      })
    })
  }
  if (biome.id === 'amazon') {
    scatterAmazon(biome).forEach((item, index) => {
      if (item.kind === 'emergent' || item.kind === 'canopy' || item.kind === 'subcanopy') {
        const layer = item.kind
        const seed = layer === 'emergent' ? 11 : layer === 'subcanopy' ? 37 : 23
        const height = amazonTreeHeight(seed, layer)
        const crownBase = height * (layer === 'emergent' ? 0.73 : layer === 'subcanopy' ? 0.64 : 0.67)
        const tierHeight = height * (layer === 'emergent' ? 0.115 : layer === 'subcanopy' ? 0.16 : 0.14)
        const branchHeight = item.y + (crownBase + tierHeight * (layer === 'emergent' ? 1 : 0.5)) * item.scale
        const branchRadius = (layer === 'emergent' ? 2.3 : layer === 'subcanopy' ? 1.25 : 1.55) * item.scale
        const treeRadius = layer === 'emergent' ? 0.28 : layer === 'subcanopy' ? 0.16 : 0.2
        out.push({
          id: `amazon-${layer}-trunk-${index}`,
          kind: 'prop',
          collisionKind: 'tree-trunk',
          collisionRadius: treeRadius * item.scale,
          rootRadius: (layer === 'emergent' ? 0.62 : layer === 'subcanopy' ? 0.36 : 0.42) * item.scale,
          rootTop: item.y + 0.45 * item.scale,
          x: item.x,
          z: item.z,
          r: treeRadius * item.scale,
          top: item.y + height * item.scale,
          bottom: item.y - 0.1,
          walkable: false,
        })
        out.push({
          id: `amazon-${layer}-branch-${index}`,
          kind: 'prop',
          x: item.x,
          z: item.z,
          r: 0.28 * item.scale,
          supportRadius: branchRadius,
          top: branchHeight + 0.42 * item.scale,
          bottom: branchHeight - 0.3 * item.scale,
          walkable: true,
          surfaceType: 'branch',
          heightAt: (x, z) => branchHeight + item.scale * (
            0.18 + 0.24 * Math.min(1, Math.hypot(x - item.x, z - item.z) / branchRadius)
          ),
        })
      } else if (item.kind === 'log') {
        out.push({
          id: `amazon-fallen-log-${index}`,
          kind: 'prop',
          x: item.x,
          z: item.z,
          r: 0.24 * item.scale,
          supportRadius: 0.82 * item.scale,
          top: item.y + 0.46 * item.scale,
          bottom: item.y + 0.12 * item.scale,
          walkable: true,
          surfaceType: 'log',
        })
      }
    })
  }
  const discsById = Object.fromEntries(biome.discs.map((d) => [d.id, d]))
  biome.stations.forEach((station) => {
    const surface = discsById[station.disc]
    if (!surface) throw new Error(`Unknown disc for station ${station.n}: ${station.disc}`)
    const postRadius = 0.08
    out.push({
      id: `station-post-${station.n}`,
      kind: 'prop',
      x: station.x,
      z: station.z,
      r: postRadius,
      supportRadius: postRadius + 0.35,
      top: surface.top + 2.2,
      bottom: surface.top,
      walkable: true,
    })
  })
  return out
}

const segDist = (px, pz, ax, az, bx, bz) => {
  const dx = bx - ax
  const dz = bz - az
  const len2 = dx * dx + dz * dz || 1
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2))
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz))
}

/**
 * Scatters `count` props of `type` over the given discs, never inside a path corridor (the
 * straight line between linked discs), near a station or near the spawn point.
 */
export function scatter({ seed, discs, count, type, links, keepClear, minSpacing = 1.6, make }) {
  const rand = mulberry32(seed)
  const out = []
  let tries = 0
  while (out.length < count && tries < count * 60) {
    tries += 1
    const d = discs[Math.floor(rand() * discs.length)]
    const ang = rand() * Math.PI * 2
    const rad = Math.sqrt(rand()) * d.r * 0.85
    const x = d.x + Math.cos(ang) * rad
    const z = d.z + Math.sin(ang) * rad
    if (links.some(([a, b]) => segDist(x, z, a.x, a.z, b.x, b.z) < 1.8)) continue
    if (keepClear.some((c) => Math.hypot(x - c.x, z - c.z) < (c.r ?? 2.6))) continue
    if (out.some((o) => Math.hypot(x - o.x, z - o.z) < minSpacing)) continue
    out.push({ type, x, z, y: d.top, ...make(rand) })
  }
  return out
}

/** Pairs of discs that the map intends to be connected (used for scatter corridors and tests). */
export function linksFrom(discs, pairs) {
  const byId = Object.fromEntries(discs.map((d) => [d.id, d]))
  return pairs.map(([a, b]) => {
    if (!byId[a] || !byId[b]) throw new Error(`unknown disc in link ${a}–${b}`)
    return [byId[a], byId[b]]
  })
}

/**
 * A boardwalk: overlapping plank discs from disc a to disc b (same height as both), so the
 * learner can WALK across without jumping. Returns { discs, pairs } to add to the map.
 */
export function boardwalk(prefix, a, b, r = 1.3) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const len = Math.hypot(dx, dz)
  const from = a.r - 1.0
  const to = len - b.r + 1.0
  const span = Math.max(0, to - from)
  const count = Math.max(1, Math.ceil(span / (r * 1.2)))
  const discs = Array.from({ length: count }, (_, i) => {
    const t = (from + (span * (i + 0.5)) / count) / len
    return disc(`${prefix}${i + 1}`, a.x + dx * t, a.z + dz * t, r, a.top, 'plank', 0.3)
  })
  const ids = [a.id, ...discs.map((d) => d.id), b.id]
  const pairs = ids.slice(1).map((id, i) => [ids[i], id])
  return { discs, pairs }
}
