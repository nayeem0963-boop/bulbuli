// L2: cross-tab concurrency, fail-closed (design 2.5, X1–X6). Two IndexedDB connections stand in
// for two tabs. Correctness comes from IndexedDB transaction serialisation, not Web Locks, so each
// scenario runs with a Web Locks stand-in present and absent.
import test from 'node:test'
import assert from 'node:assert/strict'
import * as tx from '../store/transactions.js'
import { withOptionalLock } from '../adapters/core.js'
import { createPreviewAdapter, PREVIEW_PLAYER_ID } from '../adapters/preview.js'
import { dumpDb, freshFactory, getEvents, getTotals, openTabs, POLICY, putRaw } from './helpers.js'

const P = PREVIEW_PLAYER_ID

/** A minimal Web Locks stand-in (exclusive, FIFO). */
function fakeLocks() {
  const tails = new Map()
  let used = 0
  return {
    get used() { return used },
    request(name, fn) {
      used += 1
      const prev = tails.get(name) ?? Promise.resolve()
      const run = prev.then(() => fn())
      tails.set(name, run.catch(() => {}))
      return run
    },
  }
}

const variants = [['Web Locks available', fakeLocks], ['Web Locks UNAVAILABLE', () => null]]

async function preparedFlight(db, flightKey) {
  await tx.startFlight(db, { playerId: P, flightKey, missionId: 'sky-watcher', band: '7-8', primaryCount: 1, quickCheckCount: 0 })
  await tx.recordAnswer(db, { playerId: P, flightKey, answer: { slot: 'primary', index: 0, objectiveId: 'o0', itemId: 'p0', correct: true } })
}

for (const [label, makeLocks] of variants) {
  test(`X1/X2 (${label}): two tabs commit the same flight concurrently → one round, one set of events, XP once`, async () => {
    const [tab1, tab2] = await openTabs(freshFactory())
    await preparedFlight(tab1, 'sky:flight:x')
    const locks = makeLocks()
    const nav = locks ? { locks } : {}
    const commit = (db) => withOptionalLock('bulbuli-learning', () => tx.commitFlight(db, { playerId: P, flightKey: 'sky:flight:x', policy: POLICY, account: null }), nav)
    const [a, b] = await Promise.all([commit(tab1), commit(tab2)])
    assert.equal([a, b].filter((r) => r.alreadyCommitted).length, 1)
    assert.equal(await getTotals(tab1, P), 16)
    assert.equal((await dumpDb(tab1)).rounds.length, 1)
    assert.equal((await getEvents(tab1, P)).length, 4) // gate + 3 tiers
    if (locks) assert.equal(locks.used, 2)
  })

  test(`X3 (${label}): two tabs complete the same station in DIFFERENT open visits → one station event, XP once`, async () => {
    const [tab1, tab2] = await openTabs(freshFactory())
    await tx.startVisit(tab1, { playerId: P, expedition: 'sahara', visitKey: 'we:visit:v1', account: null })
    // a second open visit (as two tabs could hold briefly) inserted directly
    await putRaw(tab1, 'rounds', { playerId: P, roundKey: 'we:visit:v2', gameId: 'skyward-explorer', kind: 'visit', expedition: 'sahara', status: 'open', xp: 0, rewards: [], createdAt: new Date().toISOString() })
    for (const step of ['observe', 'investigate']) await tx.saveStationProgress(tab1, { playerId: P, visitKey: 'we:visit:v1', expedition: 'sahara', station: 1, step })
    await tx.recordExplainAttempt(tab1, { playerId: P, visitKey: 'we:visit:v1', expedition: 'sahara', station: 1, choice: 'r', correct: true })
    const run = (db, visitKey) => tx.completeStation(db, { playerId: P, visitKey, expedition: 'sahara', station: 1, policy: POLICY })
    const results = await Promise.all([run(tab1, 'we:visit:v1'), run(tab2, 'we:visit:v2')])
    assert.equal(results.filter((r) => r.ok && r.xp === 4).length, 1)
    assert.equal(await getTotals(tab1, P), 4)
    const rounds = (await dumpDb(tab1)).rounds
    assert.equal(rounds.reduce((sum, r) => sum + r.xp, 0), 4, 'the XP sits in exactly one visit')
  })

  test(`X4 (${label}): two tabs seal the same open visit → one seal, one hand-off`, async () => {
    const factory = freshFactory()
    const t1 = createPreviewAdapter({ factory })
    const t2 = createPreviewAdapter({ factory })
    await t1.ready(); await t2.ready()
    const v = (await t1.world.startVisit('amazon')).visit.roundKey
    for (const step of ['observe', 'investigate']) await t1.world.saveStationProgress(v, 'amazon', 1, step)
    await t1.world.recordExplainAttempt(v, 'amazon', 1, 'r', true)
    await t1.world.completeStation(v, 'amazon', 1)
    const [x, y] = await Promise.all([t1.world.sealVisit(v), t2.world.sealVisit(v)])
    assert.equal([x, y].filter((r) => r.alreadySealed).length, 1)
    assert.equal(t1.wouldBeAwards().length + t2.wouldBeAwards().length, 1)
    t1.store.close(); t2.store.close()
  })
}

test('X5: IndexedDB cannot be opened → Practice mode: every action refused, nothing written, nothing handed off', async () => {
  const broken = { open() { throw new Error('SecurityError: blocked by settings') } }
  const a = createPreviewAdapter({ factory: broken })
  assert.equal(await a.ready(), 'practice')
  assert.equal(a.store.getSnapshot().practice, true)
  const s = await a.sky.startFlight({ missionId: 'sky-watcher', band: '7-8', primaryCount: 1, quickCheckCount: 0 })
  assert.deepEqual(s, { ok: false, reason: 'practice-mode' })
  assert.deepEqual(await a.world.startVisit('sahara'), { ok: false, reason: 'practice-mode' })
  assert.deepEqual(a.wouldBeAwards(), [])
  a.store.close()
})

test('X6: a transaction aborted mid-way changes nothing; the retry succeeds exactly once', async () => {
  const [db] = await openTabs(freshFactory(), 1)
  await preparedFlight(db, 'sky:flight:y')
  const before = await dumpDb(db)
  await assert.rejects(tx.commitFlight(db, { playerId: P, flightKey: 'sky:flight:y', policy: POLICY, account: null }, { inject: 'abort-before-commit' }))
  assert.deepEqual(await dumpDb(db), before)
  const ok = await tx.commitFlight(db, { playerId: P, flightKey: 'sky:flight:y', policy: POLICY, account: null })
  assert.equal(ok.ok, true)
  assert.equal(await getTotals(db, P), 16)
})
