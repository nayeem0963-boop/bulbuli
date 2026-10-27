import { countdownParts } from '../community/gallery.js'
import { APPEAL_PRESETS, DEFAULT_SIM, contestStandings, hoursLeft, simulateVotes } from '../community/simulation.js'
import { createMockCommunityLevels, createMockContest } from '../data/communityLevels.js'
import {
  DEFAULT_TAB,
  REWARDS,
  TABS,
  mockLeaderboard,
  mockPlayer,
  xpForLevel,
} from '../data/mockData.js'
import { validateLevel } from '../level/levelSchema.js'
import { BADGE_BY_ID, MEDAL_NAMES, pendingAchievements } from '../profile/achievements.js'
import { COSMETIC_BY_ID, DEFAULT_LOOK, SLOTS, isHex, isUnlocked } from '../profile/cosmetics.js'

export const FIRST_CREATOR_BADGE = 'First Creator'

/**
 * Builds the starting state. `now` is injectable so tests are deterministic. `saved` is the
 * validated save game from saveGame.loadSave() (progress, gems, unlocks, votes, published levels),
 * or null for a fresh start.
 */
export function createInitialGameState(now = Date.now(), saved = null) {
  const contest = createMockContest(now)
  const votes = saved?.votes ?? {}
  const mock = createMockCommunityLevels(now, contest.id).map((l) => {
    const v = votes[l.id]
    return {
      ...l,
      description: '',
      difficulty: null,
      thumbnail: null,
      votedByMe: Boolean(v?.voted),
      voteRewarded: Boolean(v?.rewarded),
      votes: l.votes + (v?.voted ? 1 : 0), // mock counts don't include our own saved vote
    }
  })
  const savedLevels = saved?.levels ?? []
  const savedIds = new Set(savedLevels.map((l) => l.id))
  const p = saved?.player ?? {}
  return {
    activeTab: DEFAULT_TAB,
    player: {
      ...mockPlayer,
      level: p.level ?? mockPlayer.level,
      xp: p.xp ?? mockPlayer.xp,
      gems: p.gems ?? mockPlayer.gems,
      badges: [...new Set([...mockPlayer.badges, ...(p.badges ?? [])])],
      medals: p.medals ?? mockPlayer.medals,
      /** levelId → best finish time (ms) */
      beaten: p.beaten ?? {},
    },
    cosmetics: {
      unlocked: saved?.cosmetics?.unlocked ?? [],
      equipped: saved?.cosmetics?.equipped ?? DEFAULT_LOOK,
    },
    /** Level content lives in the separate LevelEditorProvider (it changes on every click). */
    studio: { lastPublished: null, publishedIds: saved?.publishedIds ?? [] },
    community: {
      contest,
      /**
       * Gallery entries: { id, title, author, description, difficulty, tags, votes, plays,
       * createdAt, contestId, thumbnail, level, votedByMe, voteRewarded }
       */
      levels: [...savedLevels, ...mock.filter((l) => !savedIds.has(l.id))],
      /** Id of a just-published level the gallery should scroll to and highlight once. */
      highlightId: null,
      /** Settled contests, newest first: { id, theme, endedAt, entries, myRank, podium: [{ title, author, votes }] } */
      pastContests: saved?.pastContests ?? [],
    },
    /** Dev / Test Mode: simulated community voters (see community/simulation.js). */
    sim: saved?.sim ?? DEFAULT_SIM,
    leaderboard: mockLeaderboard,
    /** Short-lived reward toasts: { id, xp, gems, reason, badge } */
    toasts: [],
  }
}

/** Adds XP and rolls over as many levels as it covers. Pure, so it is easy to unit test. */
export function applyXp(player, amount) {
  let { level, xp } = player
  xp += amount
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level)
    level += 1
  }
  return { ...player, level, xp: Math.max(0, xp) }
}

let toastSeq = 0
/** Pays xp/gems (gems may be negative for purchases) and queues a toast describing it. */
const withReward = (state, { xp = 0, gems = 0 }, reason, badge = null) => ({
  ...state,
  player: { ...applyXp(state.player, xp), gems: state.player.gems + gems },
  toasts: xp || gems || badge ? [...state.toasts, { id: ++toastSeq, xp, gems, reason, badge }] : state.toasts,
})

/** Awards every badge whose goal is now met (each with its reward + a badge toast). */
function awardAchievements(state) {
  let next = state
  for (const badge of pendingAchievements(state)) {
    next = { ...next, player: { ...next.player, badges: [...next.player.badges, badge.id] } }
    next = withReward(next, badge.reward, 'Badge unlocked', badge.id)
  }
  return next
}

const mapLevels = (state, id, fn) => ({
  ...state,
  community: { ...state.community, levels: state.community.levels.map((l) => (l.id === id ? fn(l) : l)) },
})

export const communityIdFor = (level) => `ugc_${level.id}`

