import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  canRequestFullscreen, exitFullscreen, fullscreenElement, onFullscreenChange, requestFullscreen,
} from '../lib/fullscreen.js'

/**
 * Full screen for one element (a game's frame), kept in step with the browser.
 *
 *   const { isFullscreen, supported, enter, exit, toggle } = useFullscreen(ref, options)
 *
 * - Real full screen through the Fullscreen API on `ref.current` (never the whole document).
 * - `isFullscreen` follows the browser's fullscreenchange event, so leaving with Esc or the
 *   browser's own controls updates the button too.
 * - `fallback` (default true): where the API is missing or refuses (iPhone Safari), the element
 *   "fills the window" instead (`isFilled`; style it with a class). Esc leaves that as well,
 *   unless `escapeExitsFallback` is false (a frame whose games use Esc to pause).
 * - `lockLandscape`: also asks phones to turn sideways while in full screen (best effort).
 * - Leaves full screen when the component goes away, so nothing is left stuck.
 *
 * enter() must be called from a click or key press, or the browser refuses.
 * The element stays mounted throughout, so the game inside keeps all of its state.
 */
export function useFullscreen(ref, { fallback = true, lockLandscape = false, escapeExitsFallback = true } = {}) {
  const [isNative, setNative] = useState(false) // the browser's own full screen, on this element
  const [isFilled, setFilled] = useState(false) // fallback: the element fills the window

  // one listener per element, removed on unmount
  useEffect(() => {
    const sync = () => {
      const on = Boolean(ref.current) && fullscreenElement() === ref.current
      setNative(on)
      if (on) setFilled(false)
    }
    sync()
    return onFullscreenChange(sync)
  }, [ref])

  // leave full screen if the frame unmounts while full screen
  useEffect(() => {
    const element = ref.current
    return () => {
      if (element && fullscreenElement() === element) exitFullscreen()
    }
  }, [ref])

  // in the fallback, Esc leaves too, and the page behind doesn't scroll
  useEffect(() => {
    if (!isFilled) return undefined
    const onKey = (event) => { if (event.key === 'Escape') setFilled(false) }
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    if (escapeExitsFallback) document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
    }
  }, [isFilled, escapeExitsFallback])

  const enter = useCallback(async () => {
    const element = ref.current
    if (!element) return
    if (canRequestFullscreen(element)) {
      try {
        await requestFullscreen(element)
        if (lockLandscape) await window.screen?.orientation?.lock?.('landscape')?.catch?.(() => {})
        return
      } catch {
        // refused (e.g. not from a click, or a permissions policy): fall back below
      }
    }
    if (fallback) setFilled(true)
  }, [ref, fallback, lockLandscape])

  const exit = useCallback(() => {
    exitFullscreen()
    try { window.screen?.orientation?.unlock?.() } catch { /* not supported */ }
    setFilled(false)
  }, [])

  const isFullscreen = isNative || isFilled
  const toggle = useCallback(() => (isFullscreen ? exit() : enter()), [isFullscreen, enter, exit])
  const supported = fallback || canRequestFullscreen(typeof document === 'undefined' ? null : document.documentElement)

  return useMemo(
    () => ({ isFullscreen, isNative, isFilled, supported, enter, exit, toggle }),
    [isFullscreen, isNative, isFilled, supported, enter, exit, toggle],
  )
}

export default useFullscreen
