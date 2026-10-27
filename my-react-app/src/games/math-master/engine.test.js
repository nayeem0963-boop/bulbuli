import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getLevel, LEVELS } from './curriculum/index.js'
import {
  answer, createRng, createRound, currentQuestion, isCorrect, isUnlocked, mergeRecord, next, parseNumericInput,
  pointsFor, rankFor, revealHint, shuffle, starsFor, suggestedLevel, summarize, timeLimitFor, xpForRound,
} from './engine.js'

const level1 = getLevel(1)

/** Plays a whole round, answering correctly for the given question indexes. */
function play(level, mode, correctIndexes, { hintOn = [] } = {}) {
  let round = createRound(level, mode, createRng(7), 0)
  round.questions.forEach((question, index) => {
    if (hintOn.includes(index)) round = revealHint(round)
    const right = correctIndexes.includes(index)
    let response
    if (question.format === 'input') response = { value: right ? String(question.answer) : '999999' }
    else response = { choice: right ? question.answer : question.choices.find((c) => c !== question.answer) }
    round = answer(round, response, { timeLeft: 0 }).round
    round = next(round, 1000 * (index + 1))
  })
  return round
}

test('shuffle keeps every item and is repeatable with a seed', () => {
  const list = ['a', 'b', 'c', 'd']
  assert.deepEqual([...shuffle(list, createRng(3))].sort(), list)
  assert.deepEqual(shuffle(list, createRng(3)), shuffle(list, createRng(3)))
})

test('typed answers accept the usual ways of writing a number', () => {
  assert.equal(parseNumericInput('5'), 5)
  assert.equal(parseNumericInput(' x = 5 '), 5)
  assert.equal(parseNumericInput('−3.5'), -3.5)
  assert.equal(parseNumericInput('3,5'), 3.5)
  assert.equal(parseNumericInput('7/2'), 3.5)
  assert.ok(Number.isNaN(parseNumericInput('')))
  assert.ok(Number.isNaN(parseNumericInput('five')))
  assert.ok(Number.isNaN(parseNumericInput('1/0')))
})

test('a round keeps the answer among the shuffled choices; tap-the-point questions keep A–D order', () => {
  for (const level of LEVELS) {
    const round = createRound(level, 'practice', createRng(level.id))
    round.questions.forEach((question, i) => {
      if (question.format === 'input') return
      assert.ok(question.choices.includes(question.answer))
      assert.deepEqual([...question.choices].sort(), [...level.questions[i].choices].sort())
      if (question.format === 'pick') assert.deepEqual(question.choices, ['A', 'B', 'C', 'D'])
    })
  }
})

test('a question can only be answered once: no double scoring', () => {
  let round = createRound(level1, 'practice', createRng(1))
  const question = currentQuestion(round)
  const first = answer(round, { choice: question.answer })
  assert.equal(first.outcome.correct, true)
  assert.equal(first.round.score, 100)
  const second = answer(first.round, { choice: question.answer })
  assert.equal(second.outcome, 'ignored')
  assert.equal(second.round.score, 100)
  assert.equal(second.round.responses.length, 1)
  // a late timeout after answering is ignored as well
  assert.equal(answer(first.round, { timeout: true }).outcome, 'ignored')
  round = next(first.round)
  assert.equal(round.index, 1)
  assert.equal(round.phase, 'asking')
  // next() before answering does nothing
  assert.equal(next(round), round)
})

test('invalid responses are ignored rather than marked wrong', () => {
  const round = createRound(level1, 'practice', createRng(1))
  assert.equal(answer(round, { choice: 'not a choice' }).outcome, 'ignored')
  const inputRound = createRound(getLevel(3), 'practice', createRng(1)) // L3-01 is a typed answer
  assert.equal(currentQuestion(inputRound).format, 'input')
  assert.equal(answer(inputRound, { value: '' }).outcome, 'ignored')
  assert.equal(answer(inputRound, { value: 'x = 7' }).outcome.correct, true)
})

test('scoring: hints halve the base, streaks add up to +50, Challenge adds a time bonus', () => {
  assert.equal(pointsFor({ correct: false, streak: 0 }), 0)
  assert.equal(pointsFor({ correct: true, hintUsed: false, streak: 1, mode: 'practice' }), 100)
  assert.equal(pointsFor({ correct: true, hintUsed: true, streak: 1, mode: 'practice' }), 50)
  assert.equal(pointsFor({ correct: true, streak: 3, mode: 'practice' }), 120)
  assert.equal(pointsFor({ correct: true, streak: 20, mode: 'practice' }), 150)
  assert.equal(pointsFor({ correct: true, streak: 1, mode: 'challenge', timeLeft: 30, timeLimit: 60 }), 125)
  assert.equal(pointsFor({ correct: true, streak: 1, mode: 'practice', timeLeft: 30, timeLimit: 60 }), 100)
})

