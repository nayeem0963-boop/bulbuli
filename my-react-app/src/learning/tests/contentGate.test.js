// L1: content release gate (design 8.3, brief Part 4).
import test from 'node:test'
import assert from 'node:assert/strict'
import { contentHash, contentReport, isShippable, shippableOnly, structuralErrors } from '../contentGate.js'
import { ALL_CONTENT_ITEMS, SKY_SCIENCE_MISSIONS, WORLD_EXPEDITIONS } from '../content/index.js'
import { REVIEWERS } from '../reviewers.js'

// Test-only reviewers and item. These are NOT real people or real content; they exist only inside
// this test to exercise the gate. The real reviewers.js stays empty until the owner fills it in.
const TEST_REVIEWERS = [
  { id: 'test-accuracy', name: 'Test Accuracy Reviewer', roles: ['accuracy'] },
  { id: 'test-bangla', name: 'Test Bangla Reviewer', roles: ['bangla'] },
]
const NOW = new Date('2026-11-02T12:00:00Z')

function item(overrides = {}) {
  const base = {
    id: 'test.sky.b7.example.p1',
    version: 1,
    objective: 'test.sky.b7.example',
    role: 'primary',
    band: '7-8',
    skill: 'identify',
    prompt: { en: 'Test prompt?', bn: 'পরীক্ষার প্রশ্ন?' },
    answer: { en: 'Right', bn: 'ঠিক' },
    distractors: [{ text: { en: 'Wrong', bn: 'ভুল' }, misconception: { en: 'Why wrong', bn: 'কেন ভুল' } }],
    explanation: { en: 'Because.', bn: 'কারণ।' },
    source: { url: 'https://example.org/test', publisher: 'Test fixture', supports: 'fixture only', verifiedOn: '2026-11-01' },
    ...overrides,
  }
  const hash = contentHash(base)
  return {
    ...base,
    review: {
      accuracy: { reviewer: 'test-accuracy', date: '2026-11-01', status: 'approved', hash },
      bangla: { reviewer: 'test-bangla', date: '2026-11-01', status: 'approved', hash },
      ...overrides.review,
    },
  }
}

test('reviewers.js is empty: no placeholder reviewers exist', () => {
  assert.deepEqual([...REVIEWERS], [])
})

test('a fully approved item with matching hashes is shippable', () => {
  assert.equal(isShippable(item(), TEST_REVIEWERS, NOW), true)
})

test('ANY edit to reviewable content invalidates both approvals', () => {
  const approved = item()
  const edited = { ...approved, explanation: { ...approved.explanation, bn: 'অন্য কারণ।' } }
  assert.equal(isShippable(edited, TEST_REVIEWERS, NOW), false)
  const report = contentReport([edited], TEST_REVIEWERS, NOW)
  assert.equal(report.invalidApprovals.length, 1)
  assert.match(report.invalidApprovals[0].errors.join(' '), /hash/)
})

test('approval by an unknown reviewer, the wrong role, or with a future/invalid date is invalid', () => {
  const a = item()
  const cases = [
    { ...a, review: { ...a.review, accuracy: { ...a.review.accuracy, reviewer: 'someone-not-listed' } } },
    { ...a, review: { ...a.review, bangla: { ...a.review.bangla, reviewer: 'test-accuracy' } } },
    { ...a, review: { ...a.review, accuracy: { ...a.review.accuracy, date: '2027-01-01' } } },
    { ...a, review: { ...a.review, accuracy: { ...a.review.accuracy, date: '2026-02-30' } } },
  ]
  for (const c of cases) assert.equal(isShippable(c, TEST_REVIEWERS, NOW), false)
  assert.equal(contentReport(cases, TEST_REVIEWERS, NOW).invalidApprovals.length, 4)
})

test('with the real (empty) reviewers list, nothing can be shippable', () => {
  assert.equal(isShippable(item(), [...REVIEWERS], NOW), false)
})

test('only one approval → blocked; pending reviews are not errors', () => {
  const a = item()
  const one = { ...a, review: { ...a.review, bangla: { status: 'pending' } } }
  const report = contentReport([one], TEST_REVIEWERS, NOW)
  assert.equal(report.approved, 0)
  assert.equal(report.blocked, 1)
  assert.equal(report.awaitingBanglaReview, 1)
  assert.equal(report.awaitingAccuracyReview, 0)
  assert.equal(report.invalidApprovals.length, 0)
  assert.deepEqual(shippableOnly([one, a], TEST_REVIEWERS, NOW).map((i) => i.id), [a.id])
})

test('structure: both languages, misconceptions and a real source are required', () => {
  assert.ok(structuralErrors(item({ prompt: { en: 'x', bn: '' } })).some((e) => e.includes('prompt')))
  assert.ok(structuralErrors(item({ distractors: [{ text: { en: 'a', bn: 'ক' } }] })).some((e) => e.includes('misconception')))
  assert.ok(structuralErrors(item({ source: { url: 'http://insecure', publisher: 'x', supports: 'y', verifiedOn: '2026-11-01' } })).some((e) => e.includes('https')))
})

// Brief Part 4: "automated tests must fail if shippable content has missing or invalid approval records".
test('the REAL content set has no invalid approvals, structural problems or duplicate ids', () => {
  const report = contentReport([...ALL_CONTENT_ITEMS], [...REVIEWERS])
  assert.deepEqual(report.invalidApprovals, [])
  assert.deepEqual(report.structuralProblems, [])
  assert.deepEqual(report.duplicateIds, [])
})

test('mission and expedition lists match the approved two-wave plan', () => {
  assert.deepEqual(SKY_SCIENCE_MISSIONS.filter((m) => m.wave === 1).map((m) => m.id), ['sky-watcher', 'weather-flyer'])
  assert.deepEqual(SKY_SCIENCE_MISSIONS.filter((m) => m.wave === 2).map((m) => m.id), ['moon-earth', 'planet-parade', 'planet-detectives', 'star-navigator'])
  assert.deepEqual(WORLD_EXPEDITIONS.filter((e) => e.playable).map((e) => e.id), ['sundarbans', 'amazon', 'sahara'])
  assert.deepEqual(WORLD_EXPEDITIONS.filter((e) => !e.playable).map((e) => e.id), ['himalaya', 'arctic', 'great-barrier-reef'])
})
