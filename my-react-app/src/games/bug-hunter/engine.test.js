import { test as check } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyChoices, cycleChoice, hasEmptySlot, isUnlocked, isUntouched, LEVELS, parseLevel, startChoices, starsFor, test, xpFor,
} from './engine.js'

/** The choice (option index) that fixes each bug. */
const FIXES = { 1: [1], 2: [1], 3: [0], 4: [0], 5: [1, 1] }

const find = (list, id) => {
  for (const block of list) {
    if (block.id === id) return block
    const inner = block.body && find(block.body, id)
    if (inner) return inner
  }
  return null
}

check('every puzzle parses, starts broken, and the intended fix works', () => {
  for (const level of LEVELS) {
    parseLevel(level)
    for (const bug of level.bugs) assert.ok(find(level.program, bug.blockId), `level ${level.id} bug ${bug.blockId}`)
    const choices = startChoices(level)
    if (!hasEmptySlot(level, choices)) {
      assert.notEqual(test(level, choices).outcome.status, 'win', `level ${level.id} should start broken`)
    }
    assert.equal(test(level, FIXES[level.id]).outcome.status, 'win', `level ${level.id} fix`)
  }
})

check('each bug shows a different kind of mistake, in the order of the brief', () => {
  assert.deepEqual(LEVELS.map((level) => level.bugs.map((bug) => bug.kind).join('+')),
    ['move', 'times', 'missing', 'turn', 'times+move'])
})

check('only the right count fixes the loop in level 2', () => {
  const level = LEVELS[1]
  const results = level.bugs[0].options.map((_, index) => test(level, [index]).outcome.status)
  assert.deepEqual(results, ['notHome', 'win', 'bump', 'bump'])
})

check('level 5 needs both bugs fixed', () => {
  const level = LEVELS[4]
  assert.notEqual(test(level, [1, 2]).outcome.status, 'win', 'count fixed, turn still wrong')
  assert.notEqual(test(level, [0, 1]).outcome.status, 'win', 'turn fixed, count still wrong')
  assert.equal(test(level, [1, 1]).outcome.status, 'win')
})

check('cycling wraps around and an empty slot fills on the first tap', () => {
  const level = LEVELS[2]
  let choices = startChoices(level)
  assert.ok(hasEmptySlot(level, choices))
  choices = cycleChoice(level, choices, 0)
  assert.deepEqual(choices, [0])
  assert.ok(!hasEmptySlot(level, choices))
  choices = cycleChoice(level, cycleChoice(level, cycleChoice(level, choices, 0), 0), 0)
  assert.deepEqual(choices, [0], 'three options then back to the first')
})

check('applying choices patches nested blocks and leaves the puzzle alone', () => {
  const level = LEVELS[4]
  const program = applyChoices(level, [1, 1])
  assert.equal(program[0].times, 3)
  assert.equal(program[0].body[3].type, 'right')
  assert.equal(level.program[0].times, 2, 'the original puzzle is not changed')
  assert.ok(isUntouched(level, startChoices(level)))
  assert.ok(!isUntouched(level, [1, 2]))
})

check('stars, XP and unlocking', () => {
  assert.equal(starsFor({ fails: 0, hintUsed: false }), 3)
  assert.equal(starsFor({ fails: 2, hintUsed: false }), 2)
  assert.equal(starsFor({ fails: 2, hintUsed: true }), 1)
  assert.equal(xpFor(3), 14)
  assert.ok(isUnlocked(1) && !isUnlocked(3, { 1: 2 }) && isUnlocked(3, { 2: 1 }))
})
