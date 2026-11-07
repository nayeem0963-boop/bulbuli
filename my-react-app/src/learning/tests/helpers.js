/**
 * Test helpers for the Phase 2A learning foundation (L2: in-memory IndexedDB + fake server).
 * These prove transaction logic, NOT real-browser behaviour (design 1.6, test levels).
 */
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { openLearningDb, PREVIEW_DB_NAME } from '../store/schema.js'
import { TEST_FIXTURE_POLICY } from '../policyFixture.js'

export const POLICY = TEST_FIXTURE_POLICY
export const USER_A = '11111111-1111-4111-8111-111111111111'
export const USER_B = '22222222-2222-4222-8222-222222222222'

/** A brand-new, empty IndexedDB "browser profile". */
export const freshFactory = () => new IDBFactory()

/** Opens N independent connections to the same database (= N tabs). */
export async function openTabs(factory, n = 2, name = PREVIEW_DB_NAME) {
  const dbs = []
  for (let i = 0; i < n; i += 1) dbs.push(await openLearningDb({ factory, name }))
  return dbs
}

const req = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

/** Full dump of every store, for byte-level "nothing changed" comparisons. */
export async function dumpDb(db) {
  const out = {}
  const stores = Array.from(db.objectStoreNames)
  const tx = db.transaction(stores, 'readonly')
  for (const name of stores) out[name] = await req(tx.objectStore(name).getAll())
  return JSON.parse(JSON.stringify(out))
}

export async function getTotals(db, playerId) {
  const tx = db.transaction(['totals'], 'readonly')
  return (await req(tx.objectStore('totals').get(playerId)))?.learningXp ?? 0
}

export async function getRound(db, playerId, roundKey) {
  const tx = db.transaction(['rounds'], 'readonly')
  return req(tx.objectStore('rounds').get([playerId, roundKey]))
}

export async function getEvents(db, playerId) {
  const tx = db.transaction(['events'], 'readonly')
  return (await req(tx.objectStore('events').getAll())).filter((e) => e.playerId === playerId)
}

export async function putRaw(db, store, value) {
  const tx = db.transaction([store], 'readwrite')
  tx.objectStore(store).put(value)
  await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error) })
}

/**
 * A fake Supabase backend reproducing the verified award_xp() semantics (design 5): insert the event
 * id if new (conflict on id only, whoever owns it), counters +1 only on insert, awarded 0 on a
 * duplicate; plus the RLS-filtered SELECT on xp_events (own rows only).
 */
export function createFakeServer() {
  const events = new Map() // id -> { user_id, game_id, amount }
  const profiles = new Map() // user -> { xp, activities, plays: {game: n} }
  let session = null
  const calls = { rpc: 0, select: 0 }
  const faults = { network: 0, invalid: false, ownershipUnavailable: 0 }
  const profile = (user) => {
    if (!profiles.has(user)) profiles.set(user, { xp: 0, activities: 0, plays: {}, gameXp: {} })
    return profiles.get(user)
  }
  return {
    calls,
    faults,
    events,
    profile,
    signIn(user) { session = user },
    signOut() { session = null },
    /** what award_xp(p_game_id, p_amount, p_event_id) does for the signed-in user */
    awardXp({ gameId, amount, eventId }) {
      calls.rpc += 1
      if (!session) throw new Error('not authenticated')
      if (!Number.isInteger(amount) || amount < 1 || amount > 500) return { error: { code: '22023' } }
      if (events.has(eventId)) return { awarded: 0 }
      events.set(eventId, { user_id: session, game_id: gameId, amount })
      const p = profile(session)
      p.xp += amount
      p.activities += 1
      p.plays[gameId] = (p.plays[gameId] ?? 0) + 1
      p.gameXp[gameId] = (p.gameXp[gameId] ?? 0) + amount
      return { awarded: amount }
    },
    /** the adapter-facing server object (what the release wiring would inject) */
    adapterServer() {
      return {
        getSessionUserId: () => session,
        submit: async ({ eventId, gameId, amount }) => {
          if (faults.network > 0) { faults.network -= 1; throw new Error('network down') }
          if (faults.invalid) { calls.rpc += 1; return { kind: 'invalid', code: '22023' } }
          const result = this.awardXp({ gameId, amount, eventId })
          if (result.error) return { kind: 'invalid', code: result.error.code }
          return { kind: 'awarded', awarded: result.awarded }
        },
        checkOwnership: async ({ eventId }) => {
          calls.select += 1
          if (faults.ownershipUnavailable > 0) { faults.ownershipUnavailable -= 1; return { kind: 'unavailable', message: 'timeout' } }
          const row = events.get(eventId)
          return row && row.user_id === session ? { kind: 'owned' } : { kind: 'not-visible' }
        },
      }
    },
  }
}

/** Plays a whole Sky Science flight through an adapter. answers: { primary: bool[], returns: {index: bool}, checks: bool[] } */
export async function playFlight(adapter, { missionId = 'sky-watcher', band = '7-8', primary, returns = {}, checks }) {
  const start = await adapter.sky.startFlight({ missionId, band, primaryCount: primary.length, quickCheckCount: checks.length })
  if (!start.ok) return start
  const { flightKey } = start
  for (let i = 0; i < primary.length; i += 1) {
    await adapter.sky.recordAnswer(flightKey, { slot: 'primary', index: i, objectiveId: `${missionId}.obj${i}`, itemId: `${missionId}.p${i}`, correct: primary[i] })
    if (!primary[i] && i in returns) {
      await adapter.sky.recordAnswer(flightKey, { slot: 'return', objectiveId: `${missionId}.obj${i}`, itemId: `${missionId}.r${i}`, correct: returns[i] })
    }
  }
  for (let i = 0; i < checks.length; i += 1) {
    await adapter.sky.recordAnswer(flightKey, { slot: 'quickcheck', index: i, objectiveId: `${missionId}.qc`, itemId: `${missionId}.q${i}`, correct: checks[i] })
  }
  const committed = await adapter.sky.commitFlight(flightKey)
  return { ...committed, flightKey }
}

/** Completes one station in an open visit: observe, investigate, explain (wrong × n, then right), record. */
export async function playStation(adapter, visitKey, expedition, station, { wrongFirst = 0 } = {}) {
  await adapter.world.saveStationProgress(visitKey, expedition, station, 'observe')
  await adapter.world.saveStationProgress(visitKey, expedition, station, 'investigate')
  for (let i = 0; i < wrongFirst; i += 1) await adapter.world.recordExplainAttempt(visitKey, expedition, station, `wrong${i}`, false)
  await adapter.world.recordExplainAttempt(visitKey, expedition, station, 'right', true)
  return adapter.world.completeStation(visitKey, expedition, station)
}

export const reportAnswers = (correct) => Array.from({ length: 5 }, (_, i) => ({ itemId: `rep${i}`, correct: i < correct }))
export { PREVIEW_DB_NAME }
