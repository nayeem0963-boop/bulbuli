// L2: server sync states, ownership, recovery and counters through the LIVE adapter with a fake
// server (design 2.4, 2.6 R1–R6, 2.7 O1–O8, 3 E5, 2.11 P10, 4.2). The fake reproduces the verified
// award_xp() + RLS semantics; it does not prove the deployed database behaves the same (D9, D10).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createLiveAdapter } from '../adapters/live.js'
import { retryOwnershipCheck } from '../adapters/core.js'
import { serverEventId } from '../eventId.js'
import { TEST_FIXTURE_POLICY } from '../policyFixture.js'
import * as tx from '../store/transactions.js'
import { learnerSyncMessage, supportCode, supportRows } from '../syncDiagnostics.js'
import { createFakeServer, dumpDb, freshFactory, getRound, getTotals, playFlight, playStation, putRaw, USER_A, USER_B } from './helpers.js'

// The live adapter refuses the fixture (tagged fixture:true). For these tests only, the same
// resolved values are passed without the tag. This is still NOT a product policy (design 6.2).
const LIVE_TEST_POLICY = Object.freeze({ ...TEST_FIXTURE_POLICY, fixture: undefined })

async function liveFor(server, factory, user = USER_A) {
  server.signIn(user)
  const adapter = createLiveAdapter({ policy: LIVE_TEST_POLICY, server: server.adapterServer(), factory })
  await adapter.ready()
  return adapter
}

test('O1: first submission → done/inserted; local XP unchanged by the reply; one counter increment', async () => {
  const server = createFakeServer()
  const a = await liveFor(server, freshFactory())
  const r = await playFlight(a, { primary: [true], checks: [] })
  assert.equal(r.round.sync, 'pending')
  assert.equal(r.round.eventId, serverEventId({ userId: USER_A, gameId: 'sky-runner', eventType: 'round', roundKey: r.flightKey }))
  const before = await getTotals(a._db(), USER_A)
  await a.syncNow()
  const round = await getRound(a._db(), USER_A, r.flightKey)
  assert.deepEqual([round.sync, round.syncDetail.confirmedBy], ['done', 'inserted'])
  assert.equal(await getTotals(a._db(), USER_A), before)
  assert.deepEqual([server.profile(USER_A).xp, server.profile(USER_A).activities, server.profile(USER_A).plays['sky-runner']], [16, 1, 1])
  a.store.close()
})

test('O2: the learner\'s own event already on the server → awarded 0 → own row → done/duplicate-owned', async () => {
  const server = createFakeServer()
  const a = await liveFor(server, freshFactory())
  const r = await playFlight(a, { primary: [true], checks: [] })
  server.awardXp({ gameId: 'sky-runner', amount: r.xp, eventId: r.round.eventId }) // e.g. sent earlier, reply lost
  await a.syncNow()
  const round = await getRound(a._db(), USER_A, r.flightKey)
  assert.deepEqual([round.sync, round.syncDetail.confirmedBy], ['done', 'duplicate-owned'])
  assert.equal(server.profile(USER_A).activities, 1, 'counted once')
  a.store.close()
})

test('O3: event id already claimed by ANOTHER account → conflict, never done; local XP kept; no re-issue', async () => {
  const server = createFakeServer()
  const factory = freshFactory()
  const a = await liveFor(server, factory)
  const r = await playFlight(a, { primary: [true], checks: [] })
  server.signIn(USER_B)
  server.awardXp({ gameId: 'sky-runner', amount: r.xp, eventId: r.round.eventId }) // pre-claimed by B
  server.signIn(USER_A)
  await a.syncNow()
  const round = await getRound(a._db(), USER_A, r.flightKey)
  assert.equal(round.sync, 'conflict')
  assert.equal(round.syncDetail.lastError.code, 'event-id-owned-elsewhere')
  assert.equal(await getTotals(a._db(), USER_A), r.xp)
  assert.equal(server.events.size, 1, 'no second id was issued')
  await a.syncNow()
  assert.equal((await getRound(a._db(), USER_A, r.flightKey)).sync, 'conflict', 'not retried automatically into success')
  a.store.close()
})

test('O4: ownership check unavailable → verifying, retried later, never done without the row', async () => {
  const server = createFakeServer()
  const a = await liveFor(server, freshFactory())
  const r = await playFlight(a, { primary: [true], checks: [] })
  server.awardXp({ gameId: 'sky-runner', amount: r.xp, eventId: r.round.eventId })
  server.faults.ownershipUnavailable = 1
  await a.syncNow()
  assert.equal((await getRound(a._db(), USER_A, r.flightKey)).sync, 'verifying')
  await a.syncNow()
  assert.equal((await getRound(a._db(), USER_A, r.flightKey)).sync, 'done')
  a.store.close()
})

test('O5: invalid input (22023) → rejected; retained; not retried automatically', async () => {
  const server = createFakeServer()
  const a = await liveFor(server, freshFactory())
  const r = await playFlight(a, { primary: [true], checks: [] })
  server.faults.invalid = true
  await a.syncNow()
  const round = await getRound(a._db(), USER_A, r.flightKey)
  assert.equal(round.sync, 'rejected')
  const rpcBefore = server.calls.rpc
  await a.syncNow()
  assert.equal(server.calls.rpc, rpcBefore, 'not resent')
  a.store.close()
})

