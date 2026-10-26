import { LANES, PLATFORM_WIDTH, WALL_X } from '../../config/constants.js'
import { DIFFICULTIES, DifficultyId } from '../../config/difficulty.js'
import { createRng } from '../../utils/random.js'

/*
 * Procedural segment generator.
 *
 * A segment is a plain description — no React, no physics:
 *   { id, type, z0, z1, pieces: [...] }
 * z0 is the near edge, z1 the far edge (the player runs toward −z, so z1 < z0).
 * Every piece carries absolute world coordinates so TrackSegment just maps them
 * to components.
 *
 * Piece kinds:
 *   platform  { x, y (top), z0, z1, w }
 *   ramp      { x, z0, length, rise, w }
 *   wall      { side, z0, z1, yMin, yMax }      wall-run panel
 *   rail      { x, y (top), z0, z1 }            grind rail
 *   hazard    { variant, x, z, phase, speed }   see hazards/Obstacle.jsx
 *   pickup    { variant, position: [x,y,z] }    see collectibles/Collectible.jsx
 *
 * Design rules that keep every segment beatable:
 *   - every segment ends on a full-width platform at y = 0 (a "run-out")
 *   - every hazard row leaves at least one lane open (or is jump/slide-able)
 *   - gap sizes stay inside what a single jump clears at base speed;
 *     long gaps always offer a wall, rail or ramp
 *
 * Difficulty (config/difficulty.js) scales gaps, island width, hazard density,
 * laser speed and how fast/far the ramp climbs. With the hard tuning every
 * multiplier is 1 and no extra RNG draws happen, so a hard course is identical
 * to the pre-difficulty generator for the same seed.
 */

const OUTER = { [-1]: 0, [1]: LANES.length - 1 }

const ISLAND_WIDTH = 3.6

export function createSegmentGenerator(seed, tuning = DIFFICULTIES[DifficultyId.HARD]) {
  const rng = createRng(seed)
  let cursor = 12          // the start platform begins slightly behind the player
  let index = 0
  let lastType = null

  function next() {
    const difficulty = Math.min(tuning.maxRamp, Math.max(0, -cursor / tuning.rampDistance))
    const type = index === 0 ? 'start' : pickType(rng, difficulty, lastType, tuning)
    const id = `seg${index}`
    const ctx = createContext(rng, id, cursor, difficulty, tuning)
    BUILDERS[type](ctx)
    const segment = { id, type, z0: cursor, z1: ctx.z, pieces: ctx.pieces }
    cursor = ctx.z
    lastType = type
    index++
    return segment
  }

  return { next }
}

function pickType(rng, d, last, tuning) {
  const long = tuning.longGapWeight
  const weights = [
    ['runway', 3],
    ['gap', 2],
    ['ramp', 1.4 * long],
    ['rail', 1.3 * long],
    ['wallrun', d > 0.05 ? 1.3 * long : 0],
    ['islands', d > 0.1 ? 1.5 : 0],
  ]
  let type = rng.weighted(weights)
  if (type === last && type !== 'runway') type = rng.weighted(weights) // avoid most repeats
  return type
}

