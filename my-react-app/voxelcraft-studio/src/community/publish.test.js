import assert from 'node:assert/strict'
import { test } from 'node:test'
import { REWARDS, mockStarterLevel } from '../data/mockData.js'
import { parseLevel } from '../level/levelSchema.js'
import { FIRST_CREATOR_BADGE, communityIdFor, createInitialGameState, gameReducer } from '../state/gameReducer.js'

const NOW = Date.UTC(2026, 9, 27, 10, 0, 0)
const level = () => parseLevel({ ...mockStarterLevel, id: 'lvl_pub' }).level
const THUMB = 'data:image/webp;base64,UklGRhIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA='

test('publish is refused without a Spawn and a Finish', () => {
  const s = createInitialGameState(NOW)
  const noFinish = { ...level(), blocks: level().blocks.filter((b) => b.type !== 'FINISH'), finishGate: null }
  assert.equal(gameReducer(s, { type: 'studio/publish', level: noFinish, now: NOW }), s)
  const noSpawn = { ...level(), blocks: level().blocks.filter((b) => b.type !== 'SPAWN'), spawnPoint: null }
  assert.equal(gameReducer(s, { type: 'studio/publish', level: noSpawn, now: NOW }), s)
  assert.equal(gameReducer(s, { type: 'community/submit', level: noSpawn, now: NOW }), s)
})

test('publish stores description, difficulty, thumbnail and contest choice; highlights the entry', () => {
  let s = createInitialGameState(NOW)
  s = gameReducer(s, { type: 'studio/publish', level: level(), description: 'Fast and shiny', difficulty: 'Hard', contest: true, thumbnail: THUMB, now: NOW })
  const id = communityIdFor(level())
  const e = s.community.levels.find((l) => l.id === id)
  assert.equal(s.community.levels[0].id, id, 'new levels go to the top')
  assert.deepEqual([e.description, e.difficulty, e.thumbnail, e.contestId], ['Fast and shiny', 'Hard', THUMB, s.community.contest.id])
  assert.equal(s.community.highlightId, id)
  // re-publish with the toggle off withdraws; omitted fields keep their values
  s = gameReducer(s, { type: 'studio/publish', level: level(), contest: false, now: NOW + 1 })
  const e2 = s.community.levels.find((l) => l.id === id)
  assert.equal(e2.contestId, null)
  assert.equal(e2.description, 'Fast and shiny')
  assert.equal(e2.thumbnail, THUMB)
  s = gameReducer(s, { type: 'community/clearHighlight' })
  assert.equal(s.community.highlightId, null)
})

test('contest entry is refused once the contest has ended (withdrawing still works)', () => {
  let s = createInitialGameState(NOW)
  s = gameReducer(s, { type: 'studio/publish', level: level(), contest: true, now: s.community.contest.endsAt + 1000 })
  assert.equal(s.community.levels.find((l) => l.id === communityIdFor(level())).contestId, null)
})

test('First Creator badge + XP bonus on the very first publish only', () => {
  let s = createInitialGameState(NOW)
  assert.ok(!s.player.badges.includes(FIRST_CREATOR_BADGE))
  const xp0 = s.player.level * 100000 + s.player.xp // monotonic proxy across level-ups
  const before = { ...s.player }
  s = gameReducer(s, { type: 'studio/publish', level: level(), now: NOW })
  assert.ok(s.player.badges.includes(FIRST_CREATOR_BADGE))
  const badgeToast = s.toasts.find((t) => t.badge === FIRST_CREATOR_BADGE)
  assert.equal(badgeToast.xp, REWARDS.firstCreator.xp)
  assert.equal(s.player.gems, before.gems + REWARDS.publishBuild.gems)
  assert.ok(s.player.level * 100000 + s.player.xp > xp0)
  assert.equal(s.studio.lastPublished.firstEver, true)

  const other = parseLevel({ ...mockStarterLevel, id: 'lvl_second' }).level
  s = gameReducer(s, { type: 'studio/publish', level: other, now: NOW + 5 })
  assert.equal(s.player.badges.filter((b) => b === FIRST_CREATOR_BADGE).length, 1, 'never awarded twice')
  assert.ok(!s.toasts.slice(-2).some((t) => t.badge === FIRST_CREATOR_BADGE))
  assert.equal(s.studio.lastPublished.firstEver, false)
})

// Storage round trips live in src/profile/profile.test.js (saveGame.js owns localStorage).
