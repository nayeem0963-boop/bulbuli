// L1/L2: Sky Science flight logic and the wave 1 content it plays (design 8.1, 2.11).
import test from 'node:test'
import assert from 'node:assert/strict'
import { ALL_CONTENT_ITEMS, SKY_SCIENCE_ITEMS } from '../../learning/content/index.js'
import { SOURCES } from '../../learning/content/sources.js'
import { BAND_RULES, BANDS, answerFor, buildPlan, heartsAfterCloud, missionPlayable, nextStep, starsFor, stepView } from './flight.js'
import { PICTURE_KEYS } from './pictures.js'

const ITEMS = [...ALL_CONTENT_ITEMS]
const WAVE1 = ['sky-watcher', 'weather-flyer']

/* ------------------------------------------------------------------ content quality */

for (const mission of WAVE1) {
  for (const band of BANDS) {
    const rules = BAND_RULES[band]
    const pool = ITEMS.filter((i) => i.mission === mission && i.band === band)
    test(`${mission} ${band}: enough objectives (each with a primary and a different return item) and Quick Checks`, () => {
      const objectives = new Set(pool.filter((i) => i.role === 'primary').map((i) => i.objective))
      assert.ok(objectives.size >= rules.gates, `${objectives.size} objectives < ${rules.gates} gates`)
      for (const objective of objectives) {
        const p = pool.find((i) => i.objective === objective && i.role === 'primary')
        const r = pool.find((i) => i.objective === objective && i.role === 'return')
        assert.ok(r, `${objective} has a return item`)
        assert.notEqual(r.id, p.id)
        assert.notEqual(r.prompt.en, p.prompt.en, `${objective}: return wording differs`)
        assert.notEqual(r.prompt.bn, p.prompt.bn)
        assert.equal(r.skill, p.skill)
      }
      assert.ok(pool.filter((i) => i.role === 'quickcheck').length >= rules.quickChecks)
    })
    test(`${mission} ${band}: prompt length suits the band; every item has exactly 3 options`, () => {
      for (const i of pool) {
        const words = i.prompt.en.trim().split(/\s+/).length
        assert.ok(words <= rules.maxPromptWords, `${i.id}: ${words} words > ${rules.maxPromptWords}`)
        assert.equal(i.distractors.length, 2, `${i.id}: 3 lanes = 1 answer + 2 distractors`)
      }
    })
    if (rules.pictures) {
      test(`${mission} ${band}: every option has a picture (no reading needed)`, () => {
        for (const i of pool) {
          for (const pic of [i.answer.pic, ...i.distractors.map((x) => x.pic)]) {
            assert.ok(pic, `${i.id} option without a picture`)
            assert.ok(PICTURE_KEYS.includes(pic), `${i.id}: unknown picture "${pic}"`)
          }
        }
      })
    }
    if (rules.needsApplication) {
      test(`${mission} ${band}: has application items, and every built flight includes one`, () => {
        assert.ok(pool.some((i) => i.skill === 'apply'))
        for (let seed = 1; seed <= 40; seed += 1) {
          const plan = buildPlan(ITEMS, { missionId: mission, band, seed })
          const skills = [...plan.gates.map((g) => ITEMS.find((i) => i.id === g.primaryId).skill), ...plan.quickChecks.map((q) => ITEMS.find((i) => i.id === q.itemId).skill)]
          assert.ok(skills.includes('apply'), `seed ${seed}`)
        }
      })
    }
  }
}

test('every item cites a recorded source quote, all items are unreviewed (pending), ids are unique', () => {
  const ids = new Set()
  for (const i of ITEMS) {
    assert.ok(!ids.has(i.id), `duplicate ${i.id}`)
    ids.add(i.id)
    const src = Object.values(SOURCES).find((s) => s.url === i.source.url)
    assert.ok(src, `${i.id}: source not in sources.js`)
    assert.ok(src.quotes.includes(i.source.supports), `${i.id}: quote not recorded`)
    assert.equal(i.review.accuracy.status, 'pending')
    assert.equal(i.review.bangla.status, 'pending')
    assert.equal(i.review.accuracy.reviewer, undefined, 'no invented reviewer')
  }
})

test('the skill ladder is used: every band covers several rungs', () => {
  for (const mission of WAVE1) {
    for (const band of BANDS) {
      const skills = new Set(ITEMS.filter((i) => i.mission === mission && i.band === band).map((i) => i.skill))
      assert.ok(skills.size >= 3, `${mission} ${band}: ${[...skills]}`)
    }
  }
})

test('only wave 1 missions are playable; wave 2 shows Coming soon', () => {
  assert.equal(missionPlayable(ITEMS, 'sky-watcher'), true)
  assert.equal(missionPlayable(ITEMS, 'weather-flyer'), true)
  for (const m of ['moon-earth', 'planet-parade', 'planet-detectives', 'star-navigator']) assert.equal(missionPlayable(ITEMS, m), false)
  assert.deepEqual(Object.keys(SKY_SCIENCE_ITEMS), WAVE1)
})

/* ------------------------------------------------------------------ flight rules */

