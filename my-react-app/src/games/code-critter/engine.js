// Code Critter rules, kept free of React so they can be tested on their own.
//
// A level is a small grid. The player builds a program out of blocks, and run()
// turns that program into a list of frames: one picture of the board per step.
// The game screen only plays those frames back, so Run, Pause, Step and Reset
// are all just "which frame are we showing".

/** Headings in clockwise order. Bulbuli's heading is `turns % 4`. */
export const DIRS = ['N', 'E', 'S', 'W']
const STEP = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] }

/** Block types, in the order they appear in the palette. */
export const BLOCK_TYPES = ['forward', 'right', 'left', 'repeat', 'ifBlocked']

export const MAX_BLOCKS = 20 // counting blocks inside a repeat
export const REPEAT_MIN = 2
export const REPEAT_MAX = 12
export const MAX_STEPS = 200 // a safety net so a program can never run forever

/**
 * Grid legend:
 *   .  grass        S  start      N  nest
 *   o  golden seed  #  rock       T  tree
 * `facing` is the way Bulbuli looks at the start. `par` is the fewest blocks
 * that solve the level (3 stars). `palette` lists the blocks the level offers.
 */
export const LEVELS = [
  {
    id: 1,
    rows: ['.....', 'S..N.', '.....'],
    facing: 'E',
    par: 3,
    palette: ['forward'],
  },
  {
    id: 2,
    rows: ['S..T', 'TT.T', '..N.'],
    facing: 'E',
    par: 5,
    palette: ['forward', 'right', 'left'],
  },
  {
    id: 3,
    rows: ['T....', 'S.#.N', '...T.'],
    facing: 'E',
    par: 9,
    palette: ['forward', 'right', 'left'],
  },
  {
    id: 4,
    rows: ['###N.', '##..#', '#..#.', 'S.#..'],
    facing: 'E',
    par: 5,
    palette: ['forward', 'right', 'left', 'repeat'],
  },
  {
    id: 5,
    rows: ['..o..', '.###.', 'o###o', '.###.', 'S###N'],
    facing: 'N',
    par: 8,
    palette: ['forward', 'right', 'left', 'repeat', 'ifBlocked'],
  },
]

export const getLevel = (id) => LEVELS.find((level) => level.id === id) ?? LEVELS[0]

const CELL_TYPES = { '.': 'grass', S: 'start', N: 'nest', o: 'seed', '#': 'rock', T: 'tree' }
const cellKey = (row, col) => `${row},${col}`

/** Reads a level's grid into cells plus the spots the rules care about. */
export function parseLevel(level) {
  const height = level.rows.length
  const width = level.rows[0].length
  const cells = []
  const seeds = []
  const blocked = new Set()
  let start = null
  let nest = null

  level.rows.forEach((line, row) => {
    if (line.length !== width) throw new RangeError(`Level ${level.id}: row ${row} is not ${width} cells wide.`)
    ;[...line].forEach((symbol, col) => {
      const type = CELL_TYPES[symbol]
      if (!type) throw new RangeError(`Level ${level.id}: unknown cell "${symbol}".`)
      cells.push({ row, col, type })
      if (type === 'start') start = { row, col }
      if (type === 'nest') nest = { row, col }
      if (type === 'seed') seeds.push({ row, col })
      if (type === 'rock' || type === 'tree') blocked.add(cellKey(row, col))
    })
  })
  if (!start || !nest) throw new RangeError(`Level ${level.id} needs a start (S) and a nest (N).`)
  return { width, height, cells, seeds, blocked, start, nest }
}

/* ---------- building programs ---------- */

let nextId = 1
const newId = () => `b${nextId++}`

/** A fresh block with its default settings. */
export function createBlock(type, id = newId()) {
  if (!BLOCK_TYPES.includes(type)) throw new TypeError(`Unknown block: ${type}`)
  if (type === 'repeat') return { id, type, times: 3, body: [] }
  if (type === 'ifBlocked') return { id, type, turn: 'right' }
  return { id, type }
}

/** Every block, counting the ones inside a repeat. */
export const countBlocks = (program) => program.reduce((total, block) => total + 1 + (block.body ? countBlocks(block.body) : 0), 0)

/** Finds a block and the list it sits in. parentId is null for the main program. */
export function findBlock(program, id) {
  for (let index = 0; index < program.length; index += 1) {
    const block = program[index]
    if (block.id === id) return { block, parentId: null, index }
    const inner = block.body?.findIndex((child) => child.id === id) ?? -1
    if (inner >= 0) return { block: block.body[inner], parentId: block.id, index: inner }
  }
  return null
}

const mapList = (program, parentId, change) => (parentId === null
  ? change(program)
  : program.map((block) => (block.id === parentId ? { ...block, body: change(block.body) } : block)))

/**
 * Puts a block into the main program (parentId null) or into a repeat.
 * A repeat cannot go inside another repeat, and the program has a size limit.
 * Returns the same program when the block cannot go there.
 */
export function insertBlock(program, block, parentId = null, index = Infinity) {
  if (countBlocks(program) + 1 + (block.body ? countBlocks(block.body) : 0) > MAX_BLOCKS) return program
  if (parentId !== null) {
    const parent = program.find((candidate) => candidate.id === parentId)
    if (!parent || parent.type !== 'repeat' || block.type === 'repeat') return program
  }
  return mapList(program, parentId, (list) => {
    const at = Math.max(0, Math.min(index, list.length))
    return [...list.slice(0, at), block, ...list.slice(at)]
  })
}