test('O6: support "Retry check" on a conflict: stays conflict while not owned; done/duplicate-owned once ownership is corrected', async () => {
  const server = createFakeServer()
  const a = await liveFor(server, freshFactory())
  const r = await playFlight(a, { primary: [true], checks: [] })
  server.signIn(USER_B)
  server.awardXp({ gameId: 'sky-runner', amount: r.xp, eventId: r.round.eventId })
  server.signIn(USER_A)
  await a.syncNow()
  const srv = server.adapterServer()
  await retryOwnershipCheck({ db: a._db(), server: srv, eventId: r.round.eventId, store: a.store })
  assert.equal((await getRound(a._db(), USER_A, r.flightKey)).sync, 'conflict')
  server.events.get(r.round.eventId).user_id = USER_A // e.g. an administrator corrected it
  await retryOwnershipCheck({ db: a._db(), server: srv, eventId: r.round.eventId, store: a.store })
  const round = await getRound(a._db(), USER_A, r.flightKey)
  assert.deepEqual([round.sync, round.syncDetail.confirmedBy], ['done', 'duplicate-owned'])
  a.store.close()
})

test('O7: no transition deletes a round; conflict and rejected rounds survive reloads with full history', async () => {
  const server = createFakeServer()
  const factory = freshFactory()
  const a = await liveFor(server, factory)
  const r1 = await playFlight(a, { primary: [true], checks: [] })
  server.faults.invalid = true
  await a.syncNow()
  a._db().close()
  const b = await liveFor(server, factory)
  const round = await getRound(b._db(), USER_A, r1.flightKey)
  assert.equal(round.sync, 'rejected')
  assert.deepEqual(round.syncDetail.history.map((h) => [h.from, h.to]), [['pending', 'rejected']])
  assert.equal((await dumpDb(b._db())).rounds.length, 1)
  a.store.close(); b.store.close()
})

test('O8: learner messages and support codes per state; support view lists problems first', () => {
  const base = { status: 'sealed', eventId: '0f1e2d3c-aaaa-5bbb-8ccc-dddddddddddd', xp: 5, gameId: 'sky-runner' }
  assert.equal(supportCode(base.eventId), '0F1E-2D3C')
  assert.equal(learnerSyncMessage({ ...base, sync: 'pending' }).text, 'Saved on this device · will sync')
  assert.equal(learnerSyncMessage({ ...base, sync: 'verifying' }).text, 'Saved on this device · checking sync')
  assert.equal(learnerSyncMessage({ ...base, sync: 'done' }).text, 'Synced')
  const conflict = learnerSyncMessage({ ...base, sync: 'conflict' })
  assert.deepEqual([conflict.problem, conflict.supportCode], [true, '0F1E-2D3C'])
  assert.equal(learnerSyncMessage({ ...base, sync: 'rejected' }).problem, true)
  const rows = supportRows([{ ...base, sync: 'done', roundKey: 'a' }, { ...base, sync: 'conflict', roundKey: 'b' }, { ...base, status: 'open', roundKey: 'c' }])
  assert.deepEqual(rows.map((r) => r.roundKey), ['b', 'a'])
})

test('E5: repeated submission (concurrent sync, re-sync, reload) → one server event and one counter increment', async () => {
  const server = createFakeServer()
  const factory = freshFactory()
  const a = await liveFor(server, factory)
  await playFlight(a, { primary: [true, true], checks: [true] })
  await Promise.all([a.syncNow(), a.syncNow()])
  await a.syncNow()
  const b = await liveFor(server, factory)
  await b.syncNow()
  assert.equal(server.events.size, 1)
  assert.equal(server.profile(USER_A).activities, 1)
  a.store.close(); b.store.close()
})

test('P10 / R1: sealed but interrupted before the hand-off → next open hands it off once with the same id', async () => {
  const server = createFakeServer()
  const factory = freshFactory()
  const a = await liveFor(server, factory)
  const r = await playFlight(a, { primary: [true], checks: [] }) // sealed; syncNow never called (tab closed)
  a._db().close()
  const b = await liveFor(server, factory)
  await b.syncNow()
  assert.deepEqual([...server.events.keys()], [r.round.eventId])
  assert.equal((await getRound(b._db(), USER_A, r.flightKey)).sync, 'done')
  a.store.close(); b.store.close()
})

test('R2: hand-off fails (network) → stays pending with attempts and lastError; later succeeds once', async () => {
  const server = createFakeServer()
  const a = await liveFor(server, freshFactory())
  const r = await playFlight(a, { primary: [true], checks: [] })
  server.faults.network = 2
  await a.syncNow()
  await a.syncNow()
  let round = await getRound(a._db(), USER_A, r.flightKey)
  assert.deepEqual([round.sync, round.syncDetail.attempts, round.syncDetail.lastError.code], ['pending', 2, 'network'])
  await a.syncNow()
  round = await getRound(a._db(), USER_A, r.flightKey)
  assert.equal(round.sync, 'done')
  assert.equal(server.profile(USER_A).activities, 1)
  a.store.close()
})

