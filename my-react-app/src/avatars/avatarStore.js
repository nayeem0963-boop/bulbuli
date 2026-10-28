/**
 * Remembers each player's avatar on this device (localStorage 'bulbuli.avatar.v1.<userId>'),
 * so it shows instantly, works offline, and survives a failed save to the account.
 * The account copy lives in Supabase auth user metadata (avatar_id / avatar_updated_at);
 * whichever was changed most recently wins (see pickNewest).
 */
import { isAvatarId } from './avatarCatalog.js'

const key = (userId) => `bulbuli.avatar.v1.${encodeURIComponent(userId)}`
const listeners = new Set()
const notify = () => listeners.forEach((listener) => listener())

/** Raw saved string (stable between calls, so it works with useSyncExternalStore). */
export function readLocalAvatarRaw(userId) {
  if (!userId) return null
  try {
    return window.localStorage.getItem(key(userId))
  } catch {
    return null
  }
}

/** { id, at } from the raw string, or null. */
export function parseLocalAvatar(raw) {
  try {
    const saved = JSON.parse(raw)
    return saved && isAvatarId(saved.id) && typeof saved.at === 'string' ? saved : null
  } catch {
    return null
  }
}

export function saveLocalAvatar(userId, id, at = new Date().toISOString()) {
  if (!userId || !isAvatarId(id)) return
  try {
    window.localStorage.setItem(key(userId), JSON.stringify({ id, at }))
  } catch {
    // storage blocked: the account copy still saves it
  }
  notify()
}

/** For useSyncExternalStore: changes in this tab and in other tabs. */
export function subscribeLocalAvatar(listener) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

/** The more recently changed of two { id, at } choices (either may be null). */
export function pickNewest(a, b) {
  if (!a) return b ?? null
  if (!b) return a
  return (Date.parse(b.at) || 0) > (Date.parse(a.at) || 0) ? b : a
}
