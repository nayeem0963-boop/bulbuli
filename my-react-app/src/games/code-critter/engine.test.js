import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  countBlocks, createBlock, findBlock, insertBlock, isUnlocked, LEVELS, MAX_BLOCKS, moveBlock, parseLevel,
  removeBlock, run, shiftBlock, starsFor, updateBlock, xpFor,
} from './engine.js'

let id = 0
const b = (type, extra = {}) => ({ ...createBlock(type, `t${(id += 1)}`), ...extra })
const F = () => b('forward')
const R = () => b('right')
const L = () => b('left')
const repeat = (times, ...body) => b('repeat', { times, body })

/** The shortest known answer for every level. */
const SOLUTIONS = {
  1: () => [F(), F(), F()],
  2: () => [F(), F(), R(), F(), F()],
  3: () => [F(), L(), F(), R(), F(), F(), F(), R(), F()],
  4: () => [repeat(3, F(), L(), F(), R())],
  5: () => [repeat(4, F()), R(), repeat(4, F()), R(), repeat(4, F())],
}

test('every level parses, uses only its own palette, and is solvable within par', () => {
  for (const level of LEVELS) {
    const board = parseLevel(level)
    assert.ok(board.width >= 3 && board.height >= 3, `level ${level.id} size`)
    const program = SOLUTIONS[level.id]()
    const used = new Set()
    const walk = (list) => list.forEach((block) => { used.add(block.type); if (block.body) walk(block.body) })
    walk(program)
    for (const type of used) assert.ok(level.palette.includes(type), `level ${level.id} offers ${type}`)
    const { outcome } = run(level, program)
    assert.equal(outcome.status, 'win', `level ${level.id}`)
    assert.ok(countBlocks(program) <= level.par, `level ${level.id} par`)
  }
})

test('level 4 is meant for a loop: without one it costs more than par', () => {
  const level = LEVELS[3]
  const long = [F(), L(), F(), R(), F(), L(), F(), R(), F(), L(), F()]
  assert.equal(run(level, long).outcome.status, 'win')
  assert.equal(starsFor(countBlocks(long), level.par), 1)
})

test('level 5 can be solved with "if path blocked" inside a repeat', () => {
  const program = [repeat(12, b('ifBlocked', { turn: 'right' }), F())]
  const { outcome, frames } = run(LEVELS[4], program)
  assert.equal(outcome.status, 'win')
  assert.equal(frames.at(-1).collected.length, 3)
})

test('walking into a rock stops with a bump on that cell, and names the block', () => {
  const level = LEVELS[2]
  const forward = F()
  const { frames, outcome } = run(level, [F(), forward, F()])
  assert.deepEqual(outcome, { status: 'bump', row: 1, col: 2 })
  assert.equal(frames.at(-1).event, 'bump')
  assert.equal(frames.at(-1).blockId, forward.id)
  assert.equal(frames.at(-1).col, 1, 'Bulbuli stays on the last safe cell')
})

test('walking off the map is an edge bump', () => {
  assert.equal(run(LEVELS[0], [L(), F(), F()]).outcome.status, 'edge')
})

test('stopping short, missing seeds, and an empty program get their own messages', () => {
  assert.equal(run(LEVELS[0], [F()]).outcome.status, 'notHome')
  assert.equal(run(LEVELS[0], []).outcome.status, 'empty')
  // a seed on the way is picked up; a nest reached with seeds left reports how many are missing
  const level = { id: 99, rows: ['So.N'], facing: 'E', par: 1, palette: ['forward'] }
  assert.equal(run(level, [F(), F(), F()]).outcome.status, 'win')
  const skipSeed = { id: 98, rows: ['S.N', 'o..'], facing: 'E', par: 1, palette: ['forward'] }
  assert.deepEqual(run(skipSeed, [F(), F()]).outcome, { status: 'missingSeeds', left: 1 })
})

test('the run stops at the nest even when blocks are left over', () => {
  const { frames, outcome } = run(LEVELS[0], [F(), F(), F(), F(), F()])
  assert.equal(outcome.status, 'win')
  assert.equal(frames.length, 4) // start + 3 moves
})

test('turns keep counting so the sprite never spins the long way round', () => {
  const { frames } = run(LEVELS[0], [L(), L(), L(), L(), L()])
  assert.deepEqual(frames.map((frame) => frame.turns), [1, 0, -1, -2, -3, -4])
  assert.equal(frames.at(-1).facing, 'N')
})

test('repeat frames say which round they are in', () => {
  const loop = repeat(3, F())
  const { frames } = run(LEVELS[0], [loop])
  assert.deepEqual(frames.slice(1).map((frame) => frame.loop.round), [1, 2, 3])
  assert.ok(frames.slice(1).every((frame) => frame.loop.id === loop.id))
})

test('a program that would run too long is stopped', () => {
  const spin = repeat(12, ...Array.from({ length: 19 }, () => R()))
  assert.equal(run(LEVELS[0], [spin]).outcome.status, 'tooLong')
})

test('editing: insert, nest, update, shift, move and remove', () => {
  const loop = repeat(3)
  let program = insertBlock([], loop)
  const step = F()
  program = insertBlock(program, step, loop.id)
  assert.equal(findBlock(program, step.id).parentId, loop.id)
  assert.equal(insertBlock(program, repeat(2), loop.id), program, 'no repeat inside a repeat')

  program = updateBlock(program, loop.id, { times: 5 })
  assert.equal(program[0].times, 5)

  const turn = R()
  program = insertBlock(program, turn, null, 0)
  assert.deepEqual(program.map((block) => block.type), ['right', 'repeat'])
  program = shiftBlock(program, turn.id, 1)
  assert.deepEqual(program.map((block) => block.type), ['repeat', 'right'])
  assert.equal(shiftBlock(program, turn.id, 1), program, 'the last block cannot move further down')

  program = moveBlock(program, step.id, null, 2)
  assert.deepEqual(program.map((block) => block.type), ['repeat', 'right', 'forward'])
  assert.equal(program[0].body.length, 0)
  program = moveBlock(program, turn.id, loop.id, 0)
  assert.equal(findBlock(program, turn.id).parentId, loop.id)
  assert.equal(moveBlock(program, loop.id, loop.id, 0), program)

  program = removeBlock(program, loop.id)
  assert.deepEqual(program.map((block) => block.type), ['forward'])
})

test('moving down inside the same list lands where it was dropped', () => {
  const [a, c, d] = [F(), R(), L()]
  const program = [a, c, d]
  // dropping "a" in the gap after "c" (index 2) puts it between c and d
  assert.deepEqual(moveBlock(program, a.id, null, 2).map((block) => block.id), [c.id, a.id, d.id])
})

test('a program cannot grow past the block limit', () => {
  let program = []
  for (let i = 0; i < MAX_BLOCKS + 3; i += 1) program = insertBlock(program, F())
  assert.equal(countBlocks(program), MAX_BLOCKS)
})

test('stars, XP and unlocking', () => {
  assert.equal(starsFor(5, 5), 3)
  assert.equal(starsFor(7, 5), 2)
  assert.equal(starsFor(8, 5), 1)
  assert.equal(xpFor(3), 14)
  assert.equal(xpFor(1), 8)
  assert.ok(isUnlocked(1, {}))
  assert.ok(!isUnlocked(2, {}))
  assert.ok(isUnlocked(2, { 1: 1 }))
})
