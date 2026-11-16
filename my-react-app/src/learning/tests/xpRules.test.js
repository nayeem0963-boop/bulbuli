// L1: XP amounts, stars and policy gating (design 6, 8.1).
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AMOUNTS, PENDING, PRODUCT_POLICY, PolicyPendingError, assertPolicyResolved, flightCandidates,
  pendingPolicyItems, reportCandidates, reportStars, skyStars, stationXp, threshold75,
} from '../xpRules.js'
import { eventKeys } from '../eventKeys.js'
import { TEST_FIXTURE_POLICY } from '../policyFixture.js'

const p = (firstTryCorrect, secured = firstTryCorrect) => ({ objectiveId: `o${Math.random()}`, firstTryCorrect, secured })

test('amounts are exactly those quoted in the brief (design 6.1)', () => {
  assert.deepEqual(
    { ...AMOUNTS.sky, tiers: { ...AMOUNTS.sky.tiers } },
    { gateFirstTry: 1, wrongFirst: 0, returnQuestion: 0, quickCheckCorrect: 2, tiers: { 1: 3, 2: 7, 3: 5 } },
  )
  assert.deepEqual({ ...AMOUNTS.world }, {
    stationFirstTry: 4, stationAfterHint: 2, stationAfterExplanation: 0,
    reportCorrectFirstFiling: 3, expeditionComplete: 20, reportThreeStars: 5,
  })
})

test('75 % rounds up: 6 → 5, 8 → 6', () => {
  assert.equal(threshold75(6), 5)
  assert.equal(threshold75(8), 6)
})

test('stars follow the approved rules (design 8.1)', () => {
  const six = (firstTry, securedExtra = 0) => Array.from({ length: 6 }, (_, i) => p(i < firstTry, i < firstTry + securedExtra))
  assert.equal(skyStars({ primary: six(4, 0), quickChecks: [] }), 0, '4/6 secured < 75 %')
  assert.equal(skyStars({ primary: six(4, 1), quickChecks: [] }), 1, '5/6 secured via a return question, 4/6 first try')
  assert.equal(skyStars({ primary: six(5), quickChecks: [{ correct: true }] }), 2, '5/6 first try')
  assert.equal(skyStars({ primary: six(6), quickChecks: [{ correct: true }, { correct: false }] }), 2, 'a wrong Quick Check blocks ★★★')
  assert.equal(skyStars({ primary: six(6), quickChecks: [{ correct: true }, { correct: true }] }), 3)
})

test('flight candidates: 1 per first-try gate, 2 per Quick Check, tiers 3/7/5 up to the stars; returns earn nothing', () => {
  const primary = [{ objectiveId: 'a', firstTryCorrect: true, secured: true }, { objectiveId: 'b', firstTryCorrect: false, secured: true }]
  const out = flightCandidates(TEST_FIXTURE_POLICY, eventKeys, { missionId: 'sky-watcher', band: '4-6', primary, quickChecks: [{ itemId: 'q', correct: true }], stars: 3 })
  assert.deepEqual(out.map((c) => [c.kind, c.xp]), [['gate', 1], ['quick-check', 2], ['tier', 3], ['tier', 7], ['tier', 5]])
  assert.ok(out.find((c) => c.kind === 'tier').eventKey.startsWith('sky:mission:sky-watcher:tier:'), 'tiers are not per band')
})

test('station XP from the committed Explain attempt: 4 / 2 / 0', () => {
  assert.equal(stationXp(1), 4)
  assert.equal(stationXp(2), 2)
  assert.equal(stationXp(3), 0)
  assert.equal(stationXp(7), 0)
  assert.throws(() => stationXp(undefined))
})

test('report: 3 per correct on first filing; ★★★ 5 on first filing only; completion 20 with ≥★', () => {
  assert.equal(reportStars(2), 0)
  assert.equal(reportStars(3), 1)
  assert.equal(reportStars(4), 2)
  assert.equal(reportStars(5), 3)
  const first = reportCandidates(eventKeys, { expedition: 'sahara', isFirstFiling: true, correct: 5, allStationsComplete: true })
  assert.deepEqual(first.map((c) => [c.kind, c.xp]), [['report', 15], ['report-three-stars', 5], ['complete', 20]])
  const retry = reportCandidates(eventKeys, { expedition: 'sahara', isFirstFiling: false, correct: 5, allStationsComplete: true })
  assert.deepEqual(retry.map((c) => [c.kind, c.xp]), [['complete', 20]], 'retry pays nothing but a first completion (D3)')
  assert.deepEqual(reportCandidates(eventKeys, { expedition: 'sahara', isFirstFiling: true, correct: 2, allStationsComplete: true }).map((c) => c.kind), ['report'])
})

test('the PRODUCT policy is entirely PENDING (U1–U7), and nothing can earn XP with it', () => {
  assert.deepEqual(pendingPolicyItems(PRODUCT_POLICY), [
    'U1 gate.replay', 'U2 quickCheck.replay', 'U3 station.replay', 'U4 gate.scope', 'U4 quickCheck.scope',
    'U5 caps', 'U6 tierStructure', 'U7 reportTiming',
  ])
  assert.throws(() => assertPolicyResolved(PRODUCT_POLICY), PolicyPendingError)
  assert.throws(() => eventKeys.gateFirstTry(PRODUCT_POLICY, '7-8', 'x'))
})

test('the fixture policy resolves, but unsupported real values are refused, not ignored', () => {
  assert.doesNotThrow(() => assertPolicyResolved(TEST_FIXTURE_POLICY))
  assert.throws(() => assertPolicyResolved({ ...TEST_FIXTURE_POLICY, caps: 'daily-50' }), /Unsupported caps/)
  assert.throws(() => assertPolicyResolved({ ...TEST_FIXTURE_POLICY, gate: { replay: 'daily', scope: 'per-band' } }), /Unsupported gate.replay/)
  assert.throws(() => assertPolicyResolved({ ...TEST_FIXTURE_POLICY, tierStructure: PENDING }), PolicyPendingError)
})

test('cross-band scope (U4) changes only gate/Quick Check keys, never tier keys', () => {
  const perBand = TEST_FIXTURE_POLICY
  const across = { ...TEST_FIXTURE_POLICY, gate: { replay: 'never', scope: 'across-bands' } }
  assert.notEqual(eventKeys.gateFirstTry(perBand, '4-6', 'o'), eventKeys.gateFirstTry(perBand, '7-8', 'o'))
  assert.equal(eventKeys.gateFirstTry(across, '4-6', 'o'), eventKeys.gateFirstTry(across, '7-8', 'o'))
})

// Design 6.3: the unresolved policies must be resolved before release. Reported as TODO (visible in
// every test run) instead of a failure, so the foundation can be built meanwhile; the live adapter
// independently refuses to start while any item is PENDING (adapters.test.js).
test('U1–U7 resolved from the corrected Phase 2 proposal before release', {
  todo: `awaiting the corrected Phase 2 proposal (D4): ${pendingPolicyItems(PRODUCT_POLICY).join('; ')}`,
}, () => {
  assert.deepEqual(pendingPolicyItems(PRODUCT_POLICY), [])
})
