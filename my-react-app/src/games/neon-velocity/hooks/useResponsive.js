import { useEffect, useState } from 'react'

export function useMediaQuery(query) {
  const get = () => typeof window !== 'undefined' && window.matchMedia(query).matches
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/**
 * Layout breakpoints used across the UI.
 *   isMobile        width < 768 px → virtual buttons, tabbed post-game, bottom sheets
 *   isTouch         coarse pointer (phones, tablets) → virtual buttons even on wide screens
 *   isShort         height ≤ 500 px (landscape phones) → compact HUD
 *   showVirtualPad  isMobile || isTouch
 */
export function useResponsive() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTouch = useMediaQuery('(pointer: coarse)')
  const isShort = useMediaQuery('(max-height: 500px)')
  const isLandscape = useMediaQuery('(orientation: landscape)')
  return { isMobile, isTouch, isShort, isLandscape, showVirtualPad: isMobile || isTouch }
}
