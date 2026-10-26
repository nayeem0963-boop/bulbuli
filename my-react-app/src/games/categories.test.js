import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CATEGORY_FILTERS, categoryCounts, categoryOf, DEFAULT_FILTER, GAME_CATEGORIES, gamesInCategory,
} from './categories.js'

const games = [
  { id: 'a', category: 'young' },
  { id: 'b', category: 'arcade' },
  { id: 'c', category: 'logic' },
  { id: 'd' },
  { id: 'e', category: 'nonsense' },
]

test('All Games is the first pill and the default', () => {
  assert.deepEqual(CATEGORY_FILTERS, ['all', 'young', 'logic', 'arcade'])
  assert.equal(DEFAULT_FILTER, 'all')
})

test('each audience shows only its own games, in order; All shows everything', () => {
  assert.deepEqual(gamesInCategory(games, 'young').map((g) => g.id), ['a'])
  assert.deepEqual(gamesInCategory(games, 'arcade').map((g) => g.id), ['b'])
  assert.deepEqual(gamesInCategory(games, 'all').map((g) => g.id), ['a', 'b', 'c', 'd', 'e'])
  assert.deepEqual(categoryCounts(games), { all: 5, young: 1, logic: 1, arcade: 1 })
})

test('hidden games stay off the home page', () => {
  const withHidden = [...games, { id: 'wip', category: 'arcade', hidden: true }]
  assert.deepEqual(gamesInCategory(withHidden, 'arcade').map((g) => g.id), ['b'])
  assert.equal(gamesInCategory(withHidden, 'all').length, 5)
})

test('a game without a valid category still shows under All Games', () => {
  assert.equal(categoryOf({ id: 'x' }), null)
  assert.equal(categoryOf({ id: 'x', category: 'educational' }), null)
  assert.ok(gamesInCategory(games, 'all').some((g) => g.id === 'e'))
})

// registry.js imports JSX, which node can't load, so check its source instead:
// every game entry names one of the audience categories.
test('every game in the registry has an audience category', () => {
  const source = readFileSync(new URL('./registry.js', import.meta.url), 'utf8')
  const entries = source.split(/\n\s*\{\n\s*id: '/).slice(1)
  assert.ok(entries.length > 0)
  for (const entry of entries) {
    const id = entry.slice(0, entry.indexOf("'"))
    const category = entry.match(/\n\s*category: '([^']+)'/)?.[1]
    assert.ok(GAME_CATEGORIES.includes(category), `${id} needs category: 'young', 'logic' or 'arcade'`)
  }
})