test('band rules match the brief: gates 6/8/8, windows 5/4/3 s, Quick Checks 2/3/4, no heart cost for ages 4–6', () => {
  assert.deepEqual(BANDS.map((b) => [BAND_RULES[b].gates, BAND_RULES[b].windowSeconds, BAND_RULES[b].quickChecks, BAND_RULES[b].cloudsCostHearts]), [[6, 5, 2, false], [8, 4, 3, true], [8, 3, 4, true]])
  assert.equal(heartsAfterCloud('4-6', 3), 3)
  assert.equal(heartsAfterCloud('7-8', 3), 2)
  assert.equal(heartsAfterCloud('9-10', 0), 0)
})

test('plans are reproducible from the seed and use distinct objectives', () => {
  const a = buildPlan(ITEMS, { missionId: 'sky-watcher', band: '7-8', seed: 42 })
  const b = buildPlan(ITEMS, { missionId: 'sky-watcher', band: '7-8', seed: 42 })
  assert.deepEqual(a, b)
  assert.equal(new Set(a.gates.map((g) => g.objectiveId)).size, 8)
})

function play(plan, choose) {
  const answers = []
  const seen = []
  for (let guard = 0; guard < 50; guard += 1) {
    const step = nextStep(plan, answers)
    seen.push(step)
    if (step.kind === 'done') break
    const lane = choose(step, stepView(plan, step, ITEMS).options)
    answers.push(answerFor(plan, step, ITEMS, lane))
  }
  return { answers, seen }
}
const right = (_s, opts) => opts.findIndex((o) => o.correct)
const wrong = (_s, opts) => opts.findIndex((o) => !o.correct)

test('a wrong first answer schedules exactly ONE return question, 2 gates later, with a different item', () => {
  const plan = buildPlan(ITEMS, { missionId: 'weather-flyer', band: '7-8', seed: 7 })
  const { answers, seen } = play(plan, (s, o) => (s.kind === 'primary' && s.gate === 0 ? wrong(s, o) : right(s, o)))
  const returns = answers.filter((x) => x.slot === 'return')
  assert.equal(returns.length, 1)
  assert.equal(returns[0].objectiveId, plan.gates[0].objectiveId)
  assert.notEqual(returns[0].itemId, answers[0].itemId)
  const order = seen.map((s) => (s.kind === 'primary' ? `p${s.gate}` : s.kind === 'return' ? `r${s.gate}` : s.kind))
  assert.deepEqual(order.slice(0, 5), ['p0', 'p1', 'p2', 'r0', 'p3'])
})

test('a wrong return answer does NOT schedule another return; late wrong answers return before the Quick Checks', () => {
  const plan = buildPlan(ITEMS, { missionId: 'sky-watcher', band: '9-10', seed: 3 })
  const { answers, seen } = play(plan, (s, o) => (s.kind === 'quickcheck' ? right(s, o) : wrong(s, o)))
  assert.equal(answers.filter((x) => x.slot === 'return').length, 8)
  const firstCheck = seen.findIndex((s) => s.kind === 'quickcheck')
  assert.ok(seen.slice(0, firstCheck).filter((s) => s.kind === 'return').length === 8)
})

test('stars: all right → ★★★; one wrong primary recovered → ★★ (7-8 needs 6/8)', () => {
  const plan = buildPlan(ITEMS, { missionId: 'sky-watcher', band: '7-8', seed: 9 })
  assert.equal(starsFor(plan, play(plan, right).answers).stars, 3)
  const oneWrong = play(plan, (s, o) => (s.kind === 'primary' && s.gate === 2 ? wrong(s, o) : right(s, o))).answers
  assert.equal(starsFor(plan, oneWrong).stars, 2)
  const allWrongFirst = play(plan, (s, o) => (s.kind === 'primary' ? wrong(s, o) : right(s, o))).answers
  assert.equal(starsFor(plan, allWrongFirst).stars, 1, 'all secured on return, no first tries → ★')
})

test('resume: the next step is derived from committed answers only (same plan → same continuation)', () => {
  const plan = buildPlan(ITEMS, { missionId: 'sky-watcher', band: '4-6', seed: 11 })
  const { answers } = play(plan, right)
  const partial = answers.slice(0, 3)
  assert.deepEqual(nextStep(plan, partial), { kind: 'primary', gate: 3 })
  assert.deepEqual(nextStep(JSON.parse(JSON.stringify(plan)), JSON.parse(JSON.stringify(partial))), { kind: 'primary', gate: 3 })
})

test('stars from the game screen equal the stars the XP commit computes (one definition)', async () => {
  const { createPreviewAdapter } = await import('../../learning/adapters/preview.js')
  const { freshFactory } = await import('../../learning/tests/helpers.js')
  const adapter = createPreviewAdapter({ factory: freshFactory() })
  await adapter.ready()
  const plan = buildPlan(ITEMS, { missionId: 'weather-flyer', band: '9-10', seed: 5 })
  const { answers } = play(plan, (s, o) => (s.kind === 'primary' && s.gate % 3 === 0 ? wrong(s, o) : right(s, o)))
  const start = await adapter.sky.startFlight({ missionId: 'weather-flyer', band: '9-10', primaryCount: 8, quickCheckCount: 4, plan })
  for (const ans of answers) assert.equal((await adapter.sky.recordAnswer(start.flightKey, ans)).ok, true)
  const committed = await adapter.sky.commitFlight(start.flightKey)
  assert.equal(committed.stars, starsFor(plan, answers).stars)
  assert.deepEqual(adapter.store.getSnapshot().sky.activeFlight, null)
  adapter.store.close()
})
