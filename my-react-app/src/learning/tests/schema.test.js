// L2: IndexedDB schema and upgrade strategy (design 2.2.1, tests U-DB1–U-DB4).
import test from 'node:test'
import assert from 'node:assert/strict'
import { freshFactory } from './helpers.js'
import { openLearningDb, PracticeModeError, PREVIEW_DB_NAME, SCHEMA_VERSION, STORES } from '../store/schema.js'

const req = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })

test('U-DB1: a fresh open creates exactly the six stores with the designed keys and indexes', async () => {
  const db = await openLearningDb({ factory: freshFactory(), name: PREVIEW_DB_NAME })
  assert.equal(db.version, SCHEMA_VERSION)
  assert.deepEqual(Array.from(db.objectStoreNames).sort(), [...STORES].sort())
  const tx = db.transaction(STORES, 'readonly')
  const keyPath = (s) => tx.objectStore(s).keyPath
  assert.deepEqual(keyPath('events'), ['playerId', 'eventKey'])
  assert.deepEqual(keyPath('rounds'), ['playerId', 'roundKey'])
  assert.equal(keyPath('totals'), 'playerId')
  assert.deepEqual(keyPath('records'), ['playerId', 'gameId'])
  assert.equal(keyPath('claims'), 'claimId')
  assert.equal(keyPath('meta'), 'name')
  assert.deepEqual(Array.from(tx.objectStore('claims').indexNames).sort(), ['byCreated', 'bySubmit', 'byUser', 'byVerify'])
  assert.deepEqual(Array.from(tx.objectStore('rounds').indexNames).sort(), ['byEventId', 'bySync'])
  db.close()
})

test('U-DB2: meta.deviceId is created once and never changes on reopen', async () => {
  const factory = freshFactory()
  const read = async () => {
    const db = await openLearningDb({ factory, name: PREVIEW_DB_NAME })
    const value = (await req(db.transaction(['meta']).objectStore('meta').get('deviceId'))).value
    db.close()
    return value
  }
  const first = await read()
  assert.match(first, /^[0-9a-f-]{36}$/)
  assert.equal(await read(), first)
  assert.equal(await read(), first)
})

test('U-DB3: an upgrade elsewhere closes this connection (onversionchange) and no commit runs during it', async () => {
  const factory = freshFactory()
  let notified = false
  const v1 = await openLearningDb({ factory, name: PREVIEW_DB_NAME, onVersionChange: () => { notified = true } })
  const upgrade = factory.open(PREVIEW_DB_NAME, SCHEMA_VERSION + 1)
  await new Promise((resolve, reject) => { upgrade.onsuccess = resolve; upgrade.onerror = () => reject(upgrade.error) })
  assert.equal(notified, true)
  assert.throws(() => v1.transaction(['events'], 'readwrite'), /closed|InvalidStateError/i)
  upgrade.result.close()
})

test('U-DB4: an older app opening a newer database → Practice mode (VersionError), nothing written', async () => {
  const factory = freshFactory()
  const newer = factory.open(PREVIEW_DB_NAME, SCHEMA_VERSION + 5)
  await new Promise((resolve) => { newer.onupgradeneeded = () => {}; newer.onsuccess = resolve })
  newer.result.close()
  await assert.rejects(openLearningDb({ factory, name: PREVIEW_DB_NAME }), (error) => error instanceof PracticeModeError && error.reason === 'version-error')
})

test('IndexedDB missing → Practice mode; open timeout → Practice mode', async () => {
  await assert.rejects(openLearningDb({ factory: null, name: PREVIEW_DB_NAME }), (e) => e.reason === 'indexeddb-unavailable')
  const hanging = { open: () => ({}) } // never fires any event
  await assert.rejects(openLearningDb({ factory: hanging, name: PREVIEW_DB_NAME, timeoutMs: 30 }), (e) => e.reason === 'open-timeout')
})
