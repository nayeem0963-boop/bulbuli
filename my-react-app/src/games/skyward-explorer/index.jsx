/**
 * Bulbuli: Skyward Explorer — the game screen.
 *
 * Game state: gameStatus 'ready' → 'playing' → 'win' (every crystal) or 'gameover' (time up).
 * Paused is separate (P / Esc / pause button / tab hidden) and freezes the whole scene.
 *
 * The score changes only on a pick-up (an event from the scene). Time and glider stamina change
 * every frame, so the scene writes them into `live` and the HUD samples it ten times a second.
 *
 * Saving, like the other arcade games:
 *   • each crystal → useScoreSync.addPoints(1) (signed-in profiles), flushed when the run ends
 *   • plays, wins, best score and fastest clear → useTutorialProgress, plus XP
 * Two ways in:
 *   • its own page, /games/skyward-explorer: header, then the Ready card with the controls
 *   • the launcher on the Play page (src/arcade/GameModal.jsx): `embedded` fills the dialog,
 *     `autoStart` skips the Ready card because the launcher already showed the controls
 * The arcade loads every game from <id>/index.jsx (see src/games/README.md).
 */
import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useScoreSync } from '../../hooks/useScoreSync.js'
import { useTutorialProgress } from '../../hooks/useTutorialProgress.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import HUD from './HUD.jsx'
import { useInputState, useKeyboardInput } from './input.js'
import { generateWorld } from './layout.js'
import { sfx } from './sfx.js'
import { SKYWARD_TEXT } from './text.js'
import './skyward-explorer.css'

// three.js and the scene load only when this screen opens.
const loadCanvas = () => import('./SkywardExplorerCanvas.jsx')
const SkywardExplorerCanvas = lazy(loadCanvas)

const GAME_ID = 'skyward-explorer'
const ROUND_SECONDS = 60
const FIRST_SEED = 7
const HUD_REFRESH_MS = 100

const newLive = () => ({ timeLeft: ROUND_SECONDS, stamina: 1, gliding: false })
// so Space jumps instead of pressing whatever button was last clicked
const releaseFocus = () => document.activeElement instanceof HTMLElement && document.activeElement.blur()
const xpFor = (score, won) => Math.floor(score / 2) + (won ? 6 : 0)

/** If WebGL fails (old GPU, lost context), say so instead of a blank box. */
class CanvasBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { console.error('Skyward Explorer could not start 3D.', error) }
  render() {
    return this.state.failed ? <p className="skx-message" role="alert">{this.props.message}</p> : this.props.children
  }
}

