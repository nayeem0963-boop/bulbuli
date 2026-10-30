/**
 * Vector emblems for the certificate medal: one clean symbol per achievement, drawn as SVG path
 * data (100 × 100 box, centre 50,50) so it is razor sharp at any size. No emoji, no images.
 *
 *   emblemFor(badge)  → 'math' | 'geometry' | 'code' | …   (badge → emblem id)
 *   EMBLEMS[id]       → { label, parts: [{ d, mode: 'fill' | 'stroke', width?, tone?: 'ink' | 'light' }] }
 *
 * Which emblem a badge gets: BADGE_EMBLEMS (by badge id), then GAME_EMBLEMS (by the badge's
 * game, requirement.gameId), then CATEGORY_EMBLEMS, then the star. To give a new badge its own
 * emblem, add one line to BADGE_EMBLEMS or GAME_EMBLEMS. Pure data, so it's testable.
 * 'ink' parts are the emblem; 'light' parts are cut-outs/details in the medal's light gold.
 */

/** A star's outline as path data. */
function star(cx, cy, outer, inner, points = 5) {
  let d = ''
  for (let i = 0; i < points * 2; i += 1) {
    const a = (i / (points * 2)) * Math.PI * 2
    const r = i % 2 ? inner : outer
    d += `${i ? 'L' : 'M'}${(cx + r * Math.sin(a)).toFixed(2)} ${(cy - r * Math.cos(a)).toFixed(2)}`
  }
  return `${d}Z`
}

const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`

function hexagon(cx, cy, r) {
  let d = ''
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6
    d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`
  }
  return `${d}Z`
}

