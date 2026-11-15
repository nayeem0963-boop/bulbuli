import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  ARCHIVED_GAME_IDS, CATALOG, CATALOG_FILTERS, CATEGORY_LABELS, LEARNING_CATEGORIES, catalogCounts, catalogGameIds,
  entriesFor, entryForGame, getCatalogEntry, hasModePicker, playableModes,
} from './learningCatalog.js'
import { GAME_ZONES } from '../games/categories.js'
import { BADGES } from '../data/badgesConfig.js'

// registry.js imports JSX, which node can't load, so read its source: each game's id and whether it's hidden.
const registrySource = readFileSync(new URL('../games/registry.js', import.meta.url), 'utf8')
const REGISTRY = registrySource.split(/\n\s*\{\n\s*id: '/).slice(1).map((entry) => ({
  id: entry.slice(0, entry.indexOf("'")),
  hidden: /\n\s*hidden: true,/.test(entry.slice(0, entry.indexOf('\n  },'))),
  path: entry.match(/\n\s*path: '([^']+)'/)?.[1] ?? null,
}))
const REGISTRY_IDS = REGISTRY.map((game) => game.id)

test('the catalogue has six Play & Learn and four Build & Create cards, in order', () => {
  assert.deepEqual(entriesFor('play-learn').map((e) => e.id), [
    'math-hero', 'shape-lab', 'adventure-run', 'sky-runner', 'sky-typewriter', 'html-architect',
  ])
  assert.deepEqual(entriesFor('build-create').map((e) => e.id), [
    'math-master', 'pro-coder', 'game-studio', 'skyward-explorer',
  ])
  assert.equal(CATALOG.length, 10)
  assert.equal(new Set(CATALOG.map((e) => e.id)).size, CATALOG.length, 'entry ids are unique')
})

test('every card says what is learnt, for which ages, in which category and at what level (en + bn)', () => {
  for (const entry of CATALOG) {
    assert.ok(GAME_ZONES.includes(entry.zone), `${entry.id}: zone`)
    assert.ok(LEARNING_CATEGORIES.includes(entry.category), `${entry.id}: category`)
    assert.match(entry.ages, /^\d+(–\d+|\+)$/, `${entry.id}: ages`)
    for (const field of ['title', 'tagline', 'learn', 'level']) {
      for (const lang of ['en', 'bn']) assert.ok(entry[field]?.[lang]?.trim(), `${entry.id}: ${field}.${lang}`)
    }
    assert.ok(entry.modes.length >= 1, `${entry.id}: at least one mode`)
  }
  for (const lang of ['en', 'bn']) {
    for (const filter of CATALOG_FILTERS) assert.ok(CATEGORY_LABELS[lang][filter], `label ${lang}.${filter}`)
  }
})

test('there is no arcade / entertainment category', () => {
  assert.ok(!CATALOG_FILTERS.includes('arcade'))
  assert.deepEqual(CATALOG_FILTERS, ['all', 'math', 'shapes', 'language', 'coding', 'create'])
})

test('every visible registry game is reachable from exactly one card; archived ones from none', () => {
  const used = catalogGameIds()
  for (const id of used) assert.ok(REGISTRY_IDS.includes(id), `${id} is a registry game`)
  for (const game of REGISTRY) {
    const owners = CATALOG.filter((entry) => entry.modes.some((mode) => mode.gameId === game.id))
    if (ARCHIVED_GAME_IDS.includes(game.id)) {
      assert.equal(owners.length, 0, `${game.id} is archived, so no card opens it`)
      assert.ok(game.hidden, `${game.id} is archived, so its registry entry is hidden`)
    } else {
      assert.equal(owners.length, 1, `${game.id} belongs to exactly one card`)
      assert.ok(!game.hidden, `${game.id} is in the catalogue, so it isn't hidden`)
    }
  }
})

test('Neon Velocity is archived: kept in the registry (old URL still plays) but on no card, count or filter', () => {
  assert.deepEqual(ARCHIVED_GAME_IDS, ['neon-velocity'])
  assert.ok(REGISTRY_IDS.includes('neon-velocity'))
  assert.equal(entryForGame('neon-velocity'), null)
  const total = GAME_ZONES.reduce((n, zone) => n + catalogCounts(zone).all, 0)
  assert.equal(total, 10)
  const sitemap = readFileSync(new URL('../../public/sitemap.xml', import.meta.url), 'utf8')
  assert.ok(!sitemap.includes('neon-velocity'))
})

