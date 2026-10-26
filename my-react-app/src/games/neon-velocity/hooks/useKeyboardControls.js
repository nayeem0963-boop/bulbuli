import { useEffect } from 'react'
import {
  pressJump, pressSlide, queueLaneShift, releaseJump, releaseSlide, setSteer,
} from '../stores/inputStore'
import { GameStatus, useGameStore } from '../stores/useGameStore'

const LEFT = new Set(['ArrowLeft', 'KeyA'])
const RIGHT = new Set(['ArrowRight', 'KeyD'])
const JUMP = new Set(['ArrowUp', 'KeyW', 'Space'])
const SLIDE = new Set(['ArrowDown', 'KeyS'])
const MUTE = new Set(['KeyM'])
const PAUSE = new Set(['Escape', 'KeyP'])
const CONFIRM = new Set(['Enter'])

/**
 * A/D ←/→ move · W/↑/Space jump (press again = double jump, hold = glide)
 * S/↓ slide (in air: slam) · M mute · Esc/P pause · Enter start/retry
 * (Neon Surge triggers automatically when the energy meter fills.)
 */
export function useKeyboardControls() {
  useEffect(() => {
    const onDown = (e) => {
      const { status, start, togglePause } = useGameStore.getState()

      // A focused menu button already handles Enter/Space itself — don't fire twice.
      const onButton = e.target instanceof HTMLElement && e.target.closest('button')
      if (onButton && (CONFIRM.has(e.code) || e.code === 'Space')) {
        if (status !== GameStatus.PLAYING) return
        e.target.blur()
      }

      if (PAUSE.has(e.code)) { togglePause(); return }
      if (MUTE.has(e.code) && !e.repeat) { useGameStore.getState().toggleMute(); return }
      if (CONFIRM.has(e.code) && (status === GameStatus.START || status === GameStatus.GAME_OVER)) {
        start(); return
      }
      if (status !== GameStatus.PLAYING) return

      let handled = true
      if (LEFT.has(e.code)) {
        setSteer('left', true)
        if (!e.repeat) queueLaneShift(-1)
      } else if (RIGHT.has(e.code)) {
        setSteer('right', true)
        if (!e.repeat) queueLaneShift(1)
      } else if (JUMP.has(e.code)) {
        if (!e.repeat) pressJump()
      } else if (SLIDE.has(e.code)) {
        if (!e.repeat) pressSlide()
      } else {
        handled = false
      }
      if (handled) e.preventDefault()
    }

    const onUp = (e) => {
      if (LEFT.has(e.code)) setSteer('left', false)
      if (RIGHT.has(e.code)) setSteer('right', false)
      if (JUMP.has(e.code)) releaseJump()
      if (SLIDE.has(e.code)) releaseSlide()
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])
}
