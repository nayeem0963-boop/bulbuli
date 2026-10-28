import { useState } from 'react'
import { STEERING_MODES } from '../../config/constants'
import { DIFFICULTIES, DIFFICULTY_ORDER, formatMultiplier } from '../../config/difficulty'
import { useResponsive } from '../../hooks/useResponsive'
import { CourseMode, utcDayKey } from '../../services/course'
import { GameStatus, useGameStore } from '../../stores/useGameStore'
import { useLeaderboardStore } from '../../stores/useLeaderboardStore'
import { useProfileStore } from '../../stores/useProfileStore'
import { useUiStore } from '../../stores/useUiStore'
import { MuteButton } from './MuteButton'
import { GameFullscreenButton } from '../../../../arcade/GameFullscreen.jsx'
import { NameEntry } from './postgame/Rankings'
import { PostGameScreen } from './postgame/PostGameScreen'
import { Segmented, SettingsPanel } from './SettingsPanel'
import { VaultOverlay } from './vault/VaultOverlay'

/** Full-screen panels for START / PAUSED / GAME_OVER, plus the Vault. */
export function Overlays() {
  const status = useGameStore((s) => s.status)
  const vaultOpen = useUiStore((s) => s.vaultOpen)
  if (status === GameStatus.START) return vaultOpen ? <VaultOverlay /> : <StartScreen />
  if (status === GameStatus.PAUSED) return <PauseScreen />
  if (status === GameStatus.GAME_OVER) return <PostGameScreen />
  return null
}

function StartScreen() {
  const start = useGameStore((s) => s.start)
  const best = useGameStore((s) => s.bestScore)
  const difficulty = useGameStore((s) => s.difficulty)
  const steering = useGameStore((s) => s.steeringMode)
  const setSteering = useGameStore((s) => s.setSteeringMode)
  const courseMode = useGameStore((s) => s.courseMode)
  const setCourseMode = useGameStore((s) => s.setCourseMode)
  const raceGhost = useGameStore((s) => s.raceGhost)
  const setRaceGhost = useGameStore((s) => s.setRaceGhost)
  const hasGlobal = useLeaderboardStore((s) => s.hasGlobal)
  const wallet = useProfileStore((s) => s.wallet)
  const name = useProfileStore((s) => s.name)
  const openVault = useUiStore((s) => s.openVault)
  const { showVirtualPad } = useResponsive()
  const [editingName, setEditingName] = useState(false)

  return (
    <div className="nv-overlay nv-overlay--start">
      <div className="nv-topbar">
        <button className="nv-wallet nv-wallet--btn" onClick={() => openVault()} aria-label={`Open vault, ${wallet} crystals`}>
          ◆ {wallet.toLocaleString()} <span>Vault</span>
        </button>
        <MuteButton />
        {/* full screen on the game page (inside the launcher dialog, the dialog has its own) */}
        <GameFullscreenButton className="nv-icon-btn" iconSize={20} />
      </div>

      <div className="nv-panel nv-panel--title">
        <h1 className="nv-title">Bulbuli</h1>
        <p className="nv-subtitle">Neon Velocity</p>

        <DifficultyPicker />

        <button className="nv-btn nv-btn--primary" onClick={start} autoFocus>Run</button>

        <Segmented
          label="Course"
          value={courseMode}
          onChange={setCourseMode}
          options={[[CourseMode.DAILY, `Daily · ${utcDayKey().slice(5)}`], [CourseMode.ENDLESS, 'Endless']]}
        />
        {courseMode === CourseMode.DAILY && (
          <Segmented
            label="Race a ghost"
            value={raceGhost}
            onChange={setRaceGhost}
            options={[['off', 'No ghost'], ['pb', 'My best'], ...(hasGlobal ? [['top', 'World #1']] : [])]}
          />
        )}
        <Segmented
          label="Steering"
          value={steering}
          onChange={setSteering}
          options={[[STEERING_MODES.LANES, 'Lanes'], [STEERING_MODES.FREE, 'Free steer']]}
        />

        {editingName ? (
          <NameEntry compact onSaved={() => setEditingName(false)} />
        ) : (
          <button className="nv-link-btn" onClick={() => setEditingName(true)}>
            {name ? `Running as ${name} ✎` : 'Set your runner name ✎'}
          </button>
        )}

        <p className="nv-hint">
          {showVirtualPad
            ? 'Swipe ← → move · ↑ jump (again = double, hold = glide) · ↓ slide — or use the buttons'
            : 'A/D move · W/Space jump (again = double, hold = glide) · S slide/slam · M mute · Esc pause'}
        </p>
        <p className="nv-hint nv-hint--accent">Fill the energy meter with crystals to trigger Neon Surge</p>
        {best > 0 && <p className="nv-best">{DIFFICULTIES[difficulty].name} best · {best.toLocaleString()}</p>}
      </div>
    </div>
  )
}

/**
 * Mode selector: three cards in a radiogroup (arrow keys move + select, like native radios).
 * Each card shows the mode's score multiplier and your personal best in that mode.
 */
function DifficultyPicker() {
  const difficulty = useGameStore((s) => s.difficulty)
  const setDifficulty = useGameStore((s) => s.setDifficulty)
  const bestScores = useGameStore((s) => s.bestScores)

  const onKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const i = DIFFICULTY_ORDER.indexOf(difficulty)
    const next = DIFFICULTY_ORDER[(i + step + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length]
    setDifficulty(next)
    e.currentTarget.querySelector(`[data-difficulty="${next}"]`)?.focus()
  }

  return (
    <div className="nv-difficulty" role="radiogroup" aria-label="Difficulty" onKeyDown={onKeyDown}>
      {DIFFICULTY_ORDER.map((id) => {
        const mode = DIFFICULTIES[id]
        const active = id === difficulty
        const best = bestScores[id] ?? 0
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            data-difficulty={id}
            className={`nv-difficulty__opt nv-difficulty__opt--${id} ${active ? 'is-active' : ''}`}
            onClick={() => setDifficulty(id)}
          >
            <span className="nv-difficulty__mult">{formatMultiplier(mode.scoreMultiplier)}</span>
            <span className="nv-difficulty__name">{mode.name}</span>
            <span className="nv-difficulty__tag">{mode.tagline}</span>
            <span className="nv-difficulty__best">{best > 0 ? `Best ${best.toLocaleString()}` : 'No runs yet'}</span>
          </button>
        )
      })}
    </div>
  )
}

function PauseScreen() {
  const resume = useGameStore((s) => s.resume)
  const start = useGameStore((s) => s.start)
  const goToMenu = useGameStore((s) => s.goToMenu)
  return (
    <div className="nv-overlay">
      <div className="nv-panel nv-panel--sheet">
        <h2 className="nv-heading">Paused</h2>
        <button className="nv-btn nv-btn--primary" onClick={resume} autoFocus>Resume</button>
        <button className="nv-btn" onClick={start}>Restart</button>
        <button className="nv-btn nv-btn--ghost" onClick={goToMenu}>Main menu</button>
        <SettingsPanel />
      </div>
    </div>
  )
}
