/**
 * The touch gesture layer over the expedition (gestures.js has the rules). A transparent surface
 * takes one finger on each half of the screen: left drags a floating stick, right swipes to turn,
 * flicks up to jump (hold to keep flying) or taps to jump. A faint ring and dot under each finger
 * show what it is doing; they are drawn by setting styles directly, so a drag never re-renders React.
 */
import { useEffect, useRef } from 'react'
import { createGestures, STICK_RADIUS } from './gestures.js'

export default function GestureControls({ inputRef, text, active }) {
  const surface = useRef(null)
  const rings = useRef({ move: null, look: null })
  const knobs = useRef({ move: null, look: null })

  useEffect(() => {
    const el = surface.current
    if (!el) return undefined
    const input = inputRef.current
    const place = (role, spot) => {
      const ring = rings.current[role], knob = knobs.current[role]
      if (!ring || !knob) return
      if (!spot) { ring.style.opacity = '0'; knob.style.opacity = '0'; return }
      ring.style.opacity = '1'; knob.style.opacity = '1'
      ring.style.transform = `translate(${spot.ox - STICK_RADIUS}px, ${spot.oy - STICK_RADIUS}px)`
      const dx = spot.x - spot.ox, dy = spot.y - spot.oy
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / STICK_RADIUS)
      knob.style.transform = `translate(${spot.ox + (dx / d) * STICK_RADIUS * k - 16}px, ${spot.oy + (dy / d) * STICK_RADIUS * k - 16}px)`
    }
    const g = createGestures(input, () => el.clientWidth, {
      onChange: (view) => { place('move', view.move); place('look', view.look) },
      afterTap: (release) => setTimeout(release, 140),
    })
    const at = (e) => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
    const down = (e) => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); g.down(e.pointerId, ...at(e), e.timeStamp) }
    const move = (e) => g.move(e.pointerId, ...at(e), e.timeStamp)
    const up = (e) => g.up(e.pointerId, e.timeStamp)
    const stop = () => g.cancel()
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    window.addEventListener('blur', stop)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      window.removeEventListener('blur', stop)
      g.cancel()
    }
  }, [inputRef, active])

  return (
    <div ref={surface} className="wx-gestures" role="group" aria-label={text.gestures.label}>
      {['move', 'look'].map((role) => (
        <span key={role} aria-hidden="true">
          <i ref={(node) => { rings.current[role] = node }} className="wx-g-ring" />
          <i ref={(node) => { knobs.current[role] = node }} className="wx-g-knob" />
        </span>
      ))}
      <p className="wx-g-hint" aria-hidden="true">
        <span>{text.gestures.left}</span>
        <span>{text.gestures.right}</span>
      </p>
    </div>
  )
}
