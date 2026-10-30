import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  journeySummary, MAX_JOURNEY_STARS, normalizeRecords, runStars, runSummary, STAGES, stageForLevel, stageStars,
  stageStatus, withLevelReached, withRun,
} from './journey.js'

test('stages cover every level once, in order', () => {
  for (let level = 1; level <= 120; level += 1) {
    const matches = STAGES.filter((s) => level >= s.from && (s.to === null || level <= s.to))
    assert.equal(matches.length, 1, `level ${level}`)
    assert.equal(stageForLevel(level), matches[0])
  }
})

test('a new player: stage 1 is current, the rest locked, no stars', () => {
  assert.equal(stageStatus(STAGES[0], 1), 'current')
  assert.equal(stageStatus(STAGES[1], 1), 'locked')
  assert.deepEqual(journeySummary(1), { stars: 0, cleared: 0 })
})

test('reaching level 2 clears stage 1 (3 stars) and opens stage 2', () => {
  assert.equal(stageStatus(STAGES[0], 2), 'cleared')
  assert.equal(stageStars(STAGES[0], 2), 3)
  assert.equal(stageStatus(STAGES[1], 2), 'current')
  assert.equal(stageStars(STAGES[1], 2), 0)
})

test('stage stars grow with the levels cleared inside it', () => {
  const two = STAGES[1] // levels 2–10 (9 levels)
  assert.equal(stageStars(two, 3), 1) // 1 cleared
  assert.equal(stageStars(two, 7), 2) // 5 of 9
  assert.equal(stageStars(two, 11), 3)
  assert.equal(stageStatus(STAGES[5], 999), 'current') // the top stage never ends
  assert.equal(stageStars(STAGES[5], 999), 3)
  assert.equal(journeySummary(999).stars, MAX_JOURNEY_STARS)
})

test('run summary: misses follow the life rules', () => {
  assert.deepEqual(runSummary({ finalScore: 0, finalLevel: 1, correctAnswers: 0 }),
    { correct: 0, missed: 1, accuracy: 0, xp: 0, level: 1, levelsCleared: 0, stars: 0 })
  const run = runSummary({ finalScore: 120, finalLevel: 5, correctAnswers: 24 })
  assert.equal(run.missed, 3) // 1 + 2 bonus lives
  assert.equal(run.accuracy, 89)
  assert.equal(run.stars, 2)
  assert.equal(runStars(6), 3)
})

test('records only ever improve, and bad data falls back safely', () => {
  let records = normalizeRecords({ bestLevel: 'x', runs: -1 })
  assert.deepEqual(records, { bestLevel: 1, bestScore: 0, bestCorrect: 0, runs: 0 })
  assert.equal(withLevelReached(records, 1), records)
  records = withLevelReached(records, 4)
  assert.equal(records.bestLevel, 4)
  records = withRun(records, { finalLevel: 3, finalScore: 50, correctAnswers: 10 })
  assert.deepEqual(records, { bestLevel: 4, bestScore: 50, bestCorrect: 10, runs: 1 })
})