/** Builder context: a moving z cursor plus helpers that emit pieces. */
function createContext(rng, segId, z, difficulty, tuning) {
  let n = 0
  const ctx = {
    rng,
    d: difficulty,
    t: tuning,
    /** Optional hazard row (after gaps / rails): fewer of them on lighter densities. */
    maybeHazardRow(zRow) {
      // `density >= 1` short-circuits, so full density spends no extra RNG draws
      if (tuning.hazardDensity >= 1 || rng.chance(tuning.hazardDensity)) hazardRow(ctx, zRow)
    },
    z,                      // advances toward −z as pieces are laid
    pieces: [],
    uid: (p) => `${segId}-${p}${n++}`,
    add(piece) { ctx.pieces.push({ id: ctx.uid(piece.kind), ...piece }) },

    platform(length, opts = {}) {
      const { x = 0, y = 0, w = PLATFORM_WIDTH } = opts
      const z0 = ctx.z
      ctx.add({ kind: 'platform', x, y, w, z0, z1: z0 - length })
      ctx.z -= length
      return z0
    },
    gap(length) {
      const z0 = ctx.z
      ctx.z -= length
      return z0
    },
    pickup(x, y, z, variant = 'crystal') {
      ctx.add({ kind: 'pickup', variant, position: [x, y, z] })
    },
    crystalLine(x, y, zStart, count, spacing = 3) {
      for (let i = 0; i < count; i++) ctx.pickup(x, y, zStart - i * spacing)
    },
    /** Arc of crystals following a jump over [zStart, zStart − length]. */
    crystalArc(x, zStart, length, baseY, height, count) {
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1)
        const y = baseY + Math.sin(t * Math.PI) * height
        ctx.pickup(x, y, zStart - t * length, i === Math.floor(count / 2) && rng.chance(0.4) ? 'prism' : 'crystal')
      }
    },
    /** Hazard rows spread along a platform section. */
    hazardRows(zStart, length, baseSpacing = 15) {
      const spacing = baseSpacing / tuning.hazardDensity
      for (let zr = zStart - 12; zr > zStart - length + 8; zr -= spacing + rng.range(-2, 3)) {
        hazardRow(ctx, zr)
      }
    },
  }
  return ctx
}

/** One row of hazards across the track at depth z. Always passable. */
function hazardRow(ctx, z) {
  const { rng, d, t } = ctx
  const pattern = rng.weighted([
    ['blocks', 3],
    ['pillars', 1 + d * 2],
    ['overhead', 1.5 + d],
    ['laserSweep', d > 0.12 ? 1 + d * 2 : 0],
    ['laserGate', d > 0.25 ? 1 + d * 2 : 0],
  ])
  const laneOrder = rng.shuffle(LANES.map((_, i) => i))

  if (pattern === 'blocks' || pattern === 'pillars') {
    const count = rng.chance((0.3 + d * 0.4) * t.hazardDensity) ? 2 : 1
    const blocked = laneOrder.slice(0, count)
    const open = laneOrder.slice(count)
    blocked.forEach((li) => {
      // mix: some blocks become pillars at higher difficulty
      const variant = pattern === 'pillars' || rng.chance(d * 0.3) ? 'pillar' : 'block'
      ctx.add({ kind: 'hazard', variant, x: LANES[li], z })
    })
    ctx.crystalLine(LANES[rng.pick(open)], 1, z + 6, 4)
  } else if (pattern === 'overhead') {
    ctx.add({ kind: 'hazard', variant: 'overhead', x: 0, z })
    ctx.crystalLine(LANES[laneOrder[0]], 0.45, z + 3, 3, 3) // low crystals reward sliding
  } else {
    ctx.add({
      kind: 'hazard',
      variant: pattern,
      x: 0,
      z,
      phase: rng.range(0, Math.PI * 2),
      speed: (0.8 + d * 0.7) * t.laserSpeed,
    })
  }
}

// ─── Segment builders ────────────────────────────────────────────

