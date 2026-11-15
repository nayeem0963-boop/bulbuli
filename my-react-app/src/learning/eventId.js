/**
 * Deterministic server event IDs (design section 3).
 *
 *   serverEventId({ userId, gameId, eventType: 'round' | 'visit', roundKey })
 *
 * = UUID v5 (RFC 4122, SHA-1) under BULBULI_NAMESPACE over
 *   "bulbuli/v1|<userId>|<gameId>|<eventType>|<roundKey>"
 *
 * The same learner + game + event type + round key always gives the same ID, so retries,
 * reloads and re-queues are counted once by award_xp(). The namespace and the "v1" prefix are
 * fixed forever: changing either would make every earlier ID unrecognisable.
 *
 * Synchronous on purpose (computed inside IndexedDB transactions).
 */
import { sha1Bytes } from './hash.js'

/** Fixed Bulbuli namespace. Never change. */
export const BULBULI_NAMESPACE = '88d50634-ac8b-4a99-a199-900d523ef152'
export const EVENT_NAME_PREFIX = 'bulbuli/v1'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const GAME_ID_RE = /^[a-z0-9-]{1,40}$/
const EVENT_TYPES = new Set(['round', 'visit'])

export const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value)

function uuidToBytes(uuid) {
  const hex = uuid.replace(/-/g, '')
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i += 1) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function bytesToUuid(bytes) {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/** RFC 4122 version-5 UUID of `name` within `namespace`. */
export function uuidv5(name, namespace) {
  if (!isUuid(namespace)) throw new TypeError('uuidv5: namespace must be a UUID')
  if (typeof name !== 'string' || name.length === 0) throw new TypeError('uuidv5: name must be a non-empty string')
  const nameBytes = new TextEncoder().encode(name)
  const input = new Uint8Array(16 + nameBytes.length)
  input.set(uuidToBytes(namespace))
  input.set(nameBytes, 16)
  const hash = sha1Bytes(input).slice(0, 16)
  hash[6] = (hash[6] & 0x0f) | 0x50 // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80 // RFC 4122 variant
  return bytesToUuid(hash)
}

/** The exact name hashed for a server event (exported so tests and support tools can show it). */
export function serverEventName({ userId, gameId, eventType, roundKey }) {
  if (!isUuid(userId)) throw new TypeError('serverEventId: userId must be an account UUID')
  if (!GAME_ID_RE.test(gameId ?? '')) throw new TypeError(`serverEventId: invalid gameId ${gameId}`)
  if (!EVENT_TYPES.has(eventType)) throw new TypeError(`serverEventId: invalid eventType ${eventType}`)
  if (typeof roundKey !== 'string' || roundKey.length === 0) throw new TypeError('serverEventId: roundKey required')
  return `${EVENT_NAME_PREFIX}|${userId.toLowerCase()}|${gameId}|${eventType}|${roundKey}`
}

export function serverEventId(parts) {
  return uuidv5(serverEventName(parts), BULBULI_NAMESPACE)
}
