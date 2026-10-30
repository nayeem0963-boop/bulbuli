import assert from 'node:assert/strict'
import test from 'node:test'
import {
  answer, bestStars, createRound, currentQuestion, getLevel, isUnlocked, LEVELS, MAX_STARS, mergeRecord, next,
  QUESTIONS_PER_LEVEL, starsFor, suggestedLevel, summarize, totalStars, xpForRound,
} from './engine.js'
import { parseFraction } from './questions.js'

const SEEDS = Array.from({ length: 300 }, (_, i) => i * 7919 + 1)
const value = (text) => {
  if (text.includes('/')) { const [n, d] = parseFraction(text); return n / d }
  return Number(text)
}

/** Works out the answer from the question itself, wherever the question makes that possible. */
function expectedAnswer(q) {
  const eq = q.equation?.replace('−', '-').replace('×', '*').replace('÷', '/')
  let m
  if (eq && (m = eq.match(/^(\d+) ([-+*/]) (\d+) = \?$/))) {
    const [a, op, b] = [Number(m[1]), m[2], Number(m[3])]
    return String({ '+': a + b, '-': a - b, '*': a * b, '/': a / b }[op])
  }
  if (eq && (m = eq.match(/^(\d+) \+ \? = (\d+)$/))) return String(Number(m[2]) - Number(m[1]))
  if (eq && (m = eq.match(/^\? \+ (\d+) = (\d+)$/))) return String(Number(m[2]) - Number(m[1]))
  if (q.visual?.kind === 'fraction') {
    const { parts, shaded } = q.visual
    return q.prompt.en.includes('NOT') ? `${parts - shaded}/${parts}` : `${shaded}/${parts}`
  }
  if (q.visual?.kind === 'compare') {
    const dens = q.visual.fractions.map(([, d]) => d)
    return `1/${q.prompt.en.includes('BIGGEST') ? Math.min(...dens) : Math.max(...dens)}`
  }
  if (q.visual?.kind === 'pattern') {
    const nums = q.visual.items.map(Number)
    return String(nums[3] + (nums[1] - nums[0]))
  }
  return null
}

test('there are five levels worth 50–70 XP, each with its own badge', () => {
  assert.equal(LEVELS.length, 5)
  assert.deepEqual(LEVELS.map((l) => l.id), [1, 2, 3, 4, 5])
  for (const level of LEVELS) {
    assert.ok(level.maxXp >= 50 && level.maxXp <= 70)
    assert.ok(level.title.en && level.title.bn && level.badge.name.en && level.badge.name.bn)
  }
  assert.equal(new Set(LEVELS.map((l) => l.badge.id)).size, 5)
  assert.equal(MAX_STARS, 15)
})

