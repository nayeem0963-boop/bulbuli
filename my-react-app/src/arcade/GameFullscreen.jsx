/**
 * Full screen for one game, shared by every game that supports it (`fullscreen: true` in registry.js).
 *
 *   GameFullscreenFrame    GamePage wraps the game in this. Its div is the element that goes full
 *                          screen: the game itself, without the arcade's bar, header or footer.
 *                          It never unmounts while the game runs, so whichever screen the game is
 *                          on (menu, play, results), its state, score and timers carry through.
 *   GameFullscreenButton   the game puts this in its own header or toolbar. Outside a frame (e.g. the
 *                          launcher dialog, which has its own full-screen button) it renders nothing.
 *
 * In full screen the frame gets `is-fullscreen` (and `is-filled` in the iPhone fallback) and the
 * class `game-fs-<id>`, so each game's CSS can lay itself out for the whole screen.
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
      <FullscreenContext.Provider value={value}>{children}</FullscreenContext.Provider>
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
