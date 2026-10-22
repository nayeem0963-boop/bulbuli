import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_ZONE, zoneFromSearch, zonePath } from './zone.js'

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