export const isContestOpen = (contest, now = Date.now()) => !countdownParts(contest.endsAt - now).ended

/**
 * Adds or updates the player's own level in the community gallery.
 * A re-publish keeps its votes, plays and original date.
 *   contest: true → enter the current contest · false → withdraw · undefined → keep as is
 *   meta: { description, difficulty, thumbnail } (undefined fields keep their old value)
 */
function upsertOwnLevel(state, level, { contest, now, meta = {} }) {
  const id = communityIdFor(level)
  const existing = state.community.levels.find((l) => l.id === id)
  const contestOpen = isContestOpen(state.community.contest, now)
  const keep = (key, fallback) => (meta[key] !== undefined ? meta[key] : (existing?.[key] ?? fallback))
  const entry = {
    id,
    title: level.title,
    author: state.player.handle,
    description: keep('description', ''),
    difficulty: keep('difficulty', null),
    thumbnail: keep('thumbnail', null),
    tags: existing?.tags ?? ['New'],
    votes: existing?.votes ?? 0,
    plays: existing?.plays ?? 0,
    createdAt: existing?.createdAt ?? now,
    // Entering needs an open contest; withdrawing is always allowed.
    contestId:
      contest === true && contestOpen ? state.community.contest.id
        : contest === false ? null
          : (existing?.contestId ?? null),
    level: { ...level, author: state.player.handle },
    votedByMe: false,
    voteRewarded: false,
  }
  const levels = existing
    ? state.community.levels.map((l) => (l.id === id ? entry : l))
    : [entry, ...state.community.levels]
  return { ...state, community: { ...state.community, levels } }
}

function baseReducer(state, action) {
  switch (action.type) {
    case 'tab/set':
      return TABS.some((t) => t.id === action.tab) ? { ...state, activeTab: action.tab } : state

    case 'player/reward':
      return withReward(state, action.reward, action.reason ?? 'Reward')

    case 'studio/publish': {
      // Publishing shares the level to the community gallery.
      //   action: { level, description?, difficulty?, contest?, thumbnail?, now? }
      // Guard: a level without a Spawn and a Finish can't be published, whatever the UI does.
      if (validateLevel(action.level).length) return state
      const now = action.now ?? Date.now()
      const firstOfLevel = !state.studio.publishedIds.includes(action.level.id)
      const firstEver = !state.player.badges.includes(FIRST_CREATOR_BADGE)
      let next = upsertOwnLevel(state, action.level, {
        contest: action.contest,
        now,
        meta: { description: action.description, difficulty: action.difficulty, thumbnail: action.thumbnail },
      })
      const id = communityIdFor(action.level)
      next = {
        ...next,
        studio: {
          lastPublished: { levelId: action.level.id, entryId: id, title: action.level.title, at: now, firstOfLevel, firstEver },
          publishedIds: firstOfLevel ? [...state.studio.publishedIds, action.level.id] : state.studio.publishedIds,
        },
        community: { ...next.community, highlightId: id },
      }
      // Once per level. Badges (First Creator, Master Builder…) are awarded by awardAchievements.
      return firstOfLevel ? withReward(next, REWARDS.publishBuild, `Published "${action.level.title}"`) : next
    }

    case 'community/clearHighlight':
      return state.community.highlightId ? { ...state, community: { ...state.community, highlightId: null } } : state

    case 'community/submit':
      if (validateLevel(action.level).length) return state
      return upsertOwnLevel(state, action.level, { contest: true, now: action.now ?? Date.now() })

    case 'community/toggleVote': {
      const target = state.community.levels.find((l) => l.id === action.id)
      // No voting on your own levels: it would be a free gem tap.
      if (!target || target.author === state.player.handle) return state
      const voting = !target.votedByMe
      // Gems are paid on the first upvote of each level, so vote / un-vote / vote can't farm them.
      const firstVote = voting && !target.voteRewarded
      const next = mapLevels(state, action.id, (l) => ({
        ...l,
        votedByMe: voting,
        voteRewarded: l.voteRewarded || voting,
        votes: l.votes + (voting ? 1 : -1),
      }))
      return firstVote ? withReward(next, REWARDS.castVote, `Upvoted "${target.title}"`) : next
    }

    case 'community/recordPlay':
      return mapLevels(state, action.id, (l) => ({ ...l, plays: l.plays + 1 }))

    case 'player/levelBeaten': {
      // { levelId, title, ms } from Play mode's finish line. Keeps the best time per level.
      const { levelId, title = 'level', ms } = action
      if (typeof levelId !== 'string' || !Number.isFinite(ms) || ms <= 0) return state
      const prev = state.player.beaten[levelId]
      if (prev !== undefined && prev <= ms) return state
      const next = { ...state, player: { ...state.player, beaten: { ...state.player.beaten, [levelId]: ms } } }
      return prev === undefined ? withReward(next, REWARDS.firstClear, `Cleared "${title}"`) : next
    }

    case 'contest/settle':
      // The countdown hit zero (with the page open): rank, award, archive, open next week.
      return settleContest(state, action.now ?? Date.now())

    case 'sim/configure': {
      // Dev / Test Mode settings: { enabled?, appeal? }
      const appeal = APPEAL_PRESETS.some((a) => a.id === action.appeal) ? action.appeal : state.sim.appeal
      const enabled = typeof action.enabled === 'boolean' ? action.enabled : state.sim.enabled
      if (appeal === state.sim.appeal && enabled === state.sim.enabled) return state
      return { ...state, sim: { ...state.sim, appeal, enabled } }
    }

    case 'sim/tick':
      // Live simulated voters (5 s real time = 1 simulated hour). Only while enabled.
      return state.sim.enabled ? simulateVotes(state, Math.min(24, Math.max(1, action.hours ?? 1))) : state

    case 'contest/fastForward': {
      // Dev / Test: play out the rest of the week's voting instantly, then settle exactly as the
      // real countdown would. Votes come from the same simulated crowd as live mode.
      const now = action.now ?? Date.now()
      const c = state.community.contest
      const simulated = simulateVotes(state, hoursLeft(c, now))
      return settleContest(simulated, Math.max(now, c.endsAt))
    }

    case 'cosmetics/buy': {
      const item = COSMETIC_BY_ID[action.itemId]
      if (!item || item.unlock.type !== 'gems' || state.cosmetics.unlocked.includes(item.id)) return state
      if (state.player.gems < item.unlock.cost) return state // UI shows "need N more"
      const next = {
        ...state,
        cosmetics: {
          unlocked: [...state.cosmetics.unlocked, item.id],
          equipped: { ...state.cosmetics.equipped, [item.slot]: { ...state.cosmetics.equipped[item.slot], item: item.id } },
        },
      }
      return withReward(next, { gems: -item.unlock.cost }, `Unlocked ${item.name}`)
    }

    case 'cosmetics/equip': {
      const item = COSMETIC_BY_ID[action.itemId]
      if (!item || !isUnlocked(item, state)) return state
      return {
        ...state,
        cosmetics: { ...state.cosmetics, equipped: { ...state.cosmetics.equipped, [item.slot]: { ...state.cosmetics.equipped[item.slot], item: item.id } } },
      }
    }

    case 'cosmetics/color': {
      if (!SLOTS.some((s) => s.id === action.slot) || !isHex(action.color)) return state
      const color = action.color.toLowerCase()
      return {
        ...state,
        cosmetics: { ...state.cosmetics, equipped: { ...state.cosmetics.equipped, [action.slot]: { ...state.cosmetics.equipped[action.slot], color } } },
      }
    }

    case 'state/replace': // "Reset progress" in the profile: fresh state, but stay on this tab
      return { ...action.state, activeTab: state.activeTab }

    case 'toast/dismiss':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) }

    default:
      return state
  }
}

