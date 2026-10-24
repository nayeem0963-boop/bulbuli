/**
 * Bulbuli 3D — tap the 3D bird to collect stars.
 *
 * Two kinds of reward, kept separate on purpose:
 *   • Stars: one per tap. Signed-in players' stars are saved to Supabase
 *     (profiles.total_score) by useScoreSync, debounced and batched.
 *   • XP: the arcade's own XP (useTutorialProgress → home page total).
 *     1 XP per TAPS_PER_XP taps, capped per day so tapping can't swamp the
 *     XP earned in the learning games.
 */
import { useCallback, useRef } from 'react'
import GameCanvas from '../../components/game/GameCanvas.jsx'
import { useScoreSync } from '../../hooks/useScoreSync.js'
import { useTutorialProgress } from '../../hooks/useTutorialProgress.js'
import { playSound } from '../../utils/sound.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import { BULBULI_3D_TEXT } from './text.js'
import './bulbuli-3d.css'

const GAME_ID = 'bulbuli-3d'
const TAPS_PER_XP = 10
const DAILY_XP_CAP = 20

const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, local time

export default function Bulbuli3D({ playerId, language }) {
  const text = BULBULI_3D_TEXT[language] ?? BULBULI_3D_TEXT.en
  const n = (value) => formatDigits(value, language)

  const { score, addPoints, status } = useScoreSync({ userId: playerId })
  const { games, saveGameResult } = useTutorialProgress(playerId)

  const record = games[GAME_ID] ?? {}
  const xpToday = record.xpDate === today() ? record.xpToday ?? 0 : 0
  const capped = xpToday >= DAILY_XP_CAP

  // Tap counter towards the next XP point. A ref: no re-render per tap.
  const tapsTowardXp = useRef(0)
  const xpTodayRef = useRef(xpToday)
  xpTodayRef.current = xpToday

  const handleTap = useCallback(
    (points) => {
      addPoints(points)
      playSound('click') // respects the arcade's mute switch

      tapsTowardXp.current += 1
      if (tapsTowardXp.current < TAPS_PER_XP) return
      tapsTowardXp.current = 0
      if (xpTodayRef.current >= DAILY_XP_CAP) return

      // One localStorage write per 10 taps, not per tap.
      saveGameResult(
        GAME_ID,
        (previous) => {
          const sameDay = previous.xpDate === today()
          return {
            ...previous,
            taps: (previous.taps ?? 0) + TAPS_PER_XP,
            xpDate: today(),
            xpToday: (sameDay ? previous.xpToday ?? 0 : 0) + 1,
          }
        },
        1,
      )
    },
    [addPoints, saveGameResult],
  )

  const statusText =
    capped ? text.xpCapped
      : status === 'saving' ? text.saving
        : status === 'error' ? text.offline
          : status === 'guest' ? text.guest
            : ''

  return (
    <div className="b3d" lang={language}>
      <header className="b3d-header">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </header>

      <div className="b3d-hud" aria-live="polite">
        <span>⭐ {text.stars}: <strong>{n(score)}</strong></span>
        <span>✨ {text.xp}: <strong>{n(xpToday)}/{n(DAILY_XP_CAP)}</strong></span>
      </div>

      <GameCanvas onTap={handleTap} pointsPerTap={1} labels={text.canvas} />

      <p className="b3d-status" role="status">{statusText}</p>
    </div>
  )
}
