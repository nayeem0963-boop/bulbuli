/**
 * Small builders that turn compact content definitions into full learning items (the shape the
 * release gate checks, design 8.3). No item is ever approved here: every item gets
 * review.accuracy and review.bangla with status 'pending' and no reviewer.
 */
import { SOURCES, VERIFIED_ON } from './sources.js'

const PENDING_REVIEW = Object.freeze({
  accuracy: Object.freeze({ status: 'pending' }),
  bangla: Object.freeze({ status: 'pending' }),
})

/** [en, bn] → { en, bn } */
export const t = ([en, bn]) => ({ en, bn })

/** A distractor: wrong answer text, the misconception it represents, and an optional picture key. */
export const d = (en, bn, misEn, misBn, pic) => ({ text: { en, bn }, misconception: { en: misEn, bn: misBn }, ...(pic ? { pic } : {}) })

/** The correct answer, with an optional picture key. */
export const a = (en, bn, pic) => ({ en, bn, ...(pic ? { pic } : {}) })

function source(key, supports) {
  const s = SOURCES[key]
  if (!s) throw new Error(`unknown source ${key}`)
  if (!s.quotes.some((q) => q === supports)) throw new Error(`"${supports}" is not a recorded quote of source ${key}`)
  return { url: s.url, publisher: s.publisher, title: s.title, supports, verifiedOn: VERIFIED_ON }
}

function item({ id, mission, band, objective, role, skill, prompt, answer, distractors, explanation, src, quote, image }) {
  return {
    id,
    version: 1,
    mission,
    objective,
    role,
    band,
    skill,
    prompt: t(prompt),
    answer,
    distractors,
    explanation: t(explanation),
    ...(image ? { image } : {}),
    source: source(src, quote),
    review: PENDING_REVIEW,
  }
}

/**
 * One learning objective with its primary gate item and its return item (different id, wording
 * and situation; same objective).
 */
export function objective(base, { slug, skill, src, quote, explanation, primary, ret }) {
  const objectiveId = `sky.${base.mission}.b${base.band}.${slug}`
  return [
    item({ ...base, id: `${objectiveId}.p1`, objective: objectiveId, role: 'primary', skill, src, quote, explanation, ...primary }),
    item({ ...base, id: `${objectiveId}.r1`, objective: objectiveId, role: 'return', skill, src, quote, explanation, ...ret }),
  ]
}

/** A Quick Check item (asked after the flight, without lanes or a timer). */
export function quickCheck(base, { slug, skill, src, quote, explanation, prompt, answer, distractors }) {
  const objectiveId = `sky.${base.mission}.b${base.band}.qc.${slug}`
  return item({ ...base, id: `${objectiveId}.q1`, objective: objectiveId, role: 'quickcheck', skill, src, quote, explanation, prompt, answer, distractors })
}

/* ------------------------------------------------------------------ World Explorer 3D (ages 12+) */

const WORLD_BAND = '12+'

/**
 * One World Explorer station: Observe → Investigate → Explain → Record (design 8.2). The Explain
 * question is the gated item; the station's Observe/Investigate/hint/Record texts are part of the
 * same reviewable item, so editing any of them invalidates its approvals.
 */
export function station(expedition, { n, slug, skill, src, quote, title, observe, investigate, finding, hint, record, prompt, answer, distractors, explanation }) {
  const objectiveId = `we.${expedition}.s${n}.${slug}`
  return {
    ...item({
      id: `${objectiveId}.e1`, mission: expedition, band: WORLD_BAND, objective: objectiveId, role: 'station',
      skill, src, quote, prompt, answer, distractors, explanation,
    }),
    station: { n, title: t(title), observe: t(observe), investigate: t(investigate), finding: t(finding), hint: t(hint), record: t(record) },
  }
}

/** One expedition-report question. set 'A' (first filing) or 'B' (the one retry). */
export function reportItem(expedition, set, { n, slug, skill, src, quote, prompt, answer, distractors, explanation }) {
  const role = set === 'A' ? 'report-a' : 'report-b'
  return item({
    id: `we.${expedition}.${role}.q${n}.${slug}`, mission: expedition, band: WORLD_BAND,
    objective: `we.${expedition}.report.${slug}`, role, skill, src, quote, prompt, answer, distractors, explanation,
  })
}
