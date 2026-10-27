/**
 * Math Master's curriculum: level metadata joined with each level's question file.
 * No React and no three.js here, so it can be tested with node:test and reused by any screen.
 *
 * Adding a question: append it to questions/level-NN.js following the schema in README.md, then run
 * `npm test` — curriculum.test.js recomputes every answer and checks every distractor.
 */
import { LEVEL_META, TIER_ORDER, TIERS } from './levels.js'
import level01 from './questions/level-01.js'
import level02 from './questions/level-02.js'
import level03 from './questions/level-03.js'
import level04 from './questions/level-04.js'
import level05 from './questions/level-05.js'
import level06 from './questions/level-06.js'
import level07 from './questions/level-07.js'
import level08 from './questions/level-08.js'
import level09 from './questions/level-09.js'
import level10 from './questions/level-10.js'

const QUESTION_FILES = [level01, level02, level03, level04, level05, level06, level07, level08, level09, level10]

export const LEVELS = LEVEL_META.map((meta, index) => ({
  ...meta,
  questions: QUESTION_FILES[index].map((question) => ({ format: 'choice', ...question, levelId: meta.id })),
}))

export const ALL_QUESTIONS = LEVELS.flatMap((level) => level.questions)

export { TIERS, TIER_ORDER }

export const getLevel = (id) => LEVELS.find((level) => level.id === Number(id)) ?? null

/** The distinct topics a level covers, in the order they first appear. */
export const topicsOf = (level) => [...new Set(level.questions.map((question) => question.topic))]

/** How a stored choice is shown: '92' with prefix '$' → '$92'; '55' with unit 'cm²' → '55 cm²'. */
export function displayValue(question, value) {
  const text = String(value)
  const prefix = question.prefix ?? ''
  if (!question.unit) return `${prefix}${text}`
  const joiner = question.unit === '°' || question.unit === '%' ? '' : ' '
  return `${prefix}${text}${joiner}${question.unit}`
}

/** The correct answer as the player should read it. */
export const displayAnswer = (question) => displayValue(question, question.answer)
