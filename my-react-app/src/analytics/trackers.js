// Typed helpers, so components never build event payloads by hand.
import { trackEvent } from './analytics.js'
import { EARLY_EXIT_MS, EVENTS } from './events.js'

const seconds = (ms) => Math.max(0, Math.round(ms / 1000))

/** surface: 'page' (/games/<id>) or 'launcher' (the dialog on the Play page). */
export const trackGameStarted = ({ gameId, category, surface, language }) =>
  trackEvent(EVENTS.GAME_STARTED, { game_id: gameId, category, surface, language })

export const trackGameCompleted = ({ gameId, durationMs, round, xp, score }) =>
  trackEvent(EVENTS.GAME_COMPLETED, { game_id: gameId, duration_sec: seconds(durationMs), round, xp, score })

/** Sends game_exited_early when the player left in under 15 seconds, game_exited otherwise. */
export const trackGameExited = ({ gameId, durationMs, roundsCompleted, how }) =>
  trackEvent(durationMs < EARLY_EXIT_MS ? EVENTS.GAME_EXITED_EARLY : EVENTS.GAME_EXITED, {
    game_id: gameId,
    duration_sec: seconds(durationMs),
    rounds_completed: roundsCompleted,
    how, // 'button' (Exit / All games / ✕) | 'away' (browser Back, closed tab)
  })

export const trackFavoriteToggled = ({ gameId, isFavorite, source }) =>
  trackEvent(isFavorite ? EVENTS.GAME_FAVORITED : EVENTS.GAME_UNFAVORITED, { game_id: gameId, source })

export const trackFeedbackSubmitted = ({ gameId, reaction, tags, trigger }) =>
  trackEvent(EVENTS.GAME_FEEDBACK_SUBMITTED, {
    game_id: gameId,
    reaction, // 'fun' | 'okay' | 'dislike'
    tags, // e.g. ['too_hard', 'boring']
    tag_count: tags.length,
    trigger, // 'completed' | 'exit'
  })
