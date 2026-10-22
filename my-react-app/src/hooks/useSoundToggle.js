import { useMuted } from '../arcade/preferences.js'

// Kept for existing screens: the mute switch is now one shared setting for the whole arcade.
function useSoundToggle() {
  return useMuted()
}

export default useSoundToggle
