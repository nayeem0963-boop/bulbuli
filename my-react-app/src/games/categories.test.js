import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CATEGORY_FILTERS, categoryCounts, categoryOf, DEFAULT_FILTER, GAME_CATEGORIES, gamesInCategory,
  GAME_ZONES, gamesInZone, zoneOf,
  categoryCountsInZone, DEFAULT_HOME_MODE, HOME_MODE_STORAGE_KEY, parseHomeMode,
} from './categories.js'
import { COURSE_CATALOG } from '../courses/catalog.js'

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

test('the home page has two zones; every game lands in exactly one', () => {
  assert.deepEqual(GAME_ZONES, ['play-learn', 'build-create'])
  const zoned = [{ id: 'a', zone: 'play-learn' }, { id: 'b', zone: 'build-create' }, { id: 'c' }, { id: 'd', zone: 'x' }]
  assert.deepEqual(gamesInZone(zoned, 'play-learn').map((g) => g.id), ['a', 'c', 'd'])
  assert.deepEqual(gamesInZone(zoned, 'build-create').map((g) => g.id), ['b'])
  assert.equal(zoneOf({}), 'play-learn')
  const total = GAME_ZONES.reduce((n, zone) => n + gamesInZone(zoned, zone).length, 0)
  assert.equal(total, zoned.length)
})

// The zone each home-page card sits in. Changing a game's zone is a deliberate choice: update this too.
const EXPECTED_ZONES = {
  'math-hero': 'play-learn',
  'memory-match': 'play-learn',
  'pattern-quest': 'play-learn',
  'bulbuli-3d': 'play-learn',
  'shape-hunt': 'play-learn',
  'shape-sorting': 'play-learn',
  'sky-runner': 'play-learn',
  'ball-dash': 'play-learn',
  'skyward-explorer': 'build-create',
  'neon-velocity': 'build-create',
  'sky-typewriter': 'play-learn',
  'html-architect': 'play-learn',
  'math-master': 'build-create',
}

test('every game in the registry names a zone, and the HTML Course sits in Build & Create', () => {
  const source = readFileSync(new URL('./registry.js', import.meta.url), 'utf8')
  const entries = source.split(/\n\s*\{\n\s*id: '/).slice(1)
  const found = {}
  for (const entry of entries) {
    const id = entry.slice(0, entry.indexOf("'"))
    const zone = entry.match(/\n\s*zone: '([^']+)'/)?.[1]
    assert.ok(GAME_ZONES.includes(zone), `${id} needs zone: 'play-learn' or 'build-create'`)
    found[id] = zone
  }
  assert.deepEqual(found, EXPECTED_ZONES)
  for (const course of COURSE_CATALOG) assert.ok(GAME_ZONES.includes(course.zone), `course ${course.id} needs a zone`)
  assert.equal(COURSE_CATALOG.find((c) => c.id === 'html').zone, 'build-create')
})

test('home mode: a stored mode is used only when it is a real zone; anything else is Play & Learn', () => {
  assert.equal(HOME_MODE_STORAGE_KEY, 'bulbuli.home.mode')
  assert.equal(parseHomeMode('build-create'), 'build-create')
  assert.equal(parseHomeMode('play-learn'), 'play-learn')
  for (const bad of [null, undefined, '', 'BUILD-CREATE', 'arcade', '{"x":1}']) assert.equal(parseHomeMode(bad), 'play-learn')
  assert.equal(DEFAULT_HOME_MODE, 'play-learn')
})

test('home mode: each zone counts only its own games, and the two zones add up to the whole catalog', () => {
  const games = [
    { id: 'a', category: 'young', zone: 'play-learn' },
    { id: 'b', category: 'logic', zone: 'play-learn' },
    { id: 'c', category: 'arcade', zone: 'build-create' },
    { id: 'd', category: 'logic', zone: 'build-create', hidden: true },
  ]
  assert.deepEqual(categoryCountsInZone(games, 'play-learn'), { all: 2, young: 1, logic: 1, arcade: 0 })
  assert.deepEqual(categoryCountsInZone(games, 'build-create'), { all: 1, young: 0, logic: 0, arcade: 1 })
  const whole = categoryCounts(games)
  for (const key of Object.keys(whole)) {
    assert.equal(categoryCountsInZone(games, 'play-learn')[key] + categoryCountsInZone(games, 'build-create')[key], whole[key])
  }
})
