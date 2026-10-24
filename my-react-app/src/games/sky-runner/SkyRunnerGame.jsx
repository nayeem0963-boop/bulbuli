/**
 * Bulbuli's Sky Runner — the game screen around the 3D scene (RunnerCanvas.jsx).
 *
 * Flow: pick a level → 3-2-1 countdown → fly until the star goal is reached
 * (win) or the hearts run out (a gentle "Bulbuli needs a rest") → result.
 *
 * Controls: RunnerCanvas handles taps, swipes and ← → / A D itself; this screen
 * adds big on-screen ◀ ▶ buttons (drive it through controlsRef), P / Esc to
 * pause, and pauses automatically when the tab is hidden.
 *
 * Saving, like the other arcade games:
 *   • Every collected star → useScoreSync.addPoints(1) (signed-in players'
 *     profiles.total_score). The hook batches the writes; we flush when the run ends,
 *     and it flushes by itself if the player leaves mid-run.
 *   • XP, best stars, best points and best distance per level → useTutorialProgress.
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useTutorialProgress } from '../../hooks/useTutorialProgress.js'
import { useScoreSync } from '../../hooks/useScoreSync.js'
import { isMuted, playSound } from '../../utils/sound.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import { SKY_RUNNER_TEXT } from './text.js'
import './SkyRunnerGame.css'

// three.js + the scene load only when a run starts; fetched early while the child picks a level.
const loadCanvas = () => import('./RunnerCanvas.jsx')
const RunnerCanvas = lazy(loadCanvas)

const GAME_ID = 'sky-runner'
const HEARTS = 3
const COUNTDOWN_STEP_MS = 800
const END_DELAY_MS = 900 // let the last star pop / the bump wobble play before the result screen
const HUD_REFRESH_MS = 250 // distance is read from statsRef this often, not every frame

/**
 * Levels. difficulty goes straight to RunnerCanvas: speeds in world units per second,
 * accel = extra speed per unit flown.
 */
const LEVELS = [
  { id: 1, goal: 15, difficulty: { baseSpeed: 7, maxSpeed: 11, accel: 0.012 } },
  { id: 2, goal: 25, difficulty: { baseSpeed: 8, maxSpeed: 14, accel: 0.016 } },
  { id: 3, goal: 40, difficulty: { baseSpeed: 9, maxSpeed: 17, accel: 0.02 } },
]
const getLevel = (id) => LEVELS.find((level) => level.id === id) ?? LEVELS[0]

/** 3 stars with no bumps, 2 with one, otherwise 1. Only for a finished level. */
const starsFor = (bumps) => (bumps === 0 ? 3 : bumps === 1 ? 2 : 1)

/** Points shown in the game: stars are worth the most, distance adds a little. */
const pointsFor = (stars, distance) => stars * 10 + Math.floor(distance / 10)

/** XP: a share of the stars collected, plus a bonus for finishing (more for more stars). */
const xpFor = (collected, won, rating) => Math.floor(collected / 3) + (won ? 4 + rating * 2 : 0)

/** Same speech behaviour as the other arcade games: respects mute, silent in Bangla without a Bangla voice. */
function speak(words, language, { interrupt = true } = {}) {
  if (!words || isMuted() || typeof window === 'undefined' || !window.speechSynthesis) return
  const lang = language === 'bn' ? 'bn' : 'en'
  const voice = window.speechSynthesis.getVoices().find((candidate) => candidate.lang?.toLowerCase().startsWith(lang))
  if (!voice && lang === 'bn') return
  const utterance = new SpeechSynthesisUtterance(words)
  utterance.lang = voice?.lang ?? 'en-US'
  if (voice) utterance.voice = voice
  utterance.rate = 0.95
  utterance.pitch = 1.15
  if (interrupt) window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

function Stars({ count, label, size = 'md' }) {
  return (
    <span className={`srg-stars is-${size}`} role="img" aria-label={label}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= count ? 'is-on' : ''} aria-hidden="true">★</span>
      ))}
    </span>
  )
}

