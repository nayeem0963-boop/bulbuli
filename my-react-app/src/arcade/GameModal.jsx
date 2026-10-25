/**
 * The game launcher: a dialog over the Play page that opens a game either embedded (in a
 * large window over the page) or full screen.
 *
 *   1. Launch card: the tile art, what the game is, how to play, and two Start buttons.
 *      The game's code starts downloading as soon as this card shows.
 *   2. The game itself, started straight away (it gets `embedded` and `autoStart`).
 *      The bar on top keeps sound, full screen and close within reach.
 *
 * The dialog is opened by an address ('/?category=adventure&play=<id>', see zone.js), so the
 * Back button closes it. It is loaded lazily by ArcadeHome: none of this, and none of the
 * game, is in the Play page's bundle.
 *
 * Full screen uses the Fullscreen API on the dialog. Where that isn't available (iPhone
 * Safari), the dialog simply fills the whole window instead.
 *
 * Keys: Esc closes the launch card. While a game runs, Esc belongs to the game (it pauses).
 */
import { Suspense, useCallback, useEffect, useId, useRef, useState } from 'react'
import { formatDigits } from '../utils/mathHeroText.js'
import { GameErrorBoundary, getLazyGame, prefetchGame } from './gameLoader.jsx'
import { useMuted } from './preferences.js'

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

const canFullscreen = () => typeof document !== 'undefined' && !!document.documentElement.requestFullscreen

function useFullscreen(ref) {
  const [native, setNative] = useState(false)   // the browser's own full screen
  const [filled, setFilled] = useState(false)   // fallback: dialog fills the window

  useEffect(() => {
    const sync = () => setNative(document.fullscreenElement === ref.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [ref])

  const enter = useCallback(async () => {
    const el = ref.current
    if (!el) return
    if (canFullscreen()) {
      try {
        await el.requestFullscreen({ navigationUI: 'hide' })
        // phones play better sideways; most browsers only allow this lock in full screen
        await window.screen?.orientation?.lock?.('landscape').catch(() => {})
        return
      } catch {
        // refused (e.g. not from a click): fall back below
      }
    }
    setFilled(true)
  }, [ref])

  const exit = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    window.screen?.orientation?.unlock?.()
    setFilled(false)
  }, [])

  return { isFullscreen: native || filled, enter, exit }
}

export default function GameModal({ game, playerId, language, text, onClose }) {
  const dialog = useRef(null)
  const titleId = useId()
  const [phase, setPhase] = useState('launch') // 'launch' | 'playing'
  const { muted, toggleMuted } = useMuted()
  const { isFullscreen, enter, exit } = useFullscreen(dialog)
  const GameComponent = getLazyGame(game)
  const { Art } = game
  const title = game.title[language]

  // download the game while the player reads the launch card
  useEffect(() => { prefetchGame(game) }, [game])

  // the page behind doesn't scroll; focus comes back to the tile on close
  useEffect(() => {
    const opener = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  // focus into the dialog when it opens and when the game starts
  useEffect(() => {
    const first = dialog.current?.querySelector(phase === 'launch' ? '.game-modal-start' : '.game-modal-body')
    first?.focus({ preventScroll: true })
  }, [phase])

  const close = useCallback(() => {
    exit()
    onClose()
  }, [exit, onClose])

  // Esc closes the launch card; Tab stays inside the dialog
  const onKeyDown = (event) => {
    if (event.key === 'Escape' && phase === 'launch') {
      event.stopPropagation()
      close()
      return
    }
    if (event.key !== 'Tab') return
    const items = [...dialog.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const launch = (fullscreen) => {
    if (fullscreen) enter() // must run inside the click, or the browser refuses
    setPhase('playing')
  }

  return (
    <div
      className="game-modal-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget && phase === 'launch') close() }}
    >
      <div
        ref={dialog}
        className={`game-modal is-${phase}${isFullscreen ? ' is-fullscreen' : ''} is-${game.color}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
      >
        <div className="game-modal-bar">
          <h2 id={titleId} className="game-modal-title">{title}</h2>
          <button
            type="button"
            className="game-modal-icon"
            onClick={toggleMuted}
            aria-pressed={!muted}
            aria-label={muted ? text.soundOn : text.soundOff}
            title={muted ? text.soundOn : text.soundOff}
          >
            <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
          </button>
          {phase === 'playing' && (
            <button
              type="button"
              className="game-modal-icon"
              onClick={isFullscreen ? exit : enter}
              aria-label={isFullscreen ? text.fullscreenExit : text.fullscreenEnter}
              title={isFullscreen ? text.fullscreenExit : text.fullscreenEnter}
            >
              <span aria-hidden="true">{isFullscreen ? '🗗' : '⛶'}</span>
            </button>
          )}
          <button type="button" className="game-modal-icon is-close" onClick={close} aria-label={text.closeGame} title={text.closeGame}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {phase === 'launch' ? (
          <div className="game-modal-launch">
            <div className="game-modal-art"><Art /></div>
            <div className="game-modal-copy">
              <p className="game-modal-meta">
                <span>{game.skill[language]}</span>
                <span>{text.ages(formatDigits(game.ages, language))}</span>
              </p>
              <p className="game-modal-tagline">{game.tagline[language]}</p>
              {game.controls && <p className="game-modal-controls">{game.controls[language]}</p>}
              <div className="game-modal-actions">
                <button type="button" className="game-modal-start" onClick={() => launch(false)}>
                  <span aria-hidden="true">▶</span> {text.startGame}
                </button>
                <button type="button" className="game-modal-secondary" onClick={() => launch(true)}>
                  <span aria-hidden="true">⛶</span> {text.startFullscreen}
                </button>
              </div>
              <p className="game-modal-hint">{text.launcherHint}</p>
            </div>
          </div>
        ) : (
          <div className="game-modal-body" tabIndex={-1}>
            <GameErrorBoundary key={game.id} text={text}>
              <Suspense fallback={<p className="game-message" role="status">{text.loadingGame}</p>}>
                <GameComponent key={playerId} playerId={playerId} language={language} game={game} embedded autoStart />
              </Suspense>
            </GameErrorBoundary>
          </div>
        )}
      </div>
    </div>
  )
}
