import { REWARDS } from '../data/mockData.js'

/**
 * Badge catalogue + the rules that award them. Pure functions over game state, so the reducer
 * can call `pendingAchievements(state)` after any action and award whatever was just earned.
 *
 * Progress counters:
 *   published  levels by the player in the Community Gallery
 *   beaten     distinct levels finished in Play mode (Studio play-tests or community levels)
 *   gold       gold contest medals
 */

export const BADGES = [
  {
    id: 'First Creator',
    blurb: 'Publish your first level from the Studio',
    icon: 'rocket',
    goal: 1,
    progress: (s) => (s.studio.publishedIds.length > 0 ? 1 : 0),
    reward: REWARDS.firstCreator,
  },
  {
    id: 'Master Builder',
    blurb: 'Have 3 or more published levels',
    icon: 'blocks',
    goal: 3,
    progress: (s) => publishedCount(s),
    reward: { xp: 400, gems: 150 },
  },
  {
    id: 'Parkour King',
    blurb: 'Beat 5 different levels in Play mode',
    icon: 'crown',
    goal: 5,
    progress: (s) => Object.keys(s.player.beaten ?? {}).length,
    reward: { xp: 300, gems: 100 },
  },
  {
    id: 'Contest Winner',
    blurb: 'Win a gold medal in a weekly contest',
    icon: 'trophy',
    goal: 1,
    progress: (s) => (s.player.medals ?? []).filter((m) => m.place === 1).length,
    reward: { xp: 1000, gems: 0 }, // the contest prize itself is paid when the contest settles
  },
  // Earned before this build (mock history): shown in the gallery, never re-awarded.
  { id: 'Early Crafter', blurb: 'Joined in the first season', icon: 'sparkles', legacy: true },
  { id: 'Top 100 Builder', blurb: 'Reached the top 100 creators', icon: 'medal', legacy: true },
  { id: 'Vote Machine', blurb: 'Upvoted 100 community levels', icon: 'thumbs', legacy: true },
]

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]))
export const KNOWN_BADGES = new Set(BADGES.map((b) => b.id))

export const ownLevels = (s) => s.community.levels.filter((l) => l.author === s.player.handle)
export const publishedCount = (s) => ownLevels(s).length
export const upvotesReceived = (s) => ownLevels(s).reduce((sum, l) => sum + l.votes, 0)

/** Earnable badges the player has met the goal for but doesn't hold yet. */
export function pendingAchievements(state) {
  return BADGES.filter((b) => !b.legacy && !state.player.badges.includes(b.id) && b.progress(state) >= b.goal)
}

/** { current, goal, done } for the badge gallery's progress bars. */
export function badgeProgress(badge, state) {
  if (badge.legacy) return { current: 1, goal: 1, done: state.player.badges.includes(badge.id) }
  const current = Math.min(badge.goal, badge.progress(state))
  return { current, goal: badge.goal, done: state.player.badges.includes(badge.id) }
}

export const MEDAL_NAMES = { 1: 'Gold', 2: 'Silver', 3: 'Bronze' }
