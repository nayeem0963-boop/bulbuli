import { test } from 'node:test'
import { existsSync } from 'node:fs'
import assert from 'node:assert/strict'
import { AVATARS, AVATAR_GROUPS, DEFAULT_AVATAR_ID, getAvatar, isAvatarId, lockReason, resolveAvatar } from './avatarCatalog.js'

test('catalog: unique ids, known kinds and groups, default exists and is free', () => {
  const ids = new Set()
  const groups = new Set(AVATAR_GROUPS.map(([id]) => id))
  for (const a of AVATARS) {
    assert.match(a.id, /^[a-z0-9-]+$/)
    assert.ok(!ids.has(a.id), a.id)
    ids.add(a.id)
    assert.ok(['image', 'bird', 'photo', 'initial'].includes(a.kind), a.id)
    assert.ok(groups.has(a.group), a.id)
    assert.ok(a.name && a.bg)
  }
  assert.equal(lockReason(getAvatar(DEFAULT_AVATAR_ID)), null)
})

test('nothing chosen or unknown id → the mascot', () => {
  assert.equal(resolveAvatar(undefined).id, 'bulbuli')
  assert.equal(resolveAvatar('nope').id, 'bulbuli')
  assert.equal(isAvatarId('nope'), false)
  assert.equal(isAvatarId('royal'), true)
})

test('level avatars unlock at their level', () => {
  assert.equal(lockReason(getAvatar('royal'), { level: 4 }), 'Reach level 5')
  assert.equal(lockReason(getAvatar('royal'), { level: 5 }), null)
  assert.equal(resolveAvatar('royal', { level: 4 }).id, 'bulbuli')
  assert.equal(resolveAvatar('royal', { level: 7 }).id, 'royal')
})

test('photo only when the account has one; the letter always works', () => {
  assert.equal(resolveAvatar('photo', { hasPhoto: false }).id, 'bulbuli')
  assert.equal(resolveAvatar('photo', { hasPhoto: true }).id, 'photo')
  assert.equal(resolveAvatar('initial').id, 'initial')
})

test('all 13 animal friends, each with its picture on disk', () => {
  const animals = AVATARS.filter((a) => a.group === 'animals')
  assert.deepEqual(animals.map((a) => a.id), ['bulbuli', 'hoppy', 'shelly', 'fawnley', 'roary', 'dashy', 'leo', 'sky', 'miskiti', 'buddy', 'finny', 'buzzy', 'pip'])
  for (const a of AVATARS.filter((x) => x.kind === 'image')) {
    assert.ok(existsSync(new URL(`../assets/avatars/${a.image}`, import.meta.url)), a.image)
    assert.equal(lockReason(a), null, `${a.id} is free`)
  }
})
