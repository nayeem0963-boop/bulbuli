import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { categoryOf, DEFAULT_CATEGORY, GAME_CATEGORIES, gamesInCategory } from './categories.js'

const games = [
  { id: 'a', category: 'educational' },
  { id: 'b', category: 'adventure' },
  { id: 'c', category: 'educational' },
  { id: 'd' },
  { id: 'e', category: 'nonsense' },
]

test('Educational is the first group and the default', () => {
  assert.deepEqual(GAME_CATEGORIES, ['educational', 'adventure'])
  assert.equal(DEFAULT_CATEGORY, 'educational')
})

test('each group shows only its own games, in order', () => {
  assert.deepEqual(gamesInCategory(games, 'adventure').map((g) => g.id), ['b'])
  assert.deepEqual(gamesInCategory(games, 'educational').map((g) => g.id), ['a', 'c', 'd', 'e'])
})

test('hidden games stay off the home page', () => {
  const withHidden = [...games, { id: 'wip', category: 'adventure', hidden: true }]
  assert.deepEqual(gamesInCategory(withHidden, 'adventure').map((g) => g.id), ['b'])
})

test('a game without a valid category falls back to Educational instead of vanishing', () => {
  assert.equal(categoryOf({ id: 'x' }), 'educational')
  assert.equal(categoryOf({ id: 'x', category: 'puzzle' }), 'educational')
  assert.equal(categoryOf(null), 'educational')
})

// registry.js imports JSX, which node can't load, so check its source instead:
// every game entry names a category, and only a known one.
test('every game in the registry has a category', () => {
  const source = readFileSync(new URL('./registry.js', import.meta.url), 'utf8')
  const entries = source.split(/\n\s*\{\n\s*id: '/).slice(1)
  assert.ok(entries.length > 0)
  for (const entry of entries) {
    const id = entry.slice(0, entry.indexOf("'"))
    const category = entry.match(/\n\s*category: '([^']+)'/)?.[1]
    assert.ok(GAME_CATEGORIES.includes(category), `${id} needs category: 'educational' or 'adventure'`)
  }
})
