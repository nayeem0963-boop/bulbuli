import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ALPHABETS, HOP_CONFIG as CFG, MODE_IDS, ballPosition, createRun, drainEvents, hopDuration, makeRow,
  multiplier, numberDistractors, createRng, questionFor, stepRun, summary, targetFor, tileUnder, tileX, xpForRun,
} from './engine.js'

const DT = 1 / 60

/** Steps until the ball has landed (or fallen) once; `aim` picks the x to hold during the hop. */
function hopOnce(run, aim) {
  let guard = 0
  const before = run.correct + run.wrong + run.falls
  while (run.correct + run.wrong + run.falls === before && !run.over && guard < 600) {
    if (run.phase === 'air' && aim) run.input.dragX = aim(run)
    stepRun(run, DT)
    guard += 1
  }
  run.input.dragX = null
  return run
}
/** Steps until the ball is about to take off again (after a landing / respawn). */
function settle(run) {
  let guard = 0
  while (run.phase !== 'air' && !run.over && guard < 600) { stepRun(run, DT); guard += 1 }
  return run
}

const aimAt = (pickTile) => (run) => {
  const row = run.rows[run.to]
  const tile = pickTile(row)
  return tileX(row, tile, run.t + 0.05)
}
const correctTile = (row) => row.tiles.find((t) => t.correct)
const wrongTile = (row) => row.tiles.find((t) => !t.correct)
/** An x over the void in that row: past the far edge of the outermost tile. */
const voidX = (run) => {
  const row = run.rows[run.to]
  const xs = row.tiles.map((t) => tileX(row, t, run.t))
  const occupied = (x) => tileUnder(row, x, run.t)
  for (const x of [0, -1.25, 1.25, -CFG.xLimit, CFG.xLimit]) if (!occupied(x)) return x
  return Math.max(...xs) + 2
}

test('the run starts on the wide start pad with 3 hearts and rows already made ahead', () => {
  const run = createRun({ seed: 7 })
  assert.equal(run.row, 0)
  assert.equal(run.hearts, 3)
  assert.equal(run.rows[0].tiles.length, 1)
  assert.equal(run.rows[0].tiles[0].pad, true)
  assert.ok(run.rows.length > 10)
})

test('every row has exactly one correct tile, distinct labels, and tiles that never overlap', () => {
  for (const mode of MODE_IDS) {
    for (const alphabet of ['en', 'bn']) {
      const run = createRun({ seed: 11, mode, alphabet })
      for (let k = 1; k < 80; k += 1) {
        const row = makeRow(k, run)
        assert.equal(row.tiles.filter((t) => t.correct).length, 1, `${mode} row ${k}`)
        const labels = row.tiles.map((t) => t.label)
        assert.equal(new Set(labels).size, labels.length, `${mode} row ${k} labels ${labels}`)
        const xs = row.tiles.map((t) => t.x).sort((a, b) => a - b)
        for (let i = 1; i < xs.length; i += 1) {
          // a real gap between neighbours (bigger than the forgiving edge on both sides)
          assert.ok(xs[i] - xs[i - 1] > row.tiles[0].w + 2 * CFG.forgive, `${mode} row ${k} gap`)
        }
        for (const x of xs) assert.ok(Math.abs(x) + row.tiles[0].w / 2 < CFG.xLimit + 1.2)
      }
    }
  }
})

test('counting rows ask for step × row; the distractors are near it and never the number before', () => {
  const rng = createRng(3)
  for (const [mode, step] of [['by2', 2], ['by3', 3], ['by5', 5], ['by10', 10]]) {
    for (let k = 1; k < 40; k += 1) {
      const tiles = questionFor(mode, k, 3, rng)
      assert.equal(tiles[0].value, step * k)
      for (const t of tiles.slice(1)) {
        assert.ok(t.value > 0 && t.value !== step * k && t.value !== step * (k - 1))
        assert.ok(Math.abs(t.value - step * k) <= 2 * step + 1)
      }
    }
  }
  assert.equal(numberDistractors(2, 2, 2, rng).length, 2)
})

test('vowel rows hold one vowel and only consonants otherwise, in English and Bangla', () => {
  const rng = createRng(5)
  for (const alphabet of ['en', 'bn']) {
    for (let k = 1; k < 30; k += 1) {
      const [right, ...others] = questionFor('vowels', k, 3, rng, alphabet)
      assert.ok(ALPHABETS[alphabet].vowels.includes(right.label))
      for (const o of others) assert.ok(ALPHABETS[alphabet].consonants.includes(o.label))
    }
  }
})

test('the ball bounces on its own: it hops in an arc and lands on the next row', () => {
  const run = createRun({ seed: 1 })
  settle(run)
  assert.equal(run.phase, 'air')
  for (let i = 0; i < 20; i += 1) stepRun(run, DT)
  const mid = ballPosition(run)
  assert.ok(mid.y > 0.5, 'in the air')
  assert.ok(mid.z < 0 && mid.z > -CFG.rowGap, 'between the rows')
  hopOnce(run, aimAt(correctTile))
  assert.equal(run.row, 1)
  assert.equal(run.correct, 1)
  assert.equal(ballPosition(run).y, 0)
})

