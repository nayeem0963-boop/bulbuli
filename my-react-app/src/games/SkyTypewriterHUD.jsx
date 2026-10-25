import { memo } from 'react'
import { Html } from '@react-three/drei'
import './sky-typewriter-hud.css'

/**
 * In-flight stats drawn over the canvas (score, hearts, combo, pause).
 * The end-of-flight dialog is GameOverModal.jsx, rendered outside the <Canvas>
 * so it gets normal focus, clicks and keyboard handling.
 */
function SkyTypewriterHUD({
  score = 0,
  lives = 3,
  combo = 0,
  paused = false,
  status = 'PLAYING',
  onTogglePause,
}) {
  const safeLives = Math.max(0, Math.min(3, lives))

  return (
    <Html fullscreen className="sky-typewriter-hud-root">
      <div className="sky-typewriter-hud">
        <div className="sky-typewriter-hud__stats" aria-label="Game status">
          <div className="sky-typewriter-hud__pill">
            <span className="sky-typewriter-hud__label">Score</span>
            <span className="sky-typewriter-hud__value" aria-live="polite">{score}</span>
          </div>

          <div
            className="sky-typewriter-hud__pill sky-typewriter-hud__lives"
            role="img"
            aria-label={`${safeLives} of 3 lives remaining`}
          >
            {[0, 1, 2].map((heart) => (
              <span key={heart} className={heart < safeLives ? 'is-alive' : 'is-lost'} aria-hidden="true">
                ♥
              </span>
            ))}
          </div>

          <div className={`sky-typewriter-hud__pill sky-typewriter-hud__combo${combo > 1 ? ' is-active' : ''}`}>
            <span aria-hidden="true">⚡</span>
            <span className="sky-typewriter-hud__label">Combo</span>
            <span className="sky-typewriter-hud__value" aria-live="polite">×{Math.max(1, combo)}</span>
          </div>
        </div>

        {status === 'PLAYING' && (
          <button
            type="button"
            className="sky-typewriter-hud__pause"
            onClick={onTogglePause}
            aria-label={paused ? 'Resume game' : 'Pause game'}
            aria-pressed={paused}
          >
            <span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>
            {paused ? 'Resume' : 'Pause'}
          </button>
        )}
      </div>
    </Html>
  )
}

export default memo(SkyTypewriterHUD)
