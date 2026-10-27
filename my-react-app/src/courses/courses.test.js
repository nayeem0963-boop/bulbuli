import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COURSES, DEFAULT_COURSE_ID, getCourse } from './index.js'
import { COURSE_CATALOG } from './catalog.js'
import { validateCourse } from './validate.js'
import htmlCourse from './html/index.js'

// Target size of each HTML level (the curriculum in src/courses/README.md).
const HTML_LEVEL_SIZES = { 1: 8, 2: 8, 3: 6, 4: 6, 5: 7, 6: 10, 7: 8, 8: 6, 9: 6, 10: 5 }

test('every registered course passes validation', () => {
  for (const course of Object.values(COURSES)) {
    assert.deepEqual(validateCourse(course), [], `${course.id} has data problems`)
  }
})

test('the HTML course has at least 60 unique questions (70 planned)', () => {
  const { questions } = htmlCourse
  assert.ok(questions.length >= 60, `only ${questions.length} questions`)
  assert.equal(questions.length, 70)
  assert.equal(new Set(questions.map((q) => q.id)).size, questions.length, 'question ids are unique')
})

test('the HTML course follows the 10-level curriculum', () => {
  assert.deepEqual(htmlCourse.levels.map((l) => l.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  const sizes = {}
  for (const q of htmlCourse.questions) sizes[q.level] = (sizes[q.level] ?? 0) + 1
  assert.deepEqual(sizes, HTML_LEVEL_SIZES)
})

test('question ids follow html-<level>-<nn> and match their level', () => {
  for (const q of htmlCourse.questions) {
    const match = /^html-(\d+)-(\d{2})$/.exec(q.id)
    assert.ok(match, `${q.id} has the wrong id format`)
    assert.equal(Number(match[1]), q.level, `${q.id} is in level ${q.level}`)
  }
})

test('every correct answer points at a real, non-empty option', () => {
  for (const q of htmlCourse.questions) {
    const answer = q.options[q.correctIndex]
    assert.equal(typeof answer, 'string', `${q.id}`)
    assert.ok(answer.trim().length > 0, `${q.id}`)
  }
})

test('correct answers are spread across A–D, so guessing one letter does not pay off', () => {
  const counts = [0, 0, 0, 0]
  for (const q of htmlCourse.questions) counts[q.correctIndex]++
  const share = counts.map((n) => n / htmlCourse.questions.length)
  for (const s of share) assert.ok(s >= 0.15 && s <= 0.35, `answer-letter spread is lopsided: ${counts}`)
})

test('question and lesson HTML escapes "<" inside code (no raw tags in <code>)', () => {
  // A raw "<tag>" inside <code> would be rendered by the browser instead of shown as text.
  const rawTagInCode = /<code>[^<]*<(?!\/code>)[a-z!/]/i
  for (const q of htmlCourse.questions) {
    for (const field of ['question', 'lesson']) {
      assert.ok(!rawTagInCode.test(q[field]), `${q.id} ${field} has an unescaped tag inside <code>`)
    }
  }
})

test('unknown or missing course ids fall back to the HTML course', () => {
  assert.equal(DEFAULT_COURSE_ID, 'html')
  assert.equal(getCourse('html'), htmlCourse)
  assert.equal(getCourse('nope'), htmlCourse)
  assert.equal(getCourse(undefined), htmlCourse)
})

test('the home-page catalog matches the real course data', () => {
  for (const entry of COURSE_CATALOG) {
    const course = COURSES[entry.id]
    assert.ok(course, `catalog lists unknown course ${entry.id}`)
    assert.equal(entry.questionCount, course.questions.length, `${entry.id} question count`)
    assert.equal(entry.levelCount, course.levels.length, `${entry.id} level count`)
  }
})

test('validateCourse catches broken questions', () => {
  const base = { id: 'h-1', level: 1, topic: 't', question: 'q', hint: 'h', lesson: 'l', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }
  const course = (questions) => ({ id: 'x', title: 'X', levels: [{ number: 1, name: 'L', color: '#fff', icon: '*' }], questions })
  assert.deepEqual(validateCourse(course([base])), [])
  assert.match(validateCourse(course([base, { ...base, question: 'other' }])).join(), /duplicate id/)
  assert.match(validateCourse(course([{ ...base, correctIndex: 4 }])).join(), /correctIndex/)
  assert.match(validateCourse(course([{ ...base, options: ['a', 'b', 'c'] }])).join(), /exactly 4 options/)
  assert.match(validateCourse(course([{ ...base, level: 2 }])).join(), /unknown level/)
  assert.match(validateCourse(course([{ ...base, hint: '' }])).join(), /missing hint/)
  assert.match(validateCourse(course([{ ...base, options: ['a', 'a', 'c', 'd'] }])).join(), /repeated option/)
})
