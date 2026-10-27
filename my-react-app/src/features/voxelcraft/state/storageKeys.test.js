import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createInitialGameState } from './gameReducer.js'
import { clearSave, loadSave, selectSaveData, writeSave } from './saveGame.js'
import { STORAGE_KEYS, STORAGE_PREFIX, migrateStandaloneStorage } from './storageKeys.js'

function memoryStorage(entries = {}) {
  const m = new Map(Object.entries(entries))
  return {
    map: m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  }
}

function withStorage(store, fn) {
  globalThis.localStorage = store
  try {
    return fn()
  } finally {
    delete globalThis.localStorage
  }
}

test('every key is namespaced for Bulbuli', () => {
  for (const key of Object.values(STORAGE_KEYS)) assert.ok(key.startsWith(STORAGE_PREFIX), key)
  assert.equal(STORAGE_KEYS.save, 'bulbuli_voxelcraft_save_v1')
})

test('saving writes only bulbuli_voxelcraft_* keys and leaves other app data alone', () => {
  const store = memoryStorage({ 'bulbuli.theme': 'dark', 'sb-auth-token': 'x' })
  withStorage(store, () => {
    assert.equal(writeSave(selectSaveData(createInitialGameState())), 'saved')
    clearSave()
  })
  const keys = [...store.map.keys()]
  assert.deepEqual(keys.filter((k) => !k.startsWith(STORAGE_PREFIX)).sort(), ['bulbuli.theme', 'sb-auth-token'])
  assert.equal(store.getItem('bulbuli.theme'), 'dark', 'reset never touches host data')
})

test('standalone keys are copied once, without overwriting, and old keys are left as they were', () => {
  const store = memoryStorage({
    'voxelcraft:save:v2': '{"old":1}',
    'voxelcraft:sfx-muted': '1',
    [STORAGE_KEYS.studio]: '{"newer":1}',
    'voxelcraft:studio:v1': '{"older":1}',
  })
  migrateStandaloneStorage(store)
  assert.equal(store.getItem(STORAGE_KEYS.save), '{"old":1}')
  assert.equal(store.getItem(STORAGE_KEYS.sfxMuted), '1')
  assert.equal(store.getItem(STORAGE_KEYS.studio), '{"newer":1}', 'an existing new key wins')
  assert.equal(store.getItem('voxelcraft:save:v2'), '{"old":1}', 'old key kept for the standalone app')
  assert.equal(store.getItem(STORAGE_KEYS.migrated), '1')
})

test('a real standalone save loads in the integrated app, and Reset can’t bring it back', () => {
  const old = selectSaveData(run(createInitialGameState()))
  const store = memoryStorage({ 'voxelcraft:save:v2': JSON.stringify({ ...old, version: 2 }) })
  withStorage(store, () => {
    const loaded = loadSave('NeonBuilder')
    assert.ok(loaded, 'migrated save loads')
    assert.equal(loaded.player.gems, old.player.gems)
    clearSave()
  })
  // a later visit (new page load = new storage object) must not re-copy the old save
  const again = memoryStorage(Object.fromEntries(store.map))
  withStorage(again, () => assert.equal(loadSave('NeonBuilder'), null))
})

function run(state) {
  return { ...state, player: { ...state.player, gems: 4321 } }
}
