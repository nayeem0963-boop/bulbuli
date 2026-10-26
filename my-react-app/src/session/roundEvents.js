/**
 * "A round just finished" — one signal shared by every game.
 *
 * Games don't have to do anything: useGameProgress.saveGameResult() (called once when a
 * level / board / run ends) and Math Hero's game-over both report it here, and Pattern Quest
 * reports it from inside its frame with postMessage. A game can also call the
 * `onRoundComplete` prop it receives, which ends up here too. Reports for the same game
 * that arrive close together are merged, so nothing is counted twice.
 *
 *   const stop = onRoundComplete((detail) => …)   // detail = { gameId, xp?, score? }
 */

export const ROUND_COMPLETE_EVENT = 'bulbuli:round-complete'
const FRAME_MESSAGE = 'bulbuli:round-complete'
const DEDUPE_MS = 2000

/** Games without rounds: their saves are not "a finished round". */
export const CONTINUOUS_GAMES = new Set(['bulbuli-3d'])

const lastReport = new Map()

export function reportRoundComplete(gameId, { xp, score } = {}) {
  if (typeof window === 'undefined' || !gameId || CONTINUOUS_GAMES.has(gameId)) return
  const now = Date.now()
  if (now - (lastReport.get(gameId) ?? 0) < DEDUPE_MS) return
  lastReport.set(gameId, now)
  window.dispatchEvent(new CustomEvent(ROUND_COMPLETE_EVENT, { detail: { gameId, xp, score } }))
}

/** For a game running inside a same-origin frame (Pattern Quest). */
export function reportRoundCompleteFromFrame(gameId, details = {}) {
  if (typeof window === 'undefined' || window.parent === window) return
  window.parent.postMessage({ type: FRAME_MESSAGE, gameId, ...details }, window.location.origin)
}

export function onRoundComplete(listener) {
  const onEvent = (event) => listener(event.detail)
  const onMessage = (event) => {
    if (event.origin !== window.location.origin || event.data?.type !== FRAME_MESSAGE) return
    const { gameId, xp, score } = event.data
    if (typeof gameId === 'string') reportRoundComplete(gameId, { xp, score })
  }
  window.addEventListener(ROUND_COMPLETE_EVENT, onEvent)
  window.addEventListener('message', onMessage)
  return () => {
    window.removeEventListener(ROUND_COMPLETE_EVENT, onEvent)
    window.removeEventListener('message', onMessage)
  }
}
