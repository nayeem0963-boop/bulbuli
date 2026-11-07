/**
 * Sundarbans vegetation layout (pure, deterministic). Produces placement records that
 * SundarbansScenery draws with instancing.
 *
 * On the walkable land (gameplay rules: clear spawn, camera approach, view corridor, stations,
 * boardwalks):
 *   mangrove            groves of large trees, denser towards the water's edge
 *   sapling             young trees at grove edges and along the shore
 *   understory          irregular clumps of fern, reeds, broad-leaved plants and hantal palm
 *   pneumatophoreField  breathing-root fields around the trees and on the shore
 *   debris              twigs and fallen leaves
 * Off the walkable land (background: true, never on ground the player can reach):
 *   backgroundMangrove  fringe trees on mud bars and the inner far-forest band ('mid' detail), the
 *                       rest of the far forest ('far' detail)
 *   shoreNipa           golpata (nipa palm) clumps at the waterline
 *   shoreRoots          pneumatophore fields on exposed mud
 *   shoreReeds          reeds and sedges in the shallows
 */
import { mulberry32 } from '../../../core/rng.js'
import { createWetlandField, fbm } from './wetland.js'
import { TERRAIN_FOOTPRINT_SCALE, hasExpandedTerrainFootprint, terrainHeightAt, terrainSeed } from './terrain.js'
import { FAR_FORM_OF, MANGROVE_FORMS, MANGROVE_SPECIES } from './mangroveForms.js'

export const TREE_SPECIES = MANGROVE_SPECIES
/** Crown radius (metres, at scale 1) used for spacing. */
const CROWN = { sundari: 2.6, gewa: 2.1, keora: 2.2, garjan: 2.1, goran: 1.3 }
/** Mature-size range per family at grove level: sundari sets the forest structure. */
const GROVE_SCALE = { sundari: [0.88, 0.36], keora: [0.84, 0.34], garjan: [0.8, 0.38], gewa: [0.78, 0.34], goran: [0.8, 0.45] }

/** Deterministic 0..1 from a position (does not touch the layout's random streams). */
function hash01(x, z, salt = 0) {
  const s = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453
  return s - Math.floor(s)
}

/**
 * Picks a seeded silhouette for each tree: the form whose nearest same-family twin is farthest
 * away, so neighbouring trees of one family rarely share a mesh.
 */
function assignForms(items, lod) {
  const placed = []
  for (const item of items) {
    const count = MANGROVE_FORMS[lod][item.variant] ?? 1
    const start = Math.floor(hash01(item.x, item.z, 1) * count)
    let best = start
    let bestDistance = -1
    for (let i = 0; i < count; i += 1) {
      const form = (start + i) % count
      let nearest = Infinity
      for (const other of placed) {
        if (other.variant === item.variant && other.form === form) nearest = Math.min(nearest, Math.hypot(other.x - item.x, other.z - item.z))
      }
      if (nearest > bestDistance + 1e-9) {
        best = form
        bestDistance = nearest
      }
      if (nearest === Infinity) break
    }
    item.form = best
    placed.push(item)
  }
}

function segmentDistance(x, z, a, b) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const length = dx * dx + dz * dz || 1
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length))
  return Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz))
}

function pick(random, weights) {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0)
  let value = random() * total
  for (const [key, weight] of Object.entries(weights)) {
    value -= weight
    if (value <= 0) return key
  }
  return Object.keys(weights)[0]
}

/** A simple spatial hash so spacing checks stay fast with hundreds of items. */
function createGrid(cell = 4) {
  const cells = new Map()
  const key = (ix, iz) => `${ix},${iz}`
  return {
    add(item) {
      const k = key(Math.floor(item.x / cell), Math.floor(item.z / cell))
      if (!cells.has(k)) cells.set(k, [])
      cells.get(k).push(item)
    },
    near(x, z, radius, test) {
      const span = Math.ceil(radius / cell)
      const ix = Math.floor(x / cell)
      const iz = Math.floor(z / cell)
      for (let i = -span; i <= span; i += 1) {
        for (let j = -span; j <= span; j += 1) {
          const list = cells.get(key(ix + i, iz + j))
          if (list && list.some(test)) return true
        }
      }
      return false
    },
  }
}

