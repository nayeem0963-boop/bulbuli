import { test } from 'node:test'
import assert from 'node:assert/strict'
import { levelForXp, levelProgress, splitAward, xpForLevel } from './levels.js'

test('levels follow floor(sqrt(xp / 100)) + 1, like the SQL function', () => {
  assert.equal(levelForXp(0), 1)
  assert.equal(levelForXp(99), 1)
  assert.equal(levelForXp(100), 2)
  assert.equal(levelForXp(399), 2)
  assert.equal(levelForXp(400), 3)
  assert.equal(levelForXp(900), 4)
  assert.equal(levelForXp(-5), 1)
  assert.equal(levelForXp(Number.NaN), 1)
})

test('xpForLevel is the threshold levelForXp switches at', () => {
  for (let level = 1; level < 30; level += 1) {
    assert.equal(levelForXp(xpForLevel(level)), level)
    if (level > 1) assert.equal(levelForXp(xpForLevel(level) - 1), level - 1)
  }
})

test('levelProgress reports the way to the next level', () => {
  assert.deepEqual(levelProgress(250), {
    level: 2,
    xp: 250,
    levelStartXp: 100,
    nextLevelXp: 400,
    xpIntoLevel: 150,
    xpToNextLevel: 150,
    percent: 50,
  })
})

test('splitAward keeps every piece within the server cap', () => {
  assert.deepEqual(splitAward(25), [25])
  assert.deepEqual(splitAward(1200), [500, 500, 200])
  assert.deepEqual(splitAward(500), [500])
  assert.deepEqual(splitAward(0), [])
  assert.deepEqual(splitAward(-3), [])
  assert.deepEqual(splitAward(2.5), [])
})
