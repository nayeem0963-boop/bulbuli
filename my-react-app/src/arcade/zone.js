import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// The home page has two zones: Play (the games) and Learn. Learn has two tracks:
// Coding (the courses and exams) and Grammar (the English tense quizzes).
// Both choices live in the address rather than in saved settings:
//   /                          Play
//   /?zone=learn               Learn, Coding
//   /?zone=learn&track=grammar Learn, Grammar
// so opening Bulbuli always starts in Play, the Back button steps between them,
// and any of them can be shared as a link.

export const ZONES = ['play', 'learn']
export const DEFAULT_ZONE = 'play'

export const LEARN_TRACKS = ['coding', 'grammar']
export const DEFAULT_TRACK = 'coding'

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

/**
 * The address of a place on the home page. Play is the plain home page; the track only
 * matters in Learn, and Coding (the default track) is left out of the address.
 */
export function zonePath(zone, track = DEFAULT_TRACK) {
  if (zone !== 'learn') return '/'
  return track === 'grammar' ? '/?zone=learn&track=grammar' : '/?zone=learn'
}

/** Where the home page currently is: { zone, track }. Track is null outside Learn. */
export function homePlace(pathname, search) {
  if (pathname !== '/') return { zone: DEFAULT_ZONE, track: null }
  const zone = zoneFromSearch(search)
  return { zone, track: zone === 'learn' ? trackFromSearch(search) : null }
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
