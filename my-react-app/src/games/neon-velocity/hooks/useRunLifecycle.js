import { useEffect } from 'react'
import { CourseMode, courseFor } from '../services/course'
import { runtime } from '../stores/runtime'
import { GameStatus, useGameStore } from '../stores/useGameStore'
import { useLeaderboardStore } from '../stores/useLeaderboardStore'
import { useProfileStore } from '../stores/useProfileStore'
import { ghostRecorder } from '../systems/runStats'

/**
 * Glue between the game and the meta-game, mounted once in <App/>.
 *
 * Run start (daily + ghost racing on) → load the ghost to race.
 * Game over →
 *   1. bank crystals (+ surge bonus) into the wallet
 *   2. finish the ghost recording (daily courses only — endless courses never repeat)
 *   3. save the run locally and, if configured + named, to the global board
 */
export function useRunLifecycle() {
  useEffect(() => {
    const preloadGhost = () => {
      const { courseMode, raceGhost } = useGameStore.getState()
      if (courseMode !== CourseMode.DAILY || raceGhost === 'off') return
      useLeaderboardStore.getState().loadGhost(courseFor(CourseMode.DAILY).boardId, raceGhost)
    }
    preloadGhost()

    const off = useGameStore.subscribe((s) => s.status, (status, prev) => {
      if (status === GameStatus.PLAYING && prev !== GameStatus.PAUSED) {
        preloadGhost()
        useLeaderboardStore.getState().clearSubmission()
      }

      if (status === GameStatus.GAME_OVER) {
        const run = useGameStore.getState().lastRun
        if (!run) return
        const earned = useProfileStore.getState().bankRun(run)
        useGameStore.setState({ lastRun: { ...run, earned } })

        const frames = run.mode === CourseMode.DAILY
          ? ghostRecorder.finish(runtime.gameTime, runtime.playerPosition, runtime.playerMode)
          : null
        useLeaderboardStore.getState().submitRun({ ...run, earned }, frames)
      }
    })

    // Re-load when the player changes ghost/course settings on the start screen
    const offSettings = useGameStore.subscribe((s) => `${s.courseMode}|${s.raceGhost}`, preloadGhost)
    return () => { off(); offSettings() }
  }, [])
}
