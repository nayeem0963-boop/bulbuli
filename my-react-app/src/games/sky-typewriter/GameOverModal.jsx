import { useEffect, useId, useRef, useState } from 'react'
import { useCountUp } from '../../shared/hooks/useCountUp.js'
import { formatDigits } from '../../utils/mathHeroText.js'

/** Keys typed in the last moment of a flight must not press a button by accident. */
const ARM_DELAY_MS = 700

/**
 * The end-of-flight dialog for SkyTypewriter 3D: "Mission Accomplished!" (VICTORY) or
 * "Flight Ended" (GAME_OVER), the run summary, the XP earned and the player's new total.
 *
 * Rendered as a sibling of the <Canvas>, not inside drei's <Html>, so it gets real focus,
 * Tab order and clicks (the HUD layer is pointer-events: none).
 */
export default function GameOverModal({
  victory = false,
  score = 0,
  wordsTyped = 0,
  accuracy = 100,
  bestCombo = 0,
  xpReward = 0,
  totalXp = 0,
  save = null, // { ok, isNewBest } once saved
  signedIn = false,
  language = 'en',
  text,
  onPlayAgain,
  onExit,
}) {
  const titleId = useId()
  const dialog = useRef(null)
  const playButton = useRef(null)
  const [armed, setArmed] = useState(false)
  const n = (value) => formatDigits(value, language)

  const shownXp = useCountUp(xpReward, { duration: 900 })
  const shownTotal = useCountUp(totalXp, { duration: 900, from: totalXp })

  // focus the main action, then accept clicks after a short pause
  useEffect(() => {
    playButton.current?.focus({ preventScroll: true })
    const timer = setTimeout(() => setArmed(true), ARM_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  // keep Tab inside the dialog
  const onKeyDown = (event) => {
    if (event.key !== 'Tab') return
    const buttons = [...dialog.current.querySelectorAll('button')]
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const guard = (action) => () => { if (armed) action?.() }
  const safeAccuracy = Math.max(0, Math.min(100, Math.round(accuracy)))

  return (
    <div className="stw-finish-backdrop">
      <section
        ref={dialog}
        className={`stw-finish ${victory ? 'is-victory' : 'is-game-over'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
      >
        <div className="stw-finish__icon" aria-hidden="true">{victory ? '🏆' : '🪶'}</div>
        <p className="stw-finish__eyebrow">{victory ? text.victoryEyebrow : text.overEyebrow}</p>
        <h2 id={titleId} className="stw-finish__title">{victory ? text.victoryTitle : text.overTitle}</h2>
        <p className="stw-finish__copy">{victory ? text.victoryCopy : text.overCopy}</p>

        <dl className="stw-finish__stats">
          <div>
            <dt>{text.finalScore}</dt>
            <dd>
              {n(score)}
              {save?.isNewBest && score > 0 && <span className="stw-badge">{text.newBest}</span>}
            </dd>
          </div>
          <div><dt>{text.wordsTyped}</dt><dd>{n(wordsTyped)}</dd></div>
          <div><dt>{text.accuracy}</dt><dd>{n(safeAccuracy)}%</dd></div>
          <div><dt>{text.bestCombo}</dt><dd>×{n(Math.max(1, bestCombo))}</dd></div>
        </dl>

        <div className="stw-finish__xp" aria-live="polite">
          <span className="stw-finish__xp-label">{text.xpEarned}</span>
          <span className="stw-finish__xp-value">+{n(shownXp)} <span aria-hidden="true">✨</span></span>
          <span className="stw-finish__xp-total">{text.totalXp(n(shownTotal))}</span>
          {save && (
            <span className={`stw-finish__saved${save.ok ? '' : ' is-error'}`}>
              {!save.ok ? text.saveFailed : signedIn ? text.savedAccount : text.savedDevice}
            </span>
          )}
        </div>

        <div className="stw-finish__actions">
          <button
            ref={playButton}
            type="button"
            className="stw-btn is-primary"
            onClick={guard(onPlayAgain)}
            aria-disabled={!armed}
          >
            <span aria-hidden="true">↻</span> {text.playAgain}
          </button>
          {onExit && (
            <button type="button" className="stw-btn is-secondary" onClick={guard(onExit)} aria-disabled={!armed}>
              {text.exit}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
