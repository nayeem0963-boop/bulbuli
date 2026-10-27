import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ALL_QUESTIONS, displayValue, getLevel, LEVELS, topicsOf } from './index.js'
import { compile, correctChoices, numberOf } from './verify.js'

// Questions per level, as the curriculum specifies (100 in total).
const EXPECTED_COUNTS = { 1: 10, 2: 12, 3: 14, 4: 12, 5: 10, 6: 10, 7: 10, 8: 8, 9: 8, 10: 6 }
const FORMATS = ['choice', 'input', 'pick']
const VISUALS = ['tiles', 'cubes', 'balance', 'coords', 'flat', 'solid', 'bars', 'marbles', 'dice', 'matches']

test('the parser reads maths notation correctly', () => {
  assert.equal(numberOf('4.7 × 10⁻⁴'), 4.7e-4)
  assert.equal(numberOf('1.8 × 10¹⁰'), 1.8e10)
  assert.equal(numberOf('6√2'), 6 * Math.sqrt(2))
  assert.equal(numberOf('36π'), 36 * Math.PI)
  assert.equal(numberOf('x = −7'), -7)
  assert.equal(numberOf('3/10'), 0.3)
  assert.equal(compile('3x² + 2x + 7', ['x'])(2), 23)
  assert.equal(compile('(x − 2)(x − 3)', ['x'])(5), 6)
  assert.equal(compile('27a⁶b³', ['a', 'b'])(1, 2), 216)
  assert.equal(compile('−x²', ['x'])(3), -9)
})

test('there are at least 100 questions, distributed across the ten levels as specified', () => {
  assert.equal(LEVELS.length, 10)
  assert.ok(ALL_QUESTIONS.length >= 100, `only ${ALL_QUESTIONS.length} questions`)
  for (const level of LEVELS) {
    assert.equal(level.questions.length, EXPECTED_COUNTS[level.id], `level ${level.id} question count`)
  }
})

test('every level has a title, objective, tier, difficulty and badge in English and Bangla', () => {
  LEVELS.forEach((level, index) => {
    assert.equal(level.id, index + 1)
    for (const field of ['title', 'objective', 'badge']) {
      assert.ok(level[field]?.en && level[field]?.bn, `level ${level.id} ${field}`)
    }
    assert.ok(level.difficulty >= 1 && level.difficulty <= 5)
    assert.ok(topicsOf(level).length >= 4, `level ${level.id} should cover several topics`)
  })
  // difficulty never goes down from one level to the next
  for (let i = 1; i < LEVELS.length; i += 1) assert.ok(LEVELS[i].difficulty >= LEVELS[i - 1].difficulty)
  assert.equal(getLevel(4).id, 4)
  assert.equal(getLevel(11), null)
})

test('ids and prompts are unique (no question is a copy of another)', () => {
  const ids = ALL_QUESTIONS.map((q) => q.id)
  assert.equal(new Set(ids).size, ids.length)
  const prompts = ALL_QUESTIONS.map((q) => q.prompt.toLowerCase().replace(/\s+/g, ' ').trim())
  assert.equal(new Set(prompts).size, prompts.length)
})

test('every question is complete: topic, prompt, hint, explanation and a valid format', () => {
  for (const q of ALL_QUESTIONS) {
    assert.ok(FORMATS.includes(q.format), `${q.id} format`)
    for (const field of ['topic', 'prompt', 'hint', 'explanation']) {
      assert.equal(typeof q[field], 'string', `${q.id} ${field}`)
      assert.ok(q[field].length >= 4, `${q.id} ${field} too short`)
    }
    // A hint nudges; it must not contain the answer itself.
    if (String(q.answer).length >= 3) assert.ok(!q.hint.includes(String(q.answer)), `${q.id}: the hint gives the answer away`)
    if (q.steps) assert.ok(Array.isArray(q.steps) && q.steps.every((s) => typeof s === 'string' && s))
    if (q.visual) {
      assert.ok(VISUALS.includes(q.visual.type), `${q.id} visual type ${q.visual.type}`)
      assert.ok(typeof q.figure === 'string' && q.figure.length > 10, `${q.id} needs a text description of its figure`)
    }
  }
})

test('multiple-choice questions have four distinct choices including the answer', () => {
  for (const q of ALL_QUESTIONS.filter((x) => x.format !== 'input')) {
    assert.equal(q.choices.length, 4, `${q.id} needs 4 choices`)
    assert.equal(new Set(q.choices).size, 4, `${q.id} has duplicate choices`)
    assert.ok(q.choices.includes(q.answer), `${q.id} answer is not one of its choices`)
    // shown values are distinct too (prefix/unit never merge two choices)
    assert.equal(new Set(q.choices.map((c) => displayValue(q, c))).size, 4)
  }
})

test('input questions have a numeric answer', () => {
  for (const q of ALL_QUESTIONS.filter((x) => x.format === 'input')) {
    assert.ok(Number.isFinite(q.answer), `${q.id} answer must be a number`)
    assert.equal(q.choices, undefined)
  }
})

test('pick questions match the labelled points in their 3D figure', () => {
  for (const q of ALL_QUESTIONS.filter((x) => x.format === 'pick')) {
    assert.equal(q.visual?.type, 'coords')
    const labels = q.visual.points.filter((p) => !p.fixed).map((p) => p.label)
    assert.deepEqual(labels, q.choices)
    const coords = q.visual.points.map((p) => `${p.x},${p.y}`)
    assert.equal(new Set(coords).size, coords.length, `${q.id} has two points in the same place`)
  }
})

test('every answer is recomputed independently and exactly one choice is correct', () => {
  const manual = []
  for (const q of ALL_QUESTIONS) {
    const { correct, kind } = correctChoices(q)
    if (kind === 'manual') {
      manual.push(q.id)
      assert.ok(q.verify.manual.length > 10, `${q.id}: describe how the manual check was done`)
      continue
    }
    const expected = q.format === 'input' ? String(q.answer) : q.answer
    assert.deepEqual(correct, [expected], `${q.id}: correct choices ${JSON.stringify(correct)} (rule: ${kind})`)
  }
  // Only reasoning questions whose answers are sentences are checked by hand.
  assert.ok(manual.length <= 10, `too many hand-checked questions: ${manual.join(', ')}`)
})

test('figures use the same measurements as the prompt', () => {
  for (const q of ALL_QUESTIONS.filter((x) => x.visual?.type === 'solid')) {
    for (const label of Object.values(q.visual.labels ?? {})) {
      const number = label.match(/[\d.]+/)?.[0]
      assert.ok(q.prompt.includes(number), `${q.id}: figure label ${label} is not in the prompt`)
    }
  }
  const cylinder = ALL_QUESTIONS.find((q) => q.id === 'L4-09').visual.size
  assert.deepEqual(cylinder, { r: 3, h: 10 })
  const tiles = ALL_QUESTIONS.find((q) => q.id === 'L1-03').visual
  assert.equal(tiles.cols * tiles.rows, 24)
  assert.equal(tiles.filled, 18)
  const goals = ALL_QUESTIONS.find((q) => q.id === 'L6-04').visual.data.map((d) => d.value)
  assert.deepEqual(goals, [4, 6, 7, 3])
  const marbles = ALL_QUESTIONS.find((q) => q.id === 'L6-06').visual.groups.map((g) => g.count)
  assert.deepEqual(marbles, [5, 3, 2])
})
