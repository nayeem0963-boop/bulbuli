import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DEFAULT_CATEGORY, GAME_CATEGORIES } from '../games/categories.js'

// The home page has two zones: Play (the games) and Learn. Each zone has a second switch:
// Play has two game categories, Educational and Adventure (see src/games/categories.js);
// Learn has two tracks, Coding (the courses and exams) and Grammar (the English tense quizzes).
// All these choices live in the address rather than in saved settings:
//   /                          Play, Educational
//   /?category=adventure       Play, Adventure
//   /?zone=learn               Learn, Coding
//   /?zone=learn&track=grammar Learn, Grammar
// so opening Bulbuli always starts in Play, the Back button steps between them,
// and any of them can be shared as a link.

export const ZONES = ['play', 'learn']
export const DEFAULT_ZONE = 'play'

export const LEARN_TRACKS = ['coding', 'grammar']
export const DEFAULT_TRACK = 'coding'

export const PLAY_CATEGORIES = GAME_CATEGORIES
export { DEFAULT_CATEGORY }

/** The zone named in a URL query string ('?zone=learn'); anything else is Play. */
export function zoneFromSearch(search) {
  const zone = new URLSearchParams(search).get('zone')
  return ZONES.includes(zone) ? zone : DEFAULT_ZONE
}

/** The Learn track named in a query string ('?zone=learn&track=grammar'); anything else is Coding. */
export function trackFromSearch(search) {
  const track = new URLSearchParams(search).get('track')
  return LEARN_TRACKS.includes(track) ? track : DEFAULT_TRACK
}

/** The Play category named in a query string ('?category=adventure'); anything else is Educational. */
export function categoryFromSearch(search) {
  const category = new URLSearchParams(search).get('category')
  return PLAY_CATEGORIES.includes(category) ? category : DEFAULT_CATEGORY
}

/**
 * The address of a place on the home page. `sub` is the zone's second choice: the category
 * in Play, the track in Learn. The defaults (Educational, Coding) are left out of the address,
 * so Play Educational is the plain home page.
 */
export function zonePath(zone, sub) {
  if (zone === 'learn') return sub === 'grammar' ? '/?zone=learn&track=grammar' : '/?zone=learn'
  return sub === 'adventure' ? '/?category=adventure' : '/'
}

/**
 * A game opened in the launcher on the Play page: '?category=adventure&play=skyward-explorer'.
 * The launcher lives in the address too, so Back closes it and the link can be shared.
 */
export function launchPath(category, gameId) {
  const base = zonePath('play', category)
  return `${base}${base.includes('?') ? '&' : '?'}play=${encodeURIComponent(gameId)}`
}

/** The game id in '?play=…', or null. Only meaningful on the Play home page. */
export function launchedGameFromSearch(search) {
  const id = new URLSearchParams(search).get('play')
  return id && /^[a-z0-9-]+$/.test(id) ? id : null
}

/**
 * Where the home page currently is: { zone, track, category }.
 * Track is null outside Learn; category is null outside Play's home page.
 */
export function homePlace(pathname, search) {
  if (pathname !== '/') return { zone: DEFAULT_ZONE, track: null, category: null }
  const zone = zoneFromSearch(search)
  return {
    zone,
    track: zone === 'learn' ? trackFromSearch(search) : null,
    category: zone === 'play' ? categoryFromSearch(search) : null,
  }
}

/**
 * Returns [zone, setZone]. Outside the home page the zone is Play (games and the Math Hero page
 * belong to it), and choosing a zone goes to the home page in that zone.
 * Going to Learn always opens its first track (Coding).
 */
export function useZone() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const { zone } = homePlace(pathname, search)
  const onHome = pathname === '/'
  const setZone = useCallback((next) => {
    if (onHome && next === zone) return
    navigate(zonePath(next))
  }, [navigate, onHome, zone])
  return [zone, setZone]
}

/**
 * Returns [track, setTrack] for the Learn zone. Track is null when Learn is not showing,
 * which is how the Coding | Grammar switch knows to hide itself.
 */
export function useLearnTrack() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const { track } = homePlace(pathname, search)
  const setTrack = useCallback((next) => {
    if (next === track) return
    navigate(zonePath('learn', next))
  }, [navigate, track])
  return [track, setTrack]
}

/**
 * Returns [category, setCategory] for the Play zone. Category is null when Play's game list
 * is not showing, which is how the Educational | Adventure switch knows to hide itself.
 */
export function useGameCategory() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const { category } = homePlace(pathname, search)
  const setCategory = useCallback((next) => {
    if (next === category) return
    navigate(zonePath('play', next))
  }, [navigate, category])
  return [category, setCategory]
}
