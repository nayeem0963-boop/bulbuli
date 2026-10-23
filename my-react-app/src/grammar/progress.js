import { useSyncExternalStore } from 'react'

// Best stars per tense module, kept on this device only (like the games' scores for guests).
// Reading or writing can fail (private windows, blocked storage); the quiz still works then,
// it just won't remember.

const STORAGE_KEY = 'bulbuli_grammar_stars'
const listeners = new Set()
let cache = null

function load() {
  if (cache) return cache
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')
    cache = saved && typeof saved === 'object' ? saved : {}
  } catch {
    cache = {}
  }
  return cache
}

/** Keeps the better of the saved and the new star count. Returns true for a new best. */
export function saveStars(moduleId, stars) {
  const current = load()
  if ((current[moduleId] ?? -1) >= stars) return false
  cache = { ...current, [moduleId]: stars }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.warn('Unable to save grammar stars on this device.', error)
  }
  listeners.forEach((listener) => listener())
  return true
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** { [moduleId]: stars } for every module tried so far. */
export function useGrammarStars() {
  return useSyncExternalStore(subscribe, load, () => ({}))
}