export function removeBlock(program, id) {
  const found = findBlock(program, id)
  if (!found) return program
  return mapList(program, found.parentId, (list) => list.filter((block) => block.id !== id))
}

export function updateBlock(program, id, patch) {
  const found = findBlock(program, id)
  if (!found) return program
  return mapList(program, found.parentId, (list) => list.map((block) => (block.id === id ? { ...block, ...patch } : block)))
}

/** Moves a block one place up (-1) or down (+1) inside its own list. */
export function shiftBlock(program, id, delta) {
  const found = findBlock(program, id)
  if (!found) return program
  return mapList(program, found.parentId, (list) => {
    const to = found.index + delta
    if (to < 0 || to >= list.length) return list
    const copy = [...list]
    ;[copy[found.index], copy[to]] = [copy[to], copy[found.index]]
    return copy
  })
}

/** Moves a block to a new place (used by drag and drop). */
export function moveBlock(program, id, parentId, index) {
  const found = findBlock(program, id)
  if (!found || parentId === id) return program
  if (found.block.type === 'repeat' && parentId !== null) return program
  const without = removeBlock(program, id)
  // Dropping later in the same list: the list got one shorter above the drop spot.
  const at = found.parentId === parentId && found.index < index ? index - 1 : index
  const moved = insertBlock(without, found.block, parentId, at)
  return moved === without ? program : moved
}

/* ---------- running programs ---------- */

/**
 * Runs a program on a level and returns { frames, outcome }.
 *
 * Each frame: { row, col, turns, facing, collected, event, blockId, loop, bump }
 *   event     'start' | 'move' | 'seed' | 'turn' | 'check' | 'bump'
 *   blockId   the block that made this frame (to light it up in the workspace)
 *   loop      { id, round, times } while inside a repeat
 *   bump      { row, col, edge } on a 'bump' frame
 *
 * outcome.status:
 *   'win'          reached the nest with every seed
 *   'bump'         walked into a rock or tree      (outcome.row/col)
 *   'edge'         tried to walk off the map
 *   'missingSeeds' at the nest, seeds left         (outcome.left)
 *   'notHome'      program ended away from the nest
 *   'empty'        no blocks yet
 *   'tooLong'      ran more than MAX_STEPS steps
 */
export function run(level, program) {
  const board = parseLevel(level)
  let row = board.start.row
  let col = board.start.col
  let turns = DIRS.indexOf(level.facing)
  const seedsLeft = new Set(board.seeds.map((seed) => cellKey(seed.row, seed.col)))
  const collected = []
  const facing = () => DIRS[((turns % 4) + 4) % 4]
  const frames = []
  let outcome = null

  const push = (event, extra = {}) => {
    frames.push({ row, col, turns, facing: facing(), collected: [...collected], event, blockId: null, loop: null, bump: null, ...extra })
  }

  const ahead = () => {
    const [dr, dc] = STEP[facing()]
    const target = { row: row + dr, col: col + dc }
    const edge = target.row < 0 || target.col < 0 || target.row >= board.height || target.col >= board.width
    return { ...target, edge, blocked: edge || board.blocked.has(cellKey(target.row, target.col)) }
  }

  const exec = (block, loop) => {
    if (outcome) return
    if (frames.length > MAX_STEPS) {
      outcome = { status: 'tooLong' }
      return
    }
    const tag = { blockId: block.id, loop }

    switch (block.type) {
      case 'forward': {
        const next = ahead()
        if (next.blocked) {
          push('bump', { ...tag, bump: { row: next.row, col: next.col, edge: next.edge } })
          outcome = next.edge ? { status: 'edge' } : { status: 'bump', row: next.row, col: next.col }
          return
        }
        row = next.row
        col = next.col
        const key = cellKey(row, col)
        if (seedsLeft.has(key)) {
          seedsLeft.delete(key)
          collected.push({ row, col })
          push('seed', tag)
        } else {
          push('move', tag)
        }
        if (row === board.nest.row && col === board.nest.col && seedsLeft.size === 0) outcome = { status: 'win' }
        return
      }
      case 'right':
      case 'left':
        turns += block.type === 'right' ? 1 : -1
        push('turn', tag)
        return
      case 'ifBlocked':
        if (ahead().blocked) {
          turns += block.turn === 'left' ? -1 : 1
          push('turn', tag)
        } else {
          push('check', tag)
        }
        return
      case 'repeat':
        for (let round = 1; round <= block.times && !outcome; round += 1) {
          for (const child of block.body) exec(child, { id: block.id, round, times: block.times })
        }
        return
      default:
        throw new TypeError(`Unknown block: ${block.type}`)
    }
  }

  push('start')
  for (const block of program) exec(block, null)

  if (!outcome) {
    const home = row === board.nest.row && col === board.nest.col
    if (countBlocks(program) === 0) outcome = { status: 'empty' }
    else if (home) outcome = { status: 'missingSeeds', left: seedsLeft.size }
    else outcome = { status: 'notHome' }
  }
  return { frames, outcome }
}

/* ---------- rewards ---------- */

/** 3 stars for the shortest program, never fewer than 1: every solved level is a win. */
export function starsFor(blocks, par) {
  if (blocks <= par) return 3
  if (blocks <= par + 2) return 2
  return 1
}

/** XP for a solved level: 5 plus 3 per star (same scale as the other arcade games). */
export const xpFor = (stars) => 5 + stars * 3

/** Level 1 is always open; every other level opens when the one before it is solved. */
export const isUnlocked = (levelId, bestStars = {}) => levelId === 1 || (bestStars[levelId - 1] ?? 0) > 0
