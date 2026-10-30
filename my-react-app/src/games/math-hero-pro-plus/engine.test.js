import assert from 'node:assert/strict'
import test from 'node:test'
import {
  answer, bestStars, createRound, currentQuestion, getLevel, isUnlocked, LEVELS, MAX_STARS, MAX_XP, mergeRecord, next,
  QUESTIONS_PER_LEVEL, starsFor, suggestedLevel, summarize, totalStars, xpForRound,
} from './engine.js'
import { parseRatio } from './questions.js'

const SEEDS = Array.from({ length: 300 }, (_, i) => i * 7919 + 1)
const close = (a, b) => Math.abs(a - b) < 1e-6

/** A choice as a number: '0.75' → 0.75, '2 : 3' → 2/3. */
const value = (text) => {
  if (text.includes(':')) { const [a, b] = parseRatio(text); return a / b }
  return Number(text)
}

/** Turns an expression from a card ('3x + 5', '4² − 2 × (7 − 3)', '25% × 80') into a function of x. */
function compile(expr) {
  const js = expr
    .replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/²/g, '**2')
    .replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')
    .replace(/(\d)x/g, '$1*x').replace(/(\d)\(/g, '$1*(')
  return new Function('x', `return (${js})`)
}

/** Both sides of `equation` agree when the answer is put in for ? (or x). */
function equationHolds(equation, ans) {
  const [left, right] = equation.replace(/\?/g, ans).split('=')
  return close(compile(left)(Number(ans)), compile(right)(Number(ans)))
}

const nums = (text) => (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)

/** Works the answer out again, independently of questions.js, wherever the question allows it. */
function recheck(q) {
  const a = Number(q.answer)
  const p = q.prompt.en
  if (q.equation?.includes('=') && !q.equation.includes(':')) return equationHolds(q.equation, q.answer)
  if (q.topic === 'ratio' && q.equation && !q.equation.includes('=')) {
    const [x, y] = q.equation.split(':').map(Number)
    const [r, s] = parseRatio(q.answer)
    const gcd = (m, n) => (n ? gcd(n, m % n) : m)
    return x * s === y * r && gcd(r, s) === 1
  }
  let m
  if ((m = q.equation?.match(/^(\d+) : (\d+) = \? : (\d+)$/))) return close(m[1] / m[2], a / m[3])
  if ((m = p.match(/costs (\d+) taka\. It is (\d+)% off/))) return close(a, m[1] * (1 - m[2] / 100))
  if ((m = p.match(/After a (\d+)% discount, .* costs (\d+) taka/))) return close(a * (1 - m[1] / 100), Number(m[2]))
  if ((m = p.match(/had (\d+) students.*grew by (\d+)%/))) return close(a, m[1] * (1 + m[2] / 100))
  if ((m = p.match(/holds (\d+) litres\. (\d+)% of the water is used/))) return close(a, m[1] * (1 - m[2] / 100))
  if ((m = p.match(/scored (\d+) out of (\d+)/))) return close(a, (m[1] / m[2]) * 100)
  if ((m = p.match(/^(\d+) \w+ cost (\d+) taka/))) return close(a * m[1], Number(m[2]))
  if ((m = p.match(/travels (\d+) km in (\d+) hours/))) return close(a * m[2], Number(m[1]))
  if ((m = p.match(/uses (\d+) eggs to make (\d+) pancakes.*for (\d+) pancakes/))) return close(a, (m[1] * m[3]) / m[2])
  if ((m = p.match(/ratio (\d+) : (\d+)\. There are (\d+) members/))) return close(a, (m[3] * m[2]) / (Number(m[1]) + Number(m[2])))
  if ((m = p.match(/1 cm stands for (\d+) km\. .* (\d+) cm apart/))) return close(a, m[1] * m[2])
  if ((m = p.match(/prints (\d+) pages in (\d+) minutes.* in (\d+) minutes/))) return close(a, (m[1] / m[2]) * m[3])
  if ((m = p.match(/Pack A has (\d+) for (\d+) taka\. Pack B has (\d+) for (\d+) taka/))) return close(a, Math.min(m[2] / m[1], m[4] / m[3]))
  if ((m = p.match(/ratio (\d+) : (\d+)\. There are (\d+) more red/))) return close(a, (m[3] / (m[1] - m[2])) * m[2])
  if ((m = p.match(/multiplies it by (\d+), then subtracts (\d+)\. The result is (\d+)/))) return close(a * m[1] - m[2], Number(m[3]))
  const v = q.visual
  if (v?.kind === 'rect' && p.includes('perimeter of this')) return close(a, 2 * (Number(v.w) + Number(v.h)))
  if (v?.kind === 'rect' && p.includes('area of this')) return close(a, Number(v.w) * Number(v.h))
  if ((m = p.match(/area of (\d+) cm² and a length of (\d+) cm/))) return close(a * m[2], Number(m[1]))
  if ((m = p.match(/square has a perimeter of (\d+) cm/))) return close(a, (m[1] / 4) ** 2)
  if (v?.kind === 'triangle' && v.isosceles) return close(v.angles[0] + 2 * a, 180)
  if (v?.kind === 'triangle') return close(v.angles.filter(Boolean).reduce((s, x) => s + x, 0) + a, 180)
  if (v?.kind === 'quad') return close(v.angles.filter(Boolean).reduce((s, x) => s + x, 0) + a, 360)
  if (v?.kind === 'triArea') return close(a, (Number(v.base) * Number(v.height)) / 2)
  if (v?.kind === 'lshape') return close(a, v.W * v.H - v.w * v.h)
  return null
}

