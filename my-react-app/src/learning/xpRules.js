/**
 * XP rules for Sky Science Explorer and World Explorer 3D (design section 6).
 *
 * Pure and synchronous: called inside IndexedDB transactions.
 *
 * Two kinds of rule live here:
 *   1. AMOUNTS: the XP values quoted from the corrected proposal in the Phase 2A brief (design 6.1).
 *   2. POLICIES: replay limits, cross-band rules, caps, tier structure and report timing.
 *      These are UNRESOLVED until the corrected Phase 2 proposal is supplied (design 6.2, U1–U7).
 *      PRODUCT_POLICY holds them as PENDING. Nothing here invents a value for them.
 *
 * Code that earns XP must be given a fully resolved policy object. assertPolicyResolved() throws
 * while any field is PENDING; the live adapter calls it and refuses to start (design 6.3). Tests
 * and the dev preview use TEST_FIXTURE_POLICY from ./policyFixture.js, which is labelled as a
 * fixture and is NOT a product decision.
 */

export const PENDING = Object.freeze({ pending: true })
export const isPending = (value) => value === PENDING

/** Amounts quoted in the brief (design 6.1). */
export const AMOUNTS = Object.freeze({
  sky: Object.freeze({
    gateFirstTry: 1,
    wrongFirst: 0,
    returnQuestion: 0,
    quickCheckCorrect: 2,
    /** incremental star tiers: index 1 = first ★, 2 = first ★★, 3 = first ★★★ (U6) */
    tiers: Object.freeze({ 1: 3, 2: 7, 3: 5 }),
  }),
  world: Object.freeze({
    stationFirstTry: 4,
    stationAfterHint: 2,
    stationAfterExplanation: 0,
    reportCorrectFirstFiling: 3,
    expeditionComplete: 20,
    reportThreeStars: 5,
  }),
})

/**
 * The product policy. Every field is PENDING until the corrected proposal resolves it.
 * Keys map to the design's unresolved items:
 *   gate.replay U1 · quickCheck.replay U2 · station.replay U3 · gate.scope / quickCheck.scope U4 ·
 *   caps U5 · tierStructure U6 · reportTiming U7
 */
export const PRODUCT_POLICY = Object.freeze({
  gate: Object.freeze({ replay: PENDING, scope: PENDING }),
  quickCheck: Object.freeze({ replay: PENDING, scope: PENDING }),
  station: Object.freeze({ replay: PENDING }),
  caps: PENDING,
  tierStructure: PENDING,
  reportTiming: PENDING,
})

const POLICY_PATHS = [
  ['gate', 'replay', 'U1'], ['quickCheck', 'replay', 'U2'], ['station', 'replay', 'U3'],
  ['gate', 'scope', 'U4'], ['quickCheck', 'scope', 'U4'], ['caps', null, 'U5'],
  ['tierStructure', null, 'U6'], ['reportTiming', null, 'U7'],
]

export class PolicyPendingError extends Error {
  constructor(items) {
    super(`XP policy is unresolved (${items.join(', ')}). Awaiting the corrected Phase 2 proposal (design 6.2).`)
    this.name = 'PolicyPendingError'
    this.items = items
  }
}

/** Lists unresolved policy items, e.g. ['U1 gate.replay', …]. */
export function pendingPolicyItems(policy) {
  const out = []
  for (const [group, field, id] of POLICY_PATHS) {
    const value = field ? policy?.[group]?.[field] : policy?.[group]
    if (value === undefined || isPending(value)) out.push(`${id} ${field ? `${group}.${field}` : group}`)
  }
  return out
}

export function assertPolicyResolved(policy) {
  const items = pendingPolicyItems(policy)
  if (items.length) throw new PolicyPendingError(items)
  // Only the policy values this foundation knows how to apply are accepted. Anything else from the
  // proposal (e.g. a daily cap) must be implemented and tested first, not silently ignored.
  for (const group of ['gate', 'quickCheck', 'station']) {
    if (policy[group].replay !== 'never') {
      throw new TypeError(`Unsupported ${group}.replay policy "${policy[group].replay}"; implement it before use.`)
    }
  }
  if (policy.caps !== 'none') throw new TypeError(`Unsupported caps policy "${policy.caps}"; implement it before use.`)
  if (policy.tierStructure !== 'incremental-3-7-5-across-bands') {
    throw new TypeError(`Unsupported tierStructure "${policy.tierStructure}"`)
  }
  if (policy.reportTiming !== 'three-stars-first-filing-completion-any-filing') {
    throw new TypeError(`Unsupported reportTiming "${policy.reportTiming}"`)
  }
  return policy
}

