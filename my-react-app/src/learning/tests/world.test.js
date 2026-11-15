// L2: World Explorer stations, visits and reports through the preview adapter.
// Design 4.4 (lifecycle), 4.4.1 (W1–W7), 4.4.2 (S1–S4), 2.11 (P4–P10), 6.1 (report rules).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPreviewAdapter, PREVIEW_PLAYER_ID } from '../adapters/preview.js'
import { InjectedAbort } from '../store/transactions.js'
import { dumpDb, freshFactory, getEvents, getRound, getTotals, playStation, reportAnswers } from './helpers.js'

const P = PREVIEW_PLAYER_ID
const EXP = 'sundarbans'
const newAdapter = async (factory) => {
  const adapter = createPreviewAdapter({ factory })
  await adapter.ready()
  return adapter
}
const visitOf = (r) => r.visit.roundKey

test('Record completes a station: XP 4 / 2 / 0 by committed Explain attempt, added at once to the local total', async () => {
  const a = await newAdapter(freshFactory())
  const v = visitOf(await a.world.startVisit(EXP))
  assert.equal((await playStation(a, v, EXP, 1)).xp, 4)
  assert.equal((await playStation(a, v, EXP, 2, { wrongFirst: 1 })).xp, 2)
  assert.equal((await playStation(a, v, EXP, 3, { wrongFirst: 2 })).xp, 0)
  assert.equal(await getTotals(a._db(), P), 6)
  assert.equal((await getRound(a._db(), P, v)).xp, 6, 'held in the open visit for one aggregated award')
  assert.equal(a.wouldBeAwards().length, 0, 'nothing submitted while the visit is open')
  a.store.close()
})

test('station steps are enforced: no Explain before Observe/Investigate; no Record before a correct answer', async () => {
  const a = await newAdapter(freshFactory())
  const v = visitOf(await a.world.startVisit(EXP))
  assert.equal((await a.world.recordExplainAttempt(v, EXP, 1, 'x', true)).reason, 'investigate-first')
  assert.equal((await a.world.saveStationProgress(v, EXP, 1, 'investigate')).reason, 'observe-first')
  await a.world.saveStationProgress(v, EXP, 1, 'observe')
  await a.world.saveStationProgress(v, EXP, 1, 'investigate')
  await a.world.recordExplainAttempt(v, EXP, 1, 'x', false)
  assert.equal((await a.world.completeStation(v, EXP, 1)).reason, 'explain-not-correct')
  a.store.close()
})

test('one visit → exactly one would-be award with the summed XP (stations never award on their own)', async () => {
  const a = await newAdapter(freshFactory())
  const v = visitOf(await a.world.startVisit(EXP))
  for (const n of [1, 2, 3]) await playStation(a, v, EXP, n)
  const sealed = await a.world.sealVisit(v)
  assert.equal(sealed.round.xp, 12)
  assert.deepEqual(a.wouldBeAwards().map((w) => w.amount), [12])
  assert.equal((await a.world.sealVisit(v)).alreadySealed, true, 'sealing is idempotent')
  assert.equal(a.wouldBeAwards().length, 1)
  a.store.close()
})

test('report: set A first, set B on retry; report XP and ★★★ first filing only; completion 20 once (D3, fixture)', async () => {
  const a = await newAdapter(freshFactory())
  let v = visitOf(await a.world.startVisit(EXP))
  for (const n of [1, 2, 3, 4, 5]) await playStation(a, v, EXP, n)
  assert.equal((await a.world.fileReport(v, EXP, 'B', reportAnswers(5))).reason, 'first-filing-uses-set-a')
  const first = await a.world.fileReport(v, EXP, 'A', reportAnswers(2)) // 2/5: no star, no completion
  assert.equal(first.xp, 6)
  assert.equal(first.round.status, 'sealed', 'filing seals the visit in the same transaction')
  v = visitOf(await a.world.startVisit(EXP))
  assert.equal((await a.world.fileReport(v, EXP, 'A', reportAnswers(5))).reason, 'retry-uses-set-b')
  const retry = await a.world.fileReport(v, EXP, 'B', reportAnswers(5))
  assert.equal(retry.xp, 20, 'retry: no report XP, no ★★★, but first completion')
  v = visitOf(await a.world.startVisit(EXP))
  const replay = await a.world.fileReport(v, EXP, 'A', reportAnswers(5))
  assert.equal(replay.xp, 0, 'replaying a completed expedition pays nothing')
  assert.equal(await getTotals(a._db(), P), 20 + 6 + 20)
  a.store.close()
})

