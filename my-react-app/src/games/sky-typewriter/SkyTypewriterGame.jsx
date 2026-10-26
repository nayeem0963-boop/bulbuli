/**
 * SkyTypewriter 3D — the game screen around the 3D scene.
 *
 *   IDLE (start card) → PLAYING → GAME_OVER | VICTORY (GameOverModal) → Play Again → PLAYING
 *
 * Who owns what:
 *   useSkyTypewriterGame   score, hearts, combo, accuracy, status, runId (rules: skyTypewriterState.js)
 *   useWordTyping          the one window 'keydown' listener; on only while `game.active`
 *   WordSpawner            moves / spawns words in R3F's frame loop; frozen while `!game.active`,
 *                          clears all words whenever runId changes
 *   useSkyTypewriterResult saves XP + the game record once per finished run (localStorage,
 *                          Play page XP counter, signed-in account)
 *
 * The <Canvas> stays mounted across Play Again (no WebGL context churn); a new runId is
 * enough to reset the sky. Leaving the game unmounts it and R3F disposes the renderer and
 * stops its requestAnimationFrame loop. Every listener and timer here is removed in cleanup.
 */
import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { playPath } from '../../arcade/zone.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import { playSound } from '../../utils/sound.js'
import InfiniteSkyEnvironment from '../InfiniteSkyEnvironment.jsx'
import PlayerBird3D from '../PlayerBird3D.jsx'
import SkyTypewriter3D from '../SkyTypewriter3D.jsx'
import useSkyTypewriterGame, { SKY_TYPEWRITER_STATUS } from '../useSkyTypewriterGame.js'
import useWordTyping from '../useWordTyping.js'
import WordSpawner from '../WordSpawner.jsx'
import GameOverModal from './GameOverModal.jsx'
import { SKY_TYPEWRITER_TEXT, SKY_TYPEWRITER_WORDS } from './text.js'
import useSkyTypewriterResult from './useSkyTypewriterResult.js'
import './sky-typewriter.css'

/** World speed behind the summary: a slow drift instead of a frozen sky. */
const FINISHED_DRIFT_SPEED = 1.5

export default function SkyTypewriterGame({
  playerId,
  language = 'en',
  embedded = false,
  autoStart = false,
  onExit,
}) {
  const text = SKY_TYPEWRITER_TEXT[language] ?? SKY_TYPEWRITER_TEXT.en
  const n = (value) => formatDigits(value, language)
  const navigate = useNavigate()

  const game = useSkyTypewriterGame()
  const { record, totalXp, save, signedIn } = useSkyTypewriterResult(playerId, game)
  const {
    status, active, paused, finished, victory, runId,
    startGame, playAgain, resetGame, setPaused, togglePause,
    recordKeystroke, recordWord, loseLife,
  } = game

  const wordsRef = useRef([]) // live words, written by WordSpawner, read by useWordTyping
  const effectsRef = useRef([]) // hit-beam events, written by useWordTyping, drained by WordHitEffects
  const stageRef = useRef(null)

  /* ---------- starting, restarting, leaving ---------- */
  const begin = useCallback((action) => {
    effectsRef.current.length = 0 // drop beams queued from the last flight
    action()
    stageRef.current?.focus({ preventScroll: true }) // so Space/Enter can't re-press a button
  }, [])

  const handleStart = useCallback(() => {
    playSound('click')
    begin(startGame)
  }, [begin, startGame])

  const handlePlayAgain = useCallback(() => {
    playSound('click')
    begin(playAgain)
  }, [begin, playAgain])

  const handleExit = useCallback(() => {
    playSound('click')
    resetGame()
    if (onExit) onExit() // launcher dialog closes itself
    else navigate(playPath('logic')) // its audience pill: Logic & Typing
  }, [navigate, onExit, resetGame])

  // The launcher already had its own Start button.
  useEffect(() => {
    if (autoStart) startGame()
  }, [autoStart, startGame])

  /* ---------- typing ---------- */
  const onWordComplete = useCallback(() => {
    playSound('correct')
    recordWord()
  }, [recordWord])

  useWordTyping({
    wordsRef,
    effectsRef,
    enabled: active, // listener is removed while paused / finished / on the start card
    onKeystroke: recordKeystroke,
    onWordComplete,
  })

  const onMiss = useCallback(() => {
    playSound('wrong')
    loseLife()
  }, [loseLife])

  /* ---------- end-of-flight sound ---------- */
  useEffect(() => {
    if (status === SKY_TYPEWRITER_STATUS.VICTORY) playSound('complete')
  }, [status])

  /* ---------- pause: Esc, and automatically when the tab is hidden ---------- */
  useEffect(() => {
    if (status !== SKY_TYPEWRITER_STATUS.PLAYING) return undefined

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      togglePause()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') setPaused(true)
    }
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [status, togglePause, setPaused])

  const worldSpeed = active ? game.flightSpeed : finished ? FINISHED_DRIFT_SPEED : 0

  return (
    <div className={`stw${embedded ? ' is-embedded' : ''}`}>
      <h1 className={embedded ? 'stw-sr-only' : 'stw-title'}>{text.title}</h1>

      <div ref={stageRef} className="stw-stage" tabIndex={-1} aria-label={text.stage}>
        <SkyTypewriter3D
          className="stw-canvas"
          effectsRef={effectsRef}
          score={game.score}
          lives={game.lives}
          combo={game.combo}
          paused={paused}
          status={status}
          onTogglePause={togglePause}
        >
          <InfiniteSkyEnvironment speed={worldSpeed} />
          <PlayerBird3D />
          <WordSpawner
            words={SKY_TYPEWRITER_WORDS}
            score={game.score}
            runId={runId}
            active={active}
            wordsRef={wordsRef}
            onMiss={onMiss}
          />
        </SkyTypewriter3D>

        {status === SKY_TYPEWRITER_STATUS.IDLE && (
          <div className="stw-finish-backdrop">
            <section className="stw-finish is-start" aria-labelledby="stw-start-title">
              <div className="stw-finish__icon" aria-hidden="true">⌨️</div>
              <h2 id="stw-start-title" className="stw-finish__title">{text.title}</h2>
              <p className="stw-finish__copy">{text.intro}</p>
              <p className="stw-finish__copy is-small">{text.howTo} {text.goal(n(game.targetScore))}</p>
              {record.bestScore > 0 && <p className="stw-badge is-inline">{text.best(n(record.bestScore))}</p>}
              <div className="stw-finish__actions">
                <button type="button" className="stw-btn is-primary" onClick={handleStart} autoFocus>
                  {text.start}
                </button>
              </div>
            </section>
          </div>
        )}

        {paused && (
          <button type="button" className="stw-paused" onClick={togglePause}>
            <span className="stw-paused__label">{text.paused}</span>
            <span className="stw-btn is-primary">▶ {text.resume}</span>
          </button>
        )}

        {finished && (
          <GameOverModal
            key={runId}
            victory={victory}
            score={game.score}
            wordsTyped={game.wordsTyped}
            accuracy={game.accuracy}
            bestCombo={game.bestCombo}
            xpReward={game.xpReward}
            totalXp={totalXp}
            save={save}
            signedIn={signedIn}
            language={language}
            text={text}
            onPlayAgain={handlePlayAgain}
            onExit={handleExit}
          />
        )}
      </div>
    </div>
  )
}