function StageLoader({ label }) {
  return (
    <div className="srg-loading" role="status">
      <span className="srg-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export default function SkyRunnerGame({ playerId, language }) {
  const text = SKY_RUNNER_TEXT[language] ?? SKY_RUNNER_TEXT.en
  const n = useCallback((value) => formatDigits(value, language), [language])

  const { games, saveGameResult, storageError } = useTutorialProgress(playerId)
  const { addPoints, flush } = useScoreSync({ userId: playerId })
  const record = games[GAME_ID] ?? {}

  const [levelId, setLevelId] = useState(() => record.levelId ?? 1)
  const level = getLevel(levelId)

  // 'menu' → 'countdown' → 'playing' → 'done'
  const [phase, setPhase] = useState('menu')
  const [runId, setRunId] = useState(0) // new key for RunnerCanvas = a brand-new sky
  const [countdown, setCountdown] = useState(null) // text shown over the canvas
  const [paused, setPaused] = useState(false)
  const [stars, setStars] = useState(0)
  const [hearts, setHearts] = useState(HEARTS)
  const [distance, setDistance] = useState(0)
  const [result, setResult] = useState(null)
  const [hitFlash, setHitFlash] = useState(0) // bumps the HUD heart animation

  const statsRef = useRef(null) // { distance, speed, stars, bumps } from RunnerCanvas, mutated per frame
  const controlsRef = useRef(null) // { left(), right(), goTo(lane) }
  const run = useRef({ stars: 0, bumps: 0, ended: true, level }) // the live run, outside React state
  const timers = useRef([])

  const later = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }, [])
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  useEffect(() => () => {
    clearTimers()
    window.speechSynthesis?.cancel()
  }, [clearTimers])

  useEffect(() => {
    loadCanvas().catch(() => {})
  }, [])

  /* ---------- start a run ---------- */
  const start = useCallback((id = levelId) => {
    playSound('click')
    clearTimers()
    const next = getLevel(id)
    run.current = { stars: 0, bumps: 0, ended: false, level: next }
    statsRef.current = null
    setLevelId(id)
    setStars(0)
    setHearts(HEARTS)
    setDistance(0)
    setResult(null)
    setPaused(false)
    setRunId((value) => value + 1)
    setPhase('countdown')

    // 3 … 2 … 1 … Go!
    const steps = [...text.countdown, text.go]
    steps.forEach((word, i) => {
      later(() => {
        setCountdown(word)
        speak(i === steps.length - 1 ? `${word} ${text.startSpeech(next.goal)}` : word, language)
      }, i * COUNTDOWN_STEP_MS)
    })
    later(() => setPhase('playing'), (steps.length - 1) * COUNTDOWN_STEP_MS)
    later(() => setCountdown(null), steps.length * COUNTDOWN_STEP_MS)
  }, [clearTimers, later, levelId, text, language])

  /* ---------- end a run ---------- */
  const endRun = useCallback((won) => {
    const current = run.current
    if (current.ended) return
    current.ended = true
    flush() // stars were added one by one during the run; save them now

    later(() => {
      const flown = Math.floor(statsRef.current?.distance ?? 0)
      const rating = won ? starsFor(current.bumps) : 0
      const points = pointsFor(current.stars, flown)
      const xp = xpFor(current.stars, won, rating)
      const id = current.level.id
      const isBest = points > (record.bestPoints?.[id] ?? 0)

      saveGameResult(GAME_ID, (previous) => ({
        ...previous,
        levelId: id,
        plays: (previous.plays ?? 0) + 1,
        totalStars: (previous.totalStars ?? 0) + current.stars,
        bestStars: { ...previous.bestStars, [id]: Math.max(previous.bestStars?.[id] ?? 0, rating) },
        bestPoints: { ...previous.bestPoints, [id]: Math.max(previous.bestPoints?.[id] ?? 0, points) },
        bestDistance: { ...previous.bestDistance, [id]: Math.max(previous.bestDistance?.[id] ?? 0, flown) },
      }), xp)

      playSound('complete')
      speak(won ? text.wonSpeech : text.lostSpeech, language)
      setResult({ won, rating, points, xp, stars: current.stars, bumps: current.bumps, distance: flown, isBest })
      setPhase('done')
    }, END_DELAY_MS)
  }, [flush, later, record.bestPoints, saveGameResult, text, language])

  /* ---------- events from the 3D scene ---------- */
  const handleStar = useCallback(() => {
    const current = run.current
    if (current.ended) return
    current.stars += 1
    const count = current.stars
    const { goal } = current.level
    setStars(count)
    addPoints(1)
    playSound('correct')

    if (count >= goal) {
      endRun(true)
      return
    }
    // Speak only at milestones, so the voice never piles up.
    const left = goal - count
    if (left <= 3) speak(text.almost(formatDigits(left, language)), language)
    else if (count % 5 === 0) speak(text.milestone(formatDigits(count, language)), language)
  }, [addPoints, endRun, text, language])

  const handleBump = useCallback(() => {
    const current = run.current
    if (current.ended) return
    current.bumps += 1
    const left = Math.max(0, HEARTS - current.bumps)
    setHearts(left)
    setHitFlash((value) => value + 1)
    playSound('wrong')
    navigator.vibrate?.(40)
    if (left === 0) {
      endRun(false)
      return
    }
    speak(left === 1 ? text.lastHeart : text.bump, language)
  }, [endRun, text, language])

  const handleMove = useCallback(() => {
    navigator.vibrate?.(8)
  }, [])

  /* ---------- pause ---------- */
  const playing = phase === 'playing'
  const togglePause = useCallback(() => {
    playSound('click')
    setPaused((value) => !value)
  }, [])

  useEffect(() => {
    if (!playing) return undefined
    const onHide = () => {
      if (document.visibilityState === 'hidden') setPaused(true)
    }
    const onKey = (e) => {
      if (e.repeat) return
      const key = e.key.toLowerCase()
      if (key === 'p' || key === 'escape') {
        e.preventDefault()
        togglePause()
      }
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('keydown', onKey)
    }
  }, [playing, togglePause])

  // Pausing also pauses the countdown's speech; resuming doesn't repeat it.
  useEffect(() => {
    if (paused) window.speechSynthesis?.cancel()
  }, [paused])

  /* ---------- distance for the HUD (polled, not per frame) ---------- */
  useEffect(() => {
    if (!playing || paused) return undefined
    const id = setInterval(() => setDistance(Math.floor(statsRef.current?.distance ?? 0)), HUD_REFRESH_MS)
    return () => clearInterval(id)
  }, [playing, paused])

  /* ---------- Level picker ---------- */
  if (phase === 'menu') {
    return (
      <div className="srg" lang={language}>
        <header className="srg-header">
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
        </header>
        {storageError && <p className="notice" role="alert">{storageError}</p>}

        <section className="srg-setup" aria-labelledby="srg-level-heading">
          <h2 id="srg-level-heading">{text.pickLevel}</h2>
          <div className="srg-choices">
            {LEVELS.map((option) => {
              const best = record.bestStars?.[option.id] ?? 0
              return (
                <button
                  key={option.id}
                  type="button"
                  className="srg-choice"
                  aria-pressed={option.id === levelId}
                  onClick={() => { playSound('click'); setLevelId(option.id) }}
                >
                  <span className="srg-choice-label">{text.levelName(n(option.id))}</span>
                  <span className="srg-choice-hint">{text.levelHint[option.id](n(option.goal))}</span>
                  <Stars count={best} size="sm" label={text.bestStars(n(best))} />
                </button>
              )
            })}
          </div>
        </section>

        <p className="srg-howto">{text.howTo}</p>
        <button type="button" className="srg-primary srg-start" onClick={() => start()}>
          {text.start}
        </button>
      </div>
    )
  }

  /* ---------- Result ---------- */
  if (phase === 'done' && result) {
    const hasNext = LEVELS.some((option) => option.id === level.id + 1)
    return (
      <div className="srg" lang={language}>
        <section className={`srg-result ${result.won ? 'is-won' : 'is-rest'}`} aria-labelledby="srg-result-title">
          <span className="srg-result-badge" aria-hidden="true">{result.won ? '🌟' : '☁️'}</span>
          <h1 id="srg-result-title">{result.won ? text.wonTitle : text.lostTitle}</h1>
          {result.won && <Stars count={result.rating} size="lg" label={text.starsLabel(n(result.rating))} />}
          <p>{text.resultStars(n(result.stars), n(level.goal))}</p>
          <p>{text.resultBumps(n(result.bumps))}</p>
          <p className="srg-muted">{text.resultDistance(n(result.distance))}</p>
          <p className="srg-points-line">
            {text.points(n(result.points))}
            {result.isBest && <span className="srg-best">{text.newBest}</span>}
          </p>
          <p className="srg-xp">{text.xpEarned(n(result.xp))}</p>
          <div className="srg-actions">
            {result.won && hasNext && (
              <button type="button" className="srg-primary" onClick={() => start(level.id + 1)}>{text.nextLevel}</button>
            )}
            <button type="button" className={result.won && hasNext ? 'srg-secondary' : 'srg-primary'} onClick={() => start(level.id)}>
              {text.playAgain}
            </button>
            <button type="button" className="srg-secondary" onClick={() => { playSound('click'); setPhase('menu') }}>
              {text.changeLevel}
            </button>
          </div>
        </section>
      </div>
    )
  }

  /* ---------- Countdown + playing ---------- */
  const progress = Math.min(100, Math.round((stars / level.goal) * 100))
  const canSteer = playing && !paused

  return (
    <div className="srg is-playing" lang={language}>
      <header className="srg-header is-compact">
        <h1>{text.title}</h1>
        <p>{text.levelName(n(level.id))} · {text.points(n(pointsFor(stars, distance)))}</p>
      </header>

      <div className="srg-hud">
        <span className="srg-goal">
          <span aria-hidden="true">⭐</span> {text.starsGoal(n(stars), n(level.goal))}
        </span>
        <div
          className="srg-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={level.goal}
          aria-valuenow={stars}
          aria-label={text.starsGoal(n(stars), n(level.goal))}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <span key={hitFlash} className={`srg-hearts ${hitFlash ? 'is-hit' : ''}`} role="img" aria-label={text.hearts(n(hearts))}>
          {Array.from({ length: HEARTS }, (_, i) => (
            <span key={i} className={i < hearts ? 'is-on' : ''} aria-hidden="true">♥</span>
          ))}
        </span>
        <button type="button" className="srg-secondary srg-pause" onClick={togglePause} aria-pressed={paused} disabled={!playing}>
          {paused ? `▶ ${text.resume}` : `⏸ ${text.pause}`}
        </button>
      </div>

      <div className="srg-stage">
        <Suspense fallback={<StageLoader label={text.loading} />}>
          <RunnerCanvas
            key={runId}
            running={playing}
            paused={paused}
            difficulty={level.difficulty}
            onStar={handleStar}
            onBump={handleBump}
            onMove={handleMove}
            statsRef={statsRef}
            controlsRef={controlsRef}
            showHints={playing && stars === 0 && distance < 40}
            label={text.playArea}
            loadingLabel={text.loading}
            noWebglMessage={text.noWebgl}
          />
        </Suspense>

        {countdown && (
          <div className="srg-countdown" aria-live="assertive">
            <span key={countdown}>{countdown}</span>
          </div>
        )}
        {paused && (
          <button type="button" className="srg-paused" onClick={togglePause}>
            <span>⏸ {text.paused}</span>
            <span className="srg-paused-cta">▶ {text.resume}</span>
          </button>
        )}
      </div>

      {/* Big steering buttons: easy for small thumbs, and usable with a switch or screen reader. */}
      <div className="srg-steer">
        <button
          type="button"
          className="srg-steer-btn"
          aria-label={text.left}
          aria-disabled={!canSteer}
          onClick={() => canSteer && controlsRef.current?.left()}
        >
          ◀
        </button>
        <button
          type="button"
          className="srg-steer-btn"
          aria-label={text.right}
          aria-disabled={!canSteer}
          onClick={() => canSteer && controlsRef.current?.right()}
        >
          ▶
        </button>
      </div>
    </div>
  )
}
