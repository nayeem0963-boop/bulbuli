// L1: hashing and deterministic event IDs (design section 3, tests E1–E4; E5 in sync.test.js).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { canonicalJson, sha1Hex, sha256Hex } from '../hash.js'
import { BULBULI_NAMESPACE, serverEventId, serverEventName, uuidv5 } from '../eventId.js'
import { USER_A, USER_B } from './helpers.js'

const EXISTING_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i // same as src/lib/xp.js

test('sha1 and sha256 match node:crypto for many inputs (incl. multi-block and Bangla text)', () => {
  const inputs = ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'x'.repeat(1000), 'বুলবুলি আকাশ বিজ্ঞান', JSON.stringify({ k: [1, 2, 3] })]
  for (const input of inputs) {
    assert.equal(sha1Hex(input), createHash('sha1').update(input).digest('hex'), `sha1 ${input.slice(0, 10)}`)
    assert.equal(sha256Hex(input), createHash('sha256').update(input).digest('hex'), `sha256 ${input.slice(0, 10)}`)
  }
})

test('canonicalJson is independent of key order', () => {
  assert.equal(canonicalJson({ b: 1, a: { d: 2, c: [3, { f: 1, e: 2 }] } }), canonicalJson({ a: { c: [3, { e: 2, f: 1 }], d: 2 }, b: 1 }))
})

test('uuidv5 matches the RFC 4122 / Python uuid5 reference vector', () => {
  // python: uuid.uuid5(uuid.NAMESPACE_DNS, 'www.example.com') == 2ed6657d-e927-568b-95e1-2665a8aea6a2
  assert.equal(uuidv5('www.example.com', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'), '2ed6657d-e927-568b-95e1-2665a8aea6a2')
})

test('E1: same learner + game + type + round → identical ID across calls', () => {
  const parts = { userId: USER_A, gameId: 'sky-runner', eventType: 'round', roundKey: 'sky:flight:abc' }
  assert.equal(serverEventId(parts), serverEventId({ ...parts }))
  assert.equal(serverEventId(parts), serverEventId({ ...parts, userId: USER_A.toUpperCase() }))
})

test('E2: a different round, game or event type → a different ID', () => {
  const base = { userId: USER_A, gameId: 'sky-runner', eventType: 'round', roundKey: 'sky:flight:abc' }
  const ids = new Set([
    serverEventId(base),
    serverEventId({ ...base, roundKey: 'sky:flight:abd' }),
    serverEventId({ ...base, gameId: 'skyward-explorer' }),
    serverEventId({ ...base, eventType: 'visit' }),
  ])
  assert.equal(ids.size, 4)
})

test('E3: different learners + same round key → different IDs', () => {
  const base = { gameId: 'sky-runner', eventType: 'round', roundKey: 'sky:flight:abc' }
  assert.notEqual(serverEventId({ ...base, userId: USER_A }), serverEventId({ ...base, userId: USER_B }))
})

test('E4: IDs are version-5 UUIDs accepted by the existing xp.js UUID check', () => {
  const id = serverEventId({ userId: USER_A, gameId: 'skyward-explorer', eventType: 'visit', roundKey: 'we:visit:1' })
  assert.match(id, EXISTING_UUID_RE)
  assert.equal(id[14], '5')
  assert.ok('89ab'.includes(id[19]))
})

test('event name format and namespace are fixed', () => {
  assert.equal(BULBULI_NAMESPACE, '88d50634-ac8b-4a99-a199-900d523ef152')
  assert.equal(serverEventName({ userId: USER_A, gameId: 'sky-runner', eventType: 'round', roundKey: 'sky:flight:x' }), `bulbuli/v1|${USER_A}|sky-runner|round|sky:flight:x`)
  assert.throws(() => serverEventId({ userId: 'guest', gameId: 'sky-runner', eventType: 'round', roundKey: 'k' }))
  assert.throws(() => serverEventId({ userId: USER_A, gameId: 'Bad Id', eventType: 'round', roundKey: 'k' }))
  assert.throws(() => serverEventId({ userId: USER_A, gameId: 'sky-runner', eventType: 'tier', roundKey: 'k' }))
})
