/**
 * IndexedDB schema for Phase 2A learning progress (design 2.2, 2.2.1).
 *
 * Live database:    bulbuli-learning-v1          (used only after the release migration)
 * Preview database: bulbuli-learning-preview-v1  (dev preview only)
 *
 * Schema version 1, six object stores:
 *   events   [playerId, eventKey]   one row per rewardable event ever recorded
 *   rounds   [playerId, roundKey]   flights and visits; also the server outbox
 *   totals   playerId               { learningXp } (+ guest-claim high-water marks on 'guest', release)
 *   records  [playerId, gameId]     game record: band, stars, stations, journal, resume state
 *   claims   claimId                guest XP claims (release only, design 1.9)
 *   meta     name                   { name: 'deviceId', value }
 *
 * Upgrades are additive only (switch on oldVersion, falling through). Open connections close
 * themselves on `versionchange`; a blocked upgrade or a VersionError means no commits (Practice mode).
 */

export const LIVE_DB_NAME = 'bulbuli-learning-v1'
export const PREVIEW_DB_NAME = 'bulbuli-learning-preview-v1'
export const SCHEMA_VERSION = 1
export const STORES = Object.freeze(['events', 'rounds', 'totals', 'records', 'claims', 'meta'])
export const OPEN_TIMEOUT_MS = 5000

function newDeviceId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** Runs inside `onupgradeneeded`. Each case falls through to the next (additive steps only). */
export function upgradeSchema(db, oldVersion, transaction) {
  switch (oldVersion) {
    case 0: {
      db.createObjectStore('events', { keyPath: ['playerId', 'eventKey'] })
      const rounds = db.createObjectStore('rounds', { keyPath: ['playerId', 'roundKey'] })
      rounds.createIndex('byEventId', 'eventId', { unique: true })
      rounds.createIndex('bySync', 'sync')
      db.createObjectStore('totals', { keyPath: 'playerId' })
      db.createObjectStore('records', { keyPath: ['playerId', 'gameId'] })
      const claims = db.createObjectStore('claims', { keyPath: 'claimId' })
      claims.createIndex('byUser', 'userId')
      claims.createIndex('bySubmit', 'submitStatus')
      claims.createIndex('byVerify', 'verifyStatus')
      claims.createIndex('byCreated', 'createdAt')
      const meta = db.createObjectStore('meta', { keyPath: 'name' })
      meta.put({ name: 'deviceId', value: newDeviceId(), createdAt: new Date().toISOString() })
    }
    // falls through: future versions add `case 1:` here (additive only)
    default:
      break
  }
  return transaction
}

export class PracticeModeError extends Error {
  constructor(reason, cause) {
    super(`Learning progress can't be saved in this browser right now (${reason}).`)
    this.name = 'PracticeModeError'
    this.reason = reason
    this.cause = cause
  }
}

/**
 * Opens (and if needed creates) a learning database.
 * Resolves to an IDBDatabase, or rejects with PracticeModeError: IndexedDB missing, open error,
 * VersionError (older app, newer database), blocked upgrade, or timeout. There is no fallback store.
 *
 * @param {object} opts
 * @param {IDBFactory} [opts.factory=globalThis.indexedDB]
 * @param {string} opts.name
 * @param {number} [opts.version=SCHEMA_VERSION]
 * @param {number} [opts.timeoutMs]
 * @param {() => void} [opts.onVersionChange]  called after this connection closes for an upgrade elsewhere
 */
export function openLearningDb({ factory = globalThis.indexedDB, name, version = SCHEMA_VERSION, timeoutMs = OPEN_TIMEOUT_MS, onVersionChange } = {}) {
  return new Promise((resolve, reject) => {
    if (!factory || typeof factory.open !== 'function') {
      reject(new PracticeModeError('indexeddb-unavailable'))
      return
    }
    let settled = false
    const finish = (fn, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn(value)
    }
    const timer = setTimeout(() => finish(reject, new PracticeModeError('open-timeout')), timeoutMs)
    let request
    try {
      request = factory.open(name, version)
    } catch (error) {
      finish(reject, new PracticeModeError('open-threw', error))
      return
    }
    request.onupgradeneeded = (event) => upgradeSchema(request.result, event.oldVersion, request.transaction)
    request.onblocked = () => finish(reject, new PracticeModeError('upgrade-blocked'))
    request.onerror = () => {
      const errorName = request.error?.name
      finish(reject, new PracticeModeError(errorName === 'VersionError' ? 'version-error' : 'open-error', request.error))
    }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => {
        db.close()
        onVersionChange?.()
      }
      if (settled) {
        db.close() // timed out meanwhile
        return
      }
      finish(resolve, db)
    }
  })
}
