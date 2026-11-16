/**
 * Shared adapter implementation (design 1.6, 2). The preview and live adapters are thin wrappers
 * that decide: which database, which player, whether there is an account, and where sealed
 * rounds go (a recorder in preview; the injected server sink at release).
 *
 * Games call ONLY these methods (through useLearningAdapter()); they never touch IndexedDB, XP,
 * Supabase or useGameProgress directly.
 */
import * as tx from '../store/transactions.js'
import { openLearningDb, PracticeModeError } from '../store/schema.js'
import { createLearningStore, readSnapshot } from '../store/learningStore.js'
import { newRoundId, roundKeys } from '../eventKeys.js'

const PRACTICE = Object.freeze({ ok: false, reason: 'practice-mode' })

/** Runs fn under a Web Lock when available; otherwise just runs it. Correctness never depends on it. */
export async function withOptionalLock(name, fn, nav = globalThis.navigator) {
  if (nav?.locks?.request) return nav.locks.request(name, fn)
  return fn()
}

/**
 * @param {object} cfg
 * @param {'preview'|'review'|'live'} cfg.kind
 * @param {IDBFactory} cfg.factory
 * @param {string} cfg.dbName
 * @param {object} cfg.policy                 resolved XP policy
 * @param {() => string} cfg.getPlayerId
 * @param {() => ({userId: string}|null)} cfg.getAccount   null = no server sync (guest / preview)
 * @param {(round) => void} [cfg.onSealed]     informational hook (preview "would-be awards" panel)
 * @param {object} [cfg.server]                { submit, checkOwnership, getSessionUserId } (live only)
 * @param {string} cfg.decoderPath
 * @param {string} cfg.channelName
 * @param {number} [cfg.openTimeoutMs]
 */
export function createAdapterCore(cfg) {
  let db = null
  let readyPromise = null
  let mode = 'starting'
  const store = createLearningStore({ read: () => readSnapshot(db, cfg.getPlayerId()), channelName: cfg.channelName })

  function ready() {
    if (!readyPromise) {
      readyPromise = openLearningDb({ factory: cfg.factory, name: cfg.dbName, timeoutMs: cfg.openTimeoutMs, onVersionChange: () => { mode = 'practice'; db = null; store.setPractice('updated-elsewhere') } })
        .then(async (opened) => {
          db = opened
          mode = 'ready'
          await store.refresh()
          return mode
        })
        .catch((error) => {
          mode = 'practice'
          store.setPractice(error instanceof PracticeModeError ? error.reason : 'open-failed')
          return mode
        })
    }
    return readyPromise
  }

  /** Runs a transaction; after it COMMITS, refreshes the snapshot and notifies other tabs. */
  async function write(fn, args, opts) {
    await ready()
    if (mode !== 'ready' || !db) return PRACTICE
    const result = await fn(db, { playerId: cfg.getPlayerId(), ...args }, opts)
    if (result?.ok) {
      // the transaction has committed: report sealed rounds first, so listeners that re-render
      // on the snapshot refresh below already see them (preview "would-be awards" panel)
      const sealedRounds = [result.round, ...(result.sealed ?? [])].filter((r) => r?.status === 'sealed' && !result.alreadyCommitted && !result.alreadySealed)
      sealedRounds.forEach((round) => cfg.onSealed?.(round))
      await store.committed()
    }
    return result
  }

  const account = () => cfg.getAccount()

  return {
    kind: cfg.kind,
    decoderPath: cfg.decoderPath,
    store,
    ready,
    get mode() { return mode },
    playerId: () => cfg.getPlayerId(),
    /** test/support use only */
    _db: () => db,

    sky: {
      setBand: (band, opts) => write(tx.setSkyBand, { band }, opts),
      startFlight: ({ missionId, band, primaryCount, quickCheckCount, plan }, opts) =>
        write(tx.startFlight, { flightKey: roundKeys.flight(newRoundId()), missionId, band, primaryCount, quickCheckCount, plan }, opts),
      recordAnswer: (flightKey, answer, opts) => write(tx.recordAnswer, { flightKey, answer }, opts),
      commitFlight: (flightKey, opts) => write(tx.commitFlight, { flightKey, policy: cfg.policy, account: account() }, opts),
      discardFlight: (flightKey, opts) => write(tx.discardFlight, { flightKey }, opts),
    },

    world: {
      startVisit: (expedition, opts) => write(tx.startVisit, { expedition, visitKey: roundKeys.visit(newRoundId()), account: account() }, opts),
      joinVisit: (expedition, opts) => write(tx.joinVisit, { expedition }, opts),
      saveStationProgress: (visitKey, expedition, station, step, opts) => write(tx.saveStationProgress, { visitKey, expedition, station, step }, opts),
      recordExplainAttempt: (visitKey, expedition, station, choice, correct, opts) =>
        write(tx.recordExplainAttempt, { visitKey, expedition, station, choice, correct }, opts),
      completeStation: (visitKey, expedition, station, opts) => write(tx.completeStation, { visitKey, expedition, station, policy: cfg.policy }, opts),
      fileReport: (visitKey, expedition, set, answers, opts) =>
        write(tx.fileReport, { visitKey, expedition, set, answers, policy: cfg.policy, account: account() }, opts),
      sealVisit: (visitKey, opts) => write(tx.sealVisit, { visitKey, account: account() }, opts),
      /** For the "Unfinished visit" banner (design 4.4.1): committed data only. */
      unfinishedVisits: (expedition) => store.getSnapshot().unfinishedVisits.filter((v) => v.expedition === expedition),
    },

    /** Server sync (design 2.4, 2.7). A no-op without cfg.server (preview). */
    syncNow: () => (cfg.server ? syncPending({ getDb: () => db, ready, store, server: cfg.server, playerId: cfg.getPlayerId() }) : Promise.resolve({ handedOff: 0, checked: 0 })),
  }
}

