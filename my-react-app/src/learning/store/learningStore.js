/**
 * In-memory snapshot of committed learning progress for React (design 2.8).
 *
 * - The snapshot is only ever re-read FROM IndexedDB (readonly transaction) after a write
 *   transaction has completed. It is never written back, and nothing is shown optimistically.
 * - Other tabs are told through BroadcastChannel and re-read; where BroadcastChannel is missing,
 *   tabs re-read on focus / visibilitychange.
 * - useLearningSnapshot(store) binds it to React with useSyncExternalStore.
 */
import { useSyncExternalStore } from 'react'
import { SKY_GAME_ID, WORLD_GAME_ID } from './transactions.js'

const req = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

export const EMPTY_SNAPSHOT = Object.freeze({ ready: false, practice: false, learningXp: 0, sky: null, world: null, unfinishedVisits: [], version: 0 })

/** Reads the committed state for one player in one readonly transaction. */
export async function readSnapshot(db, playerId) {
  const tx = db.transaction(['totals', 'records', 'rounds'], 'readonly')
  const [totals, sky, world, rounds] = await Promise.all([
    req(tx.objectStore('totals').get(playerId)),
    req(tx.objectStore('records').get([playerId, SKY_GAME_ID])),
    req(tx.objectStore('records').get([playerId, WORLD_GAME_ID])),
    req(tx.objectStore('rounds').getAll(IDBKeyRange.bound([playerId, ''], [playerId, '￿']))),
  ])
  return {
    learningXp: totals?.learningXp ?? 0,
    sky: sky ?? null,
    world: world ?? null,
    unfinishedVisits: rounds.filter((r) => r.kind === 'visit' && r.status === 'open'),
    rounds,
  }
}

/**
 * @param {object} opts
 * @param {() => Promise<object>} opts.read   reads a fresh snapshot (readSnapshot bound to the db)
 * @param {string} [opts.channelName]          BroadcastChannel name (live vs preview differ)
 */
export function createLearningStore({ read, channelName }) {
  let snapshot = EMPTY_SNAPSHOT
  const listeners = new Set()
  let channel = null
  const emit = () => listeners.forEach((listener) => listener())

  async function refresh() {
    const fresh = await read()
    snapshot = Object.freeze({ ...fresh, ready: true, practice: false, version: snapshot.version + 1 })
    emit()
    return snapshot
  }

  function setPractice(reason) {
    snapshot = Object.freeze({ ...EMPTY_SNAPSHOT, ready: true, practice: true, practiceReason: reason, version: snapshot.version + 1 })
    emit()
  }

  /** Call after a write transaction COMPLETED: re-read here and tell other tabs. */
  async function committed() {
    await refresh()
    try { channel?.postMessage({ type: 'committed' }) } catch { /* channel closed */ }
  }

  const onExternal = () => { refresh().catch(() => {}) }
  if (channelName && typeof BroadcastChannel === 'function') {
    channel = new BroadcastChannel(channelName)
    channel.onmessage = (event) => { if (event.data?.type === 'committed') onExternal() }
    channel.unref?.() // Node only: an idle channel must not keep a test process alive
  }
  const hasWindow = typeof window !== 'undefined' && typeof window.addEventListener === 'function'
  if (hasWindow && !channel) {
    window.addEventListener('focus', onExternal)
    document.addEventListener('visibilitychange', onExternal)
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => snapshot,
    refresh,
    committed,
    setPractice,
    close() {
      channel?.close()
      if (hasWindow && !channel) {
        window.removeEventListener('focus', onExternal)
        document.removeEventListener('visibilitychange', onExternal)
      }
      listeners.clear()
    },
  }
}

export function useLearningSnapshot(store) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
