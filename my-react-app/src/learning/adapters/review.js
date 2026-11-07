/**
 * REVIEW adapter: the controlled production-review build only (review/, vite.review.config.js).
 *
 * The same guarantees as the development preview adapter (preview.js), by construction:
 *   - its own IndexedDB database (bulbuli-learning-review-v1), never the live one
 *   - a fixed player id ('phase2a-review') and NO account: it never reads any Supabase session;
 *     sealed rounds are 'local-only' and never submitted
 *   - no import path to src/lib/xp.js, supabaseClient.js, useGameProgress, useScoreSync, auth,
 *     badges or achievements (checked by the import-graph tests R3/R4)
 *   - "would-be" server awards are only recorded in memory for the review panel
 *
 * It also runs on its own site (a separate Netlify origin), so it cannot even see the production
 * site's localStorage, IndexedDB or sign-in session.
 *
 * Where it may exist: the development server, and a production build made by
 * vite.review.config.js, which defines VITE_BULBULI_REVIEW_BUILD. The normal production build
 * (vite.config.js) never imports this file (test I1) and doesn't define the flag, so even if it
 * were imported there, creating the adapter would throw.
 *
 * XP policy: the TEST FIXTURE policy, exactly as the preview: review play shows what a live game
 * WOULD award, and awards nothing.
 */
import { createAdapterCore } from './core.js'
import { TEST_FIXTURE_POLICY } from '../policyFixture.js'

export const REVIEW_DB_NAME = 'bulbuli-learning-review-v1'
export const REVIEW_PLAYER_ID = 'phase2a-review'
export const REVIEW_CHANNEL = 'bulbuli-learning-review'
/** The review build copies three's bundled Draco decoder here (vite.review.config.js). */
export const REVIEW_DECODER_PATH = '/draco/'
/** Development server: the copy bundled inside `three` (as the preview, design 1.8). */
export const REVIEW_DEV_DECODER_PATH = '/node_modules/three/examples/jsm/libs/draco/gltf/'

export class ReviewOutsideReviewBuildError extends Error {
  constructor() {
    super('The Phase 2A review adapter can only be used in the review build (npm run build:review).')
    this.name = 'ReviewOutsideReviewBuildError'
  }
}

/** True only in the development server or in a build made with vite.review.config.js. */
export function isReviewBuild(env = import.meta.env) {
  return Boolean(env?.DEV) || env?.VITE_BULBULI_REVIEW_BUILD === 'true'
}

/**
 * @param {object} [opts]
 * @param {IDBFactory} [opts.factory=globalThis.indexedDB]
 * @param {object} [opts.env=import.meta.env]  injectable for tests
 * @param {number} [opts.openTimeoutMs]
 */
export function createReviewAdapter({ factory = globalThis.indexedDB, env = import.meta.env, openTimeoutMs } = {}) {
  if (!isReviewBuild(env)) throw new ReviewOutsideReviewBuildError()
  const wouldBeAwards = []
  const core = createAdapterCore({
    kind: 'review',
    factory,
    dbName: REVIEW_DB_NAME,
    policy: TEST_FIXTURE_POLICY,
    getPlayerId: () => REVIEW_PLAYER_ID,
    getAccount: () => null,
    onSealed: (round) => {
      if (round.xp > 0) wouldBeAwards.push({ roundKey: round.roundKey, gameId: round.gameId, amount: round.xp, at: new Date().toISOString() })
    },
    server: null,
    decoderPath: env?.DEV ? REVIEW_DEV_DECODER_PATH : REVIEW_DECODER_PATH,
    channelName: REVIEW_CHANNEL,
    openTimeoutMs,
  })
  return {
    ...core,
    policyIsFixture: true,
    /** What a live adapter WOULD have sent (review panel). Nothing is sent. */
    wouldBeAwards: () => wouldBeAwards.slice(),
    /** Deletes only the review database (on the review site's own origin). */
    resetPreviewData: () => new Promise((resolve, reject) => {
      core._db()?.close()
      const request = factory.deleteDatabase(REVIEW_DB_NAME)
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
      request.onblocked = () => resolve(false)
    }),
  }
}