/**
 * Ends the current contest at `now` (no-op before endsAt): ranks entries by votes (ties → the
 * earlier entry), awards the player's best-placed entry a medal (gold pays the gem prize; the
 * Contest Winner badge follows via awardAchievements), archives the podium and opens next week.
 * Used by both the real countdown and Dev Mode's fast-forward, so they can't disagree.
 */
export function settleContest(state, now) {
  const c = state.community.contest
  if (now < c.endsAt) return state
  const standings = contestStandings(state)
  const podium = standings.slice(0, 3).map((s) => s.entry)
  const mine = standings.find((s) => s.entry.author === state.player.handle)
  const place = mine && mine.rank <= 3 ? mine.rank : 0
  let next = {
    ...state,
    community: {
      ...state.community,
      contest: createMockContest(Math.max(now, c.endsAt) + 1000),
      pastContests: [
        {
          id: c.id,
          theme: c.theme,
          endedAt: c.endsAt,
          entries: standings.length,
          myRank: mine ? mine.rank : null,
          podium: podium.map(({ title, author, votes }) => ({ title, author, votes })),
        },
        ...state.community.pastContests,
      ].slice(0, 10),
    },
  }
  if (place > 0 && !state.player.medals.some((m) => m.contestId === c.id)) {
    const medal = { contestId: c.id, theme: c.theme, place, at: c.endsAt, levelTitle: mine.entry.title }
    next = { ...next, player: { ...next.player, medals: [medal, ...next.player.medals] } }
    next = place === 1
      ? withReward(next, { gems: c.prizeGems }, `Gold medal: ${c.theme}!`)
      : withReward(next, REWARDS.medal[place], `${MEDAL_NAMES[place]} medal: ${c.theme}`)
  }
  return next
}

/** Every action that changes state is followed by an achievements check. */
export function gameReducer(state, action) {
  const next = baseReducer(state, action)
  if (next === state || action.type === 'toast/dismiss' || action.type === 'state/replace') return next
  return awardAchievements(next)
}

export { BADGE_BY_ID }
