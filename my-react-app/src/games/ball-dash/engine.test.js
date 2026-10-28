import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BALL_DASH_CONFIG as CFG } from './config.js'
import {
  createRng, createRun, drainEvents, gapSecAt, jump, moveLeft, moveRight, passableLanes, rowIsFair,
  shrink, shrinkScale, speedAt, stepRun, summary, xpForRun,
} from './engine.js'

const DT = 1 / 60
const run = (seconds, state, each) => {
  for (let t = 0; t < seconds && !state.over; t += DT) {
    each?.(state)
    stepRun(state, DT)
  }
  return state
}

/** The next row that hasn't been passed yet, and how many seconds until the ball reaches it. */
function nextRow(state) {
  const row = state.rows.find((r) => !r.passed && r.at - state.dist > -0.3)
  return row ? { row, dz: row.at - state.dist, secs: (row.at - state.dist) / state.speed } : null
}

/**
 * A player model. `reaction`: seconds before they act on something they have seen;
 * `lookSec`: how far ahead (in seconds) they notice things; `jitter`: timing error on jumps/shrinks;
 * `blunder`: chance to not react to a row at all.
 */
function makeBot({ reaction, lookSec, jitter, blunder, seed }) {
  const rng = createRng(seed)
  const seen = new Map()
  return (state) => {
    const next = nextRow(state)
    if (!next) return
    const { row, secs } = next
    if (secs > lookSec) return
    if (!seen.has(row.id)) {
      seen.set(row.id, { at: state.t + reaction + rng() * 0.15, skip: rng() < blunder, done: false, lead: rng() })
    }
    const plan = seen.get(row.id)
    if (plan.skip || state.t < plan.at || plan.done) return
    if (row.kind === 'lanes') {
      const safe = passableLanes(row)
      if (safe.includes(state.lane)) { plan.done = true; return }
      const target = safe.reduce((best, lane) => (Math.abs(lane - state.lane) < Math.abs(best - state.lane) ? lane : best))
      if (target < state.lane) moveLeft(state)
      else moveRight(state)
      return
    }
    // timing of the press: a perfect press would be about half the jump before the bar
    if (row.kind === 'hurdle' && secs <= CFG.jump.duration * 0.5 + (plan.lead - 0.5) * jitter * 2) {
      jump(state)
      plan.done = true
    }
    if (row.kind === 'gate' && secs <= 0.5 + (plan.lead - 0.5) * jitter * 2) {
      shrink(state)
      plan.done = true
    }
  }
}

test('speed: flat while learning, gentle up to 60 s, then a slow ramp to a cap', () => {
  assert.equal(speedAt(0), CFG.speed.initial)
  assert.equal(speedAt(39), CFG.speed.initial)
  assert.ok(speedAt(50) > CFG.speed.initial && speedAt(50) < CFG.speed.at60)
  assert.equal(speedAt(60), CFG.speed.at60)
  assert.ok(speedAt(120) > speedAt(60))
  assert.equal(speedAt(10_000), CFG.speed.max)
  // the gap in seconds never goes below the floor
  assert.equal(gapSecAt(10_000), CFG.minGapSec)
})

test('lanes: the ball glides between lanes and never leaves the track', () => {
  const s = createRun({ seed: 1 })
  assert.equal(s.x, 0)
  moveLeft(s); moveLeft(s); moveLeft(s) // a third press does nothing
  assert.equal(s.lane, 0)
  stepRun(s, 0.05)
  assert.ok(s.x < 0 && s.x > CFG.lanes[0], 'moving, not teleporting')
  run(0.5, s)
  assert.equal(s.x, CFG.lanes[0])
  moveRight(s); moveRight(s); moveRight(s)
  assert.equal(s.lane, 2)
  run(0.6, s)
  assert.equal(s.x, CFG.lanes[2])
})

test('jump: one smooth arc, lands back on the ground, no mid-air double jump', () => {
  const s = createRun({ seed: 2 })
  assert.equal(jump(s), true)
  assert.equal(jump(s), false, 'no second jump in the air')
  let peak = 0
  let airborne = 0
  for (let i = 0; i < 70; i += 1) {
    stepRun(s, DT)
    peak = Math.max(peak, s.y)
    if (s.jumpT >= 0) airborne += DT
  }
  assert.ok(Math.abs(peak - CFG.jump.height) < 0.05, `peak ${peak}`)
  assert.ok(Math.abs(airborne - CFG.jump.duration) < 0.05)
  assert.equal(s.y, 0)
  assert.equal(s.jumpT, -1)
})

