/**
 * PREVIEW adapter: development only (design 1.6).
 *
 * Guarantees, by construction:
 *   - its own IndexedDB database (bulbuli-learning-preview-v1), never the live one
 *   - a fixed player id ('phase2a-preview') and NO account, even if a real user is signed in:
 *     it never reads any Supabase session; sealed rounds are 'local-only' and never submitted
 *   - no import path to src/lib/xp.js, supabaseClient.js, useGameProgress, useScoreSync, auth,
 *     badges or achievements (checked by the import-graph tests I3/I4)
 *   - "would-be" server awards are only recorded in memory for the preview panel
 *   - refuses to exist in a production build
 *
 * XP policy: the TEST FIXTURE policy (not a product decision), because the real replay rules
 * are unresolved (design 6.2).
 */
import { createAdapterCore } from './core.js'
import { PREVIEW_DB_NAME } from '../store/schema.js'
import { TEST_FIXTURE_POLICY } from '../policyFixture.js'

export const PREVIEW_PLAYER_ID = 'phase2a-preview'
export const PREVIEW_CHANNEL = 'bulbuli-learning-preview'
/** Development decoder: the copy bundled inside `three`, served by the Vite dev server (design 1.8). */
export const PREVIEW_DECODER_PATH = '/node_modules/three/examples/jsm/libs/draco/gltf/'

export class PreviewInProductionError extends Error {
  constructor() {
    super('The Phase 2A preview adapter cannot be used in a production build.')
    this.name = 'PreviewInProductionError'
  }
}

/**
 * @param {object} [opts]
 * @param {IDBFactory} [opts.factory=globalThis.indexedDB]
 * @param {object} [opts.env=import.meta.env]  injectable for tests (I8)
 * @param {number} [opts.openTimeoutMs]
 */
export function createPreviewAdapter({ factory = globalThis.indexedDB, env = import.meta.env, openTimeoutMs } = {}) {
  if (env?.PROD) throw new PreviewInProductionError()
  const wouldBeAwards = []
  const core = createAdapterCore({
    kind: 'preview',
    factory,
    dbName: PREVIEW_DB_NAME,
    policy: TEST_FIXTURE_POLICY,
    getPlayerId: () => PREVIEW_PLAYER_ID,
    getAccount: () => null,
    onSealed: (round) => {
      if (round.xp > 0) wouldBeAwards.push({ roundKey: round.roundKey, gameId: round.gameId, amount: round.xp, at: new Date().toISOString() })
    },
    server: null,
    decoderPath: PREVIEW_DECODER_PATH,
    channelName: PREVIEW_CHANNEL,
    openTimeoutMs,
  })
  return {
    ...core,
    policyIsFixture: true,
    /** What a live adapter WOULD have sent (preview panel). Nothing is sent. */
    wouldBeAwards: () => wouldBeAwards.slice(),
    /** Deletes only the preview database. */
    resetPreviewData: () => new Promise((resolve, reject) => {
      core._db()?.close()
      const request = factory.deleteDatabase(PREVIEW_DB_NAME)
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
      request.onblocked = () => resolve(false)
    }),
  }
}
