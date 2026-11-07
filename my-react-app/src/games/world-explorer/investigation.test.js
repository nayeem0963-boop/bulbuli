// World Explorer Investigate activities: content rules for all 15 stations + the pure helpers.
import test from 'node:test'
import assert from 'node:assert/strict'
import { compareComplete, orderMarks, shuffledOrder } from './investigation.js'
import { WORLD_EXPLORER_ITEMS } from '../../learning/content/world-explorer/index.js'
import { contentHash } from '../../learning/contentGate.js'

const bilingual = (v) => Boolean(v?.en?.trim() && v?.bn?.trim())
const stations = Object.values(WORLD_EXPLORER_ITEMS).flat().filter((i) => i.role === 'station')

test('all 15 stations have a hands-on Investigate activity (no read-and-click)', () => {
  assert.equal(stations.length, 15)
  for (const s of stations) {
    const x = s.station.interaction
    assert.ok(x, `${s.id} has no interaction`)
    assert.ok(['compare', 'order'].includes(x.kind), `${s.id} kind`)
    assert.ok(bilingual(x.explain), `${s.id} explain must be en + bn`)
  }
})

test('compare activities: a prediction, ≥2 conditions with relative levels 0–4, and an expected answer that is the unique highest or lowest', () => {
  for (const s of stations.filter((i) => i.station.interaction.kind === 'compare')) {
    const x = s.station.interaction
    assert.ok(bilingual(x.predict) && bilingual(x.measure), s.id)
    assert.ok(x.conditions.length >= 2, s.id)
    const ids = new Set(x.conditions.map((c) => c.id))
    assert.equal(ids.size, x.conditions.length, `${s.id} duplicate condition ids`)
    for (const c of x.conditions) {
      assert.ok(bilingual(c.label) && bilingual(c.reading), `${s.id}/${c.id} text`)
      assert.ok(Number.isInteger(c.level) && c.level >= 0 && c.level <= 4, `${s.id}/${c.id} level`)
    }
    const levels = x.conditions.map((c) => c.level)
    const expected = x.conditions.find((c) => c.id === x.expect)
    assert.ok(expected, `${s.id} expect must name a condition`)
    const extreme = expected.level === Math.max(...levels) ? Math.max(...levels) : Math.min(...levels)
    assert.equal(expected.level, extreme, `${s.id} expected condition must be the highest or lowest reading`)
    assert.equal(levels.filter((l) => l === extreme).length, 1, `${s.id} expected reading must be unique`)
  }
})

test('order activities: ≥3 uniquely named steps, bilingual', () => {
  for (const s of stations.filter((i) => i.station.interaction.kind === 'order')) {
    const x = s.station.interaction
    assert.ok(bilingual(x.prompt), s.id)
    assert.ok(x.items.length >= 3, s.id)
    assert.equal(new Set(x.items.map((i) => i.id)).size, x.items.length, s.id)
    for (const i of x.items) assert.ok(bilingual(i.label), `${s.id}/${i.id}`)
  }
})

test('both activity kinds are used in every expedition', () => {
  for (const [exp, items] of Object.entries(WORLD_EXPLORER_ITEMS)) {
    const kinds = new Set(items.filter((i) => i.role === 'station').map((i) => i.station.interaction.kind))
    assert.deepEqual([...kinds].sort(), ['compare', 'order'], exp)
  }
})

test('the activity is part of the reviewed content: editing it changes the content hash', () => {
  const s = stations[0]
  const edited = { ...s, station: { ...s.station, interaction: { ...s.station.interaction, explain: { en: 'changed', bn: 'বদলানো' } } } }
  assert.notEqual(contentHash(edited), contentHash(s))
})

test('shuffledOrder is deterministic, a permutation, and never already solved', () => {
  for (const s of stations.filter((i) => i.station.interaction.kind === 'order')) {
    const items = s.station.interaction.items
    const a = shuffledOrder(items, s.id)
    assert.deepEqual(a, shuffledOrder(items, s.id))
    assert.deepEqual([...a].sort(), items.map((i) => i.id).sort())
    assert.notDeepEqual(a, items.map((i) => i.id), s.id)
  }
})

test('orderMarks and compareComplete', () => {
  assert.deepEqual(orderMarks(['a', 'b', 'c'], ['a', 'c', 'b']), [true, false, false])
  assert.equal(compareComplete([{ id: 'x' }, { id: 'y' }], ['x']), false)
  assert.equal(compareComplete([{ id: 'x' }, { id: 'y' }], ['y', 'x']), true)
})