test('report needs all five stations recorded', async () => {
  const a = await newAdapter(freshFactory())
  const v = visitOf(await a.world.startVisit(EXP))
  await playStation(a, v, EXP, 1)
  assert.equal((await a.world.fileReport(v, EXP, 'A', reportAnswers(5))).reason, 'stations-incomplete')
  a.store.close()
})

test('replaying a completed station: journal only, 0 XP (U3 fixture), no extra award', async () => {
  const a = await newAdapter(freshFactory())
  const v1 = visitOf(await a.world.startVisit(EXP))
  await playStation(a, v1, EXP, 1)
  const v2 = visitOf(await a.world.startVisit(EXP))
  await a.world.recordExplainAttempt(v2, EXP, 1, 'right', true)
  const replay = await a.world.completeStation(v2, EXP, 1)
  assert.deepEqual([replay.ok, replay.xp, replay.replay], [true, 0, true])
  assert.ok(a.store.getSnapshot().world.journal.some((j) => j.type === 'station-replay'))
  assert.equal((await a.world.sealVisit(v2)).round.sync, 'none')
  a.store.close()
})

/* ------------------------------------------------------------------ W1–W7 */

test('W1: complete 2 stations, refresh → both complete, XP counted once, banner data present, nothing submitted', async () => {
  const factory = freshFactory()
  const a = await newAdapter(factory)
  const v = visitOf(await a.world.startVisit(EXP))
  await playStation(a, v, EXP, 1)
  await playStation(a, v, EXP, 2)
  a._db().close()
  const b = await newAdapter(factory)
  const snap = b.store.getSnapshot()
  assert.equal(snap.learningXp, 8)
  assert.ok(snap.world.expeditions[EXP].stations[1].complete && snap.world.expeditions[EXP].stations[2].complete)
  assert.deepEqual(b.world.unfinishedVisits(EXP).map((x) => [x.roundKey, x.xp]), [[v, 8]])
  assert.equal(b.wouldBeAwards().length, 0)
  a.store.close(); b.store.close()
})

test('W2/W3: reopen (after refresh or browser close) and Continue → old visit sealed once, new visit open, stations not re-paid', async () => {
  const factory = freshFactory()
  const a = await newAdapter(factory)
  const v = visitOf(await a.world.startVisit(EXP))
  for (const n of [1, 2, 3]) await playStation(a, v, EXP, n)
  a._db().close()
  const b = await newAdapter(factory)
  const cont = await b.world.startVisit(EXP)
  assert.deepEqual(cont.sealed.map((s) => [s.roundKey, s.xp, s.status]), [[v, 12, 'sealed']])
  assert.deepEqual(b.wouldBeAwards().map((w) => [w.roundKey, w.amount]), [[v, 12]])
  const again = await playStation(b, visitOf(cont), EXP, 1)
  assert.equal(again.reason ?? again.xp, 0, 'station 1 is complete; replay pays nothing')
  assert.equal(b.store.getSnapshot().learningXp, 12)
  a.store.close(); b.store.close()
})

test('W5: refresh INSIDE a station before Record → not complete, no XP, Observe/Investigate progress restored', async () => {
  const factory = freshFactory()
  const a = await newAdapter(factory)
  const v = visitOf(await a.world.startVisit(EXP))
  await a.world.saveStationProgress(v, EXP, 4, 'observe')
  await a.world.saveStationProgress(v, EXP, 4, 'investigate')
  await a.world.recordExplainAttempt(v, EXP, 4, 'wrong', false)
  a._db().close()
  const b = await newAdapter(factory)
  const s = b.store.getSnapshot().world.expeditions[EXP].stations[4]
  assert.deepEqual([s.complete, s.steps.observe, s.steps.investigate, s.attempts.length], [false, true, true, 1])
  assert.equal(b.store.getSnapshot().learningXp, 0)
  const v2 = visitOf(await b.world.startVisit(EXP))
  await b.world.recordExplainAttempt(v2, EXP, 4, 'right', true)
  assert.equal((await b.world.completeStation(v2, EXP, 4)).xp, 2, 'the committed wrong attempt still counts: hint already used')
  a.store.close(); b.store.close()
})

test('W6: two tabs both start a visit → the old visit is sealed exactly once; two distinct new visits', async () => {
  const factory = freshFactory()
  const a = await newAdapter(factory)
  const old = visitOf(await a.world.startVisit(EXP))
  await playStation(a, old, EXP, 1)
  const tab1 = await newAdapter(factory)
  const tab2 = await newAdapter(factory)
  const [x, y] = await Promise.all([tab1.world.startVisit(EXP), tab2.world.startVisit(EXP)])
  const sealedOld = [...x.sealed, ...y.sealed].filter((s) => s.roundKey === old)
  assert.equal(sealedOld.length, 1)
  assert.notEqual(visitOf(x), visitOf(y))
  assert.equal([...tab1.wouldBeAwards(), ...tab2.wouldBeAwards()].filter((w) => w.roundKey === old).length, 1)
  for (const t of [a, tab1, tab2]) t.store.close()
})

