import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// The home page has two zones: Play (the games) and Learn (the coding courses and exams).
// The zone lives in the address, /?zone=learn, rather than in saved settings, so:
//  - opening Bulbuli always starts in Play,
//  - the Back button steps between zones,
//  - a Learn link can be shared.

export const ZONES = ['play', 'learn']
export const DEFAULT_ZONE = 'play'

/** The zone named in a URL query string ('?zone=learn'); anything else is Play. */
export function zoneFromSearch(search) {
  const zone = new URLSearchParams(search).get('zone')
  return ZONES.includes(zone) ? zone : DEFAULT_ZONE
}

/** The address of a zone on the home page. Play is the plain home page. */
export const zonePath = (zone) => (zone === 'learn' ? '/?zone=learn' : '/')

/**
 * Returns [zone, setZone]. Outside the home page the zone is Play (games and the Math Hero page
 * belong to it), and choosing a zone goes to the home page in that zone.
 */
export function useZone() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const onHome = pathname === '/'
  const zone = onHome ? zoneFromSearch(search) : DEFAULT_ZONE
  const setZone = useCallback((next) => {
    if (onHome && next === zone) return
    navigate(zonePath(next))
  }, [navigate, onHome, zone])
  return [zone, setZone]
}
