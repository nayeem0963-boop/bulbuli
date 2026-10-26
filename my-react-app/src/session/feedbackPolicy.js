/**
 * When to show the "How was it?" card, so it stays a nice surprise and not a chore.
 *
 * - At most once per game session (one visit to a game).
 * - After a child answers for a game, that game doesn't ask again for ANSWERED_COOLDOWN_MS.
 * - After a skip, it waits SKIPPED_COOLDOWN_MS.
 * - On exit, only if they actually played a little (MIN_PLAY_MS), so a mis-tap on a tile
 *   followed by "back" doesn't get a question.
 */
export const ANSWERED_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000
export const SKIPPED_COOLDOWN_MS = 24 * 60 * 60 * 1000
export const MIN_PLAY_MS = 4000
/** Wait after a round ends, so the game's own celebration shows first. */
export const AFTER_ROUND_DELAY_MS = 2200

const KEY = 'bulbuli.feedback-asked.v1'

function read() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? '{}')
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
  } catch {
    return {}
  }
}

export function canAskFeedback(gameId, now = Date.now()) {
  const until = Number(read()[gameId])
  return !Number.isFinite(until) || until <= now
}

/** answered: true after a reaction was sent, false after a skip. */
export function rememberFeedbackAsked(gameId, answered, now = Date.now()) {
  try {
    const saved = read()
    saved[gameId] = now + (answered ? ANSWERED_COOLDOWN_MS : SKIPPED_COOLDOWN_MS)
    window.localStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    // storage blocked: it will just ask again next time
  }
}