test('jump: a press just before landing jumps again on landing (forgiving), an early one does not', () => {
  const s = createRun({ seed: 3 })
  jump(s)
  run(CFG.jump.duration * 0.3, s)
  jump(s) // far too early: ignored
  run(CFG.jump.duration * 0.8, s)
  assert.equal(s.jumpT, -1, 'landed and stayed down')
  jump(s)
  run(CFG.jump.duration - 0.1, s)
  jump(s) // within the buffer
  run(0.15, s)
  assert.ok(s.jumpT >= 0, 'jumped again on landing')
})

test('shrink: eases down, holds, always grows back by itself', () => {
  assert.equal(shrinkScale(-1), 1)
  assert.equal(shrinkScale(CFG.shrink.duration / 2), CFG.shrink.scale)
  const s = createRun({ seed: 4 })
  shrink(s)
  run(CFG.shrink.duration / 2, s)
  assert.equal(s.scale, CFG.shrink.scale)
  run(CFG.shrink.duration, s)
  assert.equal(s.scale, 1)
  assert.equal(s.shrinkT, -1)
  const events = drainEvents(s).map((e) => e.type)
  assert.ok(events.includes('shrink') && events.includes('grow'))
})

test('fairness rule: rejects rows with no way through, or too little time to switch lanes', () => {
  const lanes = (a, b, c) => ({ kind: 'lanes', lanes: [a, b, c] })
  assert.equal(rowIsFair(null, lanes('crate', 'crate', 'crate'), 10), false)
  const leftFree = lanes(null, 'crate', 'crate')
  const rightFree = lanes('crate', 'crate', null)
  assert.equal(rowIsFair(leftFree, rightFree, 0.5), false, 'two lanes over in half a second')
  assert.equal(rowIsFair(leftFree, rightFree, 2), true)
  assert.equal(rowIsFair({ kind: 'hurdle' }, { kind: 'gate' }, 0.9), false, 'needs time to land first')
  assert.equal(rowIsFair({ kind: 'hurdle' }, { kind: 'gate' }, 2), true)
})

test('generator: every row in 5 minutes of play has a way through, one move at a time, with time to react', () => {
  for (let seed = 1; seed <= 150; seed += 1) {
    const s = createRun({ seed, practice: true })
    let prev = null
    const checked = new Set()
    run(300, s, (state) => {
      for (const row of state.rows) {
        if (checked.has(row.id)) continue
        checked.add(row.id)
        assert.ok(passableLanes(row).length > 0, `seed ${seed}: row with no way through`)
        if (row.kind === 'lanes') assert.ok(row.lanes.filter(Boolean).length <= 2)
        if (prev) {
          const gapSec = (row.at - prev.at) / speedAt(state.t + (row.at - state.dist) / state.speed)
          assert.ok(rowIsFair(prev, row, gapSec * 1.02), `seed ${seed}: unfair pair at ${row.at.toFixed(1)} m`)
        }
        prev = row
      }
    })
  }
})

test('generator: nothing to jump or shrink in the first 20 s, and the first hurdle comes before the first gate', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const s = createRun({ seed, practice: true })
    const firstSeen = {}
    run(70, s, (state) => {
      for (const row of state.rows) {
        if (row.kind !== 'lanes' && firstSeen[row.kind] === undefined) firstSeen[row.kind] = row.at / CFG.speed.initial
      }
    })
    assert.ok(firstSeen.hurdle >= CFG.introduce.hurdleAt - 1, `seed ${seed} hurdle at ${firstSeen.hurdle}`)
    assert.ok(firstSeen.gate > firstSeen.hurdle)
    const firstObstacle = s.rows.length ? Math.min(...s.rows.map((r) => r.at)) : Infinity
    assert.ok(firstObstacle >= 0, 'sanity')
  }
})

test('a perfect player is never bumped in 5 minutes (no impossible sequence)', () => {
  for (let seed = 1; seed <= 120; seed += 1) {
    const s = createRun({ seed })
    const bot = makeBot({ reaction: 0.2, lookSec: 3, jitter: 0, blunder: 0, seed })
    run(300, s, bot)
    assert.equal(s.hits, 0, `seed ${seed}: hit at ${s.t.toFixed(1)} s`)
  }
})

test('first minute: a slow, sloppy beginner survives 60 s in at least 95% of first runs', () => {
  const total = 400
  let survived = 0
  let hitsInFirstMinute = 0
  for (let seed = 1; seed <= total; seed += 1) {
    const s = createRun({ seed })
    // reacts in ~0.6 s, notices things only 1.8 s ahead, ±0.15 s timing error, misses 8% of rows
    const bot = makeBot({ reaction: 0.6, lookSec: 1.8, jitter: 0.15, blunder: 0.08, seed: seed * 7 })
    run(60, s, bot)
    if (!s.over && s.t >= 59.9) survived += 1
    hitsInFirstMinute += s.hits
  }
  const rate = survived / total
  assert.ok(rate >= 0.95, `only ${(rate * 100).toFixed(1)}% survived 60 s (avg ${(hitsInFirstMinute / total).toFixed(2)} bumps)`)
})