export default function SkywardExplorer({ playerId, language = 'en', embedded = false, autoStart = false }) {
  const text = SKYWARD_TEXT[language] ?? SKYWARD_TEXT.en
  const n = useCallback((value) => formatDigits(value, language), [language])

  const { games, saveGameResult } = useTutorialProgress(playerId)
  const { addPoints, flush } = useScoreSync({ userId: playerId })
  const record = games[GAME_ID] ?? {}

  const [seed, setSeed] = useState(FIRST_SEED)
  const [runId, setRunId] = useState(0)                 // new key = fresh scene
  const [gameStatus, setGameStatus] = useState(autoStart ? 'playing' : 'ready') // 'ready' | 'playing' | 'win' | 'gameover'
  const [paused, setPaused] = useState(false)
  const [score, setScore] = useState(0)
  const [result, setResult] = useState(null)
  const [hud, setHud] = useState({ timeLeft: ROUND_SECONDS, stamina: 1, gliding: false })

  const total = useMemo(() => generateWorld(seed).crystals.length, [seed])
  const live = useRef(newLive())
  const ended = useRef(false)
  const scoreRef = useRef(0)
  const input = useInputState()

  // game keys count only while actually playing
  const inputActive = useRef(false)
  inputActive.current = gameStatus === 'playing' && !paused
  useKeyboardInput(input, inputActive)

  useEffect(() => { loadCanvas().catch(() => {}) }, [])
  // launched straight into play: the click on the launcher is the start
  useEffect(() => { if (autoStart) sfx.start() }, [autoStart])

  /* ---------- runs ---------- */
  const resetRun = useCallback((nextSeed) => {
    live.current = newLive()
    ended.current = false
    input.held.clear()
    input.touchX = 0
    input.touchY = 0
    input.touchJump = false
    setSeed(nextSeed)
    setRunId((id) => id + 1)
    scoreRef.current = 0
    setScore(0)
    setResult(null)
    setPaused(false)
    setHud({ timeLeft: ROUND_SECONDS, stamina: 1, gliding: false })
  }, [input])

  const start = useCallback(() => {
    releaseFocus()
    sfx.start()
    setGameStatus('playing')
  }, [])

  const playAgain = useCallback(() => {
    releaseFocus()
    resetRun(seed)
    sfx.start()
    setGameStatus('playing')
  }, [resetRun, seed])

  const newIsland = useCallback(() => {
    releaseFocus()
    resetRun(seed + 1)
    sfx.start()
    setGameStatus('playing')
  }, [resetRun, seed])

  const finish = useCallback((won, finalScore) => {
    if (ended.current) return
    ended.current = true
    flush()
    const timeLeft = live.current.timeLeft
    const xp = xpFor(finalScore, won)
    const clearTime = ROUND_SECONDS - timeLeft
    const isBest = finalScore > (record.bestScore ?? 0) || (won && clearTime < (record.fastestClear ?? Infinity))
    saveGameResult(GAME_ID, (previous) => ({
      ...previous,
      plays: (previous.plays ?? 0) + 1,
      wins: (previous.wins ?? 0) + (won ? 1 : 0),
      bestScore: Math.max(previous.bestScore ?? 0, finalScore),
      fastestClear: won ? Math.min(previous.fastestClear ?? Infinity, Math.round(clearTime * 10) / 10) : previous.fastestClear,
    }), xp)
    if (won) sfx.win()
    else sfx.lose()
    setResult({ won, score: finalScore, total, timeLeft, xp, isBest })
    setGameStatus(won ? 'win' : 'gameover')
  }, [flush, record.bestScore, record.fastestClear, saveGameResult, total])

  /* ---------- events from the scene ---------- */
  const handleCollect = useCallback((count, all) => {
    if (ended.current) return
    scoreRef.current = count
    setScore(count)
    addPoints(1)
    if (count === all) finish(true, count)
  }, [addPoints, finish])

  const handleTimeUp = useCallback(() => finish(false, scoreRef.current), [finish])

  /* ---------- HUD sampling (time, stamina) ---------- */
  useEffect(() => {
    if (gameStatus !== 'playing' || paused) return undefined
    let lastSecond = Math.ceil(live.current.timeLeft)
    const id = setInterval(() => {
      const l = live.current
      const second = Math.ceil(l.timeLeft)
      if (second !== lastSecond && second <= 10 && second > 0) sfx.tick()
      lastSecond = second
      setHud({ timeLeft: l.timeLeft, stamina: l.stamina, gliding: l.gliding })
    }, HUD_REFRESH_MS)
    return () => clearInterval(id)
  }, [gameStatus, paused, runId])

  /* ---------- pause: P / Esc, and whenever the tab is hidden ---------- */
  useEffect(() => {
    if (gameStatus !== 'playing') return undefined
    const onKey = (e) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault()
        setPaused((p) => !p)
      }
    }
    const onHide = () => { if (document.hidden) setPaused(true) }
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [gameStatus])

  useEffect(() => { if (paused) input.held.clear() }, [paused, input])

  return (
    <div className={`skx${embedded ? ' is-fill' : ''}`}>
      {!embedded && (
        <header className="skx-header">
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
        </header>
      )}

      <div className="skx-stage">
        <CanvasBoundary message={text.noWebgl}>
          <Suspense fallback={<p className="skx-message" role="status">{text.loading}</p>}>
            <SkywardExplorerCanvas
              key={runId}
              seed={seed}
              status={gameStatus}
              paused={paused}
              input={input}
              live={live.current}
              onCollect={handleCollect}
              onTimeUp={handleTimeUp}
            />
          </Suspense>
        </CanvasBoundary>

        <HUD
          text={text}
          n={n}
          status={gameStatus}
          paused={paused}
          score={score}
          total={total}
          timeLeft={hud.timeLeft}
          stamina={hud.stamina}
          gliding={hud.gliding}
          result={result}
          input={input}
          onStart={start}
          onPause={() => setPaused(true)}
          onResume={() => { releaseFocus(); setPaused(false) }}
          onPlayAgain={playAgain}
          onNewIsland={newIsland}
        />
      </div>
    </div>
  )
}
