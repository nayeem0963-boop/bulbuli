/**
 * Mock community levels: real, playable LevelState block data (built procedurally here so
 * the file stays readable), plus gallery metadata. All of them are checked as beatable by
 * src/community/community.test.js using the real physics (src/play/solver.js).
 *
 * Timestamps are relative to page load so "Newest" and "Trending" look alive.
 */
import { parseLevel } from '../level/levelSchema.js'

const HOUR = 3600 * 1000

// ---- tiny block helpers -------------------------------------------------------------
const P = (x, y, z, color = '#64748b') => ({ type: 'PLATFORM', x, y, z, color })
const L = (x, y, z) => ({ type: 'LAVA', x, y, z })
const B = (x, y, z) => ({ type: 'BOUNCE', x, y, z })
const spawnOn = (x, y, z) => ({ type: 'SPAWN', x, y: y + 1, z })
const finishOn = (x, y, z) => ({ type: 'FINISH', x, y: y + 1, z })
const pad = (x0, x1, y, z0, z1, color) => {
  const out = []
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) out.push(P(x, y, z, color))
  return out
}
const alt = (i, a, b) => (i % 2 ? a : b)
// Block colours must be #rrggbb (parseLevel drops anything else), so convert gradients here.
function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))))
  return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

// ---- levels ------------------------------------------------------------------------
function neonSprint() {
  // A straight run with three gaps: pure speed.
  const segments = [[-9, -6], [-3, -1], [1, 3], [6, 9]]
  const blocks = []
  segments.forEach(([a, b], s) => {
    for (let x = a; x <= b; x++) blocks.push(P(x, 0, 0, alt(x + s, '#22d3ee', '#6366f1')))
  })
  return [spawnOn(-9, 0, 0), finishOn(9, 0, 0), ...blocks]
}

function lavaGauntlet() {
  // Stepping stones over a lava field, start and end pads raised to stone height.
  const blocks = []
  for (let x = -6; x <= 6; x++) for (let z = -2; z <= 2; z++) blocks.push(L(x, 0, z))
  const stones = [[-5, 0], [-3, 1], [-1, 0], [1, -1], [3, 0], [5, 1]]
  stones.forEach(([x, z], i) => blocks.push(P(x, 1, z, alt(i, '#94a3b8', '#f59e0b'))))
  blocks.push(...pad(-9, -7, 1, -1, 1, '#334155'), ...pad(7, 9, 1, -1, 1, '#334155'))
  return [spawnOn(-8, 1, 0), finishOn(8, 1, 0), ...blocks]
}

function skyIslands() {
  // Islands climbing in a loop; bounce pads launch you to the next one.
  const isl = (cx, y, cz, color) => pad(cx - 1, cx + 1, y, cz - 1, cz + 1, color)
  return [
    spawnOn(-7, 0, -7),
    ...isl(-7, 0, -7, '#10b981'), B(-5, 0, -7),
    ...isl(-2, 2, -7, '#34d399'), B(0, 2, -7),
    ...isl(3, 4, -7, '#6ee7b7'), B(3, 4, -5),
    ...isl(3, 6, -2, '#a7f3d0'),
    P(3, 6, 0, '#a7f3d0'), P(3, 6, 1, '#a7f3d0'),
    finishOn(3, 6, 1),
  ]
}

function spiralTower() {
  // Square spiral of steps around a central pillar, one step up every two blocks.
  const ring = []
  for (let x = -3; x <= 3; x++) ring.push([x, -3])
  for (let z = -2; z <= 3; z++) ring.push([3, z])
  for (let x = 2; x >= -3; x--) ring.push([x, 3])
  for (let z = 2; z >= -2; z--) ring.push([-3, z])
  const blocks = []
  const laps = ring.slice(0, 23) // one lap, 0 → 11 high (stays under the 16-block ceiling)
  laps.forEach(([x, z], i) => {
    blocks.push(P(x, Math.floor(i / 2), z, hslToHex(260 + i * 4, 70, 62)))
  })
  for (let y = 0; y <= 10; y++) blocks.push(P(0, y, 0, '#1e1b4b'))
  const [lx, lz] = laps.at(-1)
  return [spawnOn(-3, 0, -3), finishOn(lx, Math.floor((laps.length - 1) / 2), lz), ...blocks]
}

function crystalStairs() {
  // Wide, relaxed staircase: two blocks deep per step.
  const blocks = []
  for (let s = 0; s < 8; s++) {
    for (let z = -1; z <= 1; z++) {
      blocks.push(P(-8 + s * 2, s, z, alt(s + z, '#c084fc', '#22d3ee')))
      blocks.push(P(-7 + s * 2, s, z, alt(s + z + 1, '#c084fc', '#22d3ee')))
    }
  }
  return [spawnOn(-8, 0, 0), finishOn(7, 7, 0), ...blocks]
}

function zigzagRush() {
  // One-wide zigzag with lava on the inside corners. A bounce pad offers a risky shortcut.
  const path = [
    [-8, -8], [-7, -8], [-6, -8], [-5, -8], [-5, -7], [-5, -6], [-5, -5],
    [-4, -5], [-3, -5], [-2, -5], [-2, -4], [-2, -3], [-2, -2],
    [-1, -2], [0, -2], [1, -2], [1, -1], [1, 0], [1, 1],
    [2, 1], [3, 1], [4, 1], [4, 2], [4, 3], [4, 4], [5, 4], [6, 4], [7, 4],
  ]
  const blocks = path.map(([x, z], i) => P(x, 0, z, alt(i, '#f472b6', '#818cf8')))
  blocks.push(L(-6, 0, -7), L(-3, 0, -4), L(0, 0, -1), L(3, 0, 2))
  return [spawnOn(-8, 0, -8), finishOn(7, 0, 4), ...blocks]
}

