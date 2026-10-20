import { useEffect, useState } from 'react'
import { setMuted } from '../utils/sound.js'

const MUTE_STORAGE_KEY = 'bulbuli_muted'

function loadMutedPreference() {
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true'
  } catch (error) {
    console.error('Unable to load the sound preference from localStorage.', error)
    return false
  }
}

function useSoundToggle() {
  const [muted, setMutedState] = useState(loadMutedPreference)

  useEffect(() => {
    setMuted(muted)
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, String(muted))
    } catch (error) {
      console.error('Unable to save the sound preference to localStorage.', error)
    }
  }, [muted])

  const toggleMuted = () => {
    const next = !muted
    setMuted(next)
    setMutedState(next)
  }

  return { muted, toggleMuted }
}

export default useSoundToggle
