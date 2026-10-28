import { useCallback, useState } from 'react'

/**
 * A light/dark choice for one game, remembered on this device under its own key
 * (e.g. 'bulbuli.math-master.theme'), so each game keeps its own look and nothing else changes.
 * Storage can be missing or blocked (private mode): then the choice simply lasts for the visit.
 *
 *   const [theme, toggleTheme] = useStoredTheme('bulbuli.math-master.theme', 'dark')
 */
export function readStoredTheme(key, fallback) {
  try {
    const value = window.localStorage.getItem(key)
    return value === 'light' || value === 'dark' ? value : fallback
  } catch {
    return fallback
  }
}

export function useStoredTheme(key, fallback = 'dark') {
  const [theme, setTheme] = useState(() => readStoredTheme(key, fallback))
  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'light' ? 'dark' : 'light'
      try { window.localStorage.setItem(key, next) } catch { /* not saved: fine for this visit */ }
      return next
    })
  }, [key])
  return [theme, toggleTheme]
}

export default useStoredTheme
