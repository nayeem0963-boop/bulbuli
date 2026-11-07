/**
 * Sky Science Explorer: pure flight logic (design 8.1, 2.11). No React, no storage.
 *
 * A flight = a plan (which objectives, items and option orders) + the COMMITTED answers.
 * Everything else (what to show next, which return questions are due, the stars) is derived from
 * those two, so a refreshed or resumed flight continues exactly where its committed answers left
 * it. The plan is saved with the flight when it starts; answers are saved one by one, each before
 * its feedback is shown (design 2.11).
 */
import { skyStars } from '../../learning/xpRules.js'

/** Approved age-band rules (design 8.1 / brief Part 2A). */
export const BAND_RULES = Object.freeze({
  '4-6': Object.freeze({ gates: 6, windowSeconds: 5, quickChecks: 2, cloudsCostHearts: false, pictures: true, autoSpeak: true, maxPromptWords: 12, thinkingPauseOption: false, needsApplication: false }),
  '7-8': Object.freeze({ gates: 8, windowSeconds: 4, quickChecks: 3, cloudsCostHearts: true, pictures: false, autoSpeak: false, maxPromptWords: 10, thinkingPauseOption: false, needsApplication: false }),
  '9-10': Object.freeze({ gates: 8, windowSeconds: 3, quickChecks: 4, cloudsCostHearts: true, pictures: false, autoSpeak: false, maxPromptWords: 18, thinkingPauseOption: true, needsApplication: true }),
})
export const BANDS = Object.keys(BAND_RULES)
export const HEARTS = 3
/** A return question comes after this many more primary gates (or before the Quick Checks). */
export const RETURN_DELAY = 2

