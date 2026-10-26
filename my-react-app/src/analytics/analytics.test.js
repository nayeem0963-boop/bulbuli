import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeParams } from './analytics.js'
import { EARLY_EXIT_MS, EVENT_NAMES, EVENTS } from './events.js'

test('event names are the agreed ones', () => {
  assert.deepEqual([...EVENT_NAMES].sort(), [
    'game_completed', 'game_exited', 'game_exited_early', 'game_favorited',
    'game_feedback_submitted', 'game_started', 'game_unfavorited',
  ])
  assert.equal(EVENTS.GAME_EXITED_EARLY, 'game_exited_early')
  assert.equal(EARLY_EXIT_MS, 15000)
})

test('sanitizeParams keeps small flat values and drops the rest', () => {
  const out = sanitizeParams({
    game_id: 'memory-match',
    xp: 12,
    bad_number: Number.NaN,
    ok: true,
    tags: ['too_hard', 7, 'boring'],
    nested: { a: 1 },
    'Bad-Key': 'x',
    empty: null,
  })
  assert.deepEqual(out, { game_id: 'memory-match', xp: 12, ok: true, tags: ['too_hard', 'boring'] })
})
