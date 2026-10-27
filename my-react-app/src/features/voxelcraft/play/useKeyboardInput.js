import { useEffect, useRef } from 'react'

// Physical key codes, so WASD works on AZERTY / Dvorak layouts too.
const KEYMAP = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'jump',
}

const typing = (el) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/**
 * Live keyboard state for the game loop, held in a ref (no re-renders).
 * `jumpPresses` counts keydowns so a tap shorter than one frame is never missed;
 * the loop consumes it. Keys are released on window blur so the player doesn't run forever
 * after alt-tabbing. Arrow keys / Space don't scroll the page while playing.
 */
export default function useKeyboardInput(enabled = true) {
  const input = useRef({ forward: false, back: false, left: false, right: false, jump: false, jumpPresses: 0, anyPressed: false })

  useEffect(() => {
    if (!enabled) return
    const state = input.current
    const onDown = (e) => {
      const action = KEYMAP[e.code]
      if (!action || typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      if (action === 'jump' && !e.repeat && !state.jump) state.jumpPresses += 1
      state[action] = true
      state.anyPressed = true
    }
    const onUp = (e) => {
      const action = KEYMAP[e.code]
      if (action) state[action] = false
    }
    const releaseAll = () => {
      Object.assign(state, { forward: false, back: false, left: false, right: false, jump: false })
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', releaseAll)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', releaseAll)
      releaseAll()
    }
  }, [enabled])

  return input
}
