// L2: Sky Science flights through the preview adapter: answers, commit, persistence points
// (design 2.11 P1–P3), required scenarios (2.9) and counter rule (4.2, 4.3).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPreviewAdapter, PREVIEW_PLAYER_ID } from '../adapters/preview.js'
import { InjectedAbort } from '../store/transactions.js'
import { dumpDb, freshFactory, getTotals, playFlight } from './helpers.js'

const P = PREVIEW_PLAYER_ID
const newAdapter = async (factory) => {
  const adapter = createPreviewAdapter({ factory })
  await adapter.ready()
  return adapter
}

test('a perfect 4–6 flight: 6 gates + 2 Quick Checks + tiers 3/7/5 = 25 XP, one sealed round', async () => {
  const a = await newAdapter(freshFactory())
  const r = await playFlight(a, { band: '4-6', primary: [true, true, true, true, true, true], checks: [true, true] })
  assert.equal(r.ok, true)
  assert.equal(r.stars, 3)
  assert.equal(r.xp, 6 + 4 + 15)
  assert.equal(r.round.status, 'sealed')
  assert.equal(r.round.sync, 'local-only', 'preview rounds are never submitted')
  assert.equal(await getTotals(a._db(), P), 25)
  assert.equal(a.store.getSnapshot().learningXp, 25, 'snapshot refreshed after commit')
  a.store.close()
})

test('wrong answers and return questions earn 0 XP; a return question can secure ★', async () => {
  const a = await newAdapter(freshFactory())
  const r = await playFlight(a, { band: '7-8', primary: [true, true, true, true, true, false, false, false], returns: { 5: true, 6: true }, checks: [true, true, true] })
  // 5 first-try (<6 needed for ★★); 7 secured ≥ 6 → ★; XP = 5 gates + 6 QC + tier1 3
  assert.equal(r.stars, 1)
  assert.equal(r.xp, 5 + 6 + 3)
  a.store.close()
})

test('answer rules: no second answer to a slot; return only after a wrong first answer, with a different item', async () => {
  const a = await newAdapter(freshFactory())
  const { flightKey } = await a.sky.startFlight({ missionId: 'sky-watcher', band: '7-8', primaryCount: 2, quickCheckCount: 0 })
  assert.equal((await a.sky.recordAnswer(flightKey, { slot: 'primary', index: 0, objectiveId: 'o0', itemId: 'p0', correct: true })).ok, true)
  assert.equal((await a.sky.recordAnswer(flightKey, { slot: 'primary', index: 0, objectiveId: 'o0', itemId: 'p0', correct: false })).reason, 'already-answered')
  assert.equal((await a.sky.recordAnswer(flightKey, { slot: 'return', objectiveId: 'o0', itemId: 'r0', correct: true })).reason, 'return-not-scheduled')
  await a.sky.recordAnswer(flightKey, { slot: 'primary', index: 1, objectiveId: 'o1', itemId: 'p1', correct: false })
  assert.equal((await a.sky.recordAnswer(flightKey, { slot: 'return', objectiveId: 'o1', itemId: 'p1', correct: true })).reason, 'return-must-differ')
  assert.equal((await a.sky.recordAnswer(flightKey, { slot: 'return', objectiveId: 'o1', itemId: 'r1', correct: true })).ok, true)
  assert.equal((await a.sky.recordAnswer('sky:flight:other', { slot: 'primary', index: 0, objectiveId: 'x', itemId: 'y', correct: true })).reason, 'flight-not-active')
  a.store.close()
})

test('an incomplete flight cannot be committed (no XP for unfinished work)', async () => {
  const a = await newAdapter(freshFactory())
  const { flightKey } = await a.sky.startFlight({ missionId: 'sky-watcher', band: '7-8', primaryCount: 2, quickCheckCount: 1 })
  await a.sky.recordAnswer(flightKey, { slot: 'primary', index: 0, objectiveId: 'o0', itemId: 'p0', correct: true })
  assert.equal((await a.sky.commitFlight(flightKey)).reason, 'flight-incomplete')
  assert.equal(await getTotals(a._db(), P), 0)
  a.store.close()
})

test('P1: interrupted DURING recordAnswer → nothing stored; the same gate is still unanswered', async () => {
  const factory = freshFactory()
  const a = await newAdapter(factory)
  const { flightKey } = await a.sky.startFlight({ missionId: 'sky-watcher', band: '7-8', primaryCount: 1, quickCheckCount: 0 })
  const before = await dumpDb(a._db())
  await assert.rejects(a.sky.recordAnswer(flightKey, { slot: 'primary', index: 0, objectiveId: 'o0', itemId: 'p0', correct: false }, { inject: 'abort-before-commit' }), InjectedAbort)
  assert.deepEqual(await dumpDb(a._db()), before, 'no write survived')
  const b = await newAdapter(factory) // the learner reopens
  assert.equal((await b.sky.recordAnswer(flightKey, { slot: 'primary', index: 0, objectiveId: 'o0', itemId: 'p0', correct: true })).ok, true, 'same gate offered again')
  a.store.close(); b.store.close()
})