export function scatterSundarbans(biome) {
  const field = createWetlandField(biome)
  const placements = []
  const spawnX = biome.spawn.position[0]
  const spawnZ = biome.spawn.position[2]
  const facing = biome.spawn.facing
  const cameraX = spawnX + Math.sin(facing + Math.PI) * 8.2
  const cameraZ = spawnZ + Math.cos(facing + Math.PI) * 8.2
  const camera = { x: cameraX, z: cameraZ }
  const viewEnd = { x: spawnX + Math.sin(facing) * 28, z: spawnZ + Math.cos(facing) * 28 }
  const islands = biome.discs.filter((disc) => hasExpandedTerrainFootprint(disc))
  const village = biome.props.find((prop) => prop.type === 'village')
  const villageSpot = village ? { x: village.x + 2.4, z: village.z + 0.5 } : null
  const blockers = biome.props.filter((prop) => prop.block)

  const landDisc = (x, z, inset = 0.95) => islands.find((disc) => (
    Math.hypot(x - disc.x, z - disc.z) <= disc.r * TERRAIN_FOOTPRINT_SCALE * inset
  ))
  const groundY = (disc, x, z) => terrainHeightAt(disc, x, z, terrainSeed(disc, biome.id), biome.id)
  const pathDistance = (x, z) => biome.links.reduce((best, [a, b]) => Math.min(best, segmentDistance(x, z, a, b)), Infinity)
  const stationDistance = (x, z) => biome.stations.reduce((best, s) => Math.min(best, Math.hypot(x - s.x, z - s.z)), Infinity)
  const viewDistance = (x, z) => segmentDistance(x, z, camera, viewEnd)

  /** Gameplay clearances shared by everything on the land. */
  const landClear = (x, z, { station, spawn, camera: cameraR, corridor, path, villageR = 5.5 }) => {
    if (stationDistance(x, z) < station) return false
    if (Math.hypot(x - spawnX, z - spawnZ) < spawn) return false
    if (cameraR && Math.hypot(x - cameraX, z - cameraZ) < cameraR) return false
    if (corridor && viewDistance(x, z) < corridor) return false
    if (pathDistance(x, z) < path) return false
    if (villageSpot && Math.hypot(x - villageSpot.x, z - villageSpot.z) < villageR) return false
    if (blockers.some((prop) => Math.hypot(x - prop.x, z - prop.z) < prop.block + 1.1)) return false
    return true
  }

  /* ---------------------------------------------------------------- land trees (groves) */
  const trees = []
  const treeGrid = createGrid(5)
  const random = mulberry32(0x5bd1e995)
  const groveCount = 48
  let groves = 0
  let groveAttempts = 0
  while (groves < groveCount && groveAttempts < 6000 && trees.length < 60) {
    groveAttempts += 1
    const disc = islands[Math.floor(random() * islands.length)]
    const angle = random() * Math.PI * 2
    const radius = Math.sqrt(random()) * disc.r * TERRAIN_FOOTPRINT_SCALE * 0.95
    const gx = disc.x + Math.cos(angle) * radius
    const gz = disc.z + Math.sin(angle) * radius
    const edge = field.walkSD(gx, gz)
    // groves favour the shoreline belt; the interior keeps open muddy clearings
    if (random() > 0.25 + 0.75 * Math.max(0, Math.min(1, (edge + 9) / 7))) continue
    const size = 2 + Math.floor(random() * 4)
    let planted = 0
    for (let i = 0; i < size * 4 && planted < size && trees.length < 60; i += 1) {
      const a = random() * Math.PI * 2
      const r = i === 0 ? 0 : 1.6 + random() * 3.2
      const x = gx + Math.cos(a) * r
      const z = gz + Math.sin(a) * r
      const home = landDisc(x, z)
      if (!home) continue
      const shore = field.walkSD(x, z) > -5
      // mature sundari and garjan set the structure; gewa fills; goran shrubs stay a minority
      // here (saplings add the bushy forest-edge growth)
      const variant = pick(random, shore
        ? { sundari: 4.2, garjan: 3, gewa: 1.4, keora: 1.4, goran: 1.2 }
        : { sundari: 5.5, gewa: 2.4, goran: 1, keora: 1, garjan: 0.6 })
      const big = variant !== 'goran'
      if (!big && trees.filter((t) => t.variant === 'goran').length >= 9) continue
      // a few veteran sundari, larger than the rest, stand well away from the view corridor
      const veteran = variant === 'sundari' && hash01(x, z, 4) < 0.4 && viewDistance(x, z) > 8
      const scale = (GROVE_SCALE[variant][0] + random() * GROVE_SCALE[variant][1]) * (veteran ? 1.18 : 1)
      // big crowns keep a wide clearing round each station so the follow camera can frame it
      if (!landClear(x, z, { station: big ? 9 : 5.5, spawn: 9.5, camera: 5.2, corridor: big ? 5 : 4.6, path: big ? 4.4 : 4 })) continue
      const spacing = CROWN[variant] * scale
      if (treeGrid.near(x, z, 6, (t) => Math.hypot(x - t.x, z - t.z) < (spacing + CROWN[t.variant] * t.scale) * 0.72)) continue
      const tree = {
        kind: 'mangrove',
        variant,
        x,
        z,
        y: groundY(home, x, z),
        scale,
        stretch: 0.9 + random() * 0.22,
        rot: random() * Math.PI * 2,
        clearance: 4.2,
      }
      trees.push(tree)
      treeGrid.add(tree)
      planted += 1
    }
    if (planted) groves += 1
  }
  assignForms(trees, 'near')
  placements.push(...trees)

  /* ---------------------------------------------------------------- saplings */
  const smallGrid = createGrid(3)
  const saplingRandom = mulberry32(0x27d4eb2f)
  const saplingItems = []
  let saplings = 0
  for (let attempt = 0; attempt < 2400 && saplings < 42; attempt += 1) {
    const anchor = saplingRandom() < 0.6 && trees.length ? trees[Math.floor(saplingRandom() * trees.length)] : null
    let x
    let z
    if (anchor) {
      const a = saplingRandom() * Math.PI * 2
      const r = 2.6 + saplingRandom() * 2.8
      x = anchor.x + Math.cos(a) * r
      z = anchor.z + Math.sin(a) * r
    } else {
      const disc = islands[Math.floor(saplingRandom() * islands.length)]
      const a = saplingRandom() * Math.PI * 2
      const r = Math.sqrt(saplingRandom()) * disc.r * TERRAIN_FOOTPRINT_SCALE * 0.95
      x = disc.x + Math.cos(a) * r
      z = disc.z + Math.sin(a) * r
      if (field.walkSD(x, z) < -5) continue
    }
    const home = landDisc(x, z)
    if (!home) continue
    if (!landClear(x, z, { station: 3.9, spawn: 4.8, camera: 3.6, corridor: 3.9, path: 2.4 })) continue
    if (treeGrid.near(x, z, 4, (t) => Math.hypot(x - t.x, z - t.z) < 1.9)) continue
    if (smallGrid.near(x, z, 3, (t) => Math.hypot(x - t.x, z - t.z) < 1.5)) continue
    // young growth at grove edges: mostly bushy goran, some garjan and gewa
    const kind = saplingRandom()
    const item = {
      kind: 'sapling',
      variant: kind < 0.5 ? 'goran' : kind < 0.78 ? 'garjan' : 'gewa',
      x,
      z,
      y: groundY(home, x, z),
      scale: 0.32 + saplingRandom() * 0.26,
      stretch: 0.9 + saplingRandom() * 0.3,
      rot: saplingRandom() * Math.PI * 2,
      clearance: 1.5,
    }
    placements.push(item)
    saplingItems.push(item)
    smallGrid.add(item)
    saplings += 1
  }
  assignForms(saplingItems, 'mid')

  /* ---------------------------------------------------------------- understory clumps */
  const plantRandom = mulberry32(0x165667b1)
  const plantGrid = createGrid(2)
  let clusters = 0
  for (let attempt = 0; attempt < 5000 && clusters < 34; attempt += 1) {
    const anchor = plantRandom() < 0.55 && trees.length ? trees[Math.floor(plantRandom() * trees.length)] : null
    let cx
    let cz
    if (anchor) {
      const a = plantRandom() * Math.PI * 2
      const r = 1.4 + plantRandom() * 2.6
      cx = anchor.x + Math.cos(a) * r
      cz = anchor.z + Math.sin(a) * r
    } else {
      const disc = islands[Math.floor(plantRandom() * islands.length)]
      const a = plantRandom() * Math.PI * 2
      const r = Math.sqrt(plantRandom()) * disc.r * TERRAIN_FOOTPRINT_SCALE * 0.94
      cx = disc.x + Math.cos(a) * r
      cz = disc.z + Math.sin(a) * r
    }
    if (!landDisc(cx, cz)) continue
    const nearestPath = pathDistance(cx, cz)
    if (nearestPath < 2.4 || nearestPath > 11) continue
    if (!landClear(cx, cz, { station: 4.2, spawn: 4.8, camera: 3.8, corridor: 4.2, path: 2.4 })) continue
    const shore = field.walkSD(cx, cz) > -4.5
    const kindWeights = shore
      ? { reed: 3, fern: 2.4, hantal: 1, broadleaf: 0.6 }
      : { fern: 3, broadleaf: 2.4, hantal: 1.4, reed: 0.8 }
    const main = pick(plantRandom, kindWeights)
    const count = 3 + Math.floor(plantRandom() * 4)
    let placed = 0
    for (let plant = 0; plant < count; plant += 1) {
      const a = (plant / count) * Math.PI * 2 + plantRandom() * 0.9
      const r = 0.35 + plantRandom() * 1.15
      const x = cx + Math.cos(a) * r
      const z = cz + Math.sin(a) * r
      const home = landDisc(x, z)
      if (!home) continue
      if (!landClear(x, z, { station: 3.9, spawn: 3.9, camera: 3.6, corridor: 3.9, path: 1.9 })) continue
      if (treeGrid.near(x, z, 4, (t) => Math.hypot(x - t.x, z - t.z) < 0.9)) continue
      if (plantGrid.near(x, z, 2, (t) => Math.hypot(x - t.x, z - t.z) < 0.55)) continue
      const variant = plantRandom() < 0.78 ? main : pick(plantRandom, kindWeights)
      const item = {
        kind: 'understory',
        variant,
        x,
        z,
        y: groundY(home, x, z),
        scale: (variant === 'broadleaf' ? 0.75 : 0.62) + plantRandom() * 0.5,
        rot: plantRandom() * Math.PI * 2,
        clearance: 0.55,
      }
      placements.push(item)
      plantGrid.add(item)
      placed += 1
    }
    if (placed >= 2) clusters += 1
  }

  /* ---------------------------------------------------------------- breathing-root fields */
  const rootRandom = mulberry32(0x9e3779b9)
  const rootGrid = createGrid(3)
  const tryRootField = (x, z, scale) => {
    const home = landDisc(x, z)
    if (!home) return false
    if (!landClear(x, z, { station: 3.4, spawn: 3.6, camera: 0, corridor: 0, path: 2.1 })) return false
    if (rootGrid.near(x, z, 3, (t) => Math.hypot(x - t.x, z - t.z) < 1.5 * Math.max(scale, t.scale))) return false
    const item = { kind: 'pneumatophoreField', x, z, y: groundY(home, x, z), scale, rot: rootRandom() * Math.PI * 2, clearance: 1 }
    placements.push(item)
    rootGrid.add(item)
    return true
  }
  for (const tree of trees) {
    if (tree.variant === 'garjan' || tree.variant === 'goran') continue
    const fields = tree.variant === 'keora' ? 3 : 2
    for (let i = 0; i < fields; i += 1) {
      const a = rootRandom() * Math.PI * 2
      const r = (1.3 + rootRandom() * 1.6) * tree.scale
      tryRootField(tree.x + Math.cos(a) * r, tree.z + Math.sin(a) * r, 0.75 + rootRandom() * 0.5)
    }
  }
  for (let attempt = 0; attempt < 900; attempt += 1) {
    const disc = islands[Math.floor(rootRandom() * islands.length)]
    const a = rootRandom() * Math.PI * 2
    const r = Math.sqrt(rootRandom()) * disc.r * TERRAIN_FOOTPRINT_SCALE * 0.95
    const x = disc.x + Math.cos(a) * r
    const z = disc.z + Math.sin(a) * r
    if (field.walkSD(x, z) < -4) continue
    tryRootField(x, z, 0.6 + rootRandom() * 0.6)
  }

  /* ---------------------------------------------------------------- debris */
  const debrisRandom = mulberry32(0x7f4a7c15)
  const debrisGrid = createGrid(3)
  let debris = 0
  for (let attempt = 0; attempt < 1500 && debris < 46; attempt += 1) {
    const anchor = trees.length ? trees[Math.floor(debrisRandom() * trees.length)] : null
    if (!anchor) break
    const a = debrisRandom() * Math.PI * 2
    const r = 0.8 + debrisRandom() * 3.4
    const x = anchor.x + Math.cos(a) * r
    const z = anchor.z + Math.sin(a) * r
    const home = landDisc(x, z)
    if (!home || !landClear(x, z, { station: 3, spawn: 3, path: 1.9 })) continue
    if (debrisGrid.near(x, z, 3, (t) => Math.hypot(x - t.x, z - t.z) < 1.2)) continue
    const item = { kind: 'debris', x, z, y: groundY(home, x, z), scale: 0.7 + debrisRandom() * 0.6, rot: debrisRandom() * Math.PI * 2, clearance: 0.5 }
    placements.push(item)
    debrisGrid.add(item)
    debris += 1
  }

  /* ---------------------------------------------------------------- off-land wetland */
  const wetRandom = mulberry32(0x3c6ef372)
  const bgGrid = createGrid(6)
  const shoreGrid = createGrid(3)
  const water = field.waterY
  const sample = (minR, maxR) => {
    const a = wetRandom() * Math.PI * 2
    const r = Math.sqrt(minR * minR + wetRandom() * (maxR * maxR - minR * minR))
    return [field.center.x + Math.cos(a) * r, field.center.z + Math.sin(a) * r]
  }
  const addBackground = (item) => {
    placements.push({ ...item, background: true, clearance: 0 })
    bgGrid.add(item)
  }

  // A low-frequency grove field groups the background into stands of overlapping crowns with
  // natural openings between them (instead of an even spread of single trees).
  const grove = (x, z) => fbm(x * 0.03 + 11.3, z * 0.03 - 4.7, 151, 2)

  // fringe mangroves: on exposed bars and bank edges near the playable land (cast no shadows)
  let fringe = 0
  for (let attempt = 0; attempt < 9000 && fringe < 130; attempt += 1) {
    const [x, z] = sample(18, 70)
    const e = field.walkSD(x, z)
    if (e < 3) continue
    const h = field.heightAt(x, z)
    if (h < water - 0.1 || field.channelAt(x, z) > 0.3) continue
    const variant = pick(wetRandom, e < 9
      ? { goran: 3, garjan: 2.5 }
      : { garjan: 3, keora: 2.2, goran: 1.6, gewa: 1.4, sundari: 1.4 })
    if (variant !== 'goran' && e < 6.5) continue // tall trees keep clear of the camera
    const stand = grove(x, z)
    if (stand < 0.3 && wetRandom() < 0.5) continue // an occasional opening between stands
    const scale = 0.75 + wetRandom() * 0.55
    const spacing = CROWN[variant] * scale * (1.25 - 0.5 * stand)
    if (bgGrid.near(x, z, 7, (t) => Math.hypot(x - t.x, z - t.z) < spacing + (t.lod === 'far' ? 2 : CROWN[t.variant] * t.scale) * 0.6)) continue
    addBackground({ kind: 'backgroundMangrove', lod: 'mid', variant, form: Math.floor(hash01(x, z, 2) * MANGROVE_FORMS.mid[variant]), x, z, y: h, scale, stretch: 0.88 + wetRandom() * 0.3, rot: wetRandom() * Math.PI * 2 })
    fringe += 1
  }

  // the far forest: dense, overlapping canopies of varied height on every bank
  let far = 0
  for (let attempt = 0; attempt < 34000 && far < 560; attempt += 1) {
    const [x, z] = sample(34, 158)
    const h = field.heightAt(x, z)
    if (h < water + 0.04) continue
    const dc = Math.hypot(x - field.center.x, z - field.center.z)
    const stand = grove(x, z)
    // openings between stands, mostly in the deep background (the inner band stays dense)
    if (stand < 0.34 && wetRandom() < (dc < 70 ? 0.3 : 0.7)) continue
    const spacing = (2.3 + dc * 0.022) * (1.35 - 0.8 * stand)
    if (bgGrid.near(x, z, 8, (t) => Math.hypot(x - t.x, z - t.z) < spacing)) continue
    const tall = fbm(x * 0.05, z * 0.05, 131, 2)
    const farVariant = TREE_SPECIES[Math.floor(wetRandom() * 4)]
    // the inner band of the far forest is seen from the island edges: it uses the leafy mid model
    const nearBand = dc < 70
    // low bank shrubs layered in front of the tall forest at the water's edge (and here and there)
    const shrub = !nearBand && (h < water + 0.3 ? hash01(x, z, 5) < 0.7 : hash01(x, z, 5) < 0.28)
    addBackground({
      kind: 'backgroundMangrove',
      lod: nearBand ? 'mid' : 'far',
      variant: farVariant,
      form: nearBand ? Math.floor(hash01(x, z, 3) * MANGROVE_FORMS.mid[farVariant]) : shrub ? 3 : FAR_FORM_OF[farVariant],
      x,
      z,
      y: h,
      scale: (0.85 + tall * 0.75 + wetRandom() * 0.35) * (1 + dc * 0.002) * (shrub ? 0.85 : 1),
      stretch: 0.8 + wetRandom() * 0.45,
      rot: wetRandom() * Math.PI * 2,
    })
    far += 1
  }

  // golpata (nipa palm) along the waterline
  const shoreItem = (kind, attempts, max, minR, maxR, accept, scale) => {
    let count = 0
    for (let attempt = 0; attempt < attempts && count < max; attempt += 1) {
      const [x, z] = sample(minR, maxR)
      const e = field.walkSD(x, z)
      const h = field.heightAt(x, z)
      if (!accept(e, h)) continue
      if (shoreGrid.near(x, z, 3, (t) => Math.hypot(x - t.x, z - t.z) < 1.6)) continue
      if (bgGrid.near(x, z, 6, (t) => Math.hypot(x - t.x, z - t.z) < 1.2)) continue
      const item = { kind, x, z, y: Math.max(h, water - 0.12), scale: scale(), rot: wetRandom() * Math.PI * 2, background: true, clearance: 0 }
      placements.push(item)
      shoreGrid.add(item)
      count += 1
    }
  }
  shoreItem('shoreNipa', 8000, 70, 14, 60, (e, h) => e > 0.9 && h > water - 0.22 && h < water + 0.2, () => 0.75 + wetRandom() * 0.5)
  shoreItem('shoreRoots', 8000, 110, 14, 55, (e, h) => e > 0.6 && h > water - 0.06 && h < water + 0.4, () => 0.8 + wetRandom() * 0.7)
  shoreItem('shoreReeds', 8000, 70, 14, 50, (e, h) => e > 0.8 && h > water - 0.2 && h < water + 0.08, () => 0.7 + wetRandom() * 0.6)

  // Individual breathing spikes form a dense bank carpet and share one instanced cone mesh.
  const carpetRandom = mulberry32(0x51ed270b)
  const carpetGrid = createGrid(0.65)
  let carpetCount = 0
  for (let attempt = 0; attempt < 18000 && carpetCount < 1400; attempt += 1) {
    const [x, z] = sample(14, 58)
    const e = field.walkSD(x, z)
    const h = field.heightAt(x, z)
    if (e < 0.45 || h < water - 0.12 || h > water + 0.46 || field.channelAt(x, z) > 0.3) continue
    if (carpetGrid.near(x, z, 0.28, (t) => Math.hypot(x - t.x, z - t.z) < 0.24)) continue
    const item = {
      kind: 'shorePneumatophore',
      x,
      z,
      y: h,
      scale: 0.2 + carpetRandom() * 0.2,
      rot: carpetRandom() * Math.PI * 2,
      background: true,
      clearance: 0,
    }
    placements.push(item)
    carpetGrid.add(item)
    carpetCount += 1
  }

  return placements
}
