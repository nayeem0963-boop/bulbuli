import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BADGES, BADGE_CATEGORIES, getBadge } from '../data/badgesConfig.js'
import {
  BADGE_ID_RE, badgeProgress, certificateCode, mergeUnlocked, newlyEarned, normalizeUnlocked, snapshotFromProfile,
} from './engine.js'

const profile = (over = {}) => ({ xp: 0, activities_completed: 0, stats: {}, ...over })

test('config: ids unique and valid, categories known, requirements well formed', () => {
  const ids = new Set()
  for (const badge of BADGES) {
    assert.match(badge.id, BADGE_ID_RE, badge.id)
    assert.ok(!ids.has(badge.id), `duplicate id ${badge.id}`)
    ids.add(badge.id)
    assert.ok(BADGE_CATEGORIES[badge.category], `${badge.id}: unknown category`)
    assert.equal(typeof badge.certificateEligible, 'boolean')
    assert.ok(badge.title && badge.description && badge.icon)
    assert.ok(Number.isInteger(badge.requirement.target) && badge.requirement.target > 0)
    if (badge.requirement.type.startsWith('game_')) assert.match(badge.requirement.gameId, /^[a-z0-9-]+$/)
  }
  assert.equal(getBadge('hatchling').title, 'Hatchling')
})

test('a new player has nothing; level badges are measured in XP', () => {
  const snap = snapshotFromProfile(profile())
  assert.deepEqual(newlyEarned(BADGES, snap), [])
  const p = badgeProgress(getBadge('sky-explorer'), snap)
  assert.deepEqual(p, { current: 0, target: 1600, percent: 0, met: false, unit: 'XP' })
})

test('level badge unlocks exactly at the level threshold', () => {
  assert.equal(badgeProgress(getBadge('hatchling'), snapshotFromProfile(profile({ xp: 99 }))).met, false)
  assert.equal(badgeProgress(getBadge('hatchling'), snapshotFromProfile(profile({ xp: 100 }))).met, true)
  assert.equal(badgeProgress(getBadge('hatchling'), snapshotFromProfile(profile({ xp: 99 }))).percent, 99)
})

test('game xp, games played and activities', () => {
  const snap = snapshotFromProfile(profile({
    xp: 450,
    activities_completed: 12,
    stats: {
      'math-hero': { xp: 120, plays: 8 },
      'shape-hunt': { xp: 40, plays: 2 },
      'guest-play': { xp: 200, plays: 1 },
      'html-architect': { xp: 50, plays: 1 },
    },
  }))
  assert.equal(snap.gamesPlayed, 3) // guest-play is not a game
  const ids = newlyEarned(BADGES, snap).map((b) => b.id)
  assert.deepEqual(ids, ['hatchling', 'fledgling', 'number-cruncher', 'first-tags', 'curious-mind'])
  assert.deepEqual(badgeProgress(getBadge('shape-spotter'), snap), { current: 40, target: 100, percent: 40, met: false, unit: 'XP' })
  // progress never overshoots the target on the card
  assert.equal(badgeProgress(getBadge('number-cruncher'), snap).current, 100)
})

test('already unlocked badges are not reported again', () => {
  const snap = snapshotFromProfile(profile({ xp: 150 }))
  assert.deepEqual(newlyEarned(BADGES, snap, [{ badgeId: 'hatchling', unlockedAt: '2026-10-01T00:00:00Z' }]), [])
})

test('unknown requirement types never unlock', () => {
  const p = badgeProgress({ requirement: { type: 'mystery', target: 1 } }, snapshotFromProfile(profile({ xp: 9999 })))
  assert.equal(p.met, false)
})

test('merge keeps the earliest date and drops junk', () => {
  const merged = mergeUnlocked(
    [{ badgeId: 'a', unlockedAt: '2026-10-05T00:00:00Z' }, { badgeId: 'b', unlockedAt: '2026-10-02T00:00:00Z' }],
    [{ badgeId: 'a', unlockedAt: '2026-10-01T00:00:00Z' }],
  )
  assert.deepEqual(merged, [
    { badgeId: 'a', unlockedAt: '2026-10-01T00:00:00Z' },
    { badgeId: 'b', unlockedAt: '2026-10-02T00:00:00Z' },
  ])
  assert.deepEqual(normalizeUnlocked([null, { badgeId: 'BAD ID', unlockedAt: 'x' }, { badgeId: 'ok', unlockedAt: 'nope' }]), [])
  assert.deepEqual(normalizeUnlocked('nope'), [])
})

test('certificate code is stable and well formed', () => {
  const a = certificateCode('u1', 'sky-explorer', '2026-10-28T00:00:00Z')
  assert.match(a, /^BLB-[0-9A-F]{4}-[0-9A-F]{4}$/)
  assert.equal(a, certificateCode('u1', 'sky-explorer', '2026-10-28T00:00:00Z'))
  assert.notEqual(a, certificateCode('u2', 'sky-explorer', '2026-10-28T00:00:00Z'))
})

test('requirement text', async () => {
  const { requirementText } = await import('./engine.js')
  assert.equal(requirementText(getBadge('number-cruncher'), () => 'Math Hero'), 'Earn 100 XP in Math Hero')
  assert.equal(requirementText(getBadge('sky-explorer')), 'Reach level 5')
  assert.equal(requirementText(getBadge('dedicated-learner')), 'Finish 100 rounds in any game')
})
