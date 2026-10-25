import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  categoryFromSearch, DEFAULT_CATEGORY, DEFAULT_TRACK, DEFAULT_ZONE, homePlace, launchedGameFromSearch, launchPath,
  trackFromSearch, zoneFromSearch, zonePath,
} from './zone.js'

test('Bulbuli opens in Play unless the address asks for Learn', () => {
  assert.equal(DEFAULT_ZONE, 'play')
  assert.equal(zoneFromSearch(''), 'play')
  assert.equal(zoneFromSearch('?zone=learn'), 'learn')
  assert.equal(zoneFromSearch('?zone=play'), 'play')
  assert.equal(zoneFromSearch('?zone=nonsense'), 'play')
  assert.equal(zoneFromSearch('?lang=bn&zone=learn'), 'learn')
})

test('each zone has its own address, and they round-trip', () => {
  assert.equal(zonePath('play'), '/')
  assert.equal(zonePath('learn'), '/?zone=learn')
  for (const zone of ['play', 'learn']) assert.equal(zoneFromSearch(zonePath(zone).replace('/', '')), zone)
})

test('Learn opens on Coding; Grammar has its own address', () => {
  assert.equal(DEFAULT_TRACK, 'coding')
  assert.equal(trackFromSearch('?zone=learn'), 'coding')
  assert.equal(trackFromSearch('?zone=learn&track=grammar'), 'grammar')
  assert.equal(trackFromSearch('?zone=learn&track=nonsense'), 'coding')
  assert.equal(zonePath('learn', 'coding'), '/?zone=learn')
  assert.equal(zonePath('learn', 'grammar'), '/?zone=learn&track=grammar')
  // a track means nothing in Play
  assert.equal(zonePath('play', 'grammar'), '/')
})

test('the Coding | Grammar switch only exists in Learn', () => {
  assert.equal(homePlace('/', '').track, null)
  assert.equal(homePlace('/', '?track=grammar').track, null)
  assert.equal(homePlace('/', '?zone=learn').track, 'coding')
  assert.equal(homePlace('/', '?zone=learn&track=grammar').track, 'grammar')
  assert.equal(homePlace('/games/memory-match', '?zone=learn').track, null)
})

test('Play opens on Educational; Adventure has its own address', () => {
  assert.equal(DEFAULT_CATEGORY, 'educational')
  assert.equal(categoryFromSearch(''), 'educational')
  assert.equal(categoryFromSearch('?category=adventure'), 'adventure')
  assert.equal(categoryFromSearch('?category=nonsense'), 'educational')
  assert.equal(zonePath('play', 'educational'), '/')
  assert.equal(zonePath('play', 'adventure'), '/?category=adventure')
  // a category means nothing in Learn
  assert.equal(zonePath('learn', 'adventure'), '/?zone=learn')
  for (const category of ['educational', 'adventure']) {
    assert.equal(categoryFromSearch(zonePath('play', category).replace('/', '')), category)
  }
})

test('the Educational | Adventure switch only exists on the Play home page', () => {
  assert.deepEqual(homePlace('/', ''), { zone: 'play', track: null, category: 'educational' })
  assert.deepEqual(homePlace('/', '?category=adventure'), { zone: 'play', track: null, category: 'adventure' })
  assert.deepEqual(homePlace('/', '?zone=learn&category=adventure'), { zone: 'learn', track: 'coding', category: null })
  assert.deepEqual(homePlace('/games/sky-runner', '?category=adventure'), { zone: 'play', track: null, category: null })
})

test('a game opened in the launcher has its own address on its side of the Play switch', () => {
  assert.equal(launchPath('adventure', 'skyward-explorer'), '/?category=adventure&play=skyward-explorer')
  assert.equal(launchPath('educational', 'math-hero'), '/?play=math-hero')
  const search = launchPath('adventure', 'skyward-explorer').replace('/', '')
  assert.equal(launchedGameFromSearch(search), 'skyward-explorer')
  assert.equal(categoryFromSearch(search), 'adventure') // the grid behind it stays on Adventure
  assert.equal(launchedGameFromSearch(''), null)
  assert.equal(launchedGameFromSearch('?play=<script>'), null)
})