test('P2: interrupted right AFTER recordAnswer committed → the answer is there after reopening; no XP yet', async () => {
  const factory = freshFactory()
  const a = await newAdapter(factory)
  const { flightKey } = await a.sky.startFlight({ missionId: 'sky-watcher', band: '7-8', primaryCount: 2, quickCheckCount: 0 })
  await a.sky.recordAnswer(flightKey, { slot: 'primary', index: 0, objectiveId: 'o0', itemId: 'p0', correct: false })
  a._db().close() // tab closed
  const b = await newAdapter(factory)
  const flight = b.store.getSnapshot().sky.activeFlight
  assert.equal(flight.flightKey, flightKey)
  assert.equal(flight.answers.length, 1)
  assert.equal(flight.answers[0].correct, false, 'a committed wrong answer stays wrong; no second first attempt')
  assert.equal((await b.sky.recordAnswer(flightKey, { slot: 'primary', index: 0, objectiveId: 'o0', itemId: 'p0', correct: true })).reason, 'already-answered')
  assert.equal(await getTotals(b._db(), P), 0)
  a.store.close(); b.store.close()
})

test('P3: interrupted DURING commitFlight → no events, rounds or XP; committing again works exactly once', async () => {
  const a = await newAdapter(freshFactory())
  const { flightKey } = await a.sky.startFlight({ missionId: 'sky-watcher', band: '7-8', primaryCount: 1, quickCheckCount: 0 })
  await a.sky.recordAnswer(flightKey, { slot: 'primary', index: 0, objectiveId: 'o0', itemId: 'p0', correct: true })
  const before = await dumpDb(a._db())
  await assert.rejects(a.sky.commitFlight(flightKey, { inject: 'abort-before-commit' }), InjectedAbort)
  assert.deepEqual(await dumpDb(a._db()), before)
  const ok = await a.sky.commitFlight(flightKey)
  assert.equal(ok.ok, true)
  assert.equal(ok.xp, 1 + 3 + 7 + 5)
  const again = await a.sky.commitFlight(flightKey)
  assert.equal(again.alreadyCommitted, true)
  assert.equal(await getTotals(a._db(), P), 16)
  a.store.close()
})

test('2.9 refresh on the result screen: reopening and committing again adds nothing', async () => {
  const factory = freshFactory()
  const a = await newAdapter(factory)
  const r = await playFlight(a, { primary: [true], checks: [] })
  const b = await newAdapter(factory)
  assert.equal(b.store.getSnapshot().sky.activeFlight, null, 'resume state cleared in the same transaction')
  assert.equal((await b.sky.commitFlight(r.flightKey)).alreadyCommitted, true)
  assert.equal(await getTotals(b._db(), P), r.xp)
  a.store.close(); b.store.close()
})

test('2.9 double click: two concurrent commits of one flight → one round, XP once', async () => {
  const a = await newAdapter(freshFactory())
  const { flightKey } = await a.sky.startFlight({ missionId: 'sky-watcher', band: '9-10', primaryCount: 1, quickCheckCount: 0 })
  await a.sky.recordAnswer(flightKey, { slot: 'primary', index: 0, objectiveId: 'o0', itemId: 'p0', correct: true })
  const [x, y] = await Promise.all([a.sky.commitFlight(flightKey), a.sky.commitFlight(flightKey)])
  assert.equal([x, y].filter((r) => r.alreadyCommitted).length, 1)
  assert.equal(await getTotals(a._db(), P), 16)
  a.store.close()
})

test('replaying a completed mission pays no repeat XP (fixture policy) and a 0-XP flight produces no award event', async () => {
  const a = await newAdapter(freshFactory())
  const first = await playFlight(a, { band: '7-8', primary: Array(8).fill(true), checks: [true, true, true] })
  assert.equal(first.xp, 8 + 6 + 15)
  const replay = await playFlight(a, { band: '7-8', primary: Array(8).fill(true), checks: [true, true, true] })
  assert.equal(replay.xp, 0)
  assert.equal(replay.round.sync, 'none', 'nothing to submit → no counter increment')
  assert.equal(a.wouldBeAwards().length, 1)
  a.store.close()
})

test('band switching never repays mission tiers (tiers are once per mission across bands)', async () => {
  const a = await newAdapter(freshFactory())
  await playFlight(a, { band: '4-6', primary: Array(6).fill(true), checks: [true, true] })
  const other = await playFlight(a, { band: '9-10', primary: Array(8).fill(true), checks: [true, true, true, true] })
  assert.equal(other.round.rewards.filter((r) => r.kind === 'tier').length, 0)
  // gate / Quick Check XP in another band follows the cross-band policy, U4 (fixture: per band)
  assert.equal(other.xp, 8 + 8)
  a.store.close()
})

test('one completed flight → at most one would-be award (one counter increment) however many reward types', async () => {
  const a = await newAdapter(freshFactory())
  await playFlight(a, { band: '7-8', primary: Array(8).fill(true), checks: [true, true, true] })
  assert.equal(a.wouldBeAwards().length, 1)
  assert.equal(a.wouldBeAwards()[0].amount, 29)
  a.store.close()
})

test('abandoned flight (discard) records nothing and its objectives stay earnable', async () => {
  const a = await newAdapter(freshFactory())
  const { flightKey } = await a.sky.startFlight({ missionId: 'sky-watcher', band: '7-8', primaryCount: 1, quickCheckCount: 0 })
  await a.sky.recordAnswer(flightKey, { slot: 'primary', index: 0, objectiveId: 'sky-watcher.obj0', itemId: 'p0', correct: true })
  assert.equal((await a.sky.discardFlight(flightKey)).ok, true)
  assert.equal(await getTotals(a._db(), P), 0)
  const later = await playFlight(a, { primary: [true], checks: [] })
  assert.ok(later.xp >= 1)
  a.store.close()
})
