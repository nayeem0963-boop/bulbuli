import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DIFFICULTIES, DIFFICULTY_ORDER, DEFAULT_DIFFICULTY, difficultyConfig } from './difficulty.js'
import { CourseMode, courseFor } from '../services/course.js'
import { createSegmentGenerator } from '../components/track/segmentGenerator.js'

const segments = (seed, id, n = 60) => {
  const gen = createSegmentGenerator(seed, DIFFICULTIES[id])
  return Array.from({ length: n }, () => gen.next())
}
const pieces = (segs, kind) => segs.flatMap((s) => s.pieces.filter((p) => p.kind === kind))

test('modes match the design brief', () => {
  assert.deepEqual(DIFFICULTY_ORDER, ['easy', 'medium', 'hard'])
  assert.equal(DIFFICULTIES.easy.speedScale, 0.6)
  assert.equal(DIFFICULTIES.medium.speedScale, 0.8)
  assert.equal(DIFFICULTIES.hard.speedScale, 1)
  assert.equal(DIFFICULTIES.easy.laserSpeed, 0.5)
  assert.deepEqual(DIFFICULTY_ORDER.map((id) => DIFFICULTIES[id].scoreMultiplier), [1, 1.5, 2])
})

test('unknown difficulty falls back to the default', () => {
  assert.equal(difficultyConfig('nightmare').id, DEFAULT_DIFFICULTY)
})

test('boards and ghosts are separated by difficulty', () => {
  const day = new Date('2026-10-26T12:00:00Z')
  const ids = DIFFICULTY_ORDER.map((d) => courseFor(CourseMode.DAILY, d, day).boardId)
  assert.deepEqual(ids, ['daily-2026-10-26-easy', 'daily-2026-10-26-medium', 'daily-2026-10-26-hard'])
  assert.equal(courseFor(CourseMode.ENDLESS, 'easy').boardId, 'endless-easy')
  // same daily seed for every mode; the tuning makes each mode's track distinct
  assert.equal(new Set(DIFFICULTY_ORDER.map((d) => courseFor(CourseMode.DAILY, d, day).seed)).size, 1)
})

test('generation is deterministic per seed + difficulty', () => {
  for (const id of DIFFICULTY_ORDER) assert.deepEqual(segments(42, id), segments(42, id))
})

test('hard is the default generator tuning', () => {
  const gen = createSegmentGenerator(7)
  const def = Array.from({ length: 60 }, () => gen.next())
  assert.deepEqual(def, segments(7, 'hard'))
})

test('easy is gentler: fewer hazards, slower lasers, wider islands, shorter course per segment', () => {
  const seeds = [1, 2, 3, 4, 5]
  const total = (id, fn) => seeds.reduce((sum, seed) => sum + fn(segments(seed, id, 80)), 0)
  const hazardsPerMetre = (id) => total(id, (s) => pieces(s, 'hazard').length) / total(id, (s) => s[0].z0 - s.at(-1).z1)
  assert.ok(hazardsPerMetre('easy') < hazardsPerMetre('hard') * 0.8)

  const maxLaser = (id) => Math.max(0, ...seeds.flatMap((seed) => pieces(segments(seed, id, 120), 'hazard')
    .filter((h) => h.variant.startsWith('laser')).map((h) => h.speed)))
  assert.ok(maxLaser('easy') <= 1.5 * 0.5 + 1e-9)

  const islands = pieces(segments(3, 'easy', 120), 'platform').filter((p) => p.w < 10)
  assert.ok(islands.length > 0 && islands.every((p) => p.w > 3.6))
})
