import { useCallback, useMemo, useSyncExternalStore } from 'react'
import HTMLArchitectGame from '../../components/html_architect/HTMLArchitectGame.jsx'
import { LEVELS } from '../../components/html_architect/levelsData.js'
import { useGameProgress } from '../../hooks/useGameProgress.js'
import { mutedPreference } from '../../arcade/preferences.js'
import { xpForClear } from './rewards.js'
import './html-architect.css'

const GAME_ID = 'html-architect'

/**
 * Bulbuli's HTML Architect 3D inside the arcade (/play/html-architect; /games/html-architect redirects there).
 *
 * The game itself lives in src/components/html_architect/. This wrapper connects it to the app:
 *  - stars and XP are saved through useGameProgress → the player's total XP on the home page,
 *    and (for signed-in players) their account via awardXp()
 *  - sound follows the arcade's shared mute switch in the game bar
 *  - code-in-progress is kept per player on this device
 */
export default function HTMLArchitect({ playerId }) {
  const { games, saveGameResult } = useGameProgress(playerId)
  const record = games[GAME_ID] ?? {}
  const muted = useSyncExternalStore(mutedPreference.subscribe, mutedPreference.get, mutedPreference.get)

  const savedStars = useMemo(
    () => Object.fromEntries(Object.entries(record.levels ?? {}).map(([id, level]) => [id, level?.stars ?? 0])),
    [record.levels],
  )

  const onLevelComplete = useCallback(({ levelId, stars }) => {
    // Read the best from the saved record, not the game's own memory, so XP is never paid twice.
    saveGameResult(GAME_ID, (previous) => {
      const levels = { ...(previous.levels ?? {}) }
      const before = levels[levelId]?.stars ?? 0
      levels[levelId] = {
        stars: Math.max(before, stars),
        clears: (levels[levelId]?.clears ?? 0) + 1,
        lastClearedAt: new Date().toISOString(),
      }
      const totalStars = Object.values(levels).reduce((sum, level) => sum + (level.stars ?? 0), 0)
      return { ...previous, levels, totalStars, chaptersCleared: Object.keys(levels).length, lastLevel: levelId }
    }, xpForClear(record.levels?.[levelId]?.stars ?? 0, stars))
  }, [saveGameResult, record.levels])

  return (
    <div className="html-architect-page">
      <HTMLArchitectGame
        inPage
        muted={muted}
        savedStars={savedStars}
        onLevelComplete={onLevelComplete}
        storageKey={`bulbuli.html-architect.v1.${encodeURIComponent(playerId)}`}
      />
      <p className="html-architect-note">
        {LEVELS.length} chapters · up to {LEVELS.length * 3} stars · first clear {xpForClear(0, 1)}–{xpForClear(0, 3)} XP
      </p>
    </div>
  )
}
