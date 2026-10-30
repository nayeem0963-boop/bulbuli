/**
 * Badges waiting for their celebration, per player, on this device
 * (localStorage 'bulbuli.celebrations.v1.<userId>'). A badge is added once when it's earned and
 * removed when the celebration is closed, so each celebration shows exactly once.
 */
import { BADGE_ID_RE } from './engine.js'

const key = (userId) => `bulbuli.celebrations.v1.${encodeURIComponent(userId)}`
const MAX = 10

/** Cleans a saved queue: valid badge ids, one entry each, at most MAX (oldest dropped). */
export function normalizeCelebrations(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const out = []
  for (const entry of list) {
    if (!entry || typeof entry.badgeId !== 'string' || !BADGE_ID_RE.test(entry.badgeId) || seen.has(entry.badgeId)) continue
    seen.add(entry.badgeId)
    out.push({ badgeId: entry.badgeId, unlockedAt: typeof entry.unlockedAt === 'string' ? entry.unlockedAt : new Date().toISOString() })
  }
  return out.slice(-MAX)
}

export function readCelebrations(userId) {
  try {
    return normalizeCelebrations(JSON.parse(window.localStorage.getItem(key(userId)) ?? '[]'))
  } catch {
    return []
  }
}

export function writeCelebrations(userId, list) {
  try {
    const clean = normalizeCelebrations(list)
    if (clean.length) window.localStorage.setItem(key(userId), JSON.stringify(clean))
    else window.localStorage.removeItem(key(userId))
  } catch {
    // storage blocked: the celebration still shows in this visit
  }
}