test('timeouts count as incorrect and break the streak; time limits grow with difficulty', () => {
  let round = createRound(level1, 'challenge', createRng(2))
  assert.equal(round.timeLimit, 60)
  round = answer(round, { choice: currentQuestion(round).answer }, { timeLeft: 60 }).round
  assert.equal(round.score, 150)
  round = next(round)
  const { round: after, outcome } = answer(round, { timeout: true }, { timeLeft: 0 })
  assert.equal(outcome.correct, false)
  assert.equal(outcome.timedOut, true)
  assert.equal(after.streak, 0)
  assert.equal(timeLimitFor(getLevel(10)), 120)
  assert.equal(createRound(level1, 'practice').timeLimit, null)
})

test('hints can be opened once, only while a question is open', () => {
  let round = createRound(level1, 'practice', createRng(1))
  round = revealHint(round)
  assert.equal(round.hintUsed, true)
  assert.equal(revealHint(round), round)
  round = answer(round, { choice: currentQuestion(round).answer }).round
  assert.equal(round.score, 50)
  round = next(round)
  assert.equal(round.hintUsed, false)
})

test('summary: accuracy, stars, topic breakdown and concepts to practise', () => {
  const round = play(level1, 'practice', [0, 1, 2, 3, 4, 5, 6])
  assert.equal(round.phase, 'done')
  const summary = summarize(round)
  assert.equal(summary.correct, 7)
  assert.equal(summary.incorrect, 3)
  assert.equal(summary.accuracy, 0.7)
  assert.equal(summary.stars, 1)
  assert.equal(summary.durationMs, 10000)
  assert.equal(summary.byTopic.reduce((n, t) => n + t.total, 0), 10)
  assert.deepEqual(summary.practise, ['Squares, cubes & roots', 'Factors & multiples', 'Prime numbers'])
  assert.equal(summary.missed.length, 3)
})

test('stars need 50% / 75% / 90%; nobody needs a perfect score to progress', () => {
  assert.equal(starsFor(0.49), 0)
  assert.equal(starsFor(0.5), 1)
  assert.equal(starsFor(0.75), 2)
  assert.equal(starsFor(0.9), 3)
})

test('XP: per correct answer, plus first clear and new stars only (replays cannot farm stars)', () => {
  assert.equal(xpForRound({ previousBestStars: 0, stars: 3, correct: 10, mode: 'practice' }), 10 + 20 + 30)
  assert.equal(xpForRound({ previousBestStars: 3, stars: 3, correct: 10, mode: 'practice' }), 10)
  assert.equal(xpForRound({ previousBestStars: 1, stars: 2, correct: 8, mode: 'challenge' }), 16 + 10)
  assert.equal(xpForRound({ previousBestStars: 0, stars: 0, correct: 3, mode: 'practice' }), 3)
})

test('levels unlock one at a time when the previous level is cleared', () => {
  let record = {}
  assert.equal(isUnlocked(1, record), true)
  assert.equal(isUnlocked(2, record), false)
  assert.equal(rankFor(record), 'novice')
  assert.equal(suggestedLevel(record), 1)

  const failed = summarize(play(level1, 'practice', [0, 1]))
  record = mergeRecord(record, failed, new Date(0))
  assert.equal(isUnlocked(2, record), false)
  assert.equal(record.levels[1].plays, 1)
  assert.equal(record.levels[1].firstClearedAt, null)

  const cleared = summarize(play(level1, 'challenge', [0, 1, 2, 3, 4, 5, 6, 7, 8]))
  record = mergeRecord(record, cleared, new Date(1000))
  assert.equal(isUnlocked(2, record), true)
  assert.equal(isUnlocked(3, record), false)
  assert.equal(record.levels[1].bestStars, 3)
  assert.equal(record.levels[1].plays, 2)
  assert.equal(record.totalStars, 3)
  assert.equal(record.correctAnswers, 11)
  assert.equal(suggestedLevel(record), 2)

  // a worse replay never lowers the best
  record = mergeRecord(record, failed, new Date(2000))
  assert.equal(record.levels[1].bestStars, 3)
  assert.equal(record.levels[1].firstClearedAt, new Date(1000).toISOString())

  const level3 = summarize(play(getLevel(3), 'practice', [...Array(14).keys()]))
  assert.equal(rankFor(mergeRecord(record, level3)), 'apprentice')
})

test('every question in the bank can be answered correctly through the engine', () => {
  for (const level of LEVELS) {
    const round = play(level, 'practice', [...Array(level.questions.length).keys()])
    const summary = summarize(round)
    assert.equal(summary.correct, level.questions.length, `level ${level.id}`)
    assert.equal(summary.stars, 3)
    for (const question of level.questions) {
      assert.equal(isCorrect(question, { timeout: true }), false)
    }
  }
})
