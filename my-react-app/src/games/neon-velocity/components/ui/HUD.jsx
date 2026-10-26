import { MAX_HEARTS } from '../../config/constants'
import { MODE_LABELS } from '../player/playerModes'
import { GameStatus, selectDistance, selectSpeedKmh, useGameStore } from '../../stores/useGameStore'
import { useEffect, useState } from 'react'
import { runtime } from '../../stores/runtime'
import { useLeaderboardStore } from '../../stores/useLeaderboardStore'
import { MuteButton } from './MuteButton'

/** In-run readout. Every value uses its own primitive selector → re-renders only on change. */
export function HUD() {
  const status = useGameStore((s) => s.status)
  if (status !== GameStatus.PLAYING && status !== GameStatus.PAUSED) return null
  return (
    <>
      <TopBar />
      <BottomBar />
      <SurgeBanner />
      <SpeedToast />
      <GhostDelta />
      <HitFlash />
    </>
  )
}

function TopBar() {
  const score = useGameStore((s) => s.score)
  const distance = useGameStore(selectDistance)
  const speed = useGameStore(selectSpeedKmh)
  const multiplier = useGameStore((s) => s.speedMultiplier.toFixed(1))
  const boosting = useGameStore((s) => s.boosting)
  const crystals = useGameStore((s) => s.crystals)
  const hearts = useGameStore((s) => s.hearts)
  const pause = useGameStore((s) => s.pause)

  return (
    <div className="nv-hud">
      <div className="nv-hud__stat">
        <span className="nv-hud__label">Score</span>
        <span className="nv-hud__value">{score}</span>
        <span className="nv-hud__sub">{distance} m</span>
      </div>

      <div className="nv-hud__stat nv-hud__stat--center">
        <span className="nv-hud__label">Speed</span>
        <span className={`nv-hud__value nv-hud__value--cyan ${boosting ? 'is-surging' : ''}`}>
          {speed}<small>km/h</small>
        </span>
        <span className="nv-hud__multiplier">×{multiplier}</span>
      </div>

      <div className="nv-hud__stat nv-hud__stat--right">
        <div className="nv-hearts" aria-label={`${hearts} of ${MAX_HEARTS} integrity`}>
          {Array.from({ length: MAX_HEARTS }, (_, i) => (
            <span key={i} className={`nv-heart ${i < hearts ? 'is-full' : ''}`} />
          ))}
        </div>
        <span className="nv-hud__value nv-hud__value--crystal">
          <span key={crystals} className="nv-crystal-icon" aria-hidden="true" />
          {crystals}
        </span>
      </div>

      <div className="nv-hud__buttons">
        <MuteButton />
        <button
          className="nv-icon-btn"
          aria-label="Pause"
          onClick={(e) => { e.currentTarget.blur(); pause() }}
        >
          <span className="nv-pause-glyph"><span /><span /></span>
        </button>
      </div>
    </div>
  )
}

function BottomBar() {
  const meter = useGameStore((s) => Math.round(s.boostMeter * 100))
  const boosting = useGameStore((s) => s.boosting)
  const mode = useGameStore((s) => s.playerMode)

  return (
    <div className="nv-hud-bottom">
      <span className={`nv-mode-chip nv-mode-chip--${mode.toLowerCase()}`}>{MODE_LABELS[mode]}</span>
      <div className={`nv-boost ${boosting ? 'is-active' : ''} ${meter >= 80 && !boosting ? 'is-near' : ''}`}>
        <div className="nv-boost__track">
          <div className="nv-boost__fill" style={{ transform: `scaleX(${meter / 100})` }} />
        </div>
        <span className="nv-boost__label">{boosting ? 'Neon Surge' : `Energy ${meter}%`}</span>
      </div>
    </div>
  )
}

/** Big title card when Neon Surge kicks in. Keyed on surgeCount so it replays every surge. */
function SurgeBanner() {
  const surgeCount = useGameStore((s) => s.surgeCount)
  const boosting = useGameStore((s) => s.boosting)
  if (!boosting || surgeCount === 0) return null
  return (
    <div key={surgeCount} className="nv-surge-banner" aria-live="polite">
      <span className="nv-surge-banner__title">Neon Surge</span>
    </div>
  )
}

/** "Speed up" toast on each speed tier. */
function SpeedToast() {
  const tier = useGameStore((s) => s.speedTier)
  const multiplier = useGameStore((s) => s.speedMultiplier)
  if (tier === 0) return null
  return (
    <div key={tier} className="nv-speed-toast" aria-live="polite">
      Speed up <strong>×{(1 + tier * 0.2).toFixed(1)}</strong>
      <span className="nv-sr-only"> current ×{multiplier.toFixed(1)}</span>
    </div>
  )
}

function HitFlash() {
  const hitCount = useGameStore((s) => s.hitCount)
  if (hitCount === 0) return null
  return <div key={hitCount} className="nv-hit-flash" aria-hidden="true" />
}

/** "+12 m vs Your best" — polls runtime.ghostLead 4×/s (no per-frame React renders). */
function GhostDelta() {
  const course = useGameStore((s) => s.course)
  const ghost = useLeaderboardStore((s) => (course ? s.ghosts[course.boardId] : null))
  const [lead, setLead] = useState(null)
  useEffect(() => {
    const id = setInterval(() => setLead(runtime.ghostLead == null ? null : Math.round(runtime.ghostLead)), 250)
    return () => clearInterval(id)
  }, [])
  if (lead == null || !ghost) return null
  const ahead = lead >= 0
  return (
    <div className={`nv-ghost-delta ${ahead ? 'is-ahead' : 'is-behind'}`} aria-live="off">
      {ahead ? '+' : '−'}{Math.abs(lead)} m <span>vs {ghost.source === 'top' ? ghost.name : 'your best'}</span>
    </div>
  )
}
