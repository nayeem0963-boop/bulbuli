/**
 * Keyboard and touch input, kept in a ref (no re-renders). The 3D scene reads it every frame.
 *
 *   W A S D / arrows   move (relative to the camera)
 *   Space              jump; hold in the air to glide
 *   Q / E              turn the camera
 * Touch: the on-screen stick and jump button in HUD.jsx write into the same object.
 */
import { useEffect, useRef } from 'react'

const KEYMAP = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  KeyQ: 'turnLeft', KeyE: 'turnRight',
  Space: 'jump',
}

export function createInputState() {
  return {
    held: new Set(),   // action names currently held on the keyboard
    jumpPresses: 0,    // counts every new press, so a quick tap is never missed between frames
    touchX: 0,         // on-screen stick, -1..1 (right +)
    touchY: 0,         // -1..1 (forward +)
    touchJump: false,
  }
}

/** Keyboard listeners that write into `input`. Game keys only stop page scrolling while `activeRef.current`. */
export function useKeyboardInput(input, activeRef) {
  useEffect(() => {
    const onDown = (event) => {
      const action = KEYMAP[event.code]
      if (!action) return
      // leave typing in form fields alone
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return
      if (!activeRef.current) return
      event.preventDefault()
      if (action === 'jump' && !event.repeat && !input.held.has('jump')) input.jumpPresses += 1
      input.held.add(action)
    }
    const onUp = (event) => {
      const action = KEYMAP[event.code]
      if (!action) return
      input.held.delete(action)
      // a focused button would otherwise "click" on Space's keyup
      if (activeRef.current) event.preventDefault()
    }
    const clear = () => input.held.clear()
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', clear)
    }
  }, [input, activeRef])
}

/** Stick direction (right, forward), length ≤ 1, from keys and touch together. */
export function readStick(input) {
  const h = input.held
  let right = (h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0) + input.touchX
  let forward = (h.has('forward') ? 1 : 0) - (h.has('back') ? 1 : 0) + input.touchY
  const len = Math.hypot(right, forward)
  if (len > 1) {
    right /= len
    forward /= len
  }
  return { right, forward }
}

export const isJumpHeld = (input) => input.held.has('jump') || input.touchJump
export const cameraTurn = (input) => (input.held.has('turnRight') ? 1 : 0) - (input.held.has('turnLeft') ? 1 : 0)

/** One shared input object per screen. */
export function useInputState() {
  const ref = useRef(null)
  if (!ref.current) ref.current = createInputState()
  return ref.current
}
