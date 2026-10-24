// Shape Hunt rules, kept free of React and three.js so they can be tested on their own.
//
// Each round Bulbuli names one shape; the player taps it among a few floating
// 3D shapes. Wrong taps are counted (and the tapped shape is named, so a wrong
// tap still teaches something). Stars at the end depend on the wrong taps.

/** Bangla names follow the NCTB primary maths books. */
export const SHAPES = [
  { id: 'cube', name: { en: 'cube', bn: 'ঘনক' } },
  { id: 'sphere', name: { en: 'sphere', bn: 'গোলক' } },
  { id: 'cone', name: { en: 'cone', bn: 'কোণক' } },
  { id: 'cylinder', name: { en: 'cylinder', bn: 'বেলন' } },
  { id: 'pyramid', name: { en: 'pyramid', bn: 'পিরামিড' } },
  { id: 'torus', name: { en: 'ring', bn: 'বলয়' } },
]

export const getShape = (id) => SHAPES.find((shape) => shape.id === id) ?? null

/** Bright toy colours. Shapes get a random one each round, so colour is never a clue. */
export const COLORS = ['#ff6b6b', '#ffb347', '#ffd93d', '#6bcb77', '#4d96ff', '#b388ff', '#ff8fd8']

/** The single colour used on the hardest level, where only the shape itself can help. */
export const SAME_COLOR = '#4d96ff'

/**
 * Levels from easiest to hardest.
 *   pool     which shapes can appear
 *   choices  how many shapes float in each round
 *   rounds   rounds per game
 *   sameColor  every shape the same colour
 */
export const LEVELS = [
  { id: 1, pool: ['cube', 'sphere', 'cone', 'cylinder'], choices: 3, rounds: 5, sameColor: false },
  { id: 2, pool: SHAPES.map((shape) => shape.id), choices: 4, rounds: 6, sameColor: false },
  { id: 3, pool: SHAPES.map((shape) => shape.id), choices: 5, rounds: 8, sameColor: true },
]

export const getLevel = (id) => LEVELS.find((level) => level.id === id) ?? LEVELS[0]

/** How long the "Yes!" moment lasts before the next round (ms). */
export const CORRECT_DELAY = 1100

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

function shuffle(list, rng) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * One round: a target shape plus distinct other shapes from the level's pool,
 * in a random order and with random colours. The target is never the same as
 * the previous round's, so a child can't just tap the same place again.
 */
export function createRound(level, rng, previousTarget = null) {
  if (level.pool.length < level.choices) {
    throw new RangeError(`Level ${level.id} needs at least ${level.choices} shapes in its pool.`)
  }
  const candidates = level.pool.filter((id) => id !== previousTarget)
  const target = candidates[Math.floor(rng() * candidates.length)]
  const others = shuffle(level.pool.filter((id) => id !== target), rng).slice(0, level.choices - 1)
  const colors = shuffle(COLORS, rng)
  const options = shuffle([target, ...others], rng).map((shape, index) => ({
    id: `${shape}-${index}`,
    shape,
    color: level.sameColor ? SAME_COLOR : colors[index % colors.length],
  }))
  return { target, options, wrong: [], solved: false }
}

export function createGame(level, rng = createRng()) {
  return {
    levelId: level.id,
    rounds: level.rounds,
    roundNumber: 1, // 1-based, for "Round 2 of 6"
    round: createRound(level, rng),
    mistakes: 0, // wrong taps in the whole game
    correct: 0,
    finished: false,
  }
}

/**
 * The player tapped option `optionId`.
 * @returns {{ game, result: 'correct' | 'wrong' | 'ignored', shape: string | null }}
 *   'ignored' when the round is already solved, the option was already tried,
 *   or the id is unknown — so double taps never cost a star.
 */
export function chooseShape(game, optionId) {
  const option = game.round.options.find((candidate) => candidate.id === optionId)
  if (game.finished || game.round.solved || !option || game.round.wrong.includes(optionId)) {
    return { game, result: 'ignored', shape: option?.shape ?? null }
  }
  if (option.shape === game.round.target) {
    return {
      game: { ...game, correct: game.correct + 1, round: { ...game.round, solved: true } },
      result: 'correct',
      shape: option.shape,
    }
  }
  return {
    game: { ...game, mistakes: game.mistakes + 1, round: { ...game.round, wrong: [...game.round.wrong, optionId] } },
    result: 'wrong',
    shape: option.shape,
  }
}

/** After a solved round: the next round, or the finished game. */
export function nextRound(game, level, rng = createRng()) {
  if (!game.round.solved) return game
  if (game.roundNumber >= game.rounds) return { ...game, finished: true }
  return {
    ...game,
    roundNumber: game.roundNumber + 1,
    round: createRound(level, rng, game.round.target),
  }
}

/** 3 stars with no wrong taps, 2 with at most a third of the rounds wrong, else 1. */
export function starsFor(mistakes, rounds) {
  if (mistakes === 0) return 3
  if (mistakes <= Math.ceil(rounds / 3)) return 2
  return 1
}

/** XP for a finished game: one per round plus a bonus per star. */
export const xpFor = (rounds, stars) => rounds + stars * 2
