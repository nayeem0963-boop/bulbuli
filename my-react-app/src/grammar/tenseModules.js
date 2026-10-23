// The English tense quizzes for the Learn zone's Grammar track.
// The questions live in tenses.json (its shape is described in tenses.schema.json);
// this file only adds a few helpers. To add or change a question, edit tenses.json
// and run `npm test`: grammar.test.js checks every module against the rules.
import tenses from './tenses.json' with { type: 'json' }

export const TENSE_TOPIC = tenses.topic
export const TENSE_MODULES = tenses.modules

/** Present, Past and Future, each with its four modules, in order. */
export const TENSE_GROUPS = ['present', 'past', 'future'].map((time) => ({
  time,
  modules: TENSE_MODULES.filter((module) => module.time === time),
}))

export const getTenseModule = (id) => TENSE_MODULES.find((module) => module.id === id) ?? null

/** The module after this one (Future Perfect Continuous is last, so it has none). */
export function nextTenseModule(id) {
  const index = TENSE_MODULES.findIndex((module) => module.id === id)
  return index >= 0 ? TENSE_MODULES[index + 1] ?? null : null
}

/** 3 stars for 5/5, 2 for 4/5, 1 for 3/5, none below. */
export function starsFor(score, total) {
  const misses = total - score
  if (score <= 0 || misses > 2) return 0
  return 3 - misses
}

/**
 * Splits a prompt into pieces around its gaps (___). With `fill` (an option's text) the gaps
 * are filled in; an option for a two-gap prompt is written "Have / seen".
 * Returns [{ text, gap }] where gap marks a blank or filled-in piece.
 */
export function promptPieces(prompt, fill = null) {
  const parts = prompt.split('___')
  const fills = fill ? fill.split(' / ') : []
  const pieces = []
  parts.forEach((part, index) => {
    if (part) pieces.push({ text: part, gap: false })
    if (index < parts.length - 1) pieces.push({ text: fills[index] ?? '', gap: true })
  })
  return pieces
}