/**
 * Hands sealed 'pending' rounds to the server and classifies replies; re-checks 'verifying'
 * rounds (design 2.7). Account-bound: only rounds whose userId equals the CURRENT session user.
 * Local totals are never changed here.
 *
 * server.submit({eventId, userId, gameId, amount}) resolves to
 *   { kind: 'awarded', awarded: number } | { kind: 'network-error', message } | { kind: 'invalid', code }
 * server.checkOwnership({eventId}) resolves to { kind: 'owned' } | { kind: 'not-visible' } | { kind: 'unavailable', message }
 */
export async function syncPending({ getDb, ready, store, server, playerId, lockName = 'bulbuli-learning-sync' }) {
  await ready()
  const db = getDb()
  if (!db) return { handedOff: 0, checked: 0, skipped: 'practice-mode' }
  return withOptionalLock(`${lockName}:${playerId}`, async () => {
    const sessionUserId = server.getSessionUserId()
    const rounds = await readRounds(db, playerId)
    let handedOff = 0
    let checked = 0
    for (const round of rounds) {
      if (round.status !== 'sealed' || !round.eventId) continue
      if (!tx.SYNC_STATES.includes(round.sync)) continue // unknown state: fail closed, leave it
      if (round.userId !== sessionUserId) continue // never submit under another account
      if (round.sync === 'pending') {
        handedOff += 1
        let reply
        try {
          reply = await server.submit({ eventId: round.eventId, userId: round.userId, gameId: round.gameId, amount: round.xp })
        } catch (error) {
          reply = { kind: 'network-error', message: String(error?.message ?? error) }
        }
        if (reply.kind === 'awarded' && reply.awarded > 0) {
          await tx.markSync(db, { eventId: round.eventId, to: 'done', confirmedBy: 'inserted' })
        } else if (reply.kind === 'awarded') {
          await tx.markSync(db, { eventId: round.eventId, to: 'verifying' })
          checked += await verify(db, server, round.eventId)
        } else if (reply.kind === 'invalid') {
          await tx.markSync(db, { eventId: round.eventId, to: 'rejected', error: { code: reply.code ?? '22023', message: 'rejected by server', stage: 'send' } })
        } else {
          await tx.markSync(db, { eventId: round.eventId, to: 'pending', error: { code: 'network', message: reply.message ?? 'network error', stage: 'send' } })
        }
      } else if (round.sync === 'verifying') {
        checked += await verify(db, server, round.eventId)
      }
    }
    await store.committed()
    return { handedOff, checked }
  })
}

/** Support "Retry check" (design 2.7): re-runs the ownership query for verifying/conflict/rejected. */
export async function retryOwnershipCheck({ db, server, eventId, store }) {
  const n = await verify(db, server, eventId)
  await store?.committed()
  return n
}

async function verify(db, server, eventId) {
  let result
  try {
    result = await server.checkOwnership({ eventId })
  } catch (error) {
    result = { kind: 'unavailable', message: String(error?.message ?? error) }
  }
  const round = await readRoundByEventId(db, eventId)
  if (!round) return 0
  if (result.kind === 'owned') {
    await tx.markSync(db, { eventId, to: 'done', confirmedBy: 'duplicate-owned' })
  } else if (result.kind === 'not-visible') {
    if (round.sync === 'verifying') await tx.markSync(db, { eventId, to: 'conflict', error: { code: 'event-id-owned-elsewhere', message: 'event id exists but is not visible to this learner', stage: 'verify' } })
    else await tx.markSync(db, { eventId, to: round.sync, error: { code: 'still-not-visible', message: 'ownership not confirmed', stage: 'verify' } })
  } else if (round.sync === 'verifying' || round.sync === 'conflict' || round.sync === 'rejected') {
    await tx.markSync(db, { eventId, to: round.sync, error: { code: 'ownership-check-unavailable', message: result.message ?? 'unavailable', stage: 'verify' } })
  }
  return 1
}

const reqP = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

function readRounds(db, playerId) {
  const t = db.transaction(['rounds'], 'readonly')
  return reqP(t.objectStore('rounds').getAll(IDBKeyRange.bound([playerId, ''], [playerId, '￿'])))
}

function readRoundByEventId(db, eventId) {
  const t = db.transaction(['rounds'], 'readonly')
  return reqP(t.objectStore('rounds').index('byEventId').get(eventId))
}
