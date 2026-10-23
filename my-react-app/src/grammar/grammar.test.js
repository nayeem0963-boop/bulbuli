import { test } from 'node:test'
import assert from 'node:assert/strict'
import tenses from './tenses.json' with { type: 'json' }
import schema from './tenses.schema.json' with { type: 'json' }
import { getTenseModule, nextTenseModule, promptPieces, starsFor, TENSE_GROUPS, TENSE_MODULES } from './tenseModules.js'

// A small JSON Schema checker covering the keywords tenses.schema.json uses,
// so the data can be checked without adding a package.
function check(value, rule, path, errors) {
  if (rule.$ref) rule = rule.$ref.split('/').slice(1).reduce((node, key) => node[key], schema)
  const fail = (message) => errors.push(`${path}: ${message}`)
  if ('const' in rule && value !== rule.const) fail(`must be ${JSON.stringify(rule.const)}`)
  if (rule.enum && !rule.enum.includes(value)) fail(`must be one of ${rule.enum.join(', ')}`)
  if (rule.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('must be an object')
    for (const key of rule.required ?? []) if (!(key in value)) fail(`missing "${key}"`)
    for (const [key, child] of Object.entries(value)) {
      if (rule.properties?.[key]) check(child, rule.properties[key], `${path}.${key}`, errors)
      else if (rule.additionalProperties === false) fail(`unexpected "${key}"`)
    }
  }
  if (rule.type === 'array') {
    if (!Array.isArray(value)) return fail('must be a list')
    if (rule.minItems && value.length < rule.minItems) fail(`needs at least ${rule.minItems} items`)
    if (rule.maxItems && value.length > rule.maxItems) fail(`allows at most ${rule.maxItems} items`)
    value.forEach((item, index) => check(item, rule.items, `${path}[${index}]`, errors))
  }
  if (rule.type === 'string') {
    if (typeof value !== 'string') return fail('must be text')
    if (rule.minLength && value.length < rule.minLength) fail('must not be empty')
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) fail(`must match ${rule.pattern}`)
  }
  if (rule.type === 'integer') {
    if (!Number.isInteger(value)) return fail('must be a whole number')
    if ('minimum' in rule && value < rule.minimum) fail(`must be at least ${rule.minimum}`)
  }
}

test('tenses.json matches tenses.schema.json', () => {
  const errors = []
  check(tenses, schema, 'tenses', errors)
  assert.deepEqual(errors, [])
})

test('there are 12 modules, one per tense, in order', () => {
  assert.deepEqual(TENSE_MODULES.map((m) => m.title.en), [
    'Simple Present', 'Present Continuous', 'Present Perfect', 'Present Perfect Continuous',
    'Simple Past', 'Past Continuous', 'Past Perfect', 'Past Perfect Continuous',
    'Simple Future', 'Future Continuous', 'Future Perfect', 'Future Perfect Continuous',
  ])
  assert.deepEqual(TENSE_MODULES.map((m) => m.order), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  assert.deepEqual(TENSE_GROUPS.map((g) => [g.time, g.modules.map((m) => m.aspect)]), [
    ['present', ['simple', 'continuous', 'perfect', 'perfect-continuous']],
    ['past', ['simple', 'continuous', 'perfect', 'perfect-continuous']],
    ['future', ['simple', 'continuous', 'perfect', 'perfect-continuous']],
  ])
})

test('every question has one right answer, and every wrong choice says why', () => {
  const ids = new Set()
  for (const module of TENSE_MODULES) {
    assert.equal(module.questions.length, 5, module.id)
    for (const q of module.questions) {
      assert.ok(!ids.has(q.id), `duplicate id ${q.id}`)
      ids.add(q.id)
      assert.deepEqual(q.options.map((o) => o.id), ['a', 'b', 'c', 'd'], q.id)
      assert.equal(new Set(q.options.map((o) => o.text)).size, 4, `${q.id} repeats a choice`)
      const answer = q.options.find((o) => o.id === q.answer)
      assert.ok(answer, `${q.id}: the answer is not one of the choices`)
      assert.ok(!answer.why, `${q.id}: the right answer should use "explanation", not "why"`)
      for (const option of q.options) if (option !== answer) assert.ok(option.why, `${q.id}${option.id} has no "why"`)
      // a two-gap prompt needs two-part choices ("Have / seen")
      const gaps = q.prompt.split('___').length - 1
      if (gaps > 1) for (const option of q.options) assert.equal(option.text.split(' / ').length, gaps, `${q.id}${option.id}`)
    }
  }
})

test('right answers are spread across a, b, c and d', () => {
  for (const module of TENSE_MODULES) {
    assert.ok(new Set(module.questions.map((q) => q.answer)).size >= 3, `${module.id} keeps reusing one letter`)
  }
})

test('helpers: look-up, next module, stars and filling the gaps', () => {
  assert.equal(getTenseModule('past-perfect').title.en, 'Past Perfect')
  assert.equal(getTenseModule('nope'), null)
  assert.equal(nextTenseModule('simple-present').id, 'present-continuous')
  assert.equal(nextTenseModule('future-perfect-continuous'), null)
  assert.deepEqual([5, 4, 3, 2, 0].map((score) => starsFor(score, 5)), [3, 2, 1, 0, 0])
  assert.deepEqual(promptPieces('___ you ever ___ it?', 'Have / seen'), [
    { text: 'Have', gap: true }, { text: ' you ever ', gap: false }, { text: 'seen', gap: true }, { text: ' it?', gap: false },
  ])
  assert.deepEqual(promptPieces('Look! The baby ___.'), [
    { text: 'Look! The baby ', gap: false }, { text: '', gap: true }, { text: '.', gap: false },
  ])
})
