import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  categoryFromSearch, categoryOnPage, DEFAULT_CATEGORY, launchedGameFromSearch, launchPath, learnEntryFromSearch,
  learnPath, legacyModeFromSearch, playPath, searchWithoutLegacyCategory,
} from './zone.js'

test('Play opens on All; each learning category has its own address', () => {
  assert.equal(DEFAULT_CATEGORY, 'all')
  assert.equal(categoryFromSearch(''), 'all')
  assert.equal(categoryFromSearch('?category=math'), 'math')
  assert.equal(categoryFromSearch('?category=Coding'), 'coding')
  assert.equal(categoryFromSearch('?category=nonsense'), 'all')
  assert.equal(playPath('all'), '/')
  assert.equal(playPath('shapes'), '/?category=shapes')
  for (const category of ['all', 'math', 'shapes', 'language', 'coding', 'create']) {
    assert.equal(categoryFromSearch(playPath(category).replace('/', '')), category)
  }
})

test('campaign links keep their tracking parameters when switching pills', () => {
  const search = '?category=math&utm_source=fb&utm_campaign=launch'
  assert.equal(categoryFromSearch(search), 'math')
  assert.equal(playPath('coding', search), '/?category=coding&utm_source=fb&utm_campaign=launch')
  assert.equal(playPath('all', search), '/?utm_source=fb&utm_campaign=launch')
  assert.equal(playPath('math', '?play=math-hero&zone=learn'), '/?category=math')
  assert.equal(playPath('math', '?learn=shape-lab&utm_source=x'), '/?category=math&utm_source=x')
})

test('the filter only exists on the home page', () => {
  assert.equal(categoryOnPage('/', ''), 'all')
  assert.equal(categoryOnPage('/', '?category=language'), 'language')
  assert.equal(categoryOnPage('/games/sky-runner', '?category=math'), null)
})

test('old links land on All', () => {
  assert.equal(categoryOnPage('/', '?category=educational'), 'all')
  assert.equal(categoryOnPage('/', '?category=adventure'), 'all')
  assert.equal(categoryOnPage('/', '?zone=learn&track=grammar'), 'all')
})

test('the old audience pills (young / logic / arcade) open All in the mode those games now live in', () => {
  for (const old of ['young', 'logic', 'arcade']) assert.equal(categoryOnPage('/', `?category=${old}`), 'all')
  assert.equal(legacyModeFromSearch('?category=young'), 'play-learn')
  assert.equal(legacyModeFromSearch('?category=logic'), 'play-learn')
  assert.equal(legacyModeFromSearch('?category=Arcade&utm_source=x'), 'build-create')
  assert.equal(legacyModeFromSearch('?category=math'), null)
  assert.equal(legacyModeFromSearch(''), null)
  // only the old ?category= goes: an open launcher and campaign tags stay
  assert.equal(searchWithoutLegacyCategory('?category=arcade&play=neon-velocity'), '?play=neon-velocity')
  assert.equal(searchWithoutLegacyCategory('?category=young&utm_source=fb'), '?utm_source=fb')
  assert.equal(searchWithoutLegacyCategory('?category=arcade'), '')
  assert.equal(searchWithoutLegacyCategory('?category=math&learn=math-hero'), '?category=math&learn=math-hero')
})

test('a game opened in the launcher keeps the filtered grid behind it', () => {
  assert.equal(launchPath('language', 'sky-typewriter'), '/?category=language&play=sky-typewriter')
  assert.equal(launchPath('all', 'math-hero'), '/?play=math-hero')
  const search = launchPath('language', 'sky-typewriter').replace('/', '')
  assert.equal(launchedGameFromSearch(search), 'sky-typewriter')
  assert.equal(categoryFromSearch(search), 'language')
  assert.equal(launchedGameFromSearch(''), null)
  assert.equal(launchedGameFromSearch('?play=<script>'), null)
  // the archived Neon Velocity's old launcher links still name it, so they keep opening it
  assert.equal(launchedGameFromSearch('?category=arcade&play=neon-velocity'), 'neon-velocity')
})

test('a card’s mode picker opens over the filtered grid, with its own address', () => {
  assert.equal(learnPath('all', 'math-hero'), '/?learn=math-hero')
  assert.equal(learnPath('math', 'adventure-run', '?utm_source=x'), '/?category=math&utm_source=x&learn=adventure-run')
  assert.equal(learnEntryFromSearch('?category=math&learn=adventure-run'), 'adventure-run')
  assert.equal(learnEntryFromSearch(''), null)
  assert.equal(learnEntryFromSearch('?learn=<b>'), null)
})
