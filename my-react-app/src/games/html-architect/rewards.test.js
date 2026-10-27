import test from 'node:test'
import assert from 'node:assert/strict'
import { xpForClear } from './rewards.js'
import { LEVELS } from '../../components/html_architect/levelsData.js'

test('first clear pays the clear bonus plus every star', () => {
  assert.equal(xpForClear(0, 1), 30)
  assert.equal(xpForClear(0, 3), 50)
})

test('replays pay only for stars that beat the previous best', () => {
  assert.equal(xpForClear(1, 3), 20)
  assert.equal(xpForClear(2, 3), 10)
  assert.equal(xpForClear(3, 3), 0)
  assert.equal(xpForClear(3, 1), 0)
})

test('bad input never pays', () => {
  assert.equal(xpForClear(0, 0), 0)
  assert.equal(xpForClear(undefined, 'x'), 0)
  assert.equal(xpForClear(-5, 9), 50) // clamped to 0..3
})

test('every chapter has the fields the game needs', () => {
  const ids = new Set()
  for (const level of LEVELS) {
    assert.ok(!ids.has(level.id), `duplicate level id ${level.id}`)
    ids.add(level.id)
    for (const key of ['title', 'instructions', 'starterCode', 'hintText']) {
      assert.equal(typeof level[key], 'string', `level ${level.id} ${key}`)
    }
    assert.ok(level.targetTags.length > 0)
    for (const tag of level.targetTags) assert.ok(level['3dUnlocks'][tag], `level ${level.id} unlock for <${tag}>`)
  }
})