const BUILDERS = {
  /** Safe opening stretch. */
  start(ctx) {
    const z0 = ctx.platform(90)
    ctx.crystalLine(0, 1, z0 - 30, 6)
    ctx.crystalLine(LANES[0], 1, z0 - 60, 4)
  },

  /** Long platform with hazard rows. */
  runway(ctx) {
    const length = ctx.rng.range(45, 70)
    const z0 = ctx.platform(length)
    ctx.hazardRows(z0, length, 16 - ctx.d * 4)
  },

  /** Gap you jump (or double-jump) across. */
  gap(ctx) {
    const { rng, d, t } = ctx
    ctx.platform(8)
    const g = (rng.range(6, 9) + d * 6) * t.gapScale
    const zGap = ctx.gap(g)
    ctx.crystalArc(LANES[rng.int(0, LANES.length - 1)], zGap + 2, g + 4, 1, 2.2, 6)
    const zLand = ctx.platform(30)
    if (d > 0.35) ctx.maybeHazardRow(zLand - 20)
  },

  /** Ramp launch over a long gap — jump off the top, double-jump, glide. */
  ramp(ctx) {
    const { rng, d, t } = ctx
    ctx.platform(10)
    const length = 12
    const rise = 2.6
    const z0 = ctx.z
    ctx.add({ kind: 'ramp', x: 0, z0, length, rise, w: PLATFORM_WIDTH })
    ctx.z -= length
    ctx.crystalLine(0, rise * 0.5 + 1, z0 - 2, 3, 3.5)
    const g = (15 + d * 9) * t.gapScale
    const zGap = ctx.gap(g)
    ctx.crystalArc(0, zGap, g, rise + 1.2, 2.5, 7)
    ctx.pickup(LANES[rng.chance(0.5) ? 0 : 2], rise + 2.5, zGap - g * 0.5, 'prism')
    ctx.platform(30)
  },

  /** Long gap bridged by one or two wall-run panels. */
  wallrun(ctx) {
    const { rng, d, t } = ctx
    const sides = d > 0.5 && rng.chance(0.5) ? [-1, 1] : [rng.chance(0.5) ? -1 : 1]
    const zLead = ctx.platform(16)
    // guide crystals into the outer lane on the lead-in
    ctx.crystalLine(LANES[OUTER[sides[0]]], 1, zLead - 3, 3)
    const g = (28 + d * 8) * t.gapScale
    const zGap = ctx.gap(g)
    sides.forEach((side) => {
      ctx.add({ kind: 'wall', side, z0: zGap - 1, z1: zGap - g + 1, yMin: -1.5, yMax: 4.5 })
      for (let i = 0; i < 6; i++) {
        ctx.pickup(side * (WALL_X - 1.1), 2, zGap - 3 - i * ((g - 6) / 5), i === 3 ? 'prism' : 'crystal')
      }
    })
    ctx.platform(30)
  },

  /** Grind rail starting on the lead platform and crossing a gap. */
  rail(ctx) {
    const { rng, d, t } = ctx
    const li = rng.int(0, LANES.length - 1)
    const x = LANES[li]
    const railY = 1.3
    const zLead = ctx.platform(18)
    const g = (24 + d * 10) * t.gapScale
    const zGap = ctx.gap(g)
    const zRailStart = zLead - 8
    const zRailEnd = zGap - g - 5
    ctx.add({ kind: 'rail', x, y: railY, z0: zRailStart, z1: zRailEnd })
    ctx.crystalLine(x, railY + 1, zRailStart - 2, Math.floor((zRailStart - zRailEnd - 4) / 2.5), 2.5)
    // a block in front of the rail start encourages jumping onto it
    ctx.add({ kind: 'hazard', variant: 'block', x, z: zRailStart + 3 })
    const zLand = ctx.platform(28)
    if (d > 0.3) ctx.maybeHazardRow(zLand - 18)
  },

  /** Staggered floating islands at varying heights and lanes. */
  islands(ctx) {
    const { rng, d, t } = ctx
    ctx.platform(8)
    const count = 3 + (d > 0.5 ? 1 : 0)
    let li = rng.int(0, LANES.length - 1)
    let y = 0
    for (let i = 0; i < count; i++) {
      ctx.gap((rng.range(4, 5.5) + d * 1.5) * t.gapScale)
      li = Math.max(0, Math.min(LANES.length - 1, li + rng.pick([-1, 0, 1])))
      y = Math.max(0, Math.min(1.4, y + rng.pick([-0.7, 0, 0.7])))
      const z0 = ctx.platform(9, { x: LANES[li], y, w: ISLAND_WIDTH * t.islandWidth })
      ctx.crystalLine(LANES[li], y + 1, z0 - 2, 2, 4)
    }
    ctx.gap(4 * t.gapScale)
    ctx.platform(26)
  },
}
