import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateSkyTypewriterXp } from './skyTypewriterRewards.js'

test('XP reward combines score, completed words, and high-accuracy bonus', () => {
  assert.equal(calculateSkyTypewriterXp({ score: 120, wordsTyped: 5, accuracy: 95 }), 32)
  assert.equal(calculateSkyTypewriterXp({ score: 120, wordsTyped: 5, accuracy: 89 }), 22)
})

test('XP reward clamps invalid and out-of-range summary values', () => {
  assert.equal(calculateSkyTypewriterXp({ score: -10, wordsTyped: -2, accuracy: 110 }), 0)
  assert.equal(calculateSkyTypewriterXp({ score: Number.NaN, wordsTyped: Number.NaN, accuracy: Number.NaN }), 0)
})

test('a victory adds the finishing bonus', () => {
  assert.equal(calculateSkyTypewriterXp({ score: 120, wordsTyped: 5, accuracy: 95, won: true }), 57)
})
