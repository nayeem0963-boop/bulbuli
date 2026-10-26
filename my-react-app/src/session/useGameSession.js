import { useCallback, useEffect, useRef, useState } from 'react'
import { trackGameCompleted, trackGameExited, trackGameStarted } from '../analytics/trackers.js'
import { onRoundComplete, reportRoundComplete } from './roundEvents.js'
import { AFTER_ROUND_DELAY_MS, canAskFeedback, MIN_PLAY_MS } from './feedbackPolicy.js'

/**
 * One visit to one game: analytics + when to show the feedback card.
 *
 *   const session = useGameSession(game, { active, surface: 'page', language })
 *
 *   session.roundComplete     pass to the game as `onRoundComplete` (optional for games:
 *                             finished rounds are already picked up from saveGameResult)
 *   session.requestExit(leave) call from the Exit / All games / ✕ button. Shows the feedback
 *                             card first when it should, then calls `leave` once it closes.
 *   session.feedback          { open, trigger } for <FeedbackModal>
 *   session.closeFeedback()   the modal's onClose
 *
 * `active` is false while a launcher is still on its Start card: the session (and the clock)
 * starts when the game itself starts.
 */
export default function useGameSession(game, { active = true, surface = 'page', language } = {}) {
  const gameId = game?.id ?? null
  const startedAt = useRef(0)
  const rounds = useRef(0)
  const ended = useRef(false)
  const askedThisVisit = useRef(false)
  const pendingLeave = useRef(null)
  const roundTimer = useRef(null)
  const [feedback, setFeedback] = useState({ open: false, trigger: 'completed' })

  const openFeedback = useCallback((trigger) => {
    askedThisVisit.current = true
    setFeedback({ open: true, trigger })
  }, [])

  // start, round tracking, and "left without the button" (browser Back, route change, closed tab)
  useEffect(() => {
    if (!gameId || !active) return undefined
    startedAt.current = Date.now()
    rounds.current = 0
    ended.current = false
    askedThisVisit.current = false
    trackGameStarted({ gameId, category: game.category, surface, language })

    const stopRounds = onRoundComplete((detail) => {
      if (detail.gameId !== gameId || ended.current) return
      rounds.current += 1
      trackGameCompleted({
        gameId,
        durationMs: Date.now() - startedAt.current,
        round: rounds.current,
        xp: detail.xp,
        score: detail.score,
      })
      if (!askedThisVisit.current && canAskFeedback(gameId)) {
        askedThisVisit.current = true // reserve it now; the card opens after the celebration
        clearTimeout(roundTimer.current)
        roundTimer.current = setTimeout(() => {
          if (!ended.current) setFeedback({ open: true, trigger: 'completed' })
        }, AFTER_ROUND_DELAY_MS)
      }
    })

    const leftAway = () => {
      if (ended.current) return
      ended.current = true
      trackGameExited({ gameId, durationMs: Date.now() - startedAt.current, roundsCompleted: rounds.current, how: 'away' })
    }
    window.addEventListener('pagehide', leftAway)

    return () => {
      stopRounds()
      clearTimeout(roundTimer.current)
      window.removeEventListener('pagehide', leftAway)
      leftAway()
    }
    // language/category/surface are recorded at start only; a language switch is not a new visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, active])

  const roundComplete = useCallback((details) => reportRoundComplete(gameId, details), [gameId])

  const requestExit = useCallback((leave) => {
    if (!gameId || !active || ended.current) { leave(); return }
    const durationMs = Date.now() - startedAt.current
    ended.current = true
    clearTimeout(roundTimer.current)
    trackGameExited({ gameId, durationMs, roundsCompleted: rounds.current, how: 'button' })

    const ask = !askedThisVisit.current && durationMs >= MIN_PLAY_MS && canAskFeedback(gameId)
    if (!ask) { leave(); return }
    pendingLeave.current = leave
    openFeedback('exit')
  }, [gameId, active, openFeedback])

  const closeFeedback = useCallback(() => {
    setFeedback((current) => ({ ...current, open: false }))
    const leave = pendingLeave.current
    pendingLeave.current = null
    leave?.()
  }, [])

  return { feedback, closeFeedback, requestExit, roundComplete }
}
