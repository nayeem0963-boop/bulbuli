#!/usr/bin/env node
/**
 * npm run content:report
 *
 * Prints the Phase 2A content release report (design 8.3): total items, awaiting science review,
 * awaiting Bangla review, approved, blocked. Exits with code 1 if any item marked approved has a
 * missing or invalid approval record, a structural problem, or a duplicate id.
 */
import { ALL_CONTENT_ITEMS } from '../src/learning/content/index.js'
import { contentReport } from '../src/learning/contentGate.js'
import { REVIEWERS } from '../src/learning/reviewers.js'

const report = contentReport([...ALL_CONTENT_ITEMS], [...REVIEWERS])

console.log('Bulbuli Phase 2A: content release report')
console.log('----------------------------------------')
console.log(`Total content items:          ${report.total}`)
console.log(`Awaiting science review:      ${report.awaitingAccuracyReview}`)
console.log(`Awaiting Bangla review:       ${report.awaitingBanglaReview}`)
console.log(`Approved (shippable):         ${report.approved}`)
console.log(`Blocked from release:         ${report.blocked}`)
console.log(`Named reviewers:              ${REVIEWERS.length}${REVIEWERS.length === 0 ? ' (none yet; nothing can be approved)' : ''}`)

let failed = false
for (const { id, errors } of report.structuralProblems) {
  failed = true
  console.log(`\nSTRUCTURE ${id}:\n  - ${errors.join('\n  - ')}`)
}
for (const { id, errors } of report.invalidApprovals) {
  failed = true
  console.log(`\nINVALID APPROVAL ${id}:\n  - ${errors.join('\n  - ')}`)
}
if (report.duplicateIds.length) {
  failed = true
  console.log(`\nDUPLICATE IDS: ${report.duplicateIds.join(', ')}`)
}
process.exitCode = failed ? 1 : 0
