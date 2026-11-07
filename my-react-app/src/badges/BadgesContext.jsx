/**
 * Badges for the signed-in player, shared by the whole app.
 *
 *   const { unlocked, unlockedById, ready, toasts, dismissToast, celebrations, dismissCelebration } = useBadges()
 *
 * How unlocks happen: games award XP → award_xp() saves it → AuthContext updates `profile`
 * (xp, level, stats) → this provider re-checks every badge against the new numbers, records
 * any new ones, and queues a toast for each. Nothing in the games has to change.
 *
 * Badges a player already qualifies for when they first load the app (say, from before badges
 * existed, or earned on another device) are recorded quietly, without a pile of toasts.
 * Each newly earned badge also gets one celebration (AchievementCelebration.jsx). The queue is
 * kept on the device until the player closes it, so it shows exactly once, even if they leave
 * the game before it appears, and never again when the dashboard is reopened.
 * Guests have no badges: there's nowhere to show them, and their XP isn't on an account yet.
 */
import { createContext, useContext } from 'react'

/** Value provided by <BadgesProvider> (BadgesProvider.jsx). */
export const BadgesContext = createContext(null)

export function useBadges() {
  const context = useContext(BadgesContext)
  if (!context) throw new Error('useBadges() must be used inside <BadgesProvider>.')
  return context
}