test('five levels worth 60–80 XP, each with its own badge', () => {
  assert.equal(LEVELS.length, 5)
  assert.deepEqual(LEVELS.map((l) => l.id), [1, 2, 3, 4, 5])
  for (const level of LEVELS) {
    assert.ok(level.maxXp >= 60 && level.maxXp <= 80)
    assert.ok(level.title.en && level.title.bn && level.badge.name.en && level.badge.name.bn)
  }
  assert.equal(new Set(LEVELS.map((l) => l.badge.id)).size, 5)
  assert.ok(LEVELS.some((l) => l.badge.name.en === 'Algebra Apprentice'))
  assert.ok(LEVELS.some((l) => l.badge.name.en === 'Math Tactician'))
  assert.equal(MAX_STARS, 15)
  assert.equal(MAX_XP, 350)
})

test('every generated round is well formed and every answer re-checks (300 rounds per level)', () => {
  let rechecked = 0
  for (const level of LEVELS) {
    for (const seed of SEEDS) {
      const round = createRound(level.id, seed)
      assert.equal(round.questions.length, QUESTIONS_PER_LEVEL)
      assert.equal(new Set(round.questions.map((q) => q.id)).size, QUESTIONS_PER_LEVEL, `duplicate id in level ${level.id}`)
      for (const q of round.questions) {
        const where = `level ${level.id} seed ${seed}: ${q.prompt.en} ${q.equation ?? ''}`
        assert.equal(q.choices.length, 4, where)
        assert.equal(new Set(q.choices.map(value)).size, 4, `choices must differ in value — ${where} [${q.choices}]`)
        assert.ok(q.choices.includes(q.answer), where)
        for (const c of q.choices) {
          assert.ok(Number.isFinite(value(c)) && value(c) >= 0, `bad choice ${c} — ${where}`)
          assert.ok(c.length <= 7, `choice too long for a button: ${c} — ${where}`)
        }
        for (const field of ['prompt', 'explain', 'tip']) {
          for (const lang of ['en', 'bn']) {
            const text = q[field][lang]
            assert.ok(typeof text === 'string' && text.length > 3, `${field}.${lang} — ${where}`)
            assert.doesNotMatch(text, /undefined|NaN|\[object|Infinity/, `${field}.${lang} — ${where}`)
          }
        }
        if (q.unit && typeof q.unit !== 'string') assert.ok(q.unit.en && q.unit.bn, where)
        assert.ok(q.explain.en.includes(q.answer), `explanation names the answer — ${where}`)
        assert.ok(q.explain.bn.includes(q.answer), `Bangla explanation names the answer — ${where}`)
        // the numbers in the English and Bangla prompts match
        const sorted = (text) => nums(text).filter((x) => x !== 1).sort((x, y) => x - y)
        assert.deepEqual(sorted(q.prompt.bn), sorted(q.prompt.en), `prompt numbers — ${where}`)
        const ok = recheck(q)
        if (ok !== null) { assert.ok(ok, `answer is wrong — ${where} → ${q.answer}`); rechecked++ }
      }
    }
  }
  assert.equal(rechecked, LEVELS.length * SEEDS.length * QUESTIONS_PER_LEVEL, 'every question type can be re-checked')
})

test('level topics match the curriculum', () => {
  const topics = (id) => new Set(createRound(id, 42).questions.map((q) => q.topic))
  assert.deepEqual([...topics(1)], ['order'])
  assert.deepEqual([...topics(2)].sort(), ['decimal', 'percent'])
  assert.deepEqual([...topics(3)].sort(), ['rate', 'ratio'])
  assert.deepEqual([...topics(4)], ['algebra'])
  assert.deepEqual([...topics(5)], ['geometry'])
  // Level 4 goes from one-step (x + a = b) to x on both sides
  const algebra = createRound(4, 7).questions
  assert.match(algebra[0].equation, /^x \+ \d+ = \d+$/)
  assert.match(algebra[9].equation, /x .*=.*x/)
})

test('the same seed gives the same round', () => {
  assert.deepEqual(createRound(3, 99), createRound(3, 99))
})

test('stars: 50% → 1, 75% → 2, 90% → 3', () => {
  const expected = [0, 0, 0, 0, 0, 1, 1, 1, 2, 3, 3]
  expected.forEach((stars, correct) => assert.equal(starsFor(correct, 10), stars, `${correct}/10`))
  assert.equal(starsFor(0, 0), 0)
})

test('XP pays each new star once, and practice rounds still earn a little', () => {
  assert.equal(xpForRound({ maxXp: 60, previousBestStars: 0, stars: 3, correct: 10 }), 60)
  assert.equal(xpForRound({ maxXp: 75, previousBestStars: 1, stars: 3, correct: 9 }), 50)
  assert.equal(xpForRound({ maxXp: 80, previousBestStars: 0, stars: 1, correct: 5 }), 27)
  assert.equal(xpForRound({ maxXp: 80, previousBestStars: 1, stars: 3, correct: 10 }), 53) // 27 + 53 = 80 in total
  assert.equal(xpForRound({ maxXp: 65, previousBestStars: 3, stars: 3, correct: 10 }), 10)
  assert.equal(xpForRound({ maxXp: 65, previousBestStars: 2, stars: 0, correct: 2 }), 2)
})

test('a round goes asking → answered → … → done and ignores answers out of turn', () => {
  let round = createRound(4, 5)
  for (let i = 0; i < QUESTIONS_PER_LEVEL; i++) {
    const q = currentQuestion(round)
    assert.equal(round.phase, 'asking')
    const wrong = q.choices.find((c) => c !== q.answer)
    const pick = i < 9 ? q.answer : wrong
    const result = answer(round, pick)
    assert.equal(result.outcome.correct, pick === q.answer)
    assert.equal(answer(result.round, q.answer).outcome, 'ignored', 'no second answer')
    round = next(result.round)
  }
  assert.equal(round.phase, 'done')
  assert.equal(currentQuestion(round), null)
  assert.deepEqual(summarize(round), { levelId: 4, correct: 9, total: 10, percent: 90, stars: 3 })
})

test('levels unlock one at a time with a star, and the record keeps the best results', () => {
  let record = {}
  assert.ok(isUnlocked(1, record))
  assert.ok(!isUnlocked(2, record))
  record = mergeRecord(record, { levelId: 1, correct: 4, stars: 0 }, 'a')
  assert.ok(!isUnlocked(2, record))
  record = mergeRecord(record, { levelId: 1, correct: 8, stars: 2 }, 'b')
  assert.ok(isUnlocked(2, record))
  assert.deepEqual(record.badges, ['order-commander'])
  assert.equal(suggestedLevel(record), 1)
  record = mergeRecord(record, { levelId: 1, correct: 6, stars: 1 }, 'c')
  assert.equal(bestStars(record, 1), 2)
  assert.equal(record.levels[1].plays, 3)
  assert.equal(totalStars(record), 2)
  assert.equal(getLevel(6), null)
})
