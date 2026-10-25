/**
 * Bulbuli: Skyward Explorer — where everything in the world goes.
 *
 * Pure data, no three.js, so it can be unit-tested (layout.test.js) and reused later by
 * physics and game logic. One seed always gives the same world.
 *
 * Coordinates: y is up. The main island's grass top is at y = 0, centred on the origin.
 * Every surface's `position[1]` is the height of its walkable top.
 */
import { mulberry32 } from '../../core/rng.js'

export const ISLAND = {
  radius: 10,      // main island grass top
  grassDepth: 0.6,
  dirtDepth: 1.4,
  rockDepth: 9,    // the hanging rocky underside
}

// What the player must be able to do to reach the next platform (edge to edge).
// Step 2's controller should jump at least this far and this high.
export const JUMP = { maxGap: 3.4, maxRise: 1.3 }

const PLATFORM_COUNT = 12
const PLATFORM_RING = 15   // platforms spiral round the island at about this distance
const PILLAR_RING = 3.6    // the ruined ring of ancient pillars round the centre
const CRYSTAL_HOVER = 1.1  // how high crystals float above the surface below them

export const CRYSTAL_COLORS = ['#5ef2ff', '#b48cff', '#ff7ad9', '#7dffb0']

/** The whole world for one seed: { seed, platforms, pillars, rubble, trees, rocks, crystals }. */
export function generateWorld(seed = 7) {
  const rng = mulberry32(seed)
  const range = (min, max) => min + (max - min) * rng()
  const TAU = Math.PI * 2

  // Footprints already used on the island top ({ x, z, r }), so props never overlap.
  const taken = [{ x: 0, z: 0, r: 1.6 }] // the altar in the middle
  const isFree = (x, z, r) => taken.every((t) => Math.hypot(t.x - x, t.z - z) >= t.r + r)
  const placeOnIsland = (minR, maxR, r, tries = 40) => {
    for (let i = 0; i < tries; i++) {
      const a = range(0, TAU)
      const d = range(minR, maxR)
      const x = Math.cos(a) * d
      const z = Math.sin(a) * d
      if (isFree(x, z, r)) {
        taken.push({ x, z, r })
        return [x, 0, z]
      }
    }
    return null
  }

  // Ancient pillars: a ring of six, some broken, with their fallen tops lying beside them.
  const pillars = []
  const rubble = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3
    const x = Math.cos(a) * PILLAR_RING
    const z = Math.sin(a) * PILLAR_RING
    const broken = i % 3 === 2 || rng() < 0.2
    pillars.push({
      id: `pillar-${i}`,
      position: [x, 0, z],
      height: broken ? range(1.0, 1.7) : range(2.7, 3.2),
      broken,
      rotationY: range(0, Math.PI),
    })
    taken.push({ x, z, r: 0.8 })
    if (broken) {
      const fa = a + range(-0.6, 0.6)
      const fx = x + Math.cos(fa) * 1.3
      const fz = z + Math.sin(fa) * 1.3
      rubble.push({ id: `rubble-${i}`, position: [fx, 0.38, fz], length: range(1.0, 1.5), rotationY: range(0, Math.PI) })
      taken.push({ x: fx, z: fz, r: 0.8 })
    }
  }

  const trees = []
  for (let i = 0; i < 10; i++) {
    const position = placeOnIsland(PILLAR_RING + 1.6, ISLAND.radius - 1.3, 1.1)
    if (!position) continue
    trees.push({ id: `tree-${i}`, position, height: range(2.4, 3.6), lean: range(-0.06, 0.06), rotationY: range(0, TAU), shade: rng() })
  }

  const rocks = []
  for (let i = 0; i < 14; i++) {
    const size = range(0.3, 0.85)
    const position = placeOnIsland(ISLAND.radius * 0.45, ISLAND.radius - 0.5, size)
    if (!position) continue
    rocks.push({
      id: `rock-${i}`,
      position,
      scale: [size * range(0.9, 1.4), size * range(0.55, 0.85), size * range(0.9, 1.3)],
      rotation: [range(-0.3, 0.3), range(0, TAU), range(-0.3, 0.3)],
      shade: rng(),
    })
  }

  // Parkour platforms: a rising spiral round the island. Each one is placed a jumpable gap
  // from the one before, walking round the island and pulled back towards PLATFORM_RING.
  const platforms = []
  const startAngle = range(0, TAU)
  let prev = null
  for (let i = 0; i < PLATFORM_COUNT; i++) {
    const summit = i === PLATFORM_COUNT - 1
    const radius = summit ? 2.8 : range(1.5, 2.2)
    const gap = range(1.8, JUMP.maxGap - 0.3)
    const rise = range(0.6, JUMP.maxRise - 0.2)
    let x
    let z
    let y
    if (!prev) {
      // first hop: straight out from the island's edge
      const d = ISLAND.radius + radius + gap
      x = Math.cos(startAngle) * d
      z = Math.sin(startAngle) * d
      y = rise
    } else {
      const [px, py, pz] = prev.position
      const r = Math.hypot(px, pz)
      const pull = ((PLATFORM_RING - r) / PLATFORM_RING) * 1.5
      let dx = -pz / r + (px / r) * pull
      let dz = px / r + (pz / r) * pull
      const len = Math.hypot(dx, dz)
      dx /= len
      dz /= len
      const step = prev.radius + radius + gap
      x = px + dx * step
      z = pz + dz * step
      y = py + rise
    }
    prev = { id: `platform-${i}`, position: [x, y, z], radius, summit, seed: Math.floor(rng() * 1e6) }
    platforms.push(prev)
  }

  // Crystals: one over every platform, three round the summit, one over the altar,
  // and a few tucked between the pillars and trees.
  const crystals = []
  const addCrystal = (x, surfaceY, z) => {
    crystals.push({
      id: `crystal-${crystals.length}`,
      position: [x, surfaceY + CRYSTAL_HOVER, z],
      color: CRYSTAL_COLORS[crystals.length % CRYSTAL_COLORS.length],
      phase: range(0, TAU),
    })
  }
  addCrystal(0, 0.6, 0) // on the altar
  for (const p of platforms) {
    const [x, y, z] = p.position
    if (p.summit) {
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * TAU
        addCrystal(x + Math.cos(a) * 1.4, y, z + Math.sin(a) * 1.4)
      }
    } else {
      addCrystal(x, y, z)
    }
  }
  for (let i = 0; i < 4; i++) {
    const position = placeOnIsland(2, ISLAND.radius - 1.5, 0.6)
    if (position) addCrystal(position[0], 0, position[2])
  }

  return { seed, platforms, pillars, rubble, trees, rocks, crystals }
}

/** The route a player takes: the island's edge, then each platform in turn (used by the test camera). */
export function parkourRoute(world) {
  const [fx, , fz] = world.platforms[0].position
  const d = Math.hypot(fx, fz)
  const start = [(fx / d) * (ISLAND.radius - 1.5), 0, (fz / d) * (ISLAND.radius - 1.5)]
  return [start, ...world.platforms.map((p) => p.position)]
}
