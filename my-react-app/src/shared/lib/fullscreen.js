// The browser's Fullscreen API, with the webkit-prefixed versions older Safari still needs.
// Plain functions (no React), so the arcade's hook, Pattern Quest's button and the tests share them.
// The standalone HTML course page (quiz/engine.js) can't import from src/, so it keeps its own copy.

const DOC = () => (typeof document === 'undefined' ? null : document)

/** The element that is full screen right now, or null. */
export function fullscreenElement(doc = DOC()) {
  if (!doc) return null
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

/** True when this element can ask for real (browser) full screen. False on iPhone Safari. */
export function canRequestFullscreen(element, doc = DOC()) {
  if (!element || !doc) return false
  const enabled = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled
  if (enabled === false) return false
  return typeof element.requestFullscreen === 'function' || typeof element.webkitRequestFullscreen === 'function'
}

/** Puts the element in full screen. Rejects when the browser refuses (or can't). */
export async function requestFullscreen(element) {
  if (typeof element?.requestFullscreen === 'function') {
    await element.requestFullscreen({ navigationUI: 'hide' })
    return
  }
  if (typeof element?.webkitRequestFullscreen === 'function') {
    element.webkitRequestFullscreen()
    return
  }
  throw new Error('Full screen is not available here.')
}

/** Leaves full screen, if anything is full screen. Never throws. */
export async function exitFullscreen(doc = DOC()) {
  if (!fullscreenElement(doc)) return
  try {
    if (typeof doc.exitFullscreen === 'function') await doc.exitFullscreen()
    else if (typeof doc.webkitExitFullscreen === 'function') doc.webkitExitFullscreen()
  } catch {
    // already leaving (e.g. Esc pressed at the same moment): nothing to do
  }
}

export const FULLSCREEN_EVENTS = ['fullscreenchange', 'webkitfullscreenchange']

/** Calls `listener` whenever full screen starts or ends, however that happened (button, Esc, browser UI). Returns an unsubscribe function. */
export function onFullscreenChange(listener, doc = DOC()) {
  if (!doc) return () => {}
  FULLSCREEN_EVENTS.forEach((type) => doc.addEventListener(type, listener))
  return () => FULLSCREEN_EVENTS.forEach((type) => doc.removeEventListener(type, listener))
}
