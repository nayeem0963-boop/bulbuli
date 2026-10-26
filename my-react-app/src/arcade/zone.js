import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CATEGORY_FILTERS, DEFAULT_FILTER } from '../games/categories.js'

// Addresses on the Play home page. The audience pills above the grid pick a filter
// (see src/games/categories.js), and the launcher dialog opens a game, both in the address:
//   /                                   All Games
//   /?category=young                    Young Learners      (ages 3–8)
//   /?category=logic                    Logic & Typing      (ages 6–12)
//   /?category=arcade                   Arcade & Dev Studio (ages 12+)
//   /?category=arcade&play=neon-velocity  that game open in the launcher over its filtered grid
// so the Back button steps between them, and campaign links can land on any of them.
// Other query parameters (utm_source, utm_campaign, …) are kept when switching pills.
// Old links still work: ?category=educational|adventure and ?zone=learn land on All Games.

export const PLAY_CATEGORIES = CATEGORY_FILTERS
export const DEFAULT_CATEGORY = DEFAULT_FILTER

/** The filter named in a query string ('?category=arcade'); anything else (or nothing) is All Games. */
export function categoryFromSearch(search) {
  const category = new URLSearchParams(search).get('category')?.toLowerCase()
  return PLAY_CATEGORIES.includes(category) ? category : DEFAULT_CATEGORY
}

/**
 * The address of a filtered game list. All Games, the default, has no `category`.
 * `search` (optional) is the current query string: its other parameters, such as campaign
 * tags, are carried over; `play` and the old `zone` / `track` are dropped.
 */
export function playPath(category, search = '') {
  const params = new URLSearchParams(search)
  for (const key of ['category', 'play', 'zone', 'track']) params.delete(key)
  const rest = params.toString()
  const own = category && category !== DEFAULT_CATEGORY ? `category=${encodeURIComponent(category)}` : ''
  const query = [own, rest].filter(Boolean).join('&')
  return query ? `/?${query}` : '/'
}

/** A game opened in the launcher over a filtered grid: '?category=arcade&play=neon-velocity'. */
export function launchPath(category, gameId, search = '') {
  const base = playPath(category, search)
  return `${base}${base.includes('?') ? '&' : '?'}play=${encodeURIComponent(gameId)}`
}

/** The game id in '?play=…', or null. Only meaningful on the home page. */
export function launchedGameFromSearch(search) {
  const id = new URLSearchParams(search).get('play')
  return id && /^[a-z0-9-]+$/.test(id) ? id : null
}

/** The filter showing on this page, or null away from the home page. */
export function categoryOnPage(pathname, search) {
  return pathname === '/' ? categoryFromSearch(search) : null
}

/**
 * Returns [category, setCategory]; category is null away from the home page.
 * Switching uses a view transition where the browser supports it, so the cards glide
 * into their new places instead of jumping (see .game-grid in arcade.css).
 */
export function useGameCategory() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const category = categoryOnPage(pathname, search)
  const setCategory = useCallback((next) => {
    if (next === category) return
    navigate(playPath(next, search), { viewTransition: true, preventScrollReset: true })
  }, [navigate, category, search])
  return [category, setCategory]
}
