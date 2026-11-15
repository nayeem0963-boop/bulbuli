/**
 * Content release gate (design 8.3).
 *
 * A learning item is shippable only when:
 *   - its structure is complete (both languages, distractors with misconceptions, source)
 *   - review.accuracy AND review.bangla are 'approved'
 *   - each approval names a reviewer listed in reviewers.js with that role
 *   - each approval's date is a real YYYY-MM-DD date that isn't in the future
 *   - each approval's hash equals the item's CURRENT content hash
 *
 * Any edit to a reviewable field changes the hash, so both earlier approvals stop counting.
 * Nothing here can create an approval: the gate only checks records written by real reviewers.
 */
import { canonicalJson, sha256Hex } from './hash.js'

export const ROLES = ['primary', 'return', 'quickcheck', 'station', 'report-a', 'report-b']
export const BANDS = ['4-6', '7-8', '9-10', '12+']
export const SKILLS = ['identify', 'compare', 'cause-effect', 'predict', 'apply']
export const REVIEW_STATUSES = ['approved', 'changes-requested', 'pending']

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const URL_RE = /^https:\/\/[^\s]+$/
const bilingual = (value) => Boolean(value && typeof value.en === 'string' && value.en.trim() && typeof value.bn === 'string' && value.bn.trim())

/** The fields a reviewer approves. Changing any of them invalidates both approvals. */
export function reviewablePart(item) {
  return {
    id: item.id,
    mission: item.mission,
    objective: item.objective,
    role: item.role,
    band: item.band,
    skill: item.skill,
    prompt: item.prompt,
    answer: item.answer,
    distractors: item.distractors,
    explanation: item.explanation,
    image: item.image,
    audio: item.audio,
    source: item.source,
    station: item.station,
  }
}

export const contentHash = (item) => sha256Hex(canonicalJson(reviewablePart(item)))

/** Structural problems with an item, regardless of review state. */
export function structuralErrors(item) {
  const errors = []
  if (!item || typeof item !== 'object') return ['item is not an object']
  if (typeof item.id !== 'string' || !/^[a-z0-9][a-z0-9.-]{2,119}$/.test(item.id)) errors.push('id must be a stable lowercase id')
  if (!Number.isInteger(item.version) || item.version < 1) errors.push('version must be a positive integer')
  if (typeof item.objective !== 'string' || !item.objective) errors.push('objective required')
  if (!ROLES.includes(item.role)) errors.push(`role must be one of ${ROLES.join(', ')}`)
  if (!BANDS.includes(item.band)) errors.push(`band must be one of ${BANDS.join(', ')}`)
  if (!SKILLS.includes(item.skill)) errors.push(`skill must be one of ${SKILLS.join(', ')}`)
  if (!bilingual(item.prompt)) errors.push('prompt needs en and bn')
  if (!bilingual(item.answer)) errors.push('answer needs en and bn')
  if (!bilingual(item.explanation)) errors.push('explanation needs en and bn')
  if (!Array.isArray(item.distractors) || item.distractors.length < 1) {
    errors.push('at least one distractor required')
  } else {
    item.distractors.forEach((d, i) => {
      if (!bilingual(d?.text)) errors.push(`distractor ${i + 1} needs en and bn text`)
      if (!bilingual(d?.misconception)) errors.push(`distractor ${i + 1} needs an en and bn misconception`)
    })
  }
  if (item.role === 'station') {
    for (const field of ['title', 'observe', 'investigate', 'finding', 'hint', 'record']) {
      if (!bilingual(item.station?.[field])) errors.push(`station.${field} needs en and bn`)
    }
  }
  const source = item.source
  if (!source || !URL_RE.test(source.url ?? '')) errors.push('source.url must be an https URL')
  if (!source || typeof source.publisher !== 'string' || !source.publisher.trim()) errors.push('source.publisher required')
  if (!source || typeof source.supports !== 'string' || !source.supports.trim()) errors.push('source.supports (the fact it supports) required')
  if (!source || !isRealPastDate(source.verifiedOn)) errors.push('source.verifiedOn must be a real date, not in the future')
  return errors
}

