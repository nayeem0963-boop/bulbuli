import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_TRACK, DEFAULT_ZONE, homePlace, trackFromSearch, zoneFromSearch, zonePath } from './zone.js'

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
  assert.deepEqual(homePlace('/', ''), { zone: 'play', track: null })
  assert.deepEqual(homePlace('/', '?track=grammar'), { zone: 'play', track: null })
  assert.deepEqual(homePlace('/', '?zone=learn'), { zone: 'learn', track: 'coding' })
  assert.deepEqual(homePlace('/', '?zone=learn&track=grammar'), { zone: 'learn', track: 'grammar' })
  assert.deepEqual(homePlace('/games/memory-match', '?zone=learn'), { zone: 'play', track: null })
})
