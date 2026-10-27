import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mockStarterLevel } from '../data/mockData.js'
import { parseLevel } from '../level/levelSchema.js'
import { createInitialGameState, gameReducer } from '../state/gameReducer.js'
import { loadSave, selectSaveData, writeSave } from '../state/saveGame.js'
import { HOUR, contestStandings, hoursLeft, simulateVotes } from './simulation.js'

const NOW = Date.UTC(2026, 9, 27, 10, 0, 0)
const fresh = () => createInitialGameState(NOW)
const lvl = (id) => parseLevel({ ...mockStarterLevel, id }).level
const run = (s, ...actions) => actions.reduce(gameReducer, s)
const enter = (s, id = 'lvl_entry') => run(s, { type: 'community/submit', level: lvl(id), now: NOW })
const sim = (s, patch) => run(s, { type: 'sim/configure', ...patch })

function withStorage(fn) {
  const m = new Map()
  globalThis.localStorage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  }
  try {
    return fn(m)
  } finally {
    delete globalThis.localStorage
  }
}
const reload = (s, now = NOW + 1000) => {
  assert.equal(writeSave(selectSaveData(s)), 'saved')
  return createInitialGameState(now, loadSave(s.player.handle))
}

// ---- simulated voters ---------------------------------------------------------------------
test('simulation is deterministic for a seed and advances the seed', () => {
  const s = enter(fresh())
  const a = simulateVotes(s, 10)
  const b = simulateVotes(s, 10)
  assert.deepEqual(a.community.levels.map((l) => l.votes), b.community.levels.map((l) => l.votes))
  assert.notEqual(a.sim.seed, s.sim.seed)
  assert.equal(a.sim.simulatedHours, 10)
  assert.ok(a.community.levels.some((l, i) => l.votes > s.community.levels[i].votes), 'somebody got votes')
  assert.equal(simulateVotes(s, 0), s)
})

test('simulated votes never pay gems or touch the player’s own vote flags', () => {
  let s = fresh()
  const target = s.community.levels.find((l) => l.author !== s.player.handle)
  s = run(s, { type: 'community/toggleVote', id: target.id })
  const after = simulateVotes(s, 48)
  assert.equal(after.player.gems, s.player.gems)
  assert.equal(after.player.xp, s.player.xp)
  after.community.levels.forEach((l, i) => {
    assert.equal(l.votedByMe, s.community.levels[i].votedByMe)
    assert.equal(l.voteRewarded, s.community.levels[i].voteRewarded)
    assert.ok(l.votes >= s.community.levels[i].votes, 'votes only go up')
  })
})

test('sim/tick is a no-op while the toggle is off; hours are clamped when on', () => {
  const s = enter(fresh())
  assert.equal(run(s, { type: 'sim/tick', hours: 5 }), s)
  const on = sim(s, { enabled: true })
  assert.equal(run(on, { type: 'sim/tick', hours: 1e6 }).sim.simulatedHours, 24)
  assert.equal(run(on, { type: 'sim/tick', hours: -3 }).sim.simulatedHours, 1)
  assert.equal(sim(s, { appeal: 'nonsense' }), s, 'unknown appeal ignored')
})

test('fast-forward with Viral appeal: rank #1 → gold medal, +500 gems, Contest Winner, Champion Flame, next week', () => {
  let s = sim(enter(fresh()), { appeal: 'viral' })
  const c = s.community.contest
  const gems0 = s.player.gems
  s = run(s, { type: 'contest/fastForward', now: NOW })

  const past = s.community.pastContests[0]
  assert.equal(past.id, c.id)
  assert.equal(past.myRank, 1)
  assert.equal(past.podium[0].author, s.player.handle)
  assert.deepEqual(s.player.medals[0].place, 1)
  assert.ok(s.player.gems >= gems0 + c.prizeGems, `${gems0} → ${s.player.gems}`)
  assert.ok(s.player.badges.includes('Contest Winner'))
  const equipped = run(s, { type: 'cosmetics/equip', itemId: 'trail_flame' })
  assert.equal(equipped.cosmetics.equipped.trail.item, 'trail_flame', 'Champion Flame unlocked')
  assert.notEqual(s.community.contest.id, c.id, 'a new contest opened')
  assert.equal(s.sim.simulatedHours, hoursLeft(c, NOW))

  // the same contest can never pay twice
  const twice = run(s, { type: 'contest/settle', now: s.community.contest.endsAt - 1 })
  assert.equal(twice.player.medals.length, s.player.medals.length)
})