/* ------------------------------------------------------------------ Sky Science */

/** 75 % rounded up (design 8.1): 6 → 5, 8 → 6. */
export const threshold75 = (count) => Math.ceil(count * 0.75)

/**
 * Stars for one flight (design 8.1; star rules are approved and not changed here).
 *   primary: [{ objectiveId, firstTryCorrect: boolean, secured: boolean }]  (one per primary gate)
 *   quickChecks: [{ correct: boolean }]
 */
export function skyStars({ primary, quickChecks }) {
  const n = primary.length
  if (n === 0) return 0
  const need = threshold75(n)
  const secured = primary.filter((p) => p.secured).length
  const firstTry = primary.filter((p) => p.firstTryCorrect).length
  if (secured < need) return 0
  if (firstTry === n && quickChecks.every((q) => q.correct)) return 3
  if (firstTry >= need) return 2
  return 1
}

/**
 * Candidate rewards for a completed flight, before the ledger filters out keys already recorded.
 * Returns [{ eventKey, xp, kind }]. Return questions and wrong answers earn nothing.
 */
export function flightCandidates(policy, keys, { missionId, band, primary, quickChecks, stars }) {
  const out = []
  for (const p of primary) {
    if (p.firstTryCorrect) {
      out.push({ eventKey: keys.gateFirstTry(policy, band, p.objectiveId), xp: AMOUNTS.sky.gateFirstTry, kind: 'gate' })
    }
  }
  for (const q of quickChecks) {
    if (q.correct) {
      out.push({ eventKey: keys.quickCheck(policy, band, q.itemId), xp: AMOUNTS.sky.quickCheckCorrect, kind: 'quick-check' })
    }
  }
  for (let tier = 1; tier <= stars; tier += 1) {
    out.push({ eventKey: keys.missionTier(missionId, tier), xp: AMOUNTS.sky.tiers[tier], kind: 'tier' })
  }
  return out
}

/* ------------------------------------------------------------------ World Explorer */

/**
 * Station XP from the committed Explain attempts (design 6.1): right on attempt 1 → 4,
 * on attempt 2 (after the hint) → 2, later (after the explanation) → 0.
 */
export function stationXp(correctOnAttempt) {
  if (!Number.isInteger(correctOnAttempt) || correctOnAttempt < 1) {
    throw new TypeError('stationXp: the station needs a correct Explain attempt before Record')
  }
  if (correctOnAttempt === 1) return AMOUNTS.world.stationFirstTry
  if (correctOnAttempt === 2) return AMOUNTS.world.stationAfterHint
  return AMOUNTS.world.stationAfterExplanation
}

/** Report stars (design 8.2): 3/5 → ★, 4/5 → ★★, 5/5 → ★★★. */
export const reportStars = (correct) => (correct >= 5 ? 3 : correct === 4 ? 2 : correct === 3 ? 1 : 0)

/**
 * Candidate rewards for filing a report.
 *   isFirstFiling: this expedition's report has never been filed before (set A)
 *   correct: number of correct answers (0–5)
 *   allStationsComplete: all five stations recorded
 *
 * Applies the fixture/report-timing policy "three-stars-first-filing-completion-any-filing"
 * (U7 / D3, subject to the corrected proposal): report XP and ★★★ only on the first filing;
 * completion XP on the first filing or retry that completes the expedition (≥ ★ and all stations).
 */
export function reportCandidates(keys, { expedition, isFirstFiling, correct, allStationsComplete }) {
  const out = []
  const stars = reportStars(correct)
  if (isFirstFiling) {
    out.push({
      eventKey: keys.reportFirstFiling(expedition),
      xp: correct * AMOUNTS.world.reportCorrectFirstFiling,
      kind: 'report',
    })
    if (stars === 3) out.push({ eventKey: keys.reportThreeStars(expedition), xp: AMOUNTS.world.reportThreeStars, kind: 'report-three-stars' })
  }
  if (allStationsComplete && stars >= 1) {
    out.push({ eventKey: keys.expeditionComplete(expedition), xp: AMOUNTS.world.expeditionComplete, kind: 'complete' })
  }
  return out
}
