/**
 * Local event keys and round keys (design 2.1, 3).
 *
 * Local event keys name one rewardable learning event. They never leave the device; the IndexedDB
 * `events` store is keyed by [playerId, eventKey], so recording a key a second time is impossible.
 *
 * Whether a key includes the band, and whether it can be re-earned, are XP policies that are still
 * UNRESOLVED (design 6.2, U1–U5). The key builders therefore take the resolved policy as an
 * argument and never assume a value.
 */

const SAFE_PART_RE = /^[a-z0-9][a-z0-9._-]{0,79}$/i
export const SKY_BANDS = ['4-6', '7-8', '9-10']
export const EXPEDITIONS = ['sundarbans', 'amazon', 'sahara']

function part(value, label) {
  if (typeof value !== 'string' || !SAFE_PART_RE.test(value)) {
    throw new TypeError(`eventKeys: invalid ${label} "${value}"`)
  }
  return value
}

function band(value) {
  if (!SKY_BANDS.includes(value)) throw new TypeError(`eventKeys: invalid band "${value}"`)
  return value
}

/** Scope prefix for per-item Sky Science keys: per band, or shared across bands (U4). */
function skyScope(policyScope, bandValue) {
  if (policyScope === 'per-band') return `sky:${band(bandValue)}`
  if (policyScope === 'across-bands') return 'sky:all-bands'
  throw new TypeError(`eventKeys: unsupported cross-band scope "${policyScope}"`)
}

export const eventKeys = {
  /** Primary gate answered correctly on the first attempt. */
  gateFirstTry: (policy, bandValue, objectiveId) =>
    `${skyScope(policy.gate.scope, bandValue)}:obj:${part(objectiveId, 'objectiveId')}:first`,
  /** Quick Check answered correctly. */
  quickCheck: (policy, bandValue, itemId) =>
    `${skyScope(policy.quickCheck.scope, bandValue)}:qc:${part(itemId, 'itemId')}`,
  /** Mission star tier (1–3), once per mission across all bands (brief; U6 confirms). */
  missionTier: (missionId, tier) => {
    if (![1, 2, 3].includes(tier)) throw new TypeError(`eventKeys: invalid tier ${tier}`)
    return `sky:mission:${part(missionId, 'missionId')}:tier:${tier}`
  },
  station: (expedition, stationNumber) => {
    if (!EXPEDITIONS.includes(expedition)) throw new TypeError(`eventKeys: invalid expedition "${expedition}"`)
    if (!Number.isInteger(stationNumber) || stationNumber < 1 || stationNumber > 5) {
      throw new TypeError(`eventKeys: invalid station ${stationNumber}`)
    }
    return `we:${expedition}:station:${stationNumber}`
  },
  reportFirstFiling: (expedition) => `we:${part(expedition, 'expedition')}:report:first-filing`,
  expeditionComplete: (expedition) => `we:${part(expedition, 'expedition')}:complete`,
  reportThreeStars: (expedition) => `we:${part(expedition, 'expedition')}:report:three-stars`,
}

/** Round keys: one per Sky Science flight or World Explorer visit. The id is created at start. */
export const roundKeys = {
  flight: (flightId) => `sky:flight:${part(flightId, 'flightId')}`,
  visit: (visitId) => `we:visit:${part(visitId, 'visitId')}`,
}

/** A fresh random id for a flight or visit (UUID v4 without dashes is fine for keys). */
export function newRoundId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}
