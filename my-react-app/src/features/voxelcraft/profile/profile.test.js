import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mockStarterLevel } from '../data/mockData.js'
import { parseLevel } from '../level/levelSchema.js'
import { createInitialGameState, gameReducer } from '../state/gameReducer.js'
import {
  LEGACY_KEY, SAVE_KEY, STUDIO_KEY, clearSave, loadSave, loadStudioLevel, saveStudioLevel, selectSaveData, writeSave,
} from '../state/saveGame.js'
import { STORAGE_KEYS } from '../state/storageKeys.js'
import { publishedCount, upvotesReceived } from './achievements.js'
import { COSMETIC_BY_ID, isUnlocked } from './cosmetics.js'

const NOW = Date.UTC(2026, 9, 27, 10, 0, 0)
const fresh = () => createInitialGameState(NOW)
const lvl = (id) => parseLevel({ ...mockStarterLevel, id }).level
const run = (s, ...actions) => actions.reduce(gameReducer, s)

function withStorage(fn, { quota = Infinity } = {}) {
  const m = new Map()
  globalThis.localStorage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      if (String(v).length > quota) throw new Error('QuotaExceededError')
      m.set(k, String(v))
    },
    removeItem: (k) => m.delete(k),
  }
  try {
    return fn(m)
  } finally {
    delete globalThis.localStorage
  }
}

// ---- stats ------------------------------------------------------------------------------
test('stats are derived from real state', () => {
  let s = fresh()
  const base = publishedCount(s)
  const votes0 = upvotesReceived(s)
  assert.equal(base, 1, 'the mock gallery has one level by the player (Void Hopper)')
  s = run(s, { type: 'studio/publish', level: lvl('lvl_a'), now: NOW })
  assert.equal(publishedCount(s), base + 1)
  assert.equal(upvotesReceived(s), votes0, 'a new level starts with 0 upvotes')
})

// ---- shop -------------------------------------------------------------------------------
test('buying: costs gems once, auto-equips, refuses duplicates and short balances', () => {
  let s = fresh()
  const gems0 = s.player.gems
  s = run(s, { type: 'cosmetics/buy', itemId: 'trail_sparks' })
  assert.equal(s.player.gems, gems0 - 300)
  assert.ok(s.cosmetics.unlocked.includes('trail_sparks'))
  assert.equal(s.cosmetics.equipped.trail.item, 'trail_sparks')
  assert.equal(s.toasts.at(-1).gems, -300)
  assert.equal(run(s, { type: 'cosmetics/buy', itemId: 'trail_sparks' }), s, 'already owned')
  const broke = { ...s, player: { ...s.player, gems: 100 } }
  assert.equal(run(broke, { type: 'cosmetics/buy', itemId: 'trail_rainbow' }), broke, 'not enough gems')
  assert.equal(run(s, { type: 'cosmetics/buy', itemId: 'trail_flame' }), s, 'badge items can’t be bought')
  assert.equal(run(s, { type: 'cosmetics/buy', itemId: 'nope' }), s)
})

test('equip + colour: locked items refused, colours validated', () => {
  let s = fresh()
  assert.equal(run(s, { type: 'cosmetics/equip', itemId: 'skin_chrome' }), s, 'not bought yet')
  assert.equal(run(s, { type: 'cosmetics/equip', itemId: 'trail_flame' }), s, 'needs Contest Winner')
  s = run(s, { type: 'cosmetics/equip', itemId: 'trail_comet' }) // mock history has a silver medal
  assert.equal(s.cosmetics.equipped.trail.item, 'trail_comet')
  s = run(s, { type: 'cosmetics/color', slot: 'shirt', color: '#FF00AA' })
  assert.equal(s.cosmetics.equipped.shirt.color, '#ff00aa')
  assert.equal(run(s, { type: 'cosmetics/color', slot: 'shirt', color: 'red' }), s)
  assert.equal(run(s, { type: 'cosmetics/color', slot: 'hat', color: '#000000' }), s)
  assert.ok(isUnlocked(COSMETIC_BY_ID.trail_creator, s) === false)
  s = run(s, { type: 'studio/publish', level: lvl('lvl_a'), now: NOW })
  assert.ok(isUnlocked(COSMETIC_BY_ID.trail_creator, s), 'First Creator badge unlocks Creator Aura')
})

