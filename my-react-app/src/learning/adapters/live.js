/**
 * LIVE adapter (design 1.6, 1.7). Built and tested in Stage 2A-1 but wired to NOTHING until the
 * separately approved release migration. It has no import path to Supabase or src/lib/xp.js:
 * at release, the server functions are injected (awardXpEvent-backed submit, the RLS ownership
 * query, and the session user id).
 *
 * It refuses to start:
 *   - while any XP policy is PENDING (design 6.3, U1–U7), or with the test fixture policy
 *   - without the injected server functions
 */
import { createAdapterCore } from './core.js'
import { LIVE_DB_NAME } from '../store/schema.js'
import { assertPolicyResolved } from '../xpRules.js'
import { isUuid } from '../eventId.js'

export const LIVE_CHANNEL = 'bulbuli-learning'
export const GUEST_PLAYER_ID = 'guest'

/**
 * @param {object} opts
 * @param {object} opts.policy  resolved product policy (never the fixture)
 * @param {{ submit: Function, checkOwnership: Function, getSessionUserId: () => (string|null) }} opts.server
 * @param {IDBFactory} [opts.factory=globalThis.indexedDB]
 * @param {string} [opts.decoderPath='/draco/']  release path (design 1.7)
 */
export function createLiveAdapter({ policy, server, factory = globalThis.indexedDB, decoderPath = '/draco/', openTimeoutMs } = {}) {
  if (policy?.fixture) throw new TypeError('The live adapter cannot use the test fixture policy.')
  assertPolicyResolved(policy)
  if (!server || typeof server.submit !== 'function' || typeof server.checkOwnership !== 'function' || typeof server.getSessionUserId !== 'function') {
    throw new TypeError('The live adapter needs server.submit, server.checkOwnership and server.getSessionUserId (injected at release).')
  }
  // The player is fixed when the adapter is created: an account adapter for a signed-in user, or
  // the guest adapter. A session change means creating a new adapter (and syncPending also checks
  // the session user per round).
  const sessionUser = server.getSessionUserId()
  const playerId = isUuid(sessionUser) ? sessionUser : GUEST_PLAYER_ID
  return createAdapterCore({
    kind: 'live',
    factory,
    dbName: LIVE_DB_NAME,
    policy,
    getPlayerId: () => playerId,
    getAccount: () => (playerId !== GUEST_PLAYER_ID ? { userId: playerId } : null),
    server: playerId !== GUEST_PLAYER_ID ? server : null,
    decoderPath,
    channelName: LIVE_CHANNEL,
    openTimeoutMs,
  })
}
