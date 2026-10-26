/**
 * Bulbuli: Neon Velocity — arcade entry point (loaded lazily by registry.js → load()).
 *
 * Two ways in, like the other launcher games:
 *   • the launcher on the Play page (src/arcade/GameModal.jsx): `embedded` fills the dialog and
 *     `autoStart` skips the title screen, because the player already pressed Start there
 *   • its own page, /games/neon-velocity: a fixed-height game box with the title screen
 *
 * The game keeps its own state in Zustand stores (./stores). This wrapper connects it to
 * the arcade:
 *   • a finished run → useGameProgress().saveGameResult (best score, distance, plays + XP).
 *     That also reports the round to the session/feedback system, so no separate onRoundComplete.
 *   • the arcade's sound switch (launcher bar / game bar) mutes the game too
 *   • closing the game stops the music and resets the run, so reopening starts fresh
 */
import { useEffect } from 'react'
import { useGameProgress } from '../../hooks/useGameProgress.js'
import { useMuted } from '../../arcade/preferences.js'
import NeonVelocityApp from './NeonVelocityApp.jsx'
import { GameStatus, useGameStore } from './stores/useGameStore'
import './neon-velocity.css'

const GAME_ID = 'neon-velocity'
const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;600;700&family=Monoton&display=swap'

/** XP for a run: about 1 per 150 points, plus a little for Neon Surges. Capped so one run can't dominate. */
export const xpForRun = (run) => Math.min(80, Math.floor(run.score / 150) + run.surges * 2)

function loadFontsOnce() {
  if (document.querySelector(`link[data-nv-fonts]`)) return
  const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONTS_URL })
  link.dataset.nvFonts = ''
  document.head.appendChild(link)
}

export default function NeonVelocity({ playerId, embedded = false, autoStart = false }) {
  const { saveGameResult } = useGameProgress(playerId)
  const { muted } = useMuted()

  useEffect(loadFontsOnce, [])

  // the arcade's sound switch wins over the game's own mute while the game is open
  useEffect(() => { useGameStore.setState({ muted }) }, [muted])

  // launcher: straight into a run. Leaving: back to the title screen for next time.
  useEffect(() => {
    if (autoStart) useGameStore.getState().start()
    return () => useGameStore.getState().goToMenu()
  }, [autoStart])

  // save each finished run to the arcade profile
  useEffect(() => useGameStore.subscribe((s) => s.status, (status) => {
    if (status !== GameStatus.GAME_OVER) return
    const run = useGameStore.getState().lastRun
    if (!run) return
    saveGameResult(GAME_ID, (previous) => ({
      ...previous,
      plays: (previous.plays ?? 0) + 1,
      bestScore: Math.max(previous.bestScore ?? 0, Math.floor(run.score)),
      bestDistance: Math.max(previous.bestDistance ?? 0, Math.floor(run.distance)),
      topSpeedKmh: Math.max(previous.topSpeedKmh ?? 0, Math.round(run.maxSpeedKmh ?? 0)),
      crystals: (previous.crystals ?? 0) + run.crystals,
    }), xpForRun(run))
  }), [saveGameResult])

  return (
    <div className={`nv-root${embedded ? ' is-fill' : ''}`} lang="en">
      <NeonVelocityApp />
    </div>
  )
}