function floatingGarden() {
  const blocks = [
    ...pad(-8, -6, 0, 5, 7, '#16a34a'),
    ...pad(-3, -2, 1, 5, 6, '#22c55e'),
    ...pad(1, 2, 2, 5, 6, '#4ade80'),
    B(4, 1, 6),
    ...pad(6, 8, 4, 4, 6, '#86efac'),
  ]
  return [spawnOn(-7, 0, 6), finishOn(7, 4, 5), ...blocks]
}

function voidHopper() {
  // Single-block hops over the void, each one a little higher.
  const hops = [[-8, 0, 0], [-6, 0, 1], [-4, 1, 0], [-2, 1, -1], [0, 2, 0], [2, 2, 1], [4, 3, 0], [6, 3, -1], [8, 4, 0]]
  const blocks = hops.map(([x, y, z], i) => P(x, y, z, alt(i, '#a855f7', '#6366f1')))
  return [spawnOn(-8, 0, 0), finishOn(8, 4, 0), ...blocks]
}

function lavaManor() {
  // A walled hall with lava gutters; jump between ledges to the throne.
  const blocks = []
  for (let x = -6; x <= 6; x++) {
    blocks.push(P(x, 0, -3, '#1e293b'), P(x, 0, 3, '#1e293b'), P(x, 1, -4, '#334155'), P(x, 1, 4, '#334155'))
    for (let z = -2; z <= 2; z++) blocks.push(L(x, 0, z))
  }
  const ledges = [[-5, 1, 0], [-3, 1, -1], [-1, 2, 0], [1, 2, 1], [3, 3, 0]]
  ledges.forEach(([x, y, z]) => blocks.push(P(x, y, z, '#64748b')))
  blocks.push(...pad(5, 7, 3, -1, 1, '#7c2d12'))
  blocks.push(...pad(-9, -7, 1, -1, 1, '#334155'))
  return [spawnOn(-8, 1, 0), finishOn(6, 3, 0), ...blocks]
}

// ---- gallery metadata -----------------------------------------------------------------
const DEFS = [
  { id: 'cl_neon_sprint', title: 'Neon Sprint', author: 'PixelMira', tags: ['Speedrun'], build: neonSprint, ageH: 5, votes: 812, plays: 3240, contest: true },
  { id: 'cl_lava_gauntlet', title: 'Lava Parkour Gauntlet', author: 'JumpKing_07', tags: ['Obby', 'Hazard'], build: lavaGauntlet, ageH: 30, votes: 2045, plays: 9120, contest: true },
  { id: 'cl_sky_islands', title: 'Sky Islands Bounce', author: 'AeroAsh', tags: ['Bounce'], build: skyIslands, ageH: 52, votes: 1311, plays: 5402, contest: true },
  { id: 'cl_spiral_tower', title: 'Spiral Tower', author: 'GhostByte', tags: ['Climb'], build: spiralTower, ageH: 120, votes: 744, plays: 2650, contest: false },
  { id: 'cl_crystal_stairs', title: 'Crystal Staircase', author: 'Lumen', tags: ['Chill'], build: crystalStairs, ageH: 9, votes: 136, plays: 410, contest: false },
  { id: 'cl_zigzag_rush', title: 'Zigzag Rush', author: 'CubeCadet', tags: ['Speedrun', 'Hazard'], build: zigzagRush, ageH: 2, votes: 58, plays: 190, contest: true },
  { id: 'cl_floating_garden', title: 'Floating Garden', author: 'PixelMira', tags: ['Chill', 'Bounce'], build: floatingGarden, ageH: 75, votes: 530, plays: 1876, contest: false },
  { id: 'cl_void_hopper', title: 'Void Hopper', author: 'NeonBuilder', tags: ['Obby'], build: voidHopper, ageH: 200, votes: 389, plays: 1203, contest: false },
  { id: 'cl_lava_manor', title: 'Haunted Lava Manor', author: 'GhostByte', tags: ['Hazard', 'Obby'], build: lavaManor, ageH: 14, votes: 301, plays: 990, contest: true },
]

export const CONTEST_ID = 'contest_neon_speedrun'

/** Ends next Sunday 23:59:59 local time (rolls over weekly so the mock is always live). */
function nextSundayMidnight(now = new Date()) {
  const end = new Date(now)
  end.setHours(23, 59, 59, 0)
  end.setDate(end.getDate() + ((7 - end.getDay()) % 7))
  if (end <= now) end.setDate(end.getDate() + 7)
  return end.getTime()
}

/** Weekly contest ids carry their end date, so an entry from last week isn't in this week's. */
export const contestIdFor = (endsAt) => {
  const d = new Date(endsAt)
  const pad = (n) => String(n).padStart(2, '0')
  return `${CONTEST_ID}_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function createMockContest(now = Date.now()) {
  const endsAt = nextSundayMidnight(new Date(now))
  return {
    id: contestIdFor(endsAt),
    theme: 'Neon Speedrun Challenge',
    blurb: 'Build the fastest, flashiest run you can. Top-voted entry wins.',
    prizeGems: 500,
    endsAt,
  }
}

/** Gallery entries: { id, title, author, tags, votes, plays, createdAt, contestId, level } */
export function createMockCommunityLevels(now = Date.now(), contestId = createMockContest(now).id) {
  return DEFS.map((d) => {
    const { level } = parseLevel({ id: d.id, title: d.title, author: d.author, blocks: d.build() })
    return {
      id: d.id,
      title: d.title,
      author: d.author,
      tags: d.tags,
      votes: d.votes,
      plays: d.plays,
      createdAt: now - d.ageH * HOUR,
      contestId: d.contest ? contestId : null,
      level,
    }
  })
}