test('W7: seal on reopen, refresh again → no second seal, no second award', async () => {
  const factory = freshFactory()
  const a = await newAdapter(factory)
  const v = visitOf(await a.world.startVisit(EXP))
  await playStation(a, v, EXP, 1)
  const b = await newAdapter(factory)
  await b.world.startVisit(EXP)
  const c = await newAdapter(factory)
  assert.equal((await c.world.sealVisit(v)).alreadySealed, true)
  assert.equal(c.wouldBeAwards().length, 0)
  assert.equal((await getRound(c._db(), P, v)).status, 'sealed')
  for (const t of [a, b, c]) t.store.close()
})

/* ------------------------------------------------------------------ S1–S4 stale tabs */

test('S1: Tab A visit sealed by Tab B → Tab A completeStation writes NOTHING (no XP, journal, round change)', async () => {
  const factory = freshFactory()
  const tabA = await newAdapter(factory)
  const tabB = await newAdapter(factory)
  const va = visitOf(await tabA.world.startVisit(EXP))
  await tabA.world.saveStationProgress(va, EXP, 1, 'observe')
  await tabA.world.saveStationProgress(va, EXP, 1, 'investigate')
  await tabA.world.recordExplainAttempt(va, EXP, 1, 'right', true)
  const vb = await tabB.world.startVisit(EXP)
  assert.equal(vb.sealed[0].roundKey, va)
  const before = await dumpDb(tabA._db())
  const stale = await tabA.world.completeStation(va, EXP, 1)
  assert.deepEqual(stale, { ok: false, reason: 'visit-sealed', detail: undefined })
  assert.deepEqual(await dumpDb(tabA._db()), before, 'database byte-identical: no event, XP, journal or round change')
  assert.equal((await getEvents(tabA._db(), P)).length, 0)
  assert.equal(tabA.wouldBeAwards().length, 0)
  tabA.store.close(); tabB.store.close()
})

test('S2: other visit-scoped actions from the stale tab are refused with no writes', async () => {
  const factory = freshFactory()
  const tabA = await newAdapter(factory)
  const tabB = await newAdapter(factory)
  const va = visitOf(await tabA.world.startVisit(EXP))
  for (const n of [1, 2, 3, 4, 5]) await playStation(tabA, va, EXP, n)
  await tabB.world.startVisit(EXP)
  const before = await dumpDb(tabA._db())
  assert.equal((await tabA.world.recordExplainAttempt(va, EXP, 1, 'x', true)).reason, 'visit-sealed')
  assert.equal((await tabA.world.saveStationProgress(va, EXP, 2, 'observe')).reason, 'visit-sealed')
  assert.equal((await tabA.world.fileReport(va, EXP, 'A', reportAnswers(5))).reason, 'visit-sealed')
  assert.deepEqual(await dumpDb(tabA._db()), before)
  tabA.store.close(); tabB.store.close()
})

test('S3: "Continue here" joins the current open visit; completing then adds XP once, to that visit', async () => {
  const factory = freshFactory()
  const tabA = await newAdapter(factory)
  const tabB = await newAdapter(factory)
  const va = visitOf(await tabA.world.startVisit(EXP))
  const vb = visitOf(await tabB.world.startVisit(EXP))
  const joined = await tabA.world.joinVisit(EXP)
  assert.equal(joined.visit.roundKey, vb)
  assert.notEqual(vb, va)
  assert.equal((await playStation(tabA, vb, EXP, 1)).xp, 4)
  assert.equal((await getRound(tabA._db(), P, vb)).xp, 4)
  tabA.store.close(); tabB.store.close()
})

test('S4: two tabs on the same visit complete the same station concurrently → one event, XP once', async () => {
  const factory = freshFactory()
  const tabA = await newAdapter(factory)
  const tabB = await newAdapter(factory)
  const v = visitOf(await tabA.world.startVisit(EXP))
  await tabA.world.saveStationProgress(v, EXP, 2, 'observe')
  await tabA.world.saveStationProgress(v, EXP, 2, 'investigate')
  await tabA.world.recordExplainAttempt(v, EXP, 2, 'right', true)
  const [x, y] = await Promise.all([tabA.world.completeStation(v, EXP, 2), tabB.world.completeStation(v, EXP, 2)])
  const winners = [x, y].filter((r) => r.ok && r.xp === 4)
  assert.equal(winners.length, 1, 'exactly one tab gets the station XP')
  const loser = winners[0] === x ? y : x
  assert.ok(!loser.ok || loser.xp === 0, 'the other tab is refused or gets 0')
  assert.equal(await getTotals(tabA._db(), P), 4)
  assert.equal((await getRound(tabA._db(), P, v)).xp, 4)
  tabA.store.close(); tabB.store.close()
})

