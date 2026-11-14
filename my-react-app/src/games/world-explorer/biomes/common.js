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
import { amazonBoughs, amazonTreeHeight } from '../rendering/amazonTrees.js'
import { MANGROVE_FORMS, mangroveBoughs } from '../rendering/mangroveTrees.js'
import { scatterBiomeAssets } from '../rendering/scattering.js'
import { amazonPlacement, boughColliders, sundarbansPlacement } from './boughs.js'
import { createColliderIndex } from './colliderIndex.js'
import { ROCK_STEP, duneHeightAt, duneReach, rockTopAt } from './sandShapes.js'

/** The acacia trunk that BiomeScatter.jsx draws, per unit of the tree's scale (radius at its base). */
export const ACACIA_TRUNK = Object.freeze({ radius: 0.22 * 0.75, height: 4.4 })
/** Stem radius of a Sundarbans sapling per unit of its scale, by family (mangroveTrees.js). */
export const SAPLING_STEM = Object.freeze({ sundari: 0.25, gewa: 0.2, keora: 0.19, garjan: 0.15 })

/** Bulbuli's body radius in physics.js (PHYS.radius), for colliders sized to a drawn outline. */
const PLAYER_RADIUS = 0.35
/** And its height (PHYS.height). */
const PLAYER_HEIGHT = 1.05

/** How far (metres) inside a disc's drawn edge the walkable edge sits, so feet never hang over air. */
export const WALK_INSET = 0.3