const LEFT_WING = 'M47 62C36 64 22 58 18 44C24 47 29 47 32 45C26 42 23 38 22 32C29 37 35 38 39 37C35 34 34 30 34 26C42 33 47 42 47 62Z'
const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${100 - Number(x)} ${y}`)
const LEFT_LOBE = 'M49 30C41 26 31 31 31 39C24 42 23 53 29 57C28 65 36 71 44 68C46 71 49 71 49 71Z'

export const EMBLEMS = {
  star: {
    label: 'Gold star',
    parts: [{ d: star(50, 52, 28, 12), mode: 'fill' }],
  },
  wings: {
    label: 'Wings',
    parts: [
      { d: LEFT_WING, mode: 'fill' },
      { d: mirror(LEFT_WING), mode: 'fill' },
      { d: star(50, 34, 8, 3.5), mode: 'fill' },
    ],
  },
  rocket: {
    label: 'Rocket',
    parts: [
      { d: 'M50 22C60 30 63 44 61 60H39C37 44 40 30 50 22Z', mode: 'fill' },
      { d: 'M39 48 28 64 39 61Z', mode: 'fill' },
      { d: 'M61 48 72 64 61 61Z', mode: 'fill' },
      { d: 'M44 64H56L50 77Z', mode: 'fill' },
      { d: circle(50, 40, 5), mode: 'fill', tone: 'light' },
    ],
  },
  crown: {
    label: 'Crown',
    parts: [
      { d: 'M24 64 22 34 36 46 50 26 64 46 78 34 76 64Z', mode: 'fill' },
      { d: 'M24 68H76V75H24Z', mode: 'fill' },
      { d: circle(50, 53, 4), mode: 'fill', tone: 'light' },
      { d: circle(35, 56, 2.6), mode: 'fill', tone: 'light' },
      { d: circle(65, 56, 2.6), mode: 'fill', tone: 'light' },
    ],
  },
  math: {
    label: 'Star with a plus sign',
    parts: [
      { d: star(50, 52, 30, 14), mode: 'fill' },
      { d: 'M47 41H53V49H61V55H53V63H47V55H39V49H47Z', mode: 'fill', tone: 'light' },
    ],
  },
  bolt: {
    label: 'Lightning bolt',
    parts: [{ d: 'M57 21 32 54H48L42 79 69 44H53Z', mode: 'fill' }],
  },
  geometry: {
    label: 'Triangle in a circle',
    parts: [
      { d: circle(50, 50, 27), mode: 'stroke', width: 4 },
      { d: 'M50 23 73.4 63.5H26.6Z', mode: 'stroke', width: 4 },
      { d: circle(50, 23, 4), mode: 'fill' },
      { d: circle(73.4, 63.5, 4), mode: 'fill' },
      { d: circle(26.6, 63.5, 4), mode: 'fill' },
    ],
  },
  code: {
    label: 'Code brackets',
    parts: [
      { d: 'M37 32 21 50 37 68', mode: 'stroke', width: 6.5 },
      { d: 'M63 32 79 50 63 68', mode: 'stroke', width: 6.5 },
      { d: 'M56.5 27 43.5 73', mode: 'stroke', width: 6.5 },
    ],
  },
  keyboard: {
    label: 'Keyboard',
    parts: [
      { d: 'M28 33H72A6 6 0 0 1 78 39V61A6 6 0 0 1 72 67H28A6 6 0 0 1 22 61V39A6 6 0 0 1 28 33Z', mode: 'fill' },
      ...[0, 1, 2, 3, 4].map((i) => ({ d: `M${29 + i * 9} 39h6v6h-${6}Z`, mode: 'fill', tone: 'light' })),
      ...[0, 1, 2, 3].map((i) => ({ d: `M${33.5 + i * 9} 48h6v6h-6Z`, mode: 'fill', tone: 'light' })),
      { d: 'M36 57H64V61H36Z', mode: 'fill', tone: 'light' },
    ],
  },
  book: {
    label: 'Open book',
    parts: [
      { d: 'M50 36C42 30 30 29 22 31V68C30 66 42 67 50 73C58 67 70 66 78 68V31C70 29 58 30 50 36Z', mode: 'fill' },
      { d: 'M50 38V70', mode: 'stroke', width: 2.2, tone: 'light' },
      { d: 'M28 40C33 39 39 40 44 43M28 48C33 47 39 48 44 51M56 43C61 40 67 39 72 40M56 51C61 48 67 47 72 48', mode: 'stroke', width: 2, tone: 'light' },
    ],
  },
  compass: {
    label: 'Compass',
    parts: [
      { d: circle(50, 50, 27), mode: 'stroke', width: 4 },
      { d: 'M50 26 57 50H43Z', mode: 'fill' },
      { d: 'M50 74 57 50H43Z', mode: 'stroke', width: 2.6 },
      { d: circle(50, 50, 3), mode: 'fill', tone: 'light' },
    ],
  },
  shapes: {
    label: 'Shapes',
    parts: [
      { d: 'M36 26 50 48H22Z', mode: 'fill' },
      { d: 'M54 30H74V50H54Z', mode: 'fill' },
      { d: circle(50, 64, 11), mode: 'fill' },
    ],
  },
  brain: {
    label: 'Brain',
    parts: [
      { d: LEFT_LOBE, mode: 'fill' },
      { d: mirror(LEFT_LOBE), mode: 'fill' },
      { d: 'M38 40C42 40 44 44 42 47M36 55C40 53 44 56 43 60M62 40C58 40 56 44 58 47M64 55C60 53 56 56 57 60', mode: 'stroke', width: 2, tone: 'light' },
    ],
  },
  pattern: {
    label: 'Geometric pattern',
    parts: [
      [50, 50], [50, 33], [50, 67], [35.3, 41.5], [64.7, 41.5], [35.3, 58.5], [64.7, 58.5],
    ].map(([x, y], i) => ({ d: hexagon(x, y, 8.6), mode: i === 0 ? 'fill' : 'stroke', width: 2.6 })),
  },
}

/** Badge id → emblem (wins over everything else). Ids from src/data/badgesConfig.js. */
export const BADGE_EMBLEMS = {
  'sky-explorer': 'wings',
  'high-flyer': 'rocket',
  'bulbuli-legend': 'crown',
  'math-hero-master': 'math',
  'math-hero-pro-star': 'math',
  'math-hero-pro-plus-tactician': 'bolt',
  'math-master-champion': 'geometry',
  'code-architect': 'code',
  'typing-wizard': 'keyboard',
  'dedicated-learner': 'book',
  'arcade-all-star': 'star',
  'curious-mind': 'compass',
  hatchling: 'star',
  fledgling: 'star',
}

/** By the game a badge is about (requirement.gameId). */
export const GAME_EMBLEMS = {
  'math-hero': 'math',
  'math-hero-pro': 'math',
  'math-hero-pro-plus': 'bolt',
  'math-master': 'geometry',
  'html-architect': 'code',
  'sky-typewriter': 'keyboard',
  'shape-hunt': 'shapes',
  'shape-sorting': 'shapes',
  'memory-match': 'brain',
  'pattern-quest': 'pattern',
  'sky-runner': 'compass',
  'ball-dash': 'compass',
  'bouncy-hop': 'compass',
  'skyward-explorer': 'compass',
  'neon-velocity': 'bolt',
}

export const CATEGORY_EMBLEMS = { level: 'star', skill: 'star', mastery: 'star' }

export function emblemFor(badge) {
  const id = BADGE_EMBLEMS[badge?.id] ?? GAME_EMBLEMS[badge?.requirement?.gameId] ?? CATEGORY_EMBLEMS[badge?.category] ?? 'star'
  return EMBLEMS[id] ? id : 'star'
}
