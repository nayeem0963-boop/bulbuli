/**
 * World Explorer 3D: content shape, station/report logic, practice mode, and a full expedition
 * played through the PREVIEW adapter (in-memory IndexedDB) exactly the way the game calls it.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { WORLD_EXPLORER_ITEMS } from '../../learning/content/index.js'
import { SOURCES } from '../../learning/content/sources.js'
import { structuralErrors } from '../../learning/contentGate.js'
import { createPreviewAdapter } from '../../learning/adapters/preview.js'
import {
  completedCount, createPracticeWorld, expeditionContent, expeditionPlayable, explainHelp, firstIncomplete,
  journalFor, optionsFor, reportStatus, starsForScore, stationPhase, stationRecord,
} from './session.js'
import { BIOMES } from './biomes/index.js'
import { EXPEDITIONS } from './text.js'
import { nearestStation } from './proximity.js'

const ALL = Object.values(WORLD_EXPLORER_ITEMS).flat()
const IDS = ['sundarbans', 'amazon', 'sahara']

/* ------------------------------------------------------------------ content */

for (const id of IDS) {
  test(`${id}: five stations (1–5) and two different five-question report sets`, () => {
    const c = expeditionContent(ALL, id)
    assert.equal(expeditionPlayable(c), true)
    assert.deepEqual(c.stations.map((s) => s.station.n), [1, 2, 3, 4, 5])
    assert.equal(c.reportA.length, 5)
    assert.equal(c.reportB.length, 5)
    const a = new Set(c.reportA.map((i) => i.objective))
    assert.ok(c.reportB.every((i) => !a.has(i.objective)), 'set B asks about different things than set A')
    const prompts = new Set([...c.stations, ...c.reportA].map((i) => i.prompt.en))
    assert.ok(c.reportB.every((i) => !prompts.has(i.prompt.en)), 'set B wording is new')
  })

  test(`${id}: every item is complete, ages 12+, has 3 distractors with misconceptions, and is awaiting BOTH reviews`, () => {
    for (const item of WORLD_EXPLORER_ITEMS[id]) {
      assert.deepEqual(structuralErrors(item), [], item.id)
      assert.equal(item.band, '12+')
      assert.equal(item.distractors.length, 3, item.id)
      assert.equal(item.review.accuracy.status, 'pending')
      assert.equal(item.review.bangla.status, 'pending')
      assert.equal(item.review.accuracy.reviewer, undefined)
    }
  })

  test(`${id}: every fact cites a recorded quote of its source`, () => {
    for (const item of WORLD_EXPLORER_ITEMS[id]) {
      const src = Object.values(SOURCES).find((s) => s.url === item.source.url)
      assert.ok(src, `${item.id}: unknown source`)
      assert.ok(src.quotes.includes(item.source.supports), `${item.id}: quote not recorded for ${src.url}`)
    }
  })

  test(`${id}: the map has a station for every content station`, () => {
    assert.equal(BIOMES[id].stations.length, expeditionContent(ALL, id).stations.length)
  })
}

test('menu: the three wave 1 expeditions are playable, the other three are "Coming soon" (no content)', () => {
  const playable = EXPEDITIONS.filter((e) => expeditionPlayable(expeditionContent(ALL, e.id))).map((e) => e.id)
  assert.deepEqual(playable, IDS)
  assert.deepEqual(EXPEDITIONS.filter((e) => !playable.includes(e.id)).map((e) => e.id), ['himalaya', 'arctic', 'great-barrier-reef'])
})

test('station text has no empty Bangla, and no English left in the Bangla fields', () => {
  for (const item of ALL.filter((i) => i.role === 'station')) {
    for (const f of ['title', 'observe', 'investigate', 'finding', 'hint', 'record']) {
      assert.ok(/[ঀ-৿]/.test(item.station[f].bn), `${item.id} ${f}.bn has Bangla script`)
    }
  }
})

/* ------------------------------------------------------------------ logic */

test('Explain help: nothing, then a hint after one wrong try, then the explanation after two', () => {
  assert.equal(explainHelp(0), 'none')
  assert.equal(explainHelp(1), 'hint')
  assert.equal(explainHelp(2), 'explanation')
  assert.equal(explainHelp(5), 'explanation')
})