// ---- achievements -----------------------------------------------------------------------
test('Parkour King after 5 different levels beaten; first clears pay XP; best times only improve', () => {
  let s = fresh()
  for (let i = 1; i <= 4; i++) s = run(s, { type: 'player/levelBeaten', levelId: `L${i}`, title: `L${i}`, ms: 9000 })
  assert.ok(!s.player.badges.includes('Parkour King'))
  s = run(s, { type: 'player/levelBeaten', levelId: 'L1', ms: 5000 })
  assert.equal(s.player.beaten.L1, 5000, 'new best')
  assert.equal(run(s, { type: 'player/levelBeaten', levelId: 'L1', ms: 7000 }), s, 'slower run ignored')
  const gems = s.player.gems
  s = run(s, { type: 'player/levelBeaten', levelId: 'L5', title: 'L5', ms: 8000 })
  assert.ok(s.player.badges.includes('Parkour King'))
  assert.equal(s.player.gems, gems + 100)
  assert.ok(s.toasts.some((t) => t.badge === 'Parkour King'))
  assert.ok(isUnlocked(COSMETIC_BY_ID.skin_lava, s))
  assert.equal(run(s, { type: 'player/levelBeaten', levelId: 'L6', ms: -1 }), s, 'junk times ignored')
})

test('Master Builder at 3 published levels (unlocks Holo Shift)', () => {
  let s = run(fresh(), { type: 'studio/publish', level: lvl('lvl_a'), now: NOW })
  assert.ok(!s.player.badges.includes('Master Builder'))
  s = run(s, { type: 'studio/publish', level: lvl('lvl_b'), now: NOW })
  assert.ok(s.player.badges.includes('Master Builder'))
  assert.ok(isUnlocked(COSMETIC_BY_ID.shirt_holo, s))
})

// ---- contests ---------------------------------------------------------------------------
test('contest settles only after it ends: gold → medal, prize, Contest Winner badge, next week opens', () => {
  let s = run(fresh(), { type: 'studio/publish', level: lvl('lvl_win'), contest: true, now: NOW })
  const c = s.community.contest
  assert.equal(run(s, { type: 'contest/settle', now: c.endsAt - 1 }), s, 'still running')
  // make the player's entry the most-voted (pretend the community loved it)
  s = { ...s, community: { ...s.community, levels: s.community.levels.map((l) => (l.id === 'ugc_lvl_win' ? { ...l, votes: 99999 } : l)) } }
  const gems = s.player.gems
  s = run(s, { type: 'contest/settle', now: c.endsAt + 5 })
  assert.equal(s.player.medals[0].place, 1)
  assert.equal(s.player.medals[0].contestId, c.id)
  assert.equal(s.player.gems, gems + c.prizeGems)
  assert.ok(s.player.badges.includes('Contest Winner'))
  assert.ok(isUnlocked(COSMETIC_BY_ID.trail_flame, s))
  assert.notEqual(s.community.contest.id, c.id)
  assert.ok(s.community.contest.endsAt > c.endsAt)
  assert.equal(s.community.pastContests[0].podium[0].title, mockStarterLevel.title)
})

test('contest settle: no medal outside the podium; silver pays the silver reward', () => {
  let s = run(fresh(), { type: 'studio/publish', level: lvl('lvl_meh'), contest: true, now: NOW })
  const medals = s.player.medals.length
  s = run(s, { type: 'contest/settle', now: s.community.contest.endsAt + 1 })
  assert.equal(s.player.medals.length, medals, '0 votes: no medal')

  s = run(fresh(), { type: 'studio/publish', level: lvl('lvl_2nd'), contest: true, now: NOW })
  const entries = s.community.levels.filter((l) => l.contestId === s.community.contest.id).sort((a, b) => b.votes - a.votes)
  s = { ...s, community: { ...s.community, levels: s.community.levels.map((l) => (l.id === 'ugc_lvl_2nd' ? { ...l, votes: entries[0].votes - 1 } : l)) } }
  s = run(s, { type: 'contest/settle', now: s.community.contest.endsAt + 1 })
  assert.equal(s.player.medals[0].place, 2)
  assert.ok(!s.player.badges.includes('Contest Winner'))
})

// ---- save game --------------------------------------------------------------------------
test('save round trip: progress, gems, unlocks, look, votes, published levels', () =>
  withStorage(() => {
    let s = fresh()
    const voteTarget = s.community.levels.find((l) => l.author !== s.player.handle)
    s = run(
      s,
      { type: 'cosmetics/buy', itemId: 'skin_chrome' },
      { type: 'cosmetics/color', slot: 'trail', color: '#123456' },
      { type: 'community/toggleVote', id: voteTarget.id },
      { type: 'player/levelBeaten', levelId: 'L1', title: 'L1', ms: 4321 },
      { type: 'studio/publish', level: lvl('lvl_saved'), description: 'hi', now: NOW },
    )
    assert.equal(writeSave(selectSaveData(s)), 'saved')

    const loaded = loadSave(s.player.handle)
    const r = createInitialGameState(NOW + 1000, loaded)
    assert.equal(r.player.gems, s.player.gems)
    assert.equal(r.player.level, s.player.level)
    assert.equal(r.player.xp, s.player.xp)
    assert.deepEqual(r.player.beaten, { L1: 4321 })
    assert.ok(r.player.badges.includes('First Creator'))
    assert.deepEqual(r.cosmetics, s.cosmetics)
    const v = r.community.levels.find((l) => l.id === voteTarget.id)
    assert.equal(v.votedByMe, true)
    assert.equal(v.votes, voteTarget.votes + 1)
    const again = run(r, { type: 'community/toggleVote', id: voteTarget.id }, { type: 'community/toggleVote', id: voteTarget.id })
    assert.equal(again.player.gems, r.player.gems, 'vote gems can’t be re-farmed after a reload')
    assert.ok(r.community.levels.some((l) => l.id === 'ugc_lvl_saved' && l.description === 'hi'))
  }))

