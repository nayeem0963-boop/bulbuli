/**
 * Pure gallery logic: search, sort tabs and contest countdown. No React, so it's unit-tested.
 */

export const SORT_TABS = [
  { id: 'trending', label: 'Trending' },
  { id: 'newest', label: 'Newest' },
  { id: 'top', label: 'Top Voted' },
  { id: 'contest', label: 'Contest Entries' },
]

const HOUR = 3600 * 1000

/**
 * "Hot" score: engagement decays with age (Hacker News-style gravity), so a fresh level with a
 * burst of votes outranks an old classic. Plays count a little, votes count most.
 */
export function trendingScore(entry, now = Date.now()) {
  const ageHours = Math.max(0, (now - entry.createdAt) / HOUR)
  return (entry.votes + entry.plays * 0.1 + 1) / Math.pow(ageHours + 2, 1.5)
}

/** Case- and accent-insensitive, so "pixel" finds "PixelMira" and "creme" finds "Crème". */
export const normalize = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Every search word must appear in the title or the creator's name. */
export function matchesQuery(entry, query) {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = `${normalize(entry.title)} ${normalize(entry.author)}`
  return words.every((w) => hay.includes(w))
}

/**
 * The gallery's visible list for a tab + search. Stable tie-breaks keep cards from jumping.
 * @param {Array} levels
 * @param {{ tab: string, query?: string, contestId?: string, now?: number }} opts
 */
export function selectGallery(levels, { tab, query = '', contestId, now = Date.now() }) {
  let list = levels.filter((l) => matchesQuery(l, query))
  const byNewest = (a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id)
  switch (tab) {
    case 'newest':
      return list.sort(byNewest)
    case 'top':
      return list.sort((a, b) => b.votes - a.votes || byNewest(a, b))
    case 'contest':
      list = list.filter((l) => l.contestId && l.contestId === contestId)
      return list.sort((a, b) => b.votes - a.votes || byNewest(a, b))
    case 'trending':
    default:
      return list.sort((a, b) => trendingScore(b, now) - trendingScore(a, now) || byNewest(a, b))
  }
}

/** ms → { days, hours, minutes, seconds, ended } for the contest countdown. */
export function countdownParts(ms) {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true }
  const s = Math.floor(ms / 1000)
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    ended: false,
  }
}

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
export const formatCount = (n) => compact.format(n)

/** 5 h ago → "5h ago", 3 days → "3d ago". */
export function timeAgo(ts, now = Date.now()) {
  const m = Math.max(0, Math.round((now - ts) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}
