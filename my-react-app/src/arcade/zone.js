import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DEFAULT_CATEGORY, GAME_CATEGORIES } from '../games/categories.js'

// Addresses on the Play home page. The Educational | Adventure switch picks a game category
// (see src/games/categories.js), and the launcher dialog opens a game, both in the address:
//   /                                         Educational
//   /?category=adventure                      Adventure
//   /?category=adventure&play=skyward-explorer  that game open in the launcher
// so the Back button steps between them and any of them can be shared as a link.
// Old Learn links (/?zone=learn…) simply land on the games.

export const PLAY_CATEGORIES = GAME_CATEGORIES
export { DEFAULT_CATEGORY }

/** The category named in a query string ('?category=adventure'); anything else is Educational. */
export function categoryFromSearch(search) {
  const category = new URLSearchParams(search).get('category')
  return PLAY_CATEGORIES.includes(category) ? category : DEFAULT_CATEGORY
}

/** The address of a category's game list. Educational, the default, is the plain home page. */
export function playPath(category) {
  return category === 'adventure' ? '/?category=adventure' : '/'
}

/** A game opened in the launcher: '?category=adventure&play=skyward-explorer'. */
export function launchPath(category, gameId) {
  const base = playPath(category)
  return `${base}${base.includes('?') ? '&' : '?'}play=${encodeURIComponent(gameId)}`
}

/** The game id in '?play=…', or null. Only meaningful on the home page. */
export function launchedGameFromSearch(search) {
  const id = new URLSearchParams(search).get('play')
  return id && /^[a-z0-9-]+$/.test(id) ? id : null
}

/** The category showing on this page, or null away from the home page (where the switch hides). */
export function categoryOnPage(pathname, search) {
  return pathname === '/' ? categoryFromSearch(search) : null
}

/** Returns [category, setCategory]; category is null away from the home page. */
export function useGameCategory() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const category = categoryOnPage(pathname, search)
  const setCategory = useCallback((next) => {
    if (next === category) return
    navigate(playPath(next))
  }, [navigate, category])
  return [category, setCategory]
}