/** Small seeded RNG (mulberry32) so tests and resumes are reproducible. */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(list, random) {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** The three options of an item, in lane order. Index 0 of the item's own list is the answer. */
export function optionsInOrder(item, order) {
  const all = [{ ...item.answer, correct: true }, ...item.distractors.map((dd) => ({ ...dd.text, pic: dd.pic, misconception: dd.misconception, correct: false }))]
  return order.map((i) => all[i])
}

export class NotEnoughContentError extends Error {
  constructor(detail) {
    super(`Not enough learning items for this flight: ${detail}`)
    this.name = 'NotEnoughContentError'
  }
}

/**
 * Picks a flight: `gates` objectives that each have a primary AND a return item, plus Quick Checks.
 * Ages 9–10 always include at least one application item (design 8.1).
 * @returns {{ seed, missionId, band, gates: [{ objectiveId, primaryId, returnId, order, returnOrder }], quickChecks: [{ itemId, order }] }}
 */
export function buildPlan(items, { missionId, band, seed = Date.now() }) {
  const rules = BAND_RULES[band]
  if (!rules) throw new TypeError(`unknown band ${band}`)
  const random = rng(seed)
  const pool = items.filter((i) => i.mission === missionId && i.band === band)
  const byObjective = new Map()
  for (const i of pool) {
    if (i.role !== 'primary' && i.role !== 'return') continue
    const entry = byObjective.get(i.objective) ?? {}
    entry[i.role] = i
    byObjective.set(i.objective, entry)
  }
  const complete = [...byObjective.values()].filter((e) => e.primary && e.return)
  if (complete.length < rules.gates) throw new NotEnoughContentError(`${missionId} ${band}: ${complete.length} objectives, ${rules.gates} needed`)
  const checks = pool.filter((i) => i.role === 'quickcheck')
  if (checks.length < rules.quickChecks) throw new NotEnoughContentError(`${missionId} ${band}: ${checks.length} Quick Checks, ${rules.quickChecks} needed`)

  let chosen = shuffle(complete, random).slice(0, rules.gates)
  let chosenChecks = shuffle(checks, random).slice(0, rules.quickChecks)
  if (rules.needsApplication) {
    const hasApply = chosen.some((e) => e.primary.skill === 'apply') || chosenChecks.some((q) => q.skill === 'apply')
    if (!hasApply) {
      const applyObjective = complete.find((e) => e.primary.skill === 'apply' && !chosen.includes(e))
      const applyCheck = checks.find((q) => q.skill === 'apply' && !chosenChecks.includes(q))
      if (applyObjective) chosen = [applyObjective, ...chosen.slice(0, -1)]
      else if (applyCheck) chosenChecks = [applyCheck, ...chosenChecks.slice(0, -1)]
      else throw new NotEnoughContentError(`${missionId} ${band}: no application item`)
    }
  }
  // gentle ladder: identify → compare → cause/effect → predict → apply, shuffled within each rung
  const rung = { identify: 0, compare: 1, 'cause-effect': 2, predict: 3, apply: 4 }
  chosen = chosen.slice().sort((x, y) => rung[x.primary.skill] - rung[y.primary.skill])
  const order3 = () => shuffle([0, 1, 2], random)
  return {
    seed,
    missionId,
    band,
    gates: chosen.map((e) => ({ objectiveId: e.primary.objective, primaryId: e.primary.id, returnId: e.return.id, order: order3(), returnOrder: order3() })),
    quickChecks: chosenChecks.map((q) => ({ itemId: q.id, order: order3() })),
  }
}

/**
 * The next thing to show, derived ONLY from the plan and the committed answers.
 * Returns { kind: 'primary', gate } | { kind: 'return', gate } | { kind: 'quickcheck', index } | { kind: 'done' }.
 * A wrong first answer at gate i schedules exactly one return question for that objective, shown
 * after RETURN_DELAY more primary gates, or before the Quick Checks if the flight ends sooner.
 */
export function nextStep(plan, answers) {
  const primaryDone = new Map(answers.filter((a) => a.slot === 'primary').map((a) => [a.index, a]))
  const returnsDone = new Set(answers.filter((a) => a.slot === 'return').map((a) => a.objectiveId))
  const pendingReturns = plan.gates
    .map((g, i) => ({ g, i }))
    .filter(({ g, i }) => primaryDone.has(i) && !primaryDone.get(i).correct && !returnsDone.has(g.objectiveId))
  const answeredPrimaries = primaryDone.size
  const due = pendingReturns.find(({ i }) => answeredPrimaries >= Math.min(i + 1 + RETURN_DELAY, plan.gates.length))
  if (due) return { kind: 'return', gate: due.i }
  const nextPrimary = plan.gates.findIndex((_, i) => !primaryDone.has(i))
  if (nextPrimary !== -1) return { kind: 'primary', gate: nextPrimary }
  if (pendingReturns.length) return { kind: 'return', gate: pendingReturns[0].i }
  const checksDone = new Set(answers.filter((a) => a.slot === 'quickcheck').map((a) => a.index))
  const nextCheck = plan.quickChecks.findIndex((_, i) => !checksDone.has(i))
  if (nextCheck !== -1) return { kind: 'quickcheck', index: nextCheck }
  return { kind: 'done' }
}

/** The answer record to commit for a choice (recordAnswer payload). */
export function answerFor(plan, step, items, laneIndex) {
  const byId = (id) => items.find((i) => i.id === id)
  if (step.kind === 'quickcheck') {
    const q = plan.quickChecks[step.index]
    const item = byId(q.itemId)
    const option = optionsInOrder(item, q.order)[laneIndex]
    return { slot: 'quickcheck', index: step.index, objectiveId: item.objective, itemId: item.id, correct: option.correct, choice: laneIndex }
  }
  const gate = plan.gates[step.gate]
  const isReturn = step.kind === 'return'
  const item = byId(isReturn ? gate.returnId : gate.primaryId)
  const option = optionsInOrder(item, isReturn ? gate.returnOrder : gate.order)[laneIndex]
  return { slot: isReturn ? 'return' : 'primary', index: step.gate, objectiveId: gate.objectiveId, itemId: item.id, correct: option.correct, choice: laneIndex }
}

/** The item and its options for a step. */
export function stepView(plan, step, items) {
  const byId = (id) => items.find((i) => i.id === id)
  if (step.kind === 'quickcheck') {
    const q = plan.quickChecks[step.index]
    const item = byId(q.itemId)
    return { item, options: optionsInOrder(item, q.order) }
  }
  const gate = plan.gates[step.gate]
  const item = byId(step.kind === 'return' ? gate.returnId : gate.primaryId)
  return { item, options: optionsInOrder(item, step.kind === 'return' ? gate.returnOrder : gate.order) }
}

/** Progress numbers for the HUD. */
export function progress(plan, answers) {
  const primaries = answers.filter((a) => a.slot === 'primary').length
  const checks = answers.filter((a) => a.slot === 'quickcheck').length
  return { gatesDone: primaries, gatesTotal: plan.gates.length, checksDone: checks, checksTotal: plan.quickChecks.length }
}

/** Stars from committed answers, using the same function as the XP commit (one definition). */
export function starsFor(plan, answers) {
  const primary = plan.gates.map((g, i) => {
    const first = answers.find((a) => a.slot === 'primary' && a.index === i)
    const ret = answers.find((a) => a.slot === 'return' && a.objectiveId === g.objectiveId)
    return { objectiveId: g.objectiveId, firstTryCorrect: Boolean(first?.correct), secured: Boolean(first?.correct || ret?.correct) }
  })
  const quickChecks = plan.quickChecks.map((_, i) => ({ correct: Boolean(answers.find((a) => a.slot === 'quickcheck' && a.index === i)?.correct) }))
  return { stars: skyStars({ primary, quickChecks }), secured: primary.filter((p) => p.secured).length, firstTry: primary.filter((p) => p.firstTryCorrect).length, total: primary.length, checksRight: quickChecks.filter((q) => q.correct).length, checksTotal: quickChecks.length }
}

/** Hearts after a cloud bump (design 8.1): never for ages 4–6; never for a wrong answer. */
export function heartsAfterCloud(band, hearts) {
  if (!BAND_RULES[band].cloudsCostHearts) return hearts
  return Math.max(0, hearts - 1)
}

/** Can a mission be played in this build? (wave 2 / no content → Coming soon) */
export function missionPlayable(items, missionId) {
  return BANDS.every((band) => {
    try {
      buildPlan(items, { missionId, band, seed: 1 })
      return true
    } catch {
      return false
    }
  })
}
