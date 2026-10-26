import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  categoryFromSearch, categoryOnPage, DEFAULT_CATEGORY, launchedGameFromSearch, launchPath, playPath,
} from './zone.js'

test('Play opens on All Games; each audience has its own address', () => {
  assert.equal(DEFAULT_CATEGORY, 'all')
  assert.equal(categoryFromSearch(''), 'all')
  assert.equal(categoryFromSearch('?category=arcade'), 'arcade')
  assert.equal(categoryFromSearch('?category=Young'), 'young')
  assert.equal(categoryFromSearch('?category=nonsense'), 'all')
  assert.equal(playPath('all'), '/')
  assert.equal(playPath('logic'), '/?category=logic')
  for (const category of ['all', 'young', 'logic', 'arcade']) {
    assert.equal(categoryFromSearch(playPath(category).replace('/', '')), category)
  }
})

test('campaign links keep their tracking parameters when switching pills', () => {
  const search = '?category=arcade&utm_source=fb&utm_campaign=launch'
  assert.equal(categoryFromSearch(search), 'arcade')
  assert.equal(playPath('young', search), '/?category=young&utm_source=fb&utm_campaign=launch')
  assert.equal(playPath('all', search), '/?utm_source=fb&utm_campaign=launch')
  assert.equal(playPath('logic', '?play=math-hero&zone=learn'), '/?category=logic')
})

test('the filter only exists on the home page', () => {
  assert.equal(categoryOnPage('/', ''), 'all')
  assert.equal(categoryOnPage('/', '?category=young'), 'young')
  assert.equal(categoryOnPage('/games/sky-runner', '?category=young'), null)
})

test('old links land on All Games', () => {
  assert.equal(categoryOnPage('/', '?category=educational'), 'all')
  assert.equal(categoryOnPage('/', '?category=adventure'), 'all')
  assert.equal(categoryOnPage('/', '?zone=learn&track=grammar'), 'all')
})

test('a game opened in the launcher keeps the filtered grid behind it', () => {
  assert.equal(launchPath('arcade', 'neon-velocity'), '/?category=arcade&play=neon-velocity')
  assert.equal(launchPath('all', 'math-hero'), '/?play=math-hero')
  const search = launchPath('arcade', 'neon-velocity').replace('/', '')
  assert.equal(launchedGameFromSearch(search), 'neon-velocity')
  assert.equal(categoryFromSearch(search), 'arcade')
  assert.equal(launchedGameFromSearch(''), null)
  assert.equal(launchedGameFromSearch('?play=<script>'), null)
})
