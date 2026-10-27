import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTEST_ID, createMockCommunityLevels, createMockContest } from '../data/communityLevels.js'
import { mockStarterLevel } from '../data/mockData.js'
import { parseLevel, validateLevel } from '../level/levelSchema.js'
import { communityIdFor, createInitialGameState, gameReducer } from '../state/gameReducer.js'
import { countdownParts, matchesQuery, selectGallery, trendingScore } from './gallery.js'

const NOW = Date.UTC(2026, 9, 27, 10, 0, 0) // a Tuesday
const HOUR = 3600 * 1000

test('every mock community level is valid and publishable', () => {
  for (const c of createMockCommunityLevels(NOW)) {
    assert.deepEqual(validateLevel(c.level), [], c.title)
    assert.ok(c.level.blocks.length > 5, c.title)
  }
})

test('search: title or creator, case/accent-insensitive, all words must match', () => {
  const e = { title: 'Crème Neon Sprint', author: 'PixelMira' }
  assert.ok(matchesQuery(e, 'pixel'))
  assert.ok(matchesQuery(e, 'CREME'))
  assert.ok(matchesQuery(e, 'neon mira'))
  assert.ok(!matchesQuery(e, 'neon lava'))
  assert.ok(matchesQuery(e, '   '))
})

test('sort tabs', () => {
  const levels = [
    { id: 'a', title: 'Old classic', author: 'x', votes: 5000, plays: 20000, createdAt: NOW - 400 * HOUR, contestId: null },
    { id: 'b', title: 'Fresh hit', author: 'y', votes: 300, plays: 900, createdAt: NOW - 3 * HOUR, contestId: CONTEST_ID },
    { id: 'c', title: 'Brand new', author: 'z', votes: 2, plays: 4, createdAt: NOW - 0.5 * HOUR, contestId: CONTEST_ID },
  ]
  const ids = (tab, q) => selectGallery(levels, { tab, query: q, contestId: CONTEST_ID, now: NOW }).map((l) => l.id)
  assert.deepEqual(ids('newest'), ['c', 'b', 'a'])
  assert.deepEqual(ids('top'), ['a', 'b', 'c'])
  assert.deepEqual(ids('contest'), ['b', 'c'])
  assert.equal(ids('trending')[0], 'b', 'recent engagement beats an old classic')
  assert.ok(trendingScore(levels[1], NOW) > trendingScore(levels[0], NOW))
  assert.deepEqual(ids('contest', 'brand'), ['c'], 'search applies inside a tab')
  assert.deepEqual(levels.map((l) => l.id), ['a', 'b', 'c'], 'sorting never reorders the source array')
})

test('contest ends next Sunday 23:59:59 and the countdown reads it', () => {
  const contest = createMockContest(NOW)
  const end = new Date(contest.endsAt)
  assert.equal(end.getDay(), 0)
  assert.equal(end.getHours(), 23)
  assert.ok(contest.endsAt > NOW && contest.endsAt - NOW <= 7 * 24 * HOUR)
  assert.deepEqual(countdownParts(90061000), { days: 1, hours: 1, minutes: 1, seconds: 1, ended: false })
  assert.equal(countdownParts(-5).ended, true)
})

test('upvote: +1 vote, +10 gems once per level; un-vote/re-vote never pays twice', () => {
  let s = createInitialGameState(NOW)
  const target = s.community.levels.find((l) => l.author !== s.player.handle)
  const gems0 = s.player.gems
  s = gameReducer(s, { type: 'community/toggleVote', id: target.id })
  const after = s.community.levels.find((l) => l.id === target.id)
  assert.equal(after.votes, target.votes + 1)
  assert.equal(after.votedByMe, true)
  assert.equal(s.player.gems, gems0 + 10)
  assert.equal(s.toasts.at(-1).gems, 10)
  s = gameReducer(s, { type: 'community/toggleVote', id: target.id })
  s = gameReducer(s, { type: 'community/toggleVote', id: target.id })
  assert.equal(s.player.gems, gems0 + 10, 'no farming')
  assert.equal(s.community.levels.find((l) => l.id === target.id).votes, target.votes + 1)
})

test("can't upvote your own level", () => {
  const s = createInitialGameState(NOW)
  const own = s.community.levels.find((l) => l.author === s.player.handle)
  assert.ok(own, 'mock data includes one of the player’s levels')
  assert.equal(gameReducer(s, { type: 'community/toggleVote', id: own.id }), s)
})

test('play count, contest submission and Studio publish share one gallery entry', () => {
  let s = createInitialGameState(NOW)
  const first = s.community.levels[0]
  s = gameReducer(s, { type: 'community/recordPlay', id: first.id })
  assert.equal(s.community.levels.find((l) => l.id === first.id).plays, first.plays + 1)

  const level = parseLevel({ ...mockStarterLevel, id: 'lvl_mine' }).level
  const count0 = s.community.levels.length
  const gems0 = s.player.gems
  s = gameReducer(s, { type: 'studio/publish', level, now: NOW })
  assert.equal(s.community.levels.length, count0 + 1)
  assert.equal(s.player.gems, gems0 + 40, 'first publish rewarded')
  const id = communityIdFor(level)
  assert.equal(s.community.levels.find((l) => l.id === id).contestId, null)

  s = gameReducer(s, { type: 'community/submit', level: { ...level, title: 'Renamed' }, now: NOW + 1000 })
  const entry = s.community.levels.find((l) => l.id === id)
  assert.equal(s.community.levels.length, count0 + 1, 'updated in place, not duplicated')
  assert.equal(entry.contestId, s.community.contest.id)
  assert.equal(entry.title, 'Renamed')
  assert.equal(entry.createdAt, NOW, 'keeps its original date')

  s = gameReducer(s, { type: 'studio/publish', level, now: NOW + 2000 })
  assert.equal(s.player.gems, gems0 + 40, 're-publishing pays nothing')
  assert.equal(s.community.levels.find((l) => l.id === id).contestId, s.community.contest.id, 'stays entered')
})