test('fast-forward with Normal appeal: a fresh entry finishes off the podium (no medal, no prize)', () => {
  let s = enter(fresh())
  const gems0 = s.player.gems
  s = run(s, { type: 'contest/fastForward', now: NOW })
  assert.ok(s.community.pastContests[0].myRank > 3)
  assert.equal(s.player.medals.filter((m) => m.place === 1).length, 0)
  assert.ok(!s.player.badges.includes('Contest Winner'))
  assert.ok(s.player.gems - gems0 < 500)
})

test('fast-forward without an entry: no medal, no rank', () => {
  const s0 = fresh()
  const s = run(s0, { type: 'contest/fastForward', now: NOW })
  assert.equal(s.community.pastContests[0].myRank, null)
  assert.equal(s.player.medals.length, s0.player.medals.length)
})

test('standings: votes desc, earlier entry wins a tie', () => {
  const s = enter(fresh())
  const st = contestStandings(s)
  st.forEach((x, i) => assert.equal(x.rank, i + 1))
  for (let i = 1; i < st.length; i++) assert.ok(st[i - 1].entry.votes >= st[i].entry.votes)
  assert.equal(hoursLeft({ endsAt: NOW + 2.5 * HOUR }, NOW), 3)
  assert.equal(hoursLeft({ endsAt: NOW - HOUR }, NOW), 0)
})

test('sim settings persist across reloads and tampered values are sanitized', () =>
  withStorage((m) => {
    let s = sim(enter(fresh()), { enabled: true, appeal: 'viral' })
    s = run(s, { type: 'sim/tick', hours: 3 })
    const r = reload(s)
    assert.deepEqual(r.sim, s.sim)

    const raw = JSON.parse([...m.values()].find((v) => v.includes('"sim"')))
    raw.sim = { enabled: 'yes', appeal: 'hacked', seed: 'x', simulatedHours: -9 }
    m.set([...m.keys()].find((k) => m.get(k).includes('"sim"')), JSON.stringify(raw))
    const t = createInitialGameState(NOW, loadSave(s.player.handle)).sim
    assert.equal(typeof t.enabled, 'boolean')
    assert.ok(['low', 'normal', 'viral'].includes(t.appeal))
    assert.ok(Number.isInteger(t.seed))
    assert.ok(t.simulatedHours >= 0)
  }))

// ---- guardrails ---------------------------------------------------------------------------
test('guardrail: +10 vote gems are paid once per level, across any number of reloads', () =>
  withStorage(() => {
    let s = fresh()
    const target = s.community.levels.find((l) => l.author !== s.player.handle)
    const g0 = s.player.gems
    s = run(s, { type: 'community/toggleVote', id: target.id })
    assert.equal(s.player.gems, g0 + 10)
    s = run(s, { type: 'community/toggleVote', id: target.id }) // un-vote
    for (let i = 0; i < 3; i++) {
      s = reload(s, NOW + (i + 1) * 1000)
      const l = s.community.levels.find((x) => x.id === target.id)
      assert.equal(l.voteRewarded, true, `reload ${i}: rewarded flag restored from the saved vote map`)
      s = run(s, { type: 'community/toggleVote', id: target.id }, { type: 'community/toggleVote', id: target.id })
    }
    s = reload(s)
    assert.equal(s.player.gems, g0 + 10, 'still exactly one payout')
  }))

test('guardrail: Reset Progress (state/replace) stays on the My Profile tab', () => {
  let s = run(fresh(), { type: 'tab/set', tab: 'profile' }, { type: 'player/reward', reward: { gems: 999 } })
  s = run(s, { type: 'state/replace', state: createInitialGameState(NOW) })
  assert.equal(s.activeTab, 'profile')
  assert.equal(s.player.gems, fresh().player.gems, 'progress really was reset')
})
