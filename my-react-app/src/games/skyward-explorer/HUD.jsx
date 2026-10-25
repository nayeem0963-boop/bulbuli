/**
 * Everything drawn over the 3D scene, in plain HTML/CSS:
 *   • top bar: crystals (score / total), time left, pause
 *   • glider stamina meter
 *   • touch controls (stick + jump), shown on touch screens only
 *   • the Ready, Paused, Win and Game-over cards
 */
import { useRef } from 'react'

function formatTime(seconds, n) {
  const s = Math.ceil(seconds)
  return `${n(Math.floor(s / 60))}:${n(String(s % 60).padStart(2, '0'))}`
}

/** On-screen stick: drag inside the circle to move. Writes input.touchX / touchY (-1..1). */
function TouchStick({ input, label }) {
  const knob = useRef()
  const state = useRef({ id: null, cx: 0, cy: 0 })
  const RANGE = 46

  const update = (x, y) => {
    const s = state.current
    let dx = x - s.cx
    let dy = y - s.cy
    const len = Math.hypot(dx, dy)
    if (len > RANGE) {
      dx = (dx / len) * RANGE
      dy = (dy / len) * RANGE
    }
    input.touchX = dx / RANGE
    input.touchY = -dy / RANGE
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`
  }
  const end = (e) => {
    if (e.pointerId !== state.current.id) return
    state.current.id = null
    input.touchX = 0
    input.touchY = 0
    if (knob.current) knob.current.style.transform = ''
  }

  return (
    <div
      className="skx-stick"
      role="img"
      aria-label={label}
      onPointerDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        state.current = { id: e.pointerId, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 }
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => e.pointerId === state.current.id && update(e.clientX, e.clientY)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span ref={knob} className="skx-stick-knob" />
    </div>
  )
}

function TouchJump({ input, label }) {
  const release = () => { input.touchJump = false }
  return (
    <button
      type="button"
      className="skx-jump"
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        input.jumpPresses += 1
        input.touchJump = true
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span aria-hidden="true">⤒</span>
    </button>
  )
}

function Card({ children, tone = '' }) {
  return (
    <div className="skx-overlay">
      <div className={`skx-card ${tone}`} role="dialog" aria-modal="false">
        {children}
      </div>
    </div>
  )
}

export default function HUD({
  text, n, status, paused, score, total, timeLeft, stamina, gliding, result, input,
  onStart, onPause, onResume, onPlayAgain, onNewIsland,
}) {
  const playing = status === 'playing'
  const low = playing && timeLeft <= 10

  return (
    <div className="skx-hud">
      {/* ---- top bar */}
      <div className="skx-topbar">
        <p className="skx-pill skx-score" aria-label={text.scoreLabel(n(score), n(total))}>
          <span aria-hidden="true">💎</span> {n(score)}<span className="skx-of">/{n(total)}</span>
        </p>
        <p className={`skx-pill skx-time${low ? ' is-low' : ''}`} aria-label={text.timeLabel(n(Math.ceil(timeLeft)))}>
          <span aria-hidden="true">⏱</span> {formatTime(timeLeft, n)}
        </p>
        {playing && !paused && (
          <button type="button" className="skx-pill skx-pause" onClick={onPause} aria-label={text.pause}>
            <span aria-hidden="true">⏸</span>
          </button>
        )}
      </div>

      {/* ---- glider stamina */}
      {playing && (
        <div className={`skx-stamina${gliding ? ' is-gliding' : ''}${stamina < 0.2 ? ' is-low' : ''}`}>
          <span className="skx-stamina-label">{text.glide}</span>
          <span
            className="skx-stamina-bar"
            role="meter"
            aria-label={text.glide}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(stamina * 100)}
          >
            <span className="skx-stamina-fill" style={{ transform: `scaleX(${stamina})` }} />
          </span>
        </div>
      )}

      {/* ---- touch controls */}
      {playing && !paused && (
        <div className="skx-touch">
          <TouchStick input={input} label={text.touchMove} />
          <TouchJump input={input} label={text.touchJump} />
        </div>
      )}

      {/* ---- cards */}
      {status === 'ready' && (
        <Card>
          <p className="skx-eyebrow">{text.eyebrow}</p>
          <h2>{text.readyTitle}</h2>
          <p>{text.goal(n(total), n(60))}</p>
          <ul className="skx-keys">
            <li><kbd>W A S D</kbd> / <kbd>← ↑ → ↓</kbd> {text.keyMove}</li>
            <li><kbd>{text.space}</kbd> {text.keyJump}</li>
            <li><kbd>{text.space}</kbd> {text.keyGlide}</li>
            <li><kbd>Q E</kbd> / {text.drag} {text.keyCamera}</li>
            <li><kbd>P</kbd> {text.keyPause}</li>
          </ul>
          <p className="skx-touch-hint">{text.touchHint}</p>
          <button type="button" className="skx-primary" onClick={onStart} autoFocus>{text.start}</button>
        </Card>
      )}

      {playing && paused && (
        <Card>
          <h2>{text.pausedTitle}</h2>
          <button type="button" className="skx-primary" onClick={onResume} autoFocus>{text.resume}</button>
        </Card>
      )}

      {(status === 'win' || status === 'gameover') && result && (
        <Card tone={status === 'win' ? 'is-win' : 'is-over'}>
          <p className="skx-result-icon" aria-hidden="true">{status === 'win' ? '🏆' : '⌛'}</p>
          <h2>{status === 'win' ? text.winTitle : text.overTitle}</h2>
          <p>{status === 'win' ? text.winText(n(Math.ceil(60 - result.timeLeft))) : text.overText(n(result.score), n(result.total))}</p>
          <dl className="skx-results">
            <div><dt>{text.crystals}</dt><dd>{n(result.score)}/{n(result.total)}</dd></div>
            {status === 'win' && <div><dt>{text.timeLeftLabel}</dt><dd>{formatTime(result.timeLeft, n)}</dd></div>}
            <div><dt>XP</dt><dd>+{n(result.xp)}</dd></div>
          </dl>
          {result.isBest && <p className="skx-best">{text.newBest}</p>}
          <div className="skx-actions">
            <button type="button" className="skx-primary" onClick={onPlayAgain} autoFocus>{text.playAgain}</button>
            <button type="button" onClick={onNewIsland}><span aria-hidden="true">🏝️</span> {text.newIsland}</button>
          </div>
        </Card>
      )}
    </div>
  )
}
