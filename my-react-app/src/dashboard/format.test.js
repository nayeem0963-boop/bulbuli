import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activityRows, describeSource, humanizeId, timeAgo } from './format.js'

test('unknown ids read like names, never as raw slugs', () => {
  assert.equal(humanizeId('logic-gate-builder'), 'Logic Gate Builder')
  assert.equal(humanizeId(''), 'Game')
  assert.equal(describeSource('daily-challenge').title, 'Daily Challenge')
})

test('guest XP gets a friendly label instead of an id', () => {
  const row = describeSource('guest-play')
  assert.equal(row.title, 'Guest stars')
  assert.equal(row.icon, '🐣')
  assert.equal(row.href, null)
})

test('registry games use their own title, skill, icon and link', () => {
  const game = { id: 'memory-match', title: { en: 'Memory Match' }, skill: { en: 'Memory' }, icon: '🃏', color: 'leaf' }
  assert.deepEqual(describeSource('memory-match', game), {
    title: 'Memory Match', subtitle: 'Memory', icon: '🃏', color: 'leaf', href: '/games/memory-match',
  })
})

test('activity rows are ranked by XP with a share of the top score', () => {
  const rows = activityRows({
    'shape-hunt': { xp: 50, plays: 2 },
    'math-hero': { xp: 200, plays: 9, last_played_at: '2026-10-20T00:00:00Z' },
    broken: null,
  })
  assert.deepEqual(rows.map((r) => [r.id, r.rank, r.share]), [['math-hero', 1, 100], ['shape-hunt', 2, 25]])
  assert.deepEqual(activityRows(undefined), [])
})

test('timeAgo speaks plainly', () => {
  const now = Date.parse('2026-10-25T12:00:00Z')
  assert.equal(timeAgo('2026-10-25T11:59:30Z', now), 'just now')
  assert.equal(timeAgo('2026-10-24T12:00:00Z', now), 'yesterday')
  assert.equal(timeAgo('2026-10-22T12:00:00Z', now), '3 days ago')
  assert.equal(timeAgo(null, now), '')
})
