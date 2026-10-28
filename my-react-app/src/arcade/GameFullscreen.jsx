/**
 * The game's own box, and full screen for it. GamePage wraps every game in the frame.
 *
 *   GameFullscreenFrame    Fills the screen under the game bar, so every game opens immersive (see
 *                          game-shell.css), and is the element that goes browser full screen: the
 *                          game itself, without the arcade's bar. It is a CSS size container named
 *                          `game`: games size themselves from it (cqw/cqh, @container game), so one
 *                          layout works in both states. It never unmounts while the game runs, so
 *                          whichever screen the game is on (menu, play, results), its state, score
 *                          and timers carry through.
 *   GameFullscreenButton   the game puts this in its own header or toolbar. Outside a frame (e.g. the
 *                          launcher dialog, which has its own full-screen button) it renders nothing.
 *
 * The frame always has the class `game-fs-<id>`, which each game's CSS lays itself out under; in full
 * screen it also gets `is-fullscreen` (and `is-filled` in the iPhone fallback).
 * See useFullscreen for how the browser state is tracked (Esc, browser UI, failures).
 */
import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { Maximize, Minimize } from 'lucide-react'
import { useFullscreen } from '../shared/hooks/useFullscreen.js'
import { ARCADE_TEXT } from './text.js'

const FullscreenContext = createContext(null)

export function GameFullscreenFrame({ gameId, language, forceExit = false, children }) {
  const frame = useRef(null)
  const fullscreen = useFullscreen(frame)
  const { isFullscreen, isFilled, exit } = fullscreen

  // Something outside the game needs the screen (the "How was it?" card): step out of full screen.
  useEffect(() => {
    if (forceExit && isFullscreen) exit()
  }, [forceExit, isFullscreen, exit])

  const value = useMemo(() => ({ ...fullscreen, language }), [fullscreen, language])
  const className = [
    'game-fs-frame',
    `game-fs-${gameId}`,
    isFullscreen && 'is-fullscreen',
    isFilled && 'is-filled',
  ].filter(Boolean).join(' ')

  return (
    <div ref={frame} className={className}>
      {/* the frame is the size container and never scrolls (its cq units always match the box on
          screen); this inner box scrolls when a screen of the game is taller than the frame */}
      <div className="game-fs-viewport">
        <FullscreenContext.Provider value={value}>{children}</FullscreenContext.Provider>
      </div>
    </div>
  )
}

/**
 * The full-screen button. Icon, label and tooltip always follow the real browser state.
 * `className` picks the look of the bar it sits in: the round toy button by default.
 */
export function GameFullscreenButton({ className = 'arcade-icon-button', iconSize = 22 }) {
  const fullscreen = useContext(FullscreenContext)
  if (!fullscreen?.supported) return null
  const text = ARCADE_TEXT[fullscreen.language] ?? ARCADE_TEXT.en
  const on = fullscreen.isFullscreen
  const label = on ? text.exitFullscreen : text.enterFullscreen
  const Icon = on ? Minimize : Maximize
  return (
    <button
      type="button"
      className={`${className} game-fs-toggle`}
      onClick={fullscreen.toggle}
      aria-label={label}
      title={label}
    >
      <Icon aria-hidden="true" focusable="false" size={iconSize} strokeWidth={2.75} />
    </button>
  )
}