/* ------------------------------------------------------------------ P4–P10 */

async function stationReady(a, v, n) {
  await a.world.saveStationProgress(v, EXP, n, 'observe')
  await a.world.saveStationProgress(v, EXP, n, 'investigate')
}

test('P4: interrupted during saveStationProgress → step not saved, earlier steps intact, no XP', async () => {
  const a = await newAdapter(freshFactory())
  const v = visitOf(await a.world.startVisit(EXP))
  await a.world.saveStationProgress(v, EXP, 1, 'observe')
  const before = await dumpDb(a._db())
  await assert.rejects(a.world.saveStationProgress(v, EXP, 1, 'investigate', { inject: 'abort-before-commit' }), InjectedAbort)
  assert.deepEqual(await dumpDb(a._db()), before)
  a.store.close()
})

test('P5: interrupted during recordExplainAttempt → attempt not counted; retry uses the same attempt number', async () => {
  const a = await newAdapter(freshFactory())
  const v = visitOf(await a.world.startVisit(EXP))
  await stationReady(a, v, 1)
  await assert.rejects(a.world.recordExplainAttempt(v, EXP, 1, 'wrong', false, { inject: 'abort-before-commit' }), InjectedAbort)
  assert.equal((await a.world.recordExplainAttempt(v, EXP, 1, 'right', true)).attemptNumber, 1)
  assert.equal((await a.world.completeStation(v, EXP, 1)).xp, 4)
  a.store.close()
})

test('P6: interrupted during completeStation (Record) → not complete, no XP, no journal, visit unchanged', async () => {
  const a = await newAdapter(freshFactory())
  const v = visitOf(await a.world.startVisit(EXP))
  await stationReady(a, v, 1)
  await a.world.recordExplainAttempt(v, EXP, 1, 'right', true)
  const before = await dumpDb(a._db())
  await assert.rejects(a.world.completeStation(v, EXP, 1, { inject: 'abort-before-commit' }), InjectedAbort)
  assert.deepEqual(await dumpDb(a._db()), before)
  assert.equal((await a.world.completeStation(v, EXP, 1)).xp, 4, 'Record offered again and counted once')
  a.store.close()
})

test('P7: tab closed right after Record committed → station complete and XP present once on reopen', async () => {
  const factory = freshFactory()
  const a = await newAdapter(factory)
  const v = visitOf(await a.world.startVisit(EXP))
  await playStation(a, v, EXP, 1)
  a._db().close()
  const b = await newAdapter(factory)
  assert.equal(b.store.getSnapshot().learningXp, 4)
  assert.equal(b.world.unfinishedVisits(EXP)[0].xp, 4)
  a.store.close(); b.store.close()
})

test('P8: interrupted during sealVisit → still open with its sum; the next startVisit seals it once', async () => {
  const a = await newAdapter(freshFactory())
  const v = visitOf(await a.world.startVisit(EXP))
  await playStation(a, v, EXP, 1)
  await assert.rejects(a.world.sealVisit(v, { inject: 'abort-before-commit' }), InjectedAbort)
  assert.equal((await getRound(a._db(), P, v)).status, 'open')
  assert.equal(a.wouldBeAwards().length, 0)
  const next = await a.world.startVisit(EXP)
  assert.deepEqual(next.sealed.map((s) => [s.roundKey, s.xp]), [[v, 4]])
  assert.equal(a.wouldBeAwards().length, 1)
  a.store.close()
})

test('P9: interrupted during startVisit → old visit still open, no new visit; retry seals once and opens one', async () => {
  const a = await newAdapter(freshFactory())
  const v = visitOf(await a.world.startVisit(EXP))
  await playStation(a, v, EXP, 1)
  const before = await dumpDb(a._db())
  await assert.rejects(a.world.startVisit(EXP, { inject: 'abort-before-commit' }), InjectedAbort)
  assert.deepEqual(await dumpDb(a._db()), before)
  const ok = await a.world.startVisit(EXP)
  assert.equal(ok.sealed.length, 1)
  const rounds = (await dumpDb(a._db())).rounds
  assert.equal(rounds.filter((r) => r.status === 'open').length, 1)
  a.store.close()
})
// P10 (sealed, then interrupted before the server hand-off) is in sync.test.js.
