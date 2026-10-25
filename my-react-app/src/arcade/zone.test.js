import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  categoryFromSearch, categoryOnPage, DEFAULT_CATEGORY, launchedGameFromSearch, launchPath, playPath,
} from './zone.js'

test('Play opens on Educational; Adventure has its own address', () => {
  assert.equal(DEFAULT_CATEGORY, 'educational')
  assert.equal(categoryFromSearch(''), 'educational')
  assert.equal(categoryFromSearch('?category=adventure'), 'adventure')
  assert.equal(categoryFromSearch('?category=nonsense'), 'educational')
  assert.equal(playPath('educational'), '/')
  assert.equal(playPath('adventure'), '/?category=adventure')
  for (const category of ['educational', 'adventure']) {
    assert.equal(categoryFromSearch(playPath(category).replace('/', '')), category)
  }
})

test('the Educational | Adventure switch only exists on the home page', () => {
  assert.equal(categoryOnPage('/', ''), 'educational')
  assert.equal(categoryOnPage('/', '?category=adventure'), 'adventure')
  assert.equal(categoryOnPage('/games/sky-runner', '?category=adventure'), null)
})

test('old Learn links land on the games', () => {
  assert.equal(categoryOnPage('/', '?zone=learn'), 'educational')
  assert.equal(categoryOnPage('/', '?zone=learn&track=grammar'), 'educational')
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
