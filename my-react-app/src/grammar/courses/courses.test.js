import { test } from 'node:test'
import assert from 'node:assert/strict'
import schema from './course.schema.json' with { type: 'json' }
import { courseSections, getCourse, GRAMMAR_COURSES } from './index.js'

// Checks the JSON Schema keywords course.schema.json uses (no extra package needed).
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
    if (rule.maxLength && value.length > rule.maxLength) fail(`must be at most ${rule.maxLength} characters`)
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) fail(`must match ${rule.pattern}`)
  }
  if (rule.type === 'integer') {
    if (!Number.isInteger(value)) return fail('must be a whole number')
    if ('minimum' in rule && value < rule.minimum) fail(`must be at least ${rule.minimum}`)
  }
}

test('there are 4 courses, and each matches course.schema.json', () => {
  assert.deepEqual(GRAMMAR_COURSES.map((course) => course.title.en), [
    'Subject-Verb Agreement', 'Articles & Prepositions', 'Active vs. Passive Voice', 'Punctuation & Sentence Structure',
  ])
  for (const course of GRAMMAR_COURSES) {
    const errors = []
    check(course, schema, course.id, errors)
    assert.deepEqual(errors, [])
  }
})

test('every card sits in a real section, and every section has cards', () => {
  for (const course of GRAMMAR_COURSES) {
    const sectionIds = course.sections.map((section) => section.id)
    for (const card of course.cards) assert.ok(sectionIds.includes(card.section), `${course.id}/${card.id}`)
    for (const section of courseSections(course)) assert.ok(section.cards.length > 0, `${course.id}/${section.id} is empty`)
    assert.deepEqual(course.cards.map((card) => card.order), course.cards.map((_, i) => i + 1))
    assert.equal(new Set(course.cards.map((card) => card.id)).size, course.cards.length)
  }
})

test('every question has one right answer, and every wrong choice says why', () => {
  for (const course of GRAMMAR_COURSES) {
    const ids = new Set()
    for (const card of course.cards) {
      for (const q of card.questions) {
        const where = `${course.id}/${q.id}`
        assert.ok(!ids.has(q.id), `duplicate id ${where}`)
        ids.add(q.id)
        assert.deepEqual(q.options.map((o) => o.id), ['a', 'b', 'c', 'd'], where)
        assert.equal(new Set(q.options.map((o) => o.text)).size, 4, `${where} repeats a choice`)
        const answer = q.options.find((o) => o.id === q.answer)
        assert.ok(answer && !answer.why, `${where}: the answer must be a choice without "why"`)
        for (const option of q.options) if (option !== answer) assert.ok(option.why, `${where}${option.id} has no "why"`)
        const gaps = q.prompt.split('___').length - 1
        if (gaps > 1) for (const option of q.options) assert.equal(option.text.split(' / ').length, gaps, `${where}${option.id}`)
      }
    }
  }
})

test('right answers are spread out', () => {
  for (const course of GRAMMAR_COURSES) {
    const letters = course.cards.flatMap((card) => card.questions.map((q) => q.answer))
    for (const letter of 'abcd') assert.ok(letters.filter((l) => l === letter).length >= 3, `${course.id}: too few ${letter}`)
  }
  assert.equal(getCourse('active-passive-voice').cards.length, 8)
  assert.equal(getCourse('nope'), null)
})
