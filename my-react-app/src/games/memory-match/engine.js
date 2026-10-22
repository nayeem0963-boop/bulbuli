// Memory Match rules, kept free of React so they can be tested on their own.

/**
 * Levels from easiest to hardest. `match: 'same'` pairs two identical pictures;
 * `match: 'word'` pairs a picture with its written word (early reading practice).
 */
export const LEVELS = [
  { id: 1, pairs: 3, columns: 3, match: 'same' },
  { id: 2, pairs: 6, columns: 4, match: 'same' },
  { id: 3, pairs: 6, columns: 4, match: 'word' },
  { id: 4, pairs: 8, columns: 4, match: 'word' },
]

export const getLevel = (id) => LEVELS.find((level) => level.id === id) ?? LEVELS[0]

/** How long a wrong pair stays face up before turning back over (ms). */
export const MISMATCH_DELAY = 1000

/** Small seeded random generator, so boards can be repeated in tests. */
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

/** Builds a shuffled board: two cards per chosen item. */
export function createBoard(deck, level, rng = createRng()) {
  if (deck.items.length < level.pairs) {
    throw new RangeError(`The "${deck.id}" set needs at least ${level.pairs} items for level ${level.id}.`)
  }
  const items = shuffle(deck.items, rng).slice(0, level.pairs)
  const cards = items.flatMap((item) => [
    { id: `${item.id}-a`, pairId: item.id, item, face: 'picture' },
    { id: `${item.id}-b`, pairId: item.id, item, face: level.match === 'word' ? 'word' : 'picture' },
  ])
  return shuffle(cards, rng)
}

export function createGame(deck, level, rng) {
  return {
    cards: createBoard(deck, level, rng),
    pairs: level.pairs,
    open: [], // ids of face-up cards that are not matched yet (0, 1 or 2)
    matched: [], // pair ids already found
    moves: 0, // one move = turning over two cards
    lastMatch: null,
    won: false,
  }
}

/**
 * Turns a card over. Returns the same state when the tap should be ignored
 * (card already showing, or two unmatched cards still face up).
 */
export function flipCard(state, cardId) {
  const card = state.cards.find((candidate) => candidate.id === cardId)
  if (!card || state.won || state.open.length >= 2) return state
  if (state.open.includes(cardId) || state.matched.includes(card.pairId)) return state

  const open = [...state.open, cardId]
  if (open.length < 2) return { ...state, open, lastMatch: null }

  const [first, second] = open.map((id) => state.cards.find((candidate) => candidate.id === id))
  const moves = state.moves + 1
  if (first.pairId !== second.pairId) return { ...state, open, moves, lastMatch: null }

  const matched = [...state.matched, first.pairId]
  return { ...state, open: [], matched, moves, lastMatch: first.pairId, won: matched.length === state.pairs }
}

/** Turns a wrong pair back over. */
export function hideOpenCards(state) {
  return state.open.length === 2 ? { ...state, open: [] } : state
}

export const isFaceUp = (state, card) => state.open.includes(card.id) || state.matched.includes(card.pairId)

/** 3 stars for a sharp memory, never fewer than 1: every finished board is a win. */
export function starsFor(moves, pairs) {
  if (moves <= Math.ceil(pairs * 1.5)) return 3
  if (moves <= pairs * 2 + 1) return 2
  return 1
}

/** XP for a finished board: 2 per pair plus 3 per star. */
export const xpFor = (pairs, stars) => pairs * 2 + stars * 3