export function disc(id, x, z, r, top, look, depth = 0.6, extra = {}) {
  return { id, x, z, r, top, depth, look, ...extra }
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
      // a `cliff` disc is a raised step with a drawn wall: Bulbuli's body stops exactly at the
      // wall's (slightly wavy) outline instead of 0.3 m inside it, so it cannot stand in the rim
      r: d.cliff ? terrainFootprintRadius(d) - PLAYER_RADIUS : d.r - WALK_INSET,
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
      // A rock that knows its own size (sandShapes.js): Bulbuli's body stops at the outline of the
      // stone that is drawn (not at a fixed 0.6 m), and the rock carries it, as far out as that
      // outline, on its rounded top (not on a flat lid at its highest point, 0.8 m wide whether
      // the stone was 0.4 or 1.1 m across).
      const sized = p.type === 'rock' && p.contactRadius
      const contact = sized ? Math.max(0.1, p.contactRadius - PLAYER_RADIUS) : p.block
      out.push({
        id: `prop-${i}`,
        kind: 'prop',
        collisionKind: p.type === 'giantTree' || p.type === 'rainTree' ? 'tree-trunk' : undefined,
        collisionRadius: p.type === 'giantTree' ? Math.max(p.block, 1.2 * scale) : contact,
        x: p.x,
        z: p.z,
        r: contact,
        supportRadius: sized ? p.contactRadius : walkable ? (p.supportRadius ?? p.block + 0.2) : p.block,
        heightAt: sized ? (x, z) => rockTopAt(p, x, z) : undefined,
        // a sized rock's side wall ends just above its lowest carrying surface: it stops a walking
        // bird, and never shoves aside one that is landing on the stone's shoulder
        top: sized ? (p.y ?? 0) + ROCK_STEP + 0.05 : top,
        bottom: p.blockBottom ?? -5,
        walkable,
        surfaceType: walkable && !sized ? 'prop' : undefined,
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
  // Acacias (the Sahara's scattered trees): a solid trunk exactly as wide as the one drawn
  // (BiomeScatter.jsx: a 0.22 m base tapering to 0.14 m, 0.75 wide and 4.4 tall, times the tree's
  // scale). No padding round it, so there is no invisible wall; the flat crown stays soft.
  scatteredAssets.forEach((tree, i) => {
    if (tree.kind !== 'acacia') return
    out.push({
      id: `acacia-trunk-${i}`,
      kind: 'prop',
      x: tree.x,
      z: tree.z,
      r: ACACIA_TRUNK.radius * tree.scale,
      top: tree.y + ACACIA_TRUNK.height * tree.scale,
      bottom: tree.y - 0.2,
      walkable: false,
    })
  })
  if (biome.id === 'sundarbans') {
    const branchHeight = { sundari: 3.4, gewa: 2.8, keora: 3.2, garjan: 3.1, goran: 1.1 }
    // Young trees at the grove edges (1 to 3.5 m tall): a solid stem as slim as the one drawn.
    // Goran saplings are knee-to-chest-high shrubs of finger-thin stems and stay soft, like the
    // rest of the undergrowth.
    scatteredAssets.forEach((tree, i) => {
      if (tree.kind !== 'sapling' || !SAPLING_STEM[tree.variant]) return
      out.push({
        id: `sapling-trunk-${i}`,
        kind: 'prop',
        x: tree.x,
        z: tree.z,
        r: SAPLING_STEM[tree.variant] * tree.scale,
        top: tree.y + branchHeight[tree.variant] * tree.scale * (tree.stretch ?? 1),
        bottom: tree.y - 0.2,
        walkable: false,
      })
    })
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
      // the thick wood above the trunk collider: the leaning upper trunk, stems and main limbs
      const forms = MANGROVE_FORMS.near[tree.variant] ?? 1
      out.push(...boughColliders(`mangrove-bough-${i}`, mangroveBoughs(tree.variant, (tree.form ?? 0) % forms), sundarbansPlacement(tree), { above: tree.y + height }))
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
        // its main branches (the thin crown tiers and the leaves stay soft)
        out.push(...boughColliders(`amazon-${layer}-bough-${index}`, amazonBoughs(seed, layer), amazonPlacement(item)))
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
  const dunes = duneColliders(biome, out.filter((c) => c.kind === 'land'))
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
  // dunes come first: where a dune stands, its surface (never lower than the sand under it) is the
  // ground, so the land beneath never competes with it
  return [...dunes, ...clearOfPerches(out)]
}

/**
 * Leaves out the branch pieces that pass through the space where Bulbuli stands on a perch:
 * a tree's perch disc, a log, a roof, a stump (anything it can stand on that is not the ground).
 * There a branch would shove the standing bird about, and at the rim of a perch the physics
 * cannot settle between "landed" and "pushed off" and holds the bird still in the air. Those
 * places keep the perch they always had; the branch is solid everywhere else.
 */
/** Horizontal distance from (x, z) to the edge of what a collider carries (0 or less: over it). */
function gapTo(collider, x, z) {
  if (collider.shape === 'aabb') return Math.hypot(Math.max(collider.minX - x, 0, x - collider.maxX), Math.max(collider.minZ - z, 0, z - collider.maxZ))
  return Math.hypot(x - collider.x, z - collider.z) - (collider.supportRadius ?? collider.r)
}

function clearOfPerches(colliders) {
  const perches = colliders.filter((c) => c.walkable && c.kind === 'prop' && !c.bough)
  if (!colliders.some((c) => c.bough) || !perches.length) return colliders
  const index = createColliderIndex(perches, { margin: 1 })
  return colliders.filter((c) => {
    if (!c.bough) return true
    return !index.near(c.x, c.z).some((perch) => {
      const high = perch.top
      const low = perch.heightAt ? Math.min(high, perch.heightAt(perch.x, perch.z)) : high
      // from a step below the perch (the bird steps up half a metre) to the top of its head on it
      return c.bottom < high + PLAYER_HEIGHT + 0.05 && c.top > low - 0.55
        && gapTo(perch, c.x, c.z) < c.r + PLAYER_RADIUS + 0.05
    })
  })
}

/**
 * A walkable surface for each dune prop, shaped exactly like the dune that is drawn
 * (sandShapes.js). It only carries Bulbuli (supportOnly: no side wall, so the bird is never
 * pushed away from a dune, on the ground or in the air); drive.js keeps a bird that flies or
 * jumps into a dune's side on its surface.
 * Inside the dune's outline the surface is the dune, or the sand where the dune's rim dips below
 * it; outside the outline it is the sand.
 */
function duneColliders(biome, land) {
  const landHeightAt = (x, z) => {
    let top = -Infinity
    for (const c of land) {
      const distance = Math.hypot(x - c.x, z - c.z)
      if (distance > c.r || (c.innerRadius != null && distance < c.innerRadius)) continue
      top = Math.max(top, c.heightAt ? c.heightAt(x, z) : c.top)
    }
    return top
  }
  return biome.props.filter((p) => p.type === 'dune').map((p, i) => {
    const s = p.scale ?? 1
    return {
      id: `dune-${i}`,
      kind: 'prop',
      x: p.x,
      z: p.z,
      r: duneReach(p),
      top: (p.y ?? 0) + 1.6 * s,
      bottom: (p.y ?? 0) - 1,
      walkable: true,
      supportOnly: true,
      surfaceType: undefined,
      // (beyond the outline it answers with the sand itself, never with "nothing": a bird that
      // walks off a dune must always have a finite height under it)
      heightAt: (x, z) => Math.max(duneHeightAt(p, x, z), landHeightAt(x, z)),
    }
  })
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
