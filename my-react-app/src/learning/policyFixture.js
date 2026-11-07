/**
 * TEST FIXTURE POLICY: NOT A PRODUCT DECISION.
 *
 * The real replay limits, cross-band rules, caps, tier structure and report timing (design 6.2,
 * U1–U7) are unresolved until the corrected Phase 2 proposal is supplied. Automated tests and the
 * dev-only preview still need *some* resolved policy to exercise the ledger and transactions, so
 * they use this one. It is chosen only to make tests meaningful:
 *
 *   - each rewardable event key pays at most once ('never' re-pays)
 *   - gate and Quick Check keys are per band
 *   - no caps
 *   - tiers 3 / 7 / 5 incremental across bands (as quoted in the brief)
 *   - report XP and ★★★ on first filing only; completion on whichever filing completes it (D3)
 *
 * The live adapter never accepts this object (it is tagged `fixture: true`).
 */
export const TEST_FIXTURE_POLICY = Object.freeze({
  fixture: true,
  gate: Object.freeze({ replay: 'never', scope: 'per-band' }),
  quickCheck: Object.freeze({ replay: 'never', scope: 'per-band' }),
  station: Object.freeze({ replay: 'never' }),
  caps: 'none',
  tierStructure: 'incremental-3-7-5-across-bands',
  reportTiming: 'three-stars-first-filing-completion-any-filing',
})
