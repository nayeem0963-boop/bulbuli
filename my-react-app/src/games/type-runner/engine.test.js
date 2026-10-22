import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRng, createRun, createTargets, getLevel, LEVELS, nextLetter, pressKey, progress, results, WORDS } from './engine.js'

const typeAll = (run, startAt = 0, msPerKey = 500) => {
  let now = startAt
  while (run.finishedAt === null) {
    run = pressKey(run, nextLetter(run), now)
    now += msPerKey
  }
  return run
}

test('targets match each level', () => {
  for (const level of LEVELS) {
    const targets = createTargets(level, createRng(4))
    assert.equal(targets.length, level.count)
    if (level.kind === 'keys') {
      for (const t of targets) assert.ok(level.pool.includes(t.text))
      for (let i = 1; i < targets.length; i += 1) assert.notEqual(targets[i].text, targets[i - 1].text)
    } else {
      assert.equal(new Set(targets.map((t) => t.text)).size, targets.length)
    }
  }
  for (const list of Object.values(WORDS)) {
    for (const entry of list) assert.match(entry.word, /^[a-z]+$/, entry.word)
  }
})

test('right keys move forward, wrong keys only count a mistake', () => {
  const level = getLevel(3)
  let run = createRun(level, createRng(9))
  const word = run.targets[0].text
  assert.equal(nextLetter(run), word[0])

  const wrong = word[0] === 'z' ? 'y' : 'z'
  run = pressKey(run, wrong, 1000)
  assert.equal(run.mistakes, 1)
  assert.equal(run.position, 0)
  assert.equal(run.startedAt, 1000, 'the clock starts on the first key, right or wrong')
  assert.equal(run.last, 'wrong')

  run = pressKey(run, word[0].toUpperCase(), 1200)
  assert.equal(run.position, 1, 'capital letters count')
  assert.ok(progress(run) > 0)

  for (const key of ['Shift', ' ', '1', 'Enter']) assert.equal(pressKey(run, key), run)
})

test('finishing a run and scoring it', () => {
  const level = getLevel(1)
  const run = typeAll(createRun(level, createRng(2)), 0, 1000) // 60 keys a minute
  assert.equal(progress(run), 1)
  assert.equal(pressKey(run, 'a'), run, 'no typing after the finish')
  const score = results(run, level)
  assert.equal(score.accuracy, 100)
  assert.equal(score.stars, 3)
  assert.equal(score.xp, level.count + 9)

  const slow = results(typeAll(createRun(level, createRng(2)), 0, 5000), level) // 12 a minute
  assert.equal(slow.stars, 2)
})