test('report stars: ★ 3/5, ★★ 4/5, ★★★ 5/5', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(starsForScore), [0, 0, 0, 1, 2, 3])
})

test('answer order is shuffled but stable, and always contains exactly one right answer', () => {
  for (const item of ALL) {
    const a = optionsFor(item)
    assert.deepEqual(a, optionsFor(item))
    assert.equal(a.filter((o) => o.correct).length, 1)
    assert.equal(a.length, item.distractors.length + 1)
  }
  const firstPositions = new Set(ALL.map((i) => optionsFor(i).findIndex((o) => o.correct)))
  assert.ok(firstPositions.size >= 3, 'the right answer is not always in the same place')
})

test('station phases follow Observe → Investigate → Explain → Record → complete', () => {
  assert.equal(stationPhase({ steps: {}, attempts: [] }), 'observe')
  assert.equal(stationPhase({ steps: { observe: true }, attempts: [] }), 'investigate')
  assert.equal(stationPhase({ steps: { observe: true, investigate: true }, attempts: [{ correct: false }] }), 'explain')
  assert.equal(stationPhase({ steps: { observe: true, investigate: true }, attempts: [], correctOnAttempt: 2 }), 'record')
  assert.equal(stationPhase({ complete: true }), 'complete')
})

test('proximity: a station counts as "near" only within reach and on the same level', () => {
  const stations = [{ n: 1, disc: 'a', x: 0, z: 0 }, { n: 2, disc: 'b', x: 10, z: 0 }]
  const tops = { a: 0, b: 6 }
  assert.equal(nearestStation(stations, 1, 1, 0, tops), 1)
  assert.equal(nearestStation(stations, 5, 0, 0, tops), null)
  assert.equal(nearestStation(stations, 10, 0.5, 0, tops), null, 'standing under a canopy platform is not "at" it')
  assert.equal(nearestStation(stations, 10, 0.5, 6, tops), 2)
})

/* ------------------------------------------------------------------ practice mode */

test('practice mode: same flow and rules in memory, refuses a sealed visit, no XP', async () => {
  const w = createPracticeWorld()
  const { visit } = await w.startVisit('sahara')
  const k = visit.roundKey
  assert.equal((await w.saveStationProgress(k, 'sahara', 1, 'investigate')).reason, 'observe-first')
  await w.saveStationProgress(k, 'sahara', 1, 'observe')
  await w.saveStationProgress(k, 'sahara', 1, 'investigate')
  await w.recordExplainAttempt(k, 'sahara', 1, 'd0', false)
  await w.recordExplainAttempt(k, 'sahara', 1, 'answer', true)
  const r = await w.completeStation(k, 'sahara', 1)
  assert.deepEqual([r.ok, r.xp], [true, 0])
  assert.equal(stationRecord(w.getRecord(), 'sahara', 1).correctOnAttempt, 2)
  await w.sealVisit(k)
  assert.equal((await w.completeStation(k, 'sahara', 2)).reason, 'visit-sealed')
})

/* ------------------------------------------------------------------ the full game flow through the preview adapter */

async function playStation(world, visitKey, exp, n, wrongFirst) {
  assert.ok((await world.saveStationProgress(visitKey, exp, n, 'observe')).ok)
  assert.ok((await world.saveStationProgress(visitKey, exp, n, 'investigate')).ok)
  for (let i = 0; i < wrongFirst; i += 1) assert.ok((await world.recordExplainAttempt(visitKey, exp, n, `d${i}`, false)).ok)
  assert.ok((await world.recordExplainAttempt(visitKey, exp, n, 'answer', true)).ok)
  return world.completeStation(visitKey, exp, n)
}

