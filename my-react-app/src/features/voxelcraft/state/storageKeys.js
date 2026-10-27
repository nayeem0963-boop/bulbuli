/**
 * Every localStorage key VoxelCraft uses, in one place. All of them carry the
 * `bulbuli_voxelcraft_` prefix, so they can't collide with Bulbuli's own data
 * (`bulbuli.theme`, auth, favourites, game progress…).
 */
export const STORAGE_PREFIX = 'bulbuli_voxelcraft_'

export const STORAGE_KEYS = Object.freeze({
  /** Player progress, gems, unlocks, votes, published levels, contests, sim settings. */
  save: `${STORAGE_PREFIX}save_v1`,
  /** The level open in the Build Studio (work in progress). */
  studio: `${STORAGE_PREFIX}studio_v1`,
  /** Sound effects muted ('1' / '0'). */
  sfxMuted: `${STORAGE_PREFIX}sfx_muted`,
  /** Dev / Test Mode opted in with ?devtools=1 ('1'). */
  devtools: `${STORAGE_PREFIX}devtools`,
  /** Set once the standalone build's keys have been looked at (see below). */
  migrated: `${STORAGE_PREFIX}migrated`,
})

/**
 * The standalone VoxelCraft Studio app used un-prefixed keys. It ran on the same dev origin
 * (localhost:5173), so a player's progress from it is copied over once. The old keys are left
 * alone (read, never written), and the copy never repeats: after "Reset progress" the old save
 * can't come back.
 */
const STANDALONE_KEYS = {
  'voxelcraft:save:v2': STORAGE_KEYS.save,
  'voxelcraft:studio:v1': STORAGE_KEYS.studio,
  'voxelcraft:sfx-muted': STORAGE_KEYS.sfxMuted,
  'voxelcraft:devtools': STORAGE_KEYS.devtools,
}

const done = new WeakSet()

/** Safe to call often: does its work once per storage object, and only on the first visit. */
export function migrateStandaloneStorage(store) {
  if (!store || done.has(store)) return
  done.add(store)
  try {
    if (store.getItem(STORAGE_KEYS.migrated)) return
    for (const [from, to] of Object.entries(STANDALONE_KEYS)) {
      const value = store.getItem(from)
      if (value !== null && store.getItem(to) === null) store.setItem(to, value)
    }
    store.setItem(STORAGE_KEYS.migrated, '1')
  } catch {
    // storage blocked or full: play on without the old progress
  }
}

/** localStorage when it's usable (not in Node tests or blocked private modes), migrated. */
export function getStorage() {
  try {
    const store = typeof localStorage === 'undefined' ? null : localStorage
    migrateStandaloneStorage(store)
    return store
  } catch {
    return null
  }
}
