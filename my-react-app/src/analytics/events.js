// Every analytics event name in one place, so a typo can never create a "ghost" event.
export const EVENTS = Object.freeze({
  GAME_STARTED: 'game_started',
  GAME_COMPLETED: 'game_completed',
  GAME_EXITED_EARLY: 'game_exited_early', // left in under EARLY_EXIT_MS
  GAME_EXITED: 'game_exited', // left after EARLY_EXIT_MS (for comparison)
  GAME_FAVORITED: 'game_favorited',
  GAME_UNFAVORITED: 'game_unfavorited',
  GAME_FEEDBACK_SUBMITTED: 'game_feedback_submitted',
})

export const EVENT_NAMES = new Set(Object.values(EVENTS))

export const EARLY_EXIT_MS = 15_000