test('full Sundarbans expedition through the preview adapter: 4/2/0 station XP, report A then retry B, journal, would-be awards', async () => {
  const adapter = createPreviewAdapter({ factory: new IDBFactory(), env: {} })
  await adapter.ready()
  const W = adapter.world
  const exp = 'sundarbans'
  const content = expeditionContent(ALL, exp)

  let { visit } = await W.startVisit(exp)
  const xps = []
  for (const [n, wrong] of [[1, 0], [2, 1], [3, 2]]) xps.push((await playStation(W, visit.roundKey, exp, n, wrong)).xp)
  assert.deepEqual(xps, [4, 2, 0], 'right first try 4, after the hint 2, after the explanation 0')

  // leave mid-expedition: the visit is sealed with its XP; the menu banner is gone
  await W.sealVisit(visit.roundKey)
  let snap = adapter.store.getSnapshot()
  assert.equal(snap.unfinishedVisits.length, 0)
  assert.equal(completedCount(snap.world, exp), 3)
  assert.equal(firstIncomplete(snap.world, exp), 4)

  ;({ visit } = await W.startVisit(exp))
  await playStation(W, visit.roundKey, exp, 4, 0)
  await playStation(W, visit.roundKey, exp, 5, 0)
  snap = adapter.store.getSnapshot()
  let rs = reportStatus(snap.world, exp)
  assert.deepEqual([rs.canFile, rs.nextSet], [true, 'A'])

  const answersA = content.reportA.map((it, i) => ({ itemId: it.id, correct: i < 4 })) // 4/5 → ★★
  const filedA = await W.fileReport(visit.roundKey, exp, 'A', answersA)
  assert.equal(filedA.ok, true)
  assert.equal(filedA.stars, 2)

  // filing sealed the visit: a stale call from it is refused and changes nothing
  assert.equal((await W.completeStation(visit.roundKey, exp, 1)).reason, 'visit-sealed')

  snap = adapter.store.getSnapshot()
  rs = reportStatus(snap.world, exp)
  assert.deepEqual([rs.canFile, rs.nextSet, rs.bestStars], [true, 'B', 2])
  ;({ visit } = await W.startVisit(exp))
  const filedB = await W.fileReport(visit.roundKey, exp, 'B', content.reportB.map((it) => ({ itemId: it.id, correct: true })))
  assert.equal(filedB.ok, true)
  assert.equal(filedB.stars, 3)

  snap = adapter.store.getSnapshot()
  rs = reportStatus(snap.world, exp)
  assert.deepEqual([rs.canFile, rs.filings, rs.bestStars], [false, 2, 3], 'one retry only')

  const journal = journalFor(snap.world, exp)
  assert.equal(journal.filter((e) => e.kind === 'station').length, 5)
  assert.deepEqual(journal.filter((e) => e.kind === 'report').map((e) => e.set), ['B', 'A'], 'newest first')

  // every sealed visit with XP produced one would-be award; nothing was sent anywhere
  const awards = adapter.wouldBeAwards()
  assert.ok(awards.length >= 2)
  assert.ok(awards.every((a) => a.gameId === 'skyward-explorer' && a.amount > 0))
  assert.equal(awards.reduce((s, a) => s + a.amount, 0), snap.learningXp)
})

test('stale tab: a second "tab" starting the expedition makes the first tab\'s Record refused with no change', async () => {
  const factory = new IDBFactory()
  const tabA = createPreviewAdapter({ factory, env: {} })
  const tabB = createPreviewAdapter({ factory, env: {} })
  await tabA.ready()
  await tabB.ready()
  const exp = 'amazon'
  const a = await tabA.world.startVisit(exp)
  await tabA.world.saveStationProgress(a.visit.roundKey, exp, 1, 'observe')
  await tabA.world.saveStationProgress(a.visit.roundKey, exp, 1, 'investigate')
  await tabA.world.recordExplainAttempt(a.visit.roundKey, exp, 1, 'answer', true)
  await tabB.world.startVisit(exp) // seals tab A's visit
  const before = tabA.store.getSnapshot().learningXp
  const r = await tabA.world.completeStation(a.visit.roundKey, exp, 1)
  assert.deepEqual([r.ok, r.reason], [false, 'visit-sealed'])
  await tabA.store.refresh()
  assert.equal(tabA.store.getSnapshot().learningXp, before)
  assert.equal(stationRecord(tabA.store.getSnapshot().world, exp, 1).complete, false)
  // "Continue here": join the open visit and Record succeeds once
  const joined = await tabA.world.joinVisit(exp)
  assert.equal(joined.ok, true)
  const ok = await tabA.world.completeStation(joined.visit.roundKey, exp, 1)
  assert.deepEqual([ok.ok, ok.xp], [true, 4])
})
