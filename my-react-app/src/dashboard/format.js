// Pure helpers for the dashboard (no React, no registry), so they can be tested with node --test.

/** 'shape-hunt' → 'Shape Hunt' */
export function humanizeId(id) {
  return String(id ?? '')
    .split('-')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ') || 'Game'
}

// XP sources that aren't games in the registry.
const SPECIAL_SOURCES = {
  'guest-play': { title: 'Guest stars', subtitle: 'XP earned before you signed in', icon: '🐣', color: 'sun' },
}

/**
 * How to show one row of profiles.stats. `game` is the registry entry, if any.
 * Returns { title, subtitle, icon, color, href }.
 */
export function describeSource(id, game) {
  if (game) {
    return { title: game.title.en, subtitle: game.skill?.en ?? '', icon: game.icon ?? '🎮', color: game.color ?? 'sky', href: game.path ?? `/games/${game.id}` }
  }
  if (SPECIAL_SOURCES[id]) return { ...SPECIAL_SOURCES[id], href: null }
  return { title: humanizeId(id), subtitle: 'Activity', icon: '🎮', color: 'sky', href: null }
}

/** Rows for the activity table, most XP first, with each row's share of the top score. */
export function activityRows(stats) {
  const rows = Object.entries(stats ?? {})
    .filter(([, s]) => s && typeof s === 'object')
    .map(([id, s]) => ({
      id,
      xp: Math.max(0, Number(s.xp) || 0),
      plays: Math.max(0, Number(s.plays) || 0),
      lastPlayedAt: s.last_played_at ?? null,
    }))
    .sort((a, b) => b.xp - a.xp || (Date.parse(b.lastPlayedAt) || 0) - (Date.parse(a.lastPlayedAt) || 0))
  const top = rows[0]?.xp || 1
  return rows.map((row, index) => ({ ...row, rank: index + 1, share: Math.round((row.xp / top) * 100) }))
}

const UNITS = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** '3 days ago', 'yesterday', 'just now'; '' for a missing or bad date. */
export function timeAgo(iso, now = Date.now(), locale = 'en') {
  const then = Date.parse(iso)
  if (!iso || Number.isNaN(then)) return ''
  const seconds = Math.round((then - now) / 1000)
  if (Math.abs(seconds) < 60) return 'just now'
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

/** 'Oct 25, 2026' */
export function formatDate(iso, locale) {
  const date = new Date(iso)
  return !iso || Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
}

export const formatNumber = (n) => (Number(n) || 0).toLocaleString('en')
