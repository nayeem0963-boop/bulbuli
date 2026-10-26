import { useEffect } from 'react'
import { useProfileStore } from '../stores/useProfileStore'
import { EV, GameEvents } from '../systems/events'

/** Vibrate if supported and enabled in settings. Silently no-ops elsewhere (iOS Safari, desktop). */
export function haptic(pattern) {
  if (!useProfileStore.getState().controls.haptics) return
  // browsers refuse (and log an error) until the page has had a tap or click
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return
  try { navigator.vibrate?.(pattern) } catch { /* not allowed */ }
}

/** Gameplay → vibration patterns (Android/Chrome). Mount once in <App/>. */
export function useHaptics() {
  useEffect(() => {
    const on = GameEvents.on
    const offs = [
      on(EV.HIT, () => haptic([35, 40, 35])),
      on(EV.SURGE_START, () => haptic([20, 30, 80])),
      on(EV.SLAM_LAND, () => haptic(30)),
      on(EV.LAND, ({ impact }) => { if (impact > 14) haptic(12) }),
      on(EV.GRIND_START, () => haptic(10)),
      on(EV.PICKUP, ({ variant }) => haptic(variant === 'prism' ? [8, 30, 8] : 5)),
      on(EV.FALL, () => haptic(120)),
    ]
    return () => offs.forEach((off) => off())
  }, [])
}
