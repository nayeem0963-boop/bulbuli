import { useEffect, useRef, useState } from 'react'
import { useGameProgress } from '../../hooks/useGameProgress.js'
import { flushXp, isAccountId } from '../../lib/xp.js'
import { isFinished } from '../skyTypewriterState.js'

export const SKY_TYPEWRITER_GAME_ID = 'sky-typewriter'

/**
 * Saves a finished flight exactly once, the moment it ends (GAME_OVER or VICTORY).
 *
 * saveGameResult (useGameProgress) does the three jobs in one call:
 *   1. writes the record + XP to localStorage ('bulbuli.tutorial-progress.v1.<playerId>'),
 *   2. fires 'bulbuli:game-progress', so every other useGameProgress (the Play page XP
 *      counter, SaveProgressBanner) updates at once without a reload,
 *   3. queues the XP for a signed-in player's account via awardXp (does nothing for guests).
 * We then flushXp() straight away instead of waiting for the 1.2 s batch, so AuthContext's
 * 'bulbuli:xp-awarded' listener refreshes the signed-in header level as soon as possible.
 *
 * The guard is the run's runId, so a re-render, StrictMode's double effects or the summary
 * staying on screen can never award the same flight twice.
 */
export default function useSkyTypewriterResult(playerId, game) {
  const { games, saveGameResult, totalXp } = useGameProgress(playerId)
  const record = games[SKY_TYPEWRITER_GAME_ID] ?? {}
  const savedRunId = useRef(null)
  const [lastSave, setLastSave] = useState(null) // { runId, ok, isNewBest, xp }

  const { status, runId, score, wordsTyped, accuracy, bestCombo, victory, xpReward } = game

  useEffect(() => {
    if (!isFinished(status) || savedRunId.current === runId) return
    savedRunId.current = runId

    const isNewBest = score > (record.bestScore ?? 0)
    const ok = saveGameResult(SKY_TYPEWRITER_GAME_ID, (previous) => ({
      ...previous,
      plays: (previous.plays ?? 0) + 1,
      wins: (previous.wins ?? 0) + (victory ? 1 : 0),
      bestScore: Math.max(previous.bestScore ?? 0, score),
      bestAccuracy: Math.max(previous.bestAccuracy ?? 0, wordsTyped > 0 ? accuracy : 0),
      bestCombo: Math.max(previous.bestCombo ?? 0, bestCombo),
      totalWords: (previous.totalWords ?? 0) + wordsTyped,
      lastPlayedAt: new Date().toISOString(),
    }), xpReward)
    if (ok && xpReward > 0) flushXp()

    setLastSave({ runId, ok, isNewBest, xp: xpReward })
  }, [status, runId, score, wordsTyped, accuracy, bestCombo, victory, xpReward, record.bestScore, saveGameResult])

  return {
    record,
    totalXp,
    /** Only the save for the run on screen; null while playing. */
    save: lastSave?.runId === runId ? lastSave : null,
    signedIn: isAccountId(playerId),
  }
}