test('first 20 s are gentle: a slow player who never makes a mistake loses at most one heart', () => {
  let ok = 0
  const total = 200
  for (let seed = 1; seed <= total; seed += 1) {
    const s = createRun({ seed })
    // reacts in ~0.9 s and notices things only 1.5 s ahead, but never misses one
    run(20, s, makeBot({ reaction: 0.9, lookSec: 1.5, jitter: 0.2, blunder: 0, seed }))
    if (s.hearts >= CFG.hearts - 1) ok += 1
  }
  assert.ok(ok / total >= 0.98, `${ok}/${total}`)
})

test('one bump costs exactly one heart, then a short safe time; three bumps end the run', () => {
  const s = createRun({ seed: 9 })
  const events = []
  // stand still in the centre: crates in the centre lane will bump the ball
  run(240, s, (state) => events.push(...drainEvents(state)))
  events.push(...drainEvents(s)) // the last step's events
  const hits = events.filter((e) => e.type === 'hit')
  assert.equal(hits.length, 3)
  assert.equal(s.hearts, 0)
  assert.equal(s.over, true)
  for (let i = 1; i < hits.length; i += 1) {
    assert.ok(hits[i].t - hits[i - 1].t >= CFG.invulnerableSec, 'no double bump inside the safe time')
  }
  assert.deepEqual(hits.map((h) => h.hearts), [2, 1, 0])
  assert.ok(events.some((e) => e.type === 'over'))
  const before = { ...summary(s) }
  stepRun(s, 1)
  assert.deepEqual(summary(s), before, 'a finished run does not move')
})

test('a lost heart comes back after a while without a bump, never above the maximum', () => {
  const s = createRun({ seed: 9 })
  let hearts = []
  run(200, s, (state) => {
    for (const e of drainEvents(state)) if (e.type === 'hit' || e.type === 'heart') hearts.push(`${e.type}:${e.hearts}`)
    // dodge everything after the first bump
    if (state.hits > 0) makeBotOnce(state)
  })
  assert.equal(hearts[0], 'hit:2')
  assert.ok(hearts.includes('heart:3'), hearts.join(' '))
  assert.ok(s.hearts <= CFG.hearts)
})
const perfect = makeBot({ reaction: 0.2, lookSec: 3, jitter: 0, blunder: 0, seed: 1 })
function makeBotOnce(state) { perfect(state) }

test('practice mode: bumps are counted but never end the run', () => {
  const s = createRun({ seed: 9, practice: true })
  run(240, s)
  assert.equal(s.over, false)
  assert.equal(s.hearts, CFG.hearts)
  assert.ok(s.hits >= 3)
})

test('stars: counted once each, and the total matches the events', () => {
  const s = createRun({ seed: 11 })
  const bot = makeBot({ reaction: 0.2, lookSec: 3, jitter: 0, blunder: 0, seed: 11 })
  let fromEvents = 0
  run(120, s, (state) => {
    bot(state)
    for (const e of drainEvents(state)) if (e.type === 'star') fromEvents += e.value
  })
  assert.ok(s.stars > 0)
  assert.equal(fromEvents, s.stars)
})

test('milestones fire once: 30 s, 60 s, 10 stars, and a new distance record', () => {
  const s = createRun({ seed: 5, practice: true, bestDistance: 100 })
  const ids = []
  run(70, s, (state) => {
    for (const e of drainEvents(state)) if (e.type === 'milestone') ids.push(e.id)
  })
  assert.deepEqual(ids.filter((id) => id === 't30').length, 1)
  assert.deepEqual(ids.filter((id) => id === 't60').length, 1)
  assert.deepEqual(ids.filter((id) => id === 'record').length, 1)
})

test('hints: move, jump and shrink each shown once, before their first row arrives', () => {
  const s = createRun({ seed: 6, practice: true })
  const hints = []
  run(60, s, (state) => {
    for (const e of drainEvents(state)) if (e.type === 'hint') hints.push(e.hint)
  })
  assert.deepEqual(hints, ['move', 'jump', 'shrink'])
})

test('xp: a share of stars and time, nothing for practice, capped', () => {
  assert.equal(xpForRun({ time: 60, stars: 30 }), 14)
  assert.equal(xpForRun({ time: 60, stars: 30 }, true), 0)
  assert.equal(xpForRun({ time: 6000, stars: 3000 }), 40)
})