test('Math Hero: Starter, Challenge and Advanced open the three existing games', () => {
  const entry = getCatalogEntry('math-hero')
  assert.deepEqual(entry.modes.map((m) => [m.id, m.gameId]), [
    ['starter', 'math-hero'], ['challenge', 'math-hero-pro'], ['advanced', 'math-hero-pro-plus'],
  ])
  assert.ok(hasModePicker(entry))
})

test('Shape Lab 3D: Shape Explorer and Shape Sorting', () => {
  assert.deepEqual(getCatalogEntry('shape-lab').modes.map((m) => [m.id, m.gameId]), [
    ['explorer', 'shape-hunt'], ['sorting', 'shape-sorting'],
  ])
})

test('Adventure Run: three playable modes, two clearly "coming soon" with no game behind them', () => {
  const entry = getCatalogEntry('adventure-run')
  assert.deepEqual(entry.modes.map((m) => m.id), ['multiplication-hop', 'letter-hop', 'free-practice', 'number-dash', 'pattern-run'])
  assert.deepEqual(playableModes(entry).map((m) => [m.id, m.gameId, m.search ?? '']), [
    ['multiplication-hop', 'bouncy-hop', '?track=count'],
    ['letter-hop', 'bouncy-hop', '?track=letters'],
    ['free-practice', 'ball-dash', ''],
  ])
  for (const id of ['number-dash', 'pattern-run']) {
    const mode = entry.modes.find((m) => m.id === id)
    assert.equal(mode.comingSoon, true)
    assert.equal(mode.gameId, undefined)
    assert.equal(mode.href, undefined)
    assert.equal(mode.to, undefined)
  }
})

test('Sky Runner and Skyward Explorer keep their names until Phase 2', () => {
  assert.equal(getCatalogEntry('sky-runner').title.en, "Bulbuli's Sky Runner")
  assert.equal(getCatalogEntry('skyward-explorer').title.en, 'Bulbuli: Skyward Explorer 3D')
  assert.equal(CATALOG.some((e) => /Sky Science|World Explorer/.test(e.title.en)), false)
})

test('single-mode cards open the same address as before; course and studio keep theirs', () => {
  assert.equal(getCatalogEntry('pro-coder').modes[0].href, '/quiz/?course=html')
  assert.equal(getCatalogEntry('game-studio').modes[0].to, '/game')
  for (const id of ['sky-runner', 'sky-typewriter', 'html-architect', 'math-master', 'skyward-explorer']) {
    const entry = getCatalogEntry(id)
    assert.equal(hasModePicker(entry), false)
    assert.equal(entry.modes[0].gameId, id)
  }
})

test('favourites stay saved per game: every card heart uses registry ids that card opens', () => {
  for (const entry of CATALOG) {
    const opens = new Set(playableModes(entry).map((m) => m.gameId).filter(Boolean))
    for (const id of entry.favoriteIds) assert.ok(opens.has(id), `${entry.id}: ${id}`)
    assert.deepEqual([...opens].sort(), [...entry.favoriteIds].sort(), `${entry.id}: every game's heart shows on the card`)
  }
})

test('XP, badges and certificates keep their game ids: every badge game is still opened by a card', () => {
  const opened = new Set(catalogGameIds())
  for (const badge of BADGES) {
    const gameId = badge.requirement?.gameId
    if (gameId) assert.ok(opened.has(gameId), `badge ${badge.id} (${gameId}) can still be earned`)
  }
})

test('pill counts: one per card, and each zone adds up', () => {
  assert.deepEqual(catalogCounts('play-learn'), { all: 6, math: 2, shapes: 2, language: 1, coding: 1, create: 0 })
  assert.deepEqual(catalogCounts('build-create'), { all: 4, math: 1, shapes: 1, language: 0, coding: 1, create: 1 })
  for (const zone of GAME_ZONES) {
    const counts = catalogCounts(zone)
    assert.equal(LEARNING_CATEGORIES.reduce((n, c) => n + counts[c], 0), counts.all)
  }
})
