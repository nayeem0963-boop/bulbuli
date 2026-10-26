import { useEffect } from 'react'
import { STEERING_MODES } from '../config/constants'
import {
  pressJump, pressSlide, queueLaneShift, releaseJump, releaseSlide, setSteer,
} from '../stores/inputStore'
import { GameStatus, useGameStore } from '../stores/useGameStore'
import { useProfileStore } from '../stores/useProfileStore'

/*
 * Touch gestures anywhere on screen (Pointer Events, multi-touch).
 *
 *   swipe ← →  change lane              (free steering: drag to steer while held)
 *   swipe ↑    jump; keep the finger down to glide; swipe again for double jump
 *   swipe ↓    slide on the ground / slam in the air
 *   tap        jump (only in "Swipe" layout, where there are no buttons)
 *
 * - Each finger is tracked independently, so one thumb can steer while the
 *   other jumps.
 * - Swipes fire *during* the move as soon as they're unambiguous: either the
 *   finger travelled SWIPE_DISTANCE, or it's a fast flick (≥ FLICK_VELOCITY)
 *   over at least FLICK_DISTANCE. No waiting for touchend → no input lag.
 * - Direction = dominant axis; one action per finger stroke.
 * - Touches that start on a button (virtual pad, menus) are ignored here.
 */

const SWIPE_DISTANCE = 32    // px
const FLICK_DISTANCE = 14    // px
const FLICK_VELOCITY = 0.45  // px/ms
const TAP_MAX_MOVE = 10      // px
const TAP_MAX_TIME = 220     // ms
const STEER_DEADZONE = 14    // px (free steering)

export function useSwipeControls() {
  useEffect(() => {
    const pointers = new Map() // pointerId → { x0, y0, t0, x, y, t, consumed, jumping, sliding }

    const playing = () => useGameStore.getState().status === GameStatus.PLAYING
    const freeMode = () => useGameStore.getState().steeringMode === STEERING_MODES.FREE
    const layout = () => useProfileStore.getState().controls.layout

    const onDown = (e) => {
      if (e.pointerType === 'mouse' || !playing() || layout() === 'buttons') return
      // only gestures that start on the game itself (not on its buttons, or elsewhere on the arcade page)
      if (!e.target.closest?.('.nv-root') || e.target.closest('button, input, a')) return
      pointers.set(e.pointerId, {
        x0: e.clientX, y0: e.clientY, t0: e.timeStamp,
        x: e.clientX, y: e.clientY, t: e.timeStamp,
        consumed: false, jumping: false, sliding: false,
      })
    }

    const onMove = (e) => {
      const p = pointers.get(e.pointerId)
      if (!p || !playing()) return
      const dtMs = Math.max(1, e.timeStamp - p.t)
      const vx = (e.clientX - p.x) / dtMs
      const vy = (e.clientY - p.y) / dtMs
      p.x = e.clientX; p.y = e.clientY; p.t = e.timeStamp
      const dx = p.x - p.x0
      const dy = p.y - p.y0
      const vertical = Math.abs(dy) > Math.abs(dx)
      const dist = vertical ? Math.abs(dy) : Math.abs(dx)
      const speed = vertical ? Math.abs(vy) : Math.abs(vx)
      const decided = dist >= SWIPE_DISTANCE || (dist >= FLICK_DISTANCE && speed >= FLICK_VELOCITY)

      if (freeMode() && !vertical) {
        // continuous steering for as long as this finger is down
        setSteer('left', dx < -STEER_DEADZONE)
        setSteer('right', dx > STEER_DEADZONE)
      }
      if (p.consumed || !decided) return
      p.consumed = true
      if (vertical) {
        if (dy < 0) { pressJump(); p.jumping = true }
        else { pressSlide(); p.sliding = true }
      } else if (!freeMode()) {
        queueLaneShift(dx > 0 ? 1 : -1)
      }
    }

    const onEnd = (e) => {
      const p = pointers.get(e.pointerId)
      if (!p) return
      pointers.delete(e.pointerId)
      const moved = Math.hypot(p.x - p.x0, p.y - p.y0)
      const quickTap = !p.consumed && moved < TAP_MAX_MOVE && e.timeStamp - p.t0 < TAP_MAX_TIME
      if (quickTap && e.type === 'pointerup' && layout() === 'swipe' && playing()) {
        pressJump()
        releaseJump()
      }
      if (p.jumping) releaseJump()
      if (p.sliding) releaseSlide()
      if (freeMode() && pointers.size === 0) {
        setSteer('left', false)
        setSteer('right', false)
      }
    }

    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onEnd, { passive: true })
    window.addEventListener('pointercancel', onEnd, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  }, [])
}