test('landing on the correct tile scores, grows the combo, and moves on', () => {
  const run = createRun({ seed: 2, mode: 'by3' })
  hopOnce(run, aimAt(correctTile))
  const events = drainEvents(run)
  const landed = events.find((e) => e.type === 'land')
  assert.ok(landed)
  assert.equal(landed.value, 3)
  assert.equal(run.score, CFG.points)
  assert.equal(run.combo, 1)
  assert.deepEqual(targetFor(run), { kind: 'count', step: 3, trail: [0, 3], next: 6 })
})

test('a wrong tile bounces the ball back to where it came from and costs a heart', () => {
  const run = createRun({ seed: 4 })
  hopOnce(run, aimAt(correctTile))
  settle(run)
  hopOnce(run, aimAt(wrongTile))
  const events = drainEvents(run)
  const wrong = events.find((e) => e.type === 'wrong')
  assert.ok(wrong)
  assert.equal(wrong.answer, '4')
  assert.equal(run.hearts, 2)
  assert.equal(run.combo, 0)
  assert.equal(run.phase, 'back')
  assert.ok(run.rows[2].hint, 'the right tile is hinted on the retry')
  settle(run)
  assert.equal(run.row, 1, 'back on the row it left')
  hopOnce(run, aimAt(correctTile))
  assert.equal(run.row, 2)
})

test('missing every tile drops the ball into the clouds; it pops back with one heart fewer', () => {
  const run = createRun({ seed: 9 })
  hopOnce(run, voidX)
  assert.equal(run.falls, 1)
  assert.equal(run.phase, 'fall')
  assert.ok(drainEvents(run).some((e) => e.type === 'fall'))
  let low = 0
  for (let i = 0; i < 30; i += 1) { stepRun(run, DT); low = Math.min(low, ballPosition(run).y) }
  assert.ok(low < -1, 'it really falls')
  settle(run)
  assert.equal(run.row, 0)
  assert.equal(run.hearts, 2)
})

test('three mistakes end the run; practice never ends', () => {
  const run = createRun({ seed: 12 })
  for (let i = 0; i < 3; i += 1) { hopOnce(run, voidX); settle(run) }
  assert.equal(run.over, true)
  assert.ok(drainEvents(run).some((e) => e.type === 'over'))

  const practice = createRun({ seed: 12, practice: true })
  for (let i = 0; i < 6; i += 1) { hopOnce(practice, aimAt(wrongTile)); settle(practice) }
  assert.equal(practice.over, false)
  assert.equal(practice.hearts, 3)
  assert.equal(practice.wrong, 6)
})

test('every 5 in a row raises the multiplier and gives a super bounce (with a boost event)', () => {
  const run = createRun({ seed: 21 })
  const seen = []
  for (let i = 0; i < 5; i += 1) { hopOnce(run, aimAt(correctTile)); seen.push(...drainEvents(run)); settle(run) }
  assert.ok(seen.some((e) => e.type === 'boost'))
  assert.equal(run.phase, 'air')
  const boosted = run.phaseDur
  assert.ok(boosted > hopDuration(run.row), 'the super hop floats longer')
  for (let i = 0; i < Math.floor(boosted / DT / 2); i += 1) stepRun(run, DT)
  assert.ok(ballPosition(run).y > CFG.hop.height * 1.5, 'and goes higher')
  assert.equal(multiplier(4), 1)
  assert.equal(multiplier(5), 2)
  assert.equal(multiplier(99), CFG.maxMultiplier)
  // the 5th hop scored 10 × 2
  assert.equal(run.score, 4 * 10 + 20)
})

test('steering: keys move the ball, a drag pulls it toward the finger, and it stays on the board', () => {
  const run = createRun({ seed: 1 })
  run.input.dir = 1
  for (let i = 0; i < 120; i += 1) stepRun(run, DT)
  assert.ok(run.x <= CFG.xLimit + 1e-9 && run.x > CFG.xLimit - 0.01)
  run.input.dir = 0
  run.input.dragX = -1
  for (let i = 0; i < 40; i += 1) stepRun(run, DT)
  assert.ok(Math.abs(run.x + 1) < 0.05)
  run.input.dragX = -99
  for (let i = 0; i < 60; i += 1) stepRun(run, DT)
  assert.ok(run.x >= -CFG.xLimit)
})

test('hops get a little quicker further on, but never too quick', () => {
  assert.ok(hopDuration(0) > hopDuration(20))
  assert.equal(hopDuration(500), CFG.hop.min)
})

test('a long frame never skips a landing', () => {
  const run = createRun({ seed: 3 })
  settle(run)
  run.input.dragX = tileX(run.rows[1], correctTile(run.rows[1]), 0)
  for (let i = 0; i < 60 && run.correct === 0; i += 1) stepRun(run, 2)
  assert.equal(run.correct, 1)
})

test('summary and XP', () => {
  const run = createRun({ seed: 5, mode: 'by5' })
  for (let i = 0; i < 4; i += 1) { hopOnce(run, aimAt(correctTile)); settle(run) }
  const stats = summary(run)
  assert.equal(stats.correct, 4)
  assert.equal(stats.reached, 20)
  assert.equal(xpForRun(stats, false), 2)
  assert.equal(xpForRun(stats, true), 0)
  assert.equal(xpForRun({ correct: 999, bestCombo: 999 }, false), 40)
})
