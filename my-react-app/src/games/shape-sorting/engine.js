// Shape Sorting Factory rules, kept free of React and three.js so they can be tested on their own.
//
// One item at a time rides the conveyor belt. The player drags (or taps, then
// taps a bin) the item into the matching bin before it falls off the end.
// Wrong bins and drops off the belt count as mistakes; the item comes back to
// the start of the belt so the child can try again. Stars depend on mistakes.

/** Bangla names follow the NCTB primary maths books (same as Shape Hunt). */
export const SHAPES = [
  { id: 'cube', name: { en: 'cube', bn: 'ঘনক' } },
  { id: 'sphere', name: { en: 'sphere', bn: 'গোলক' } },
  { id: 'cone', name: { en: 'cone', bn: 'কোণক' } },
  { id: 'cylinder', name: { en: 'cylinder', bn: 'বেলন' } },
  { id: 'pyramid', name: { en: 'pyramid', bn: 'পিরামিড' } },
]

export const COLORS = [
  { id: 'red', hex: '#ff5a5f', name: { en: 'red', bn: 'লাল' } },
  { id: 'blue', hex: '#4d96ff', name: { en: 'blue', bn: 'নীল' } },
  { id: 'yellow', hex: '#ffd23f', name: { en: 'yellow', bn: 'হলুদ' } },
  { id: 'green', hex: '#3fbf6f', name: { en: 'green', bn: 'সবুজ' } },
  { id: 'purple', hex: '#a77bff', name: { en: 'purple', bn: 'বেগুনি' } },
  { id: 'orange', hex: '#ff9f43', name: { en: 'orange', bn: 'কমলা' } },
]

export const getShape = (id) => SHAPES.find((shape) => shape.id === id) ?? null
export const getColor = (id) => COLORS.find((color) => color.id === id) ?? null

/**
 * Levels from easiest to hardest.
 *   sortBy  'shape' → bins are shapes and item colours are random (colour is never a clue)
 *           'color' → bins are colours and item shapes are random
 *   bins    ids of the bins (shape ids or colour ids)
 *   items   how many items must be sorted to finish
 *   speed   belt speed in world units per second (the belt is about 6–7 units long)
 */
export const LEVELS = [
  { id: 1, sortBy: 'shape', bins: ['cube', 'sphere'], items: 6, speed: 0.6 },
  { id: 2, sortBy: 'shape', bins: ['cube', 'sphere', 'cone'], items: 8, speed: 0.75 },
  { id: 3, sortBy: 'shape', bins: ['cylinder', 'pyramid', 'sphere'], items: 8, speed: 0.9 },
  { id: 4, sortBy: 'color', bins: ['red', 'blue', 'yellow'], items: 10, speed: 1.05 },
]

export const getLevel = (id) => LEVELS.find((level) => level.id === id) ?? LEVELS[0]

/** How long the "Yes!" moment lasts before the next item rolls out (ms). */
export const CORRECT_DELAY = 1100

/** Points shown in the game: full points first try, fewer after a mistake on that item. */
export const POINTS_FIRST_TRY = 10
export const POINTS_RETRY = 5

/** Small seeded random generator, so games can be repeated in tests. */
export function createRng(seed = Date.now()) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = (list, rng) => list[Math.floor(rng() * list.length)]

/**
 * A new item for the belt. Its bin is never the same three times in a row,
 * so the child can't win by always using one bin.
 * @param {string[]} history  bins of the previous items, newest first
 */
export function createItem(level, rng, number, history = []) {
  const repeated = history.length >= 2 && history[0] === history[1]
  const pool = repeated ? level.bins.filter((bin) => bin !== history[0]) : level.bins
  const bin = pick(pool, rng)
  const shape = level.sortBy === 'shape' ? bin : pick(SHAPES, rng).id
  const colorPool = level.sortBy === 'color' ? COLORS.filter((color) => color.id === bin) : COLORS
  const color = pick(colorPool, rng).id
  return { id: `${number}-${shape}-${color}`, shape, color, bin, attempts: 0, solved: false }
}

export function createGame(level, rng = createRng()) {
  const item = createItem(level, rng, 1)
  return {
    levelId: level.id,
    sortBy: level.sortBy,
    bins: level.bins,
    total: level.items,
    itemNumber: 1, // 1-based, for "Item 2 of 8"
    item,
    history: [item.bin],
    sorted: 0,
    mistakes: 0, // wrong bins + items that fell off
    misses: 0, // items that fell off the end
    points: 0,
    finished: false,
  }
}

/**
 * The player dropped the current item into `binId`.
 * @returns {{ game, result: 'correct' | 'wrong' | 'ignored' }}
 *   'ignored' when the item is already sorted, the game is over or the bin is unknown,
 *   so a double drop never costs a star.
 */
export function dropItem(game, binId) {
  if (game.finished || game.item.solved || !game.bins.includes(binId)) {
    return { game, result: 'ignored' }
  }
  if (binId === game.item.bin) {
    const points = game.item.attempts === 0 ? POINTS_FIRST_TRY : POINTS_RETRY
    return {
      game: { ...game, sorted: game.sorted + 1, points: game.points + points, item: { ...game.item, solved: true } },
      result: 'correct',
    }
  }
  return {
    game: { ...game, mistakes: game.mistakes + 1, item: { ...game.item, attempts: game.item.attempts + 1 } },
    result: 'wrong',
  }
}

/** The current item rolled off the end of the belt. It comes back for another try. */
export function missItem(game) {
  if (game.finished || game.item.solved) return game
  return {
    ...game,
    mistakes: game.mistakes + 1,
    misses: game.misses + 1,
    item: { ...game.item, attempts: game.item.attempts + 1 },
  }
}

/** After a sorted item: the next item, or the finished game. */
export function nextItem(game, level, rng = createRng()) {
  if (!game.item.solved) return game
  if (game.sorted >= game.total) return { ...game, finished: true }
  const number = game.itemNumber + 1
  const item = createItem(level, rng, number, game.history)
  return { ...game, itemNumber: number, item, history: [item.bin, ...game.history].slice(0, 4) }
}

/** 3 stars with no mistakes, 2 with at most a quarter of the items wrong, else 1. */
export function starsFor(mistakes, total) {
  if (mistakes === 0) return 3
  if (mistakes <= Math.ceil(total / 4)) return 2
  return 1
}

/** XP for a finished level: one per item plus a bonus per star. */
export const xpFor = (total, stars) => total + stars * 3
