import assert from 'node:assert/strict'
import test from 'node:test'
import { getSkyTypewriterDifficulty } from './skyTypewriterDifficulty.js'

test('difficulty scales spawn cadence, word length, and flight speed with score', () => {
  const early = getSkyTypewriterDifficulty(0)
  const middle = getSkyTypewriterDifficulty(250)
  const max = getSkyTypewriterDifficulty(1000)

  assert.equal(early.minWordLength, 3)
  assert.equal(middle.minWordLength, 5)
  assert.equal(max.minWordLength, 8)
  assert.ok(middle.spawnIntervalMultiplier < early.spawnIntervalMultiplier)
  assert.ok(middle.speedMultiplier > early.speedMultiplier)
  assert.equal(max.flightSpeed, 16)
})

test('difficulty handles invalid and negative scores and caps progression', () => {
  assert.deepEqual(getSkyTypewriterDifficulty(-1), getSkyTypewriterDifficulty(0))
  assert.deepEqual(getSkyTypewriterDifficulty(Number.NaN), getSkyTypewriterDifficulty(0))
  assert.deepEqual(getSkyTypewriterDifficulty(500), getSkyTypewriterDifficulty(5000))
})
