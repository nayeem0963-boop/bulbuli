/**
 * Badge rules: pure functions (no React, no storage), so they run in node --test.
 *
 *   const snapshot = snapshotFromProfile(profile)
 *   badgeProgress(badge, snapshot)           → { current, target, percent, met, unit }
 *   newlyEarned(BADGES, snapshot, unlocked)  → badges earned but not yet in `unlocked`
 *   mergeUnlocked(a, b)                      → one list, earliest date per badge
 */
import { levelForXp, xpForLevel } from '../lib/levels.js'

export const BADGE_ID_RE = /^[a-z0-9-]{1,40}$/

/** XP sources that aren't games, so they don't count towards "played N different games". */
const NOT_A_GAME = new Set(['guest-play'])

const count = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/**
 * The numbers badges are checked against, from a public.profiles row
 * ({ xp, activities_completed, stats: { [gameId]: { xp, plays } } }).
 */
export function snapshotFromProfile(profile) {
  const xp = count(profile?.xp)
  const rawStats = profile?.stats && typeof profile.stats === 'object' ? profile.stats : {}
  const stats = {}
  for (const [gameId, s] of Object.entries(rawStats)) {
    if (s && typeof s === 'object') stats[gameId] = { xp: count(s.xp), plays: count(s.plays) }
  }
  return {
    xp,
    level: levelForXp(xp),
    activities: count(profile?.activities_completed),
    gamesPlayed: Object.keys(stats).filter((id) => !NOT_A_GAME.has(id) && stats[id].plays > 0).length,
    stats,
  }
}

/**
 * How far along a badge is. Level badges are measured in XP (the XP that level needs),
 * so every locked card can show "current XP / required XP".
 */
export function badgeProgress(badge, snapshot) {
  const req = badge?.requirement ?? {}
  const target = count(req.target)
  let current = 0
  let goal = target
  let unit = 'XP'

  switch (req.type) {
    case 'level':
      current = snapshot.xp
      goal = xpForLevel(target)
      break
    case 'total_xp':
      current = snapshot.xp
      break
    case 'game_xp':
      current = snapshot.stats[req.gameId]?.xp ?? 0
      break
    case 'game_plays':
      current = snapshot.stats[req.gameId]?.plays ?? 0
      unit = 'rounds'
      break
    case 'games_played':
      current = snapshot.gamesPlayed
      unit = 'games'
      break
    case 'activities':
      current = snapshot.activities
      unit = 'rounds'
      break
    default:
      // unknown requirement type: never unlocks, rather than unlocking by mistake
      return { current: 0, target: goal, percent: 0, met: false, unit }
  }

  const met = goal > 0 ? current >= goal : false
  const percent = met ? 100 : goal > 0 ? Math.min(99, Math.floor((current / goal) * 100)) : 0
  return { current: Math.min(current, goal), target: goal, percent, met, unit }
}

/** Badges whose requirement is met now but that aren't in `unlocked` yet, in config order. */
export function newlyEarned(badges, snapshot, unlocked = []) {
  const have = new Set(unlocked.map((entry) => entry.badgeId))
  return badges.filter((badge) => !have.has(badge.id) && badgeProgress(badge, snapshot).met)
}

/** Cleans a saved list: valid ids and dates only, one entry per badge. */
export function normalizeUnlocked(list) {
  if (!Array.isArray(list)) return []
  return mergeUnlocked(list.filter((entry) => (
    entry
    && typeof entry.badgeId === 'string'
    && BADGE_ID_RE.test(entry.badgeId)
    && typeof entry.unlockedAt === 'string'
    && !Number.isNaN(Date.parse(entry.unlockedAt))
  )))
}

/** Union of unlocked lists. When both have a badge, the earlier unlock date wins. Oldest first. */
export function mergeUnlocked(...lists) {
  const byId = new Map()
  for (const entry of lists.flat()) {
    if (!entry?.badgeId) continue
    const known = byId.get(entry.badgeId)
    if (!known || Date.parse(entry.unlockedAt) < Date.parse(known.unlockedAt)) {
      byId.set(entry.badgeId, { badgeId: entry.badgeId, unlockedAt: entry.unlockedAt })
    }
  }
  return [...byId.values()].sort((a, b) => Date.parse(a.unlockedAt) - Date.parse(b.unlockedAt))
}

/**
 * A short code printed on a certificate, e.g. 'BLB-4F2A-9C17'. Same inputs → same code,
 * so a reprinted certificate matches the first one.
 */
export function certificateCode(userId, badgeId, unlockedAt) {
  const text = `${userId}|${badgeId}|${unlockedAt}`
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0
    h2 = Math.imul(h2 + c, 2246822519) >>> 0
  }
  const hex = ((h1 ^ h2) >>> 0).toString(16).toUpperCase().padStart(8, '0')
  return `BLB-${hex.slice(0, 4)}-${hex.slice(4)}`
}

/**
 * "How to earn it", in words. `gameName(id)` turns a game id into its display name.
 *   requirementText(badge, (id) => getGame(id)?.title.en)  →  'Earn 100 XP in Math Hero'
 */
export function requirementText(badge, gameName = (id) => id) {
  const { type, target, gameId } = badge?.requirement ?? {}
  const n = Number(target).toLocaleString('en')
  switch (type) {
    case 'level': return `Reach level ${n}`
    case 'total_xp': return `Earn ${n} XP in any game`
    case 'game_xp': return `Earn ${n} XP in ${gameName(gameId) ?? gameId}`
    case 'game_plays': return `Finish ${n} rounds of ${gameName(gameId) ?? gameId}`
    case 'games_played': return `Play ${n} different games`
    case 'activities': return `Finish ${n} rounds in any game`
    default: return 'Keep playing to find out!'
  }
}
