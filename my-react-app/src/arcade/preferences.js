import { useSyncExternalStore } from 'react'
import { loadMathHeroLanguage, saveMathHeroLanguage } from '../utils/mathHeroText.js'
import { setMuted as setSoundMuted } from '../utils/sound.js'

// Language and sound are shared by the arcade and every game, so they live in tiny external stores.
// Each store keeps its original localStorage key, so players keep the choices they already made.

function createPreference(read, write) {
  let value = read()
  const listeners = new Set()
  return {
    get: () => value,
    set(next) {
      if (next === value) return
      value = next
      write(next)
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

const MUTE_STORAGE_KEY = 'bulbuli_muted'

export const languagePreference = createPreference(loadMathHeroLanguage, saveMathHeroLanguage)

export const mutedPreference = createPreference(
  () => {
    try {
      return window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  },
  (muted) => {
    setSoundMuted(muted)
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, String(muted))
    } catch (error) {
      console.error('Unable to save the sound preference to localStorage.', error)
    }
  },
)

function usePreference(preference) {
  return useSyncExternalStore(preference.subscribe, preference.get, preference.get)
}

/** Returns [language, setLanguage, toggleLanguage]; language is 'en' or 'bn'. */
export function useLanguage() {
  const language = usePreference(languagePreference)
  return [
    language,
    languagePreference.set,
    () => languagePreference.set(languagePreference.get() === 'en' ? 'bn' : 'en'),
  ]
}

export function useMuted() {
  const muted = usePreference(mutedPreference)
  return { muted, toggleMuted: () => mutedPreference.set(!mutedPreference.get()) }
}