test('every generated round is well formed and every answer is right (300 rounds per level)', () => {
  let checked = 0
  for (const level of LEVELS) {
    for (const seed of SEEDS) {
      const round = createRound(level.id, seed)
      assert.equal(round.questions.length, QUESTIONS_PER_LEVEL)
      assert.equal(new Set(round.questions.map((q) => q.id)).size, QUESTIONS_PER_LEVEL, `duplicate id in level ${level.id}`)
      for (const q of round.questions) {
        const where = `level ${level.id} seed ${seed}: ${q.prompt.en}`
        assert.equal(q.choices.length, 4, where)
        assert.equal(new Set(q.choices.map(value)).size, 4, `choices must differ in value — ${where}`)
        assert.ok(q.choices.includes(q.answer), where)
        for (const c of q.choices) assert.ok(Number.isFinite(value(c)) && value(c) >= 0, `bad choice ${c} — ${where}`)
        if (!q.answer.includes('/')) assert.ok(Number.isInteger(Number(q.answer)), where)
        for (const field of ['prompt', 'explain', 'tip']) {
          for (const lang of ['en', 'bn']) {
            const text = q[field][lang]
            assert.ok(typeof text === 'string' && text.length > 3, `${field}.${lang} — ${where}`)
            assert.doesNotMatch(text, /undefined|NaN|\[object/, `${field}.${lang} — ${where}`)
          }
        }
        assert.ok(q.explain.en.includes(q.answer) || q.explain.en.includes(q.answer.split('/')[0]), `explanation names the answer — ${where}`)
        const expected = expectedAnswer(q)
        if (expected !== null) { assert.equal(q.answer, expected, where); checked++ }
      }
    }
  }
  assert.ok(checked > 8000, `only ${checked} answers could be re-computed`)
})

test('level topics match the curriculum', () => {
  const round = (id) => createRound(id, 42).questions
  assert.ok(round(1).every((q) => ['add', 'sub', 'bond'].includes(q.topic)))
  assert.ok(round(2).every((q) => q.topic === 'mul' && q.visual.kind === 'array' && q.visual.rows <= 10 && q.visual.cols <= 10))
  assert.ok(round(3).every((q) => q.topic === 'div' && Number.isInteger(Number(q.answer))))
  assert.ok(round(4).every((q) => ['fraction', 'compare'].includes(q.topic)))
  assert.ok(round(5).every((q) => ['word', 'logic'].includes(q.topic)))
})

test('the same seed gives the same round', () => {
  assert.deepEqual(createRound(3, 99), createRound(3, 99))
})

test('stars: 50% → 1, 75% → 2, 90% → 3', () => {
  const expected = [0, 0, 0, 0, 0, 1, 1, 1, 2, 3, 3]
  expected.forEach((stars, correct) => assert.equal(starsFor(correct, 10), stars, `${correct}/10`))
  assert.equal(starsFor(3, 4), 2)
  assert.equal(starsFor(0, 0), 0)
})

test('XP pays each new star once, and practice rounds still earn a little', () => {
  assert.equal(xpForRound({ maxXp: 60, previousBestStars: 0, stars: 3, correct: 10 }), 60)
  assert.equal(xpForRound({ maxXp: 60, previousBestStars: 1, stars: 3, correct: 9 }), 40)
  assert.equal(xpForRound({ maxXp: 70, previousBestStars: 0, stars: 1, correct: 5 }), 23)
  assert.equal(xpForRound({ maxXp: 70, previousBestStars: 1, stars: 3, correct: 10 }), 47) // 23 + 47 = 70 in total
  assert.equal(xpForRound({ maxXp: 50, previousBestStars: 3, stars: 3, correct: 10 }), 10)
  assert.equal(xpForRound({ maxXp: 50, previousBestStars: 2, stars: 0, correct: 2 }), 2)
  assert.equal(xpForRound({ maxXp: 50, previousBestStars: 0, stars: 0, correct: 0 }), 0)
})

test('a round goes asking → answered → … → done and ignores answers out of turn', () => {
  let round = createRound(1, 5)
  for (let i = 0; i < QUESTIONS_PER_LEVEL; i++) {
    const q = currentQuestion(round)
    assert.equal(round.phase, 'asking')
    const wrong = q.choices.find((c) => c !== q.answer)
    const pick = i < 8 ? q.answer : wrong
    const result = answer(round, pick)
    assert.equal(result.outcome.correct, pick === q.answer)
    assert.equal(answer(result.round, q.answer).outcome, 'ignored', 'no second answer')
    round = next(result.round)
  }
  assert.equal(round.phase, 'done')
  assert.equal(currentQuestion(round), null)
  assert.deepEqual(summarize(round), { levelId: 1, correct: 8, total: 10, percent: 80, stars: 2 })
  assert.equal(answer(createRound(1, 5), 'not a choice').outcome, 'ignored')
})

test('levels unlock one at a time with a star, and the record keeps the best results', () => {
  let record = {}
  assert.ok(isUnlocked(1, record))
  assert.ok(!isUnlocked(2, record))
  assert.equal(suggestedLevel(record), 1)

  record = mergeRecord(record, { levelId: 1, correct: 4, stars: 0 }, 'a')
  assert.ok(!isUnlocked(2, record))
  assert.deepEqual(record.badges, [])

  record = mergeRecord(record, { levelId: 1, correct: 9, stars: 3 }, 'b')
  assert.ok(isUnlocked(2, record))
  assert.ok(!isUnlocked(3, record))
  assert.deepEqual(record.badges, ['number-explorer'])
  assert.equal(suggestedLevel(record), 2)

  record = mergeRecord(record, { levelId: 1, correct: 6, stars: 1 }, 'c')
  assert.equal(bestStars(record, 1), 3)
  assert.equal(record.levels[1].bestCorrect, 9)
  assert.equal(record.levels[1].plays, 3)
  assert.deepEqual(record.badges, ['number-explorer'])
  assert.equal(totalStars(record), 3)
  assert.ok(!isUnlocked(6, record))
  assert.equal(getLevel(6), null)
})