test('R3: a server/queue copy for a round that is NOT in the local database never adds local XP', async () => {
  const server = createFakeServer()
  const a = await liveFor(server, freshFactory())
  const stray = serverEventId({ userId: USER_A, gameId: 'sky-runner', eventType: 'round', roundKey: 'sky:flight:lost-locally' })
  const result = await tx.markSync(a._db(), { eventId: stray, to: 'done', confirmedBy: 'inserted' })
  assert.deepEqual([result.ok, result.reason], [false, 'unknown-event'])
  assert.equal(await getTotals(a._db(), USER_A), 0)
  a.store.close()
})

test('R4: a round in an unknown sync state is left alone (fail closed): not submitted, not changed', async () => {
  const server = createFakeServer()
  const a = await liveFor(server, freshFactory())
  const r = await playFlight(a, { primary: [true], checks: [] })
  const round = await getRound(a._db(), USER_A, r.flightKey)
  await putRaw(a._db(), 'rounds', { ...round, sync: 'mystery' })
  const before = await dumpDb(a._db())
  await a.syncNow()
  assert.equal(server.calls.rpc, 0)
  assert.deepEqual(await dumpDb(a._db()), before)
  assert.equal((await tx.markSync(a._db(), { eventId: round.eventId, to: 'done', confirmedBy: 'inserted' })).reason, 'unknown-sync-state')
  a.store.close()
})

test('R5: the React snapshot is read from the database and never written back', async () => {
  const server = createFakeServer()
  const a = await liveFor(server, freshFactory())
  await playFlight(a, { primary: [true], checks: [] })
  const snap = a.store.getSnapshot()
  assert.ok(Object.isFrozen(snap))
  const before = await dumpDb(a._db())
  await a.store.refresh()
  assert.deepEqual(await dumpDb(a._db()), before)
  a.store.close()
})

test('R6: an existing events row of ANY shape (even corrupt) blocks re-awarding that key', async () => {
  const server = createFakeServer()
  const a = await liveFor(server, freshFactory())
  const key = 'sky:7-8:obj:sky-watcher.obj0:first'
  await putRaw(a._db(), 'events', { playerId: USER_A, eventKey: key, garbage: true })
  const r = await playFlight(a, { primary: [true], checks: [] })
  assert.equal(r.round.rewards.some((x) => x.eventKey === key), false)
  assert.equal(r.xp, 15, 'tiers only; the corrupt-but-present gate key paid nothing')
  a.store.close()
})

test('account binding: a round for Account A is never submitted while Account B is signed in', async () => {
  const server = createFakeServer()
  const a = await liveFor(server, freshFactory())
  await playFlight(a, { primary: [true], checks: [] })
  server.signIn(USER_B)
  await a.syncNow()
  assert.equal(server.calls.rpc, 0)
  assert.equal(server.profile(USER_B).xp, 0)
  server.signIn(USER_A)
  await a.syncNow()
  assert.equal(server.profile(USER_A).xp, 16)
  a.store.close()
})

test('counters: one flight + one visit → exactly 2 activity increments; a zero-XP replay → none', async () => {
  const server = createFakeServer()
  const a = await liveFor(server, freshFactory())
  await playFlight(a, { primary: [true], checks: [] })
  const v = (await a.world.startVisit('amazon')).visit.roundKey
  for (const n of [1, 2]) await playStation(a, v, 'amazon', n)
  await a.world.sealVisit(v)
  await playFlight(a, { primary: [true], checks: [] }) // replay: 0 XP
  await a.syncNow()
  assert.equal(server.profile(USER_A).activities, 2)
  assert.deepEqual(server.profile(USER_A).plays, { 'sky-runner': 1, 'skyward-explorer': 1 })
  assert.equal(server.profile(USER_A).gameXp['skyward-explorer'], 8)
  a.store.close()
})

test('live adapter refuses PENDING policies, the fixture, and missing server functions', async () => {
  const { PRODUCT_POLICY, PolicyPendingError } = await import('../xpRules.js')
  const server = createFakeServer().adapterServer()
  assert.throws(() => createLiveAdapter({ policy: PRODUCT_POLICY, server }), PolicyPendingError)
  assert.throws(() => createLiveAdapter({ policy: TEST_FIXTURE_POLICY, server }), /fixture/)
  assert.throws(() => createLiveAdapter({ policy: LIVE_TEST_POLICY, server: {} }), /injected at release/)
})

test('guest live adapter: rounds are local-only and nothing is ever submitted', async () => {
  const server = createFakeServer()
  server.signOut()
  const g = createLiveAdapter({ policy: LIVE_TEST_POLICY, server: server.adapterServer(), factory: freshFactory() })
  await g.ready()
  const r = await playFlight(g, { primary: [true], checks: [] })
  assert.equal(r.round.sync, 'local-only')
  await g.syncNow()
  assert.equal(server.calls.rpc, 0)
  g.store.close()
})
