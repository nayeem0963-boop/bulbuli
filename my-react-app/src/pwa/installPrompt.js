/**
 * Captures the browser's install prompt as early as possible.
 *
 * Chrome/Edge/Samsung Internet fire `beforeinstallprompt` once, soon after the page loads,
 * often before the home page has rendered (or while the player is on a game page). So we
 * listen here, at startup (imported first thing in main.jsx), keep the event, and let
 * <InstallPwaBanner> read it through useInstallPrompt().
 */
import { useSyncExternalStore } from 'react'

let state = { canPrompt: false, installed: false }
let deferredEvent = null
const listeners = new Set()

function setState(next) {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault() // keep Chrome's own mini-infobar away; we show our banner instead
    deferredEvent = event
    setState({ canPrompt: true })
  })

  window.addEventListener('appinstalled', () => {
    deferredEvent = null
    try { window.localStorage.setItem('bulbuli.pwa-installed', '1') } catch { /* ignore */ }
    setState({ canPrompt: false, installed: true })
  })

  try {
    if (window.localStorage.getItem('bulbuli.pwa-installed') === '1') state = { ...state, installed: true }
  } catch { /* ignore */ }
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const getSnapshot = () => state
const getServerSnapshot = () => state

/** { canPrompt, installed }: re-renders when the browser offers (or finishes) an install. */
export function useInstallPrompt() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Shows the browser's native install dialog. Must be called from a click.
 * Resolves 'accepted', 'dismissed' or 'unavailable'. A captured event works only once.
 */
export async function promptInstall() {
  const event = deferredEvent
  if (!event) return 'unavailable'
  deferredEvent = null
  setState({ canPrompt: false })
  try {
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === 'accepted') setState({ installed: true })
    return outcome
  } catch (error) {
    console.warn('[pwa] install prompt failed', error)
    return 'unavailable'
  }
}

/**
 * Registers /sw.js (public/sw.js). Chrome only offers the install prompt to sites whose
 * service worker has a real fetch handler; ours also shows a friendly page when offline.
 */
export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  const register = () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[pwa] service worker registration failed', error)
    })
  }
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}