export function isRealPastDate(value, now = new Date()) {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false
  return date.getTime() <= now.getTime()
}

/**
 * Problems with one review record ('accuracy' | 'bangla'). An approval is only valid when this
 * returns []. Non-approved records are fine to exist; they just don't make the item shippable.
 */
export function reviewErrors(item, kind, reviewers, now = new Date()) {
  const record = item?.review?.[kind]
  if (!record) return [`review.${kind} missing`]
  const errors = []
  if (!REVIEW_STATUSES.includes(record.status)) errors.push(`review.${kind}.status invalid`)
  if (record.status !== 'approved') return errors
  const reviewer = reviewers.find((r) => r.id === record.reviewer)
  if (!reviewer) errors.push(`review.${kind}.reviewer "${record.reviewer}" is not in reviewers.js`)
  else if (!reviewer.roles?.includes(kind)) errors.push(`review.${kind}.reviewer "${record.reviewer}" lacks the ${kind} role`)
  if (!isRealPastDate(record.date, now)) errors.push(`review.${kind}.date must be a real date, not in the future`)
  if (record.hash !== contentHash(item)) errors.push(`review.${kind}.hash doesn't match the current content (content changed after approval)`)
  return errors
}

export function isShippable(item, reviewers, now = new Date()) {
  return structuralErrors(item).length === 0
    && item.review?.accuracy?.status === 'approved' && reviewErrors(item, 'accuracy', reviewers, now).length === 0
    && item.review?.bangla?.status === 'approved' && reviewErrors(item, 'bangla', reviewers, now).length === 0
}

/** Only the items that may appear in normal play. */
export const shippableOnly = (items, reviewers, now = new Date()) => items.filter((item) => isShippable(item, reviewers, now))

/**
 * Release report (design 8.3). `invalidApprovals` lists items marked approved whose records are
 * broken; tests and `npm run content:report` fail on any of these.
 */
export function contentReport(items, reviewers, now = new Date()) {
  const ids = new Map()
  const duplicates = []
  for (const item of items) {
    if (ids.has(item?.id)) duplicates.push(item.id)
    ids.set(item?.id, true)
  }
  const rows = items.map((item) => {
    const structure = structuralErrors(item)
    const accuracy = reviewErrors(item, 'accuracy', reviewers, now)
    const bangla = reviewErrors(item, 'bangla', reviewers, now)
    const accuracyApproved = item?.review?.accuracy?.status === 'approved' && accuracy.length === 0
    const banglaApproved = item?.review?.bangla?.status === 'approved' && bangla.length === 0
    const claimsApproval = item?.review?.accuracy?.status === 'approved' || item?.review?.bangla?.status === 'approved'
    return {
      id: item?.id,
      structure,
      accuracyApproved,
      banglaApproved,
      shippable: structure.length === 0 && accuracyApproved && banglaApproved,
      invalidApproval: claimsApproval
        ? [...(item.review.accuracy?.status === 'approved' ? accuracy : []), ...(item.review.bangla?.status === 'approved' ? bangla : [])]
        : [],
    }
  })
  return {
    total: items.length,
    awaitingAccuracyReview: rows.filter((r) => !r.accuracyApproved).length,
    awaitingBanglaReview: rows.filter((r) => !r.banglaApproved).length,
    approved: rows.filter((r) => r.shippable).length,
    blocked: rows.filter((r) => !r.shippable).length,
    structuralProblems: rows.filter((r) => r.structure.length).map((r) => ({ id: r.id, errors: r.structure })),
    invalidApprovals: rows.filter((r) => r.invalidApproval.length).map((r) => ({ id: r.id, errors: r.invalidApproval })),
    duplicateIds: duplicates,
    rows,
  }
}