test('tampered save is clamped and filtered, never trusted', () =>
  withStorage((m) => {
    m.set(SAVE_KEY, JSON.stringify({
      version: 2,
      player: { level: 1e9, xp: -5, gems: 1e12, badges: ['Contest Winner', 'Hacker'], medals: [{ contestId: 'x', place: 7 }], beaten: { ok: 1000, bad: 'fast' } },
      cosmetics: { unlocked: ['trail_rainbow', 'trail_flame', 'nope'], equipped: { trail: { item: 'skin_chrome', color: 'red' }, skin: { item: 'skin_chrome', color: '#abcdef' } } },
      votes: { a: { voted: 'yes', rewarded: true } },
      levels: [{ id: 'ugc_x', level: { blocks: [] } }],
    }))
    const d = loadSave('NeonBuilder')
    assert.equal(d.player.level, 999)
    assert.equal(d.player.xp, 0)
    assert.equal(d.player.gems, 10_000_000)
    assert.deepEqual(d.player.badges, ['Contest Winner'], 'unknown badges dropped')
    assert.deepEqual(d.player.medals, [])
    assert.deepEqual(d.player.beaten, { ok: 1000 })
    assert.deepEqual(d.cosmetics.unlocked, ['trail_rainbow'], 'only buyable items can be "owned"')
    assert.equal(d.cosmetics.equipped.trail.item, 'trail_streak', 'wrong-slot item replaced')
    assert.equal(d.cosmetics.equipped.trail.color, '#34d399')
    assert.equal(d.votes.a.voted, false)
    assert.deepEqual(d.levels, [], 'invalid level dropped')
    // an equipped-but-locked item is never equipable via the reducer either
    const s = createInitialGameState(NOW, d)
    assert.equal(run(s, { type: 'cosmetics/equip', itemId: 'skin_lava' }), s)

    m.set(SAVE_KEY, '{oops')
    assert.equal(loadSave('NeonBuilder'), null, 'corrupt JSON → fresh start')
  }))

test('migrates the previous build’s publish data; full storage drops thumbnails; reset clears', () =>
  withStorage((m) => {
    let s = run(fresh(), { type: 'studio/publish', level: lvl('lvl_old'), thumbnail: `data:image/webp;base64,${'A'.repeat(100)}`, now: NOW })
    const v1 = { version: 1, levels: selectSaveData(s).levels, badges: s.player.badges, publishedIds: s.studio.publishedIds }
    m.set(LEGACY_KEY, JSON.stringify(v1))
    const d = loadSave('NeonBuilder')
    assert.equal(d.levels[0].id, 'ugc_lvl_old')
    assert.ok(d.player.badges.includes('First Creator'))
    writeSave(selectSaveData(createInitialGameState(NOW, d)))
    assert.ok(!m.has(LEGACY_KEY), 'legacy key removed after migrating')

    assert.ok(saveStudioLevel(lvl('lvl_wip')))
    assert.equal(loadStudioLevel().id, 'lvl_wip')
    m.set(STUDIO_KEY, '{"blocks": "nope"}')
    assert.equal(loadStudioLevel().blocks.length, 0, 'bad blocks dropped, still a valid level')
    clearSave()
    assert.deepEqual([...m.keys()], [STORAGE_KEYS.migrated], 'only the one-time migration marker stays')
  }))

test('storage full → save without thumbnails; no storage → no crash', () => {
  withStorage(() => {
    const s = run(fresh(), { type: 'studio/publish', level: lvl('lvl_big'), thumbnail: `data:image/webp;base64,${'A'.repeat(20000)}`, now: NOW })
    assert.equal(writeSave(selectSaveData(s)), 'saved-without-thumbnails')
  }, { quota: 15000 })
  assert.equal(writeSave({ version: 2, levels: [] }), 'failed')
  assert.equal(loadSave('x'), null)
  assert.equal(loadStudioLevel(), null)
})
