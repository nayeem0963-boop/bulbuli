/**
 * Bulbuli Ball Dash — the game screen around the 3D scene (BallDashScene.jsx).
 *
 * Flow: start screen → play (or practice) → pause any time → results → play again.
 * The rules live in engine.js (tested in engine.test.js); this file is controls, screens and saving.
 *
 * Controls
 *   keyboard   ← → / A D move · Space / ↑ / W jump · ↓ / S shrink · P / Esc pause
 *              (only while a run is on, never while typing in a field, never with Ctrl/Alt/⌘)
 *   touch      swipe left / right (up = jump, down = shrink) on the track, big buttons for everything
 *   mouse      the same on-screen buttons
 *
 * Saving, like the other arcade games:
 *   • each star collected → useScoreSync.addPoints (signed-in players' total score), flushed at the end
 *   • XP + personal bests → useGameProgress.saveGameResult (local, and the player's account if signed in)
 *     A run is saved once, when it ends; practice runs give no XP. The first full minute ever
 *     gives a one-time bonus, remembered in the record so a replay or reload can't pay it twice.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGameProgress } from '../../hooks/useGameProgress.js'
import { useScoreSync } from '../../hooks/useScoreSync.js'
import { playSound } from '../../utils/sound.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import { useMuted } from '../../arcade/preferences.js'
import { GameFullscreenButton } from '../../arcade/GameFullscreen.jsx'
import { useReducedMotion } from '../../shared/hooks/useReducedMotion.js'
import { createRun, jump, moveLeft, moveRight, shrink, summary, xpForRun } from './engine.js'
import { sfx } from './sfx.js'
import { BALL_DASH_TEXT } from './text.js'
import BallDashArt from './Art.jsx'
import ShareGameButton from '../../buddies/ShareGameButton.jsx'
import { shareUrl } from '../../buddies/shareLinks.js'
import './ball-dash.css'

// three.js + the scene load only when the game opens; fetched while the start screen shows.
const loadScene = () => import('./BallDashScene.jsx')
const BallDashScene = lazy(loadScene)

const GAME_ID = 'ball-dash'
const SETTINGS_KEY = 'bulbuli.ball-dash.settings' // { hints } on this device (sound is the arcade's)
const HUD_REFRESH_MS = 150
const TOAST_MS = 2600
const FIRST_MINUTE_BONUS_XP = 5
const SWIPE_PX = 28

function readSettings() {
  try {
    const value = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? '{}')
    return { hints: value?.hints !== false }
  } catch {
    return { hints: true }
  }
}

const isTyping = (target) => target instanceof HTMLElement
  && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

const clock = (seconds) => {
  const s = Math.floor(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function Hearts({ count, max, label }) {
  return (
    <span className="bd-hearts" role="img" aria-label={label}>
      {Array.from({ length: max }, (_, i) => <span key={i} className={i < count ? 'is-on' : ''} aria-hidden="true">♥</span>)}
    </span>
  )
}

export default function BallDashGame({ playerId, language }) {
  const text = BALL_DASH_TEXT[language] ?? BALL_DASH_TEXT.en
  const n = useCallback((value) => formatDigits(value, language), [language])
  const reducedMotion = useReducedMotion()
  const { muted, toggleMuted } = useMuted()

  const { games, saveGameResult, storageError } = useGameProgress(playerId)
  const { addPoints, flush } = useScoreSync({ userId: playerId })
  const record = useMemo(() => games[GAME_ID] ?? {}, [games])
  const recordRef = useRef(record)
  useEffect(() => { recordRef.current = record }, [record])

  const [settings, setSettings] = useState(readSettings)
  const [phase, setPhase] = useState('start') // 'start' | 'playing' | 'over'
  const [practice, setPractice] = useState(false)
  const [paused, setPaused] = useState(false)
  const [runId, setRunId] = useState(0)
  const [hud, setHud] = useState({ time: 0, stars: 0, hearts: 3, distance: 0 })
  const [toast, setToast] = useState(null)
  const [hintOpen, setHintOpen] = useState(false)
  const [result, setResult] = useState(null)
  const [bump, setBump] = useState(0)

  const run = useRef(null)
  const stage = useRef(null)
  const toastTimer = useRef(null)
  const lastStarSound = useRef(0)
  const saved = useRef(false)

  useEffect(() => { loadScene().catch(() => {}) }, [])
  // read-only hook for automated play-testing: only with ?bd-debug in the address
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('bd-debug')) return undefined
    window.__ballDash = run
    return () => { delete window.__ballDash }
  }, [])
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const showToast = useCallback((message, tone = 'info') => {
    clearTimeout(toastTimer.current)
    setToast({ message, tone, id: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  const saveSettings = (next) => {
    setSettings(next)
    try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)) } catch { /* fine for this visit */ }
  }

  /* ---------- start / end ---------- */
  /** Saves a run once (game over, finishing practice, or leaving a run); returns its results. */
  const saveRun = useCallback(() => {
    const current = run.current
    if (!current || saved.current) return null
    saved.current = true
    flush()
    const stats = summary(current)
    const previous = recordRef.current
    const firstMinute = !current.practice && stats.time >= 60 && !previous.firstMinuteBonus
    const xp = xpForRun(stats, current.practice) + (firstMinute ? FIRST_MINUTE_BONUS_XP : 0)
    const isRecord = !current.practice && stats.distance > (previous.bestDistance ?? 0) && (previous.plays ?? 0) > 0
    // the moves have all been met once the gate (the last one introduced) has been passed
    const learned = current.introduced.gate && current.t >= 35
    saveGameResult(GAME_ID, (rec) => ({
      ...rec,
      plays: (rec.plays ?? 0) + (current.practice ? 0 : 1),
      practiceRuns: (rec.practiceRuns ?? 0) + (current.practice ? 1 : 0),
      totalStars: (rec.totalStars ?? 0) + stats.stars,
      bestDistance: current.practice ? rec.bestDistance ?? 0 : Math.max(rec.bestDistance ?? 0, stats.distance),
      bestTime: current.practice ? rec.bestTime ?? 0 : Math.max(rec.bestTime ?? 0, Math.floor(stats.time)),
      tutorialDone: Boolean(rec.tutorialDone || learned),
      firstMinuteBonus: Boolean(rec.firstMinuteBonus || firstMinute),
      // cosmetic: unlocked once (shown on the start screen)
      badges: {
        ...rec.badges,
        ...(stats.stars >= 10 ? { starCatcher: true } : {}),
        ...(stats.time >= 60 && !current.practice ? { minuteRoller: true } : {}),
      },
    }), xp)
    return { ...stats, xp, isRecord, practice: current.practice }
  }, [flush, saveGameResult])

  const start = useCallback((asPractice) => {
    playSound('click')
    // (restarting mid-run doesn't save the run: saving ends a "round", and the arcade's
    //  "How was it?" card would pop up over the new one. Its stars were already counted.)
    clearTimeout(toastTimer.current)
    setToast(null)
    run.current = createRun({ seed: Date.now() >>> 0, practice: asPractice, bestDistance: recordRef.current.bestDistance ?? 0 })
    saved.current = false
    setPractice(asPractice)
    setPaused(false)
    setResult(null)
    setHud({ time: 0, stars: 0, hearts: run.current.hearts, distance: 0 })
    setHintOpen(settings.hints && !recordRef.current.tutorialDone)
    setRunId((id) => id + 1)
    setPhase('playing')
    requestAnimationFrame(() => stage.current?.focus({ preventScroll: true }))
  }, [settings.hints])

  const finish = useCallback(() => {
    const res = saveRun()
    if (!res) return
    playSound('complete')
    setResult({ ...res, title: text.overTitle[Math.floor(Math.random() * text.overTitle.length)] })
    setPaused(false)
    setPhase('over')
  }, [saveRun, text])

  const toStartScreen = useCallback(() => {
    playSound('click')
    if (phase === 'playing') saveRun() // stars and bests from a left run still count
    setPaused(false)
    setPhase('start')
  }, [phase, saveRun])

  // leaving the page mid-run keeps what was earned (through a ref: this must run on unmount only)
  const saveRunRef = useRef(saveRun)
  useEffect(() => { saveRunRef.current = saveRun }, [saveRun])
  useEffect(() => () => { if (run.current && !saved.current && run.current.t > 3) saveRunRef.current() }, [])

  /* ---------- events from the engine (via the scene, once per frame at most) ---------- */
  const onEvents = useCallback((events) => {
    for (const e of events) {
      switch (e.type) {
        case 'star': {
          if (!run.current?.practice) addPoints(e.value)
          const now = performance.now()
          if (now - lastStarSound.current > 110) { playSound('correct'); lastStarSound.current = now }
          break
        }
        case 'jump': sfx.jump(); break
        case 'shrink': sfx.shrink(); break
        case 'hit':
          playSound('wrong')
          navigator.vibrate?.(40)
          setBump((b) => b + 1)
          if (e.hearts > 0) showToast(text.bump, 'bump')
          break
        case 'heart': showToast(text.heartBack, 'good'); break
        case 'hint': showToast(text.hint[e.hint], 'hint'); break
        case 'milestone':
          playSound('complete')
          showToast(text.milestone[e.id], 'good')
          break
        case 'over': setTimeout(finish, 700); break
        default: break
      }
    }
  }, [addPoints, finish, showToast, text])

  // the first-run control hint hides itself after a while (it can also be closed)
  useEffect(() => {
    if (!hintOpen) return undefined
    const id = setTimeout(() => setHintOpen(false), 8000)
    return () => clearTimeout(id)
  }, [hintOpen, runId])

  /* ---------- HUD: read the engine a few times a second (not every frame) ---------- */
  useEffect(() => {
    if (phase !== 'playing' || paused) return undefined
    const id = setInterval(() => {
      const r = run.current
      if (!r) return
      const next = { time: Math.floor(r.t), stars: r.stars, hearts: r.hearts, distance: Math.floor(r.dist) }
      setHud((prev) => (prev.time === next.time && prev.stars === next.stars && prev.hearts === next.hearts
        && prev.distance === next.distance ? prev : next))
    }, HUD_REFRESH_MS)
    return () => clearInterval(id)
  }, [phase, paused, runId])

  /* ---------- pause ---------- */
  const playing = phase === 'playing'
  const togglePause = useCallback(() => {
    playSound('click')
    setPaused((value) => !value)
  }, [])

  /* ---------- actions (keyboard, touch, buttons all come here) ---------- */
  const act = useCallback((action) => {
    const r = run.current
    if (!r || phase !== 'playing' || paused) return
    if (action === 'left') moveLeft(r)
    else if (action === 'right') moveRight(r)
    else if (action === 'jump') jump(r)
    else if (action === 'shrink') shrink(r)
  }, [phase, paused])

  useEffect(() => {
    if (!playing) return undefined
    const keys = {
      arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
      ' ': 'jump', arrowup: 'jump', w: 'jump', arrowdown: 'shrink', s: 'shrink',
    }
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      const key = e.key.toLowerCase()
      if (key === 'p' || key === 'escape') {
        if (e.repeat) return
        // Esc in browser full screen also leaves full screen (the browser does that); we pause too
        e.preventDefault()
        togglePause()
        return
      }
      const action = keys[key]
      if (!action) return
      e.preventDefault() // no page scrolling from arrows / space while playing
      if (e.repeat) return
      act(action)
    }
    const onHide = () => { if (document.visibilityState === 'hidden') setPaused(true) }
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [playing, act, togglePause])

  // swipes on the track
  const swipe = useRef(null)
  const onPointerDown = (e) => {
    if (!playing || paused || e.target.closest('button')) return
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY, done: false }
  }
  const onPointerMove = (e) => {
    const g = swipe.current
    if (!g || g.id !== e.pointerId || g.done) return
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return
    g.done = true
    if (Math.abs(dx) > Math.abs(dy)) act(dx < 0 ? 'left' : 'right')
    else act(dy < 0 ? 'jump' : 'shrink')
  }
  const onPointerEnd = () => { swipe.current = null }

  const touch = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches, [])

  /* ---------- screens ---------- */
  const bestTime = record.bestTime ?? 0
  const bestDistance = record.bestDistance ?? 0

  if (phase === 'start') {
    return (
      <div className="bd" lang={language}>
        <header className="bd-header game-fs-header">
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
          <GameFullscreenButton />
        </header>
        {storageError && <p className="notice" role="alert">{text.saveError}</p>}

        <div className="bd-start">
          <div className="bd-preview"><BallDashArt large /></div>

          <div className="bd-start-main">
            <div className="bd-start-actions">
              <button type="button" className="bd-primary" onClick={() => start(false)}>▶ {text.play}</button>
              <button type="button" className="bd-secondary" onClick={() => start(true)} aria-describedby="bd-practice-info">
                🎯 {text.practice}
              </button>
            </div>
            <p id="bd-practice-info" className="bd-small">{text.practiceInfo}</p>

            <section className="bd-howto" aria-labelledby="bd-howto-title">
              <h2 id="bd-howto-title">{text.howTo}</h2>
              <ul>
                {text.moves.map((move) => (
                  <li key={move.name}>
                    <span className="bd-move-icon" aria-hidden="true">{move.icon}</span>
                    <span>
                      <strong>{move.name}</strong> <span className="bd-keys">{move.keys}</span>
                      <br />{move.what}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="bd-start-row">
              <section className="bd-best" aria-labelledby="bd-best-title">
                <h2 id="bd-best-title">{text.best}</h2>
                {(record.plays ?? 0) > 0 ? (
                  <dl>
                    <div><dt>{text.bestTime}</dt><dd>{n(clock(bestTime))}</dd></div>
                    <div><dt>{text.bestDistance}</dt><dd>{text.metres(n(bestDistance))}</dd></div>
                    <div><dt>{text.totalStars}</dt><dd>⭐ {n(record.totalStars ?? 0)}</dd></div>
                  </dl>
                ) : <p className="bd-small">{text.noBest}</p>}
                {(record.badges?.starCatcher || record.badges?.minuteRoller) && (
                  <p className="bd-badges">
                    {record.badges?.starCatcher && <span>⭐ 10</span>}
                    {record.badges?.minuteRoller && <span>🏅 1:00</span>}
                  </p>
                )}
              </section>

              <section className="bd-settings" aria-labelledby="bd-settings-title">
                <h2 id="bd-settings-title">{text.settings}</h2>
                <button type="button" className="bd-switch" aria-pressed={!muted} onClick={toggleMuted}>
                  <span>{text.sound}</span><span className="bd-switch-state">{muted ? text.off : text.on}</span>
                </button>
                <button type="button" className="bd-switch" aria-pressed={settings.hints} onClick={() => saveSettings({ ...settings, hints: !settings.hints })}>
                  <span>{text.hints}</span><span className="bd-switch-state">{settings.hints ? text.on : text.off}</span>
                </button>
              </section>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bd is-playing${paused ? ' is-paused' : ''}`} lang={language}>
      <header className="bd-header is-compact game-fs-header">
        <h1>{text.title}</h1>
        <p>{practice ? text.practiceBadge : text.intro}</p>
        <GameFullscreenButton />
      </header>

      <div
        ref={stage}
        className="bd-stage"
        tabIndex={-1}
        role="group"
        aria-label={text.playArea}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <Suspense fallback={<div className="bd-loading" role="status">{text.loading}</div>}>
          <BallDashScene
            key={runId}
            runRef={run}
            running={phase === 'playing'}
            paused={paused || phase !== 'playing'}
            onEvents={onEvents}
            reducedMotion={reducedMotion}
            noWebglMessage={text.noWebgl}
          />
        </Suspense>

        {/* HUD: top corners only, so the ball and the track ahead stay clear */}
        <div className="bd-hud">
          <div className="bd-hud-group">
            <span className="bd-pill" aria-label={`${text.time} ${clock(hud.time)}`}>⏱ {n(clock(hud.time))}</span>
            <span className="bd-pill" aria-label={`${text.distance} ${hud.distance}`}>🏁 {text.metres(n(hud.distance))}</span>
            <span className="bd-pill is-stars" aria-label={`${text.stars} ${hud.stars}`}>⭐ {n(hud.stars)}</span>
          </div>
          <div className="bd-hud-group">
            {practice
              ? <span className="bd-pill is-practice">🎯 {text.practiceBadge}</span>
              : <span key={bump} className={`bd-pill${bump ? ' is-bumped' : ''}`}><Hearts count={hud.hearts} max={3} label={text.hearts(n(hud.hearts))} /></span>}
            <button type="button" className="bd-icon" onClick={toggleMuted} aria-label={muted ? text.soundOn : text.soundOff} title={muted ? text.soundOn : text.soundOff}>
              <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
            </button>
            <button type="button" className="bd-icon" onClick={togglePause} disabled={phase !== 'playing'} aria-label={text.pause} title={`${text.pause} (P)`}>
              <span aria-hidden="true">⏸</span>
            </button>
          </div>
        </div>

        {toast && (
          <p key={toast.id} className={`bd-toast is-${toast.tone}`} role="status" aria-live="polite">{toast.message}</p>
        )}

        {hintOpen && phase === 'playing' && !paused && (
          <div className="bd-hint">
            <span>{touch ? text.controlHintTouch : text.controlHint}</span>
            <button type="button" onClick={() => setHintOpen(false)} aria-label={text.dismiss}>✕</button>
          </div>
        )}

        {/* big buttons: thumbs on phones, clicks on computers */}
        {phase === 'playing' && (
          <div className="bd-pad">
            <div className="bd-pad-side">
              <button type="button" className="bd-pad-btn" onClick={() => act('left')} aria-label={text.left}><span aria-hidden="true">◀</span></button>
              <button type="button" className="bd-pad-btn" onClick={() => act('right')} aria-label={text.right}><span aria-hidden="true">▶</span></button>
            </div>
            <div className="bd-pad-side">
              <button type="button" className="bd-pad-btn is-jump" onClick={() => act('jump')}><span aria-hidden="true">⬆</span> {text.jump}</button>
              <button type="button" className="bd-pad-btn is-shrink" onClick={() => act('shrink')}><span aria-hidden="true">⬇</span> {text.shrink}</button>
            </div>
          </div>
        )}

        {paused && phase === 'playing' && (
          <div className="bd-overlay" role="dialog" aria-modal="true" aria-labelledby="bd-paused-title">
            <div className="bd-card">
              <h2 id="bd-paused-title">⏸ {text.paused}</h2>
              <div className="bd-card-actions">
                <button type="button" className="bd-primary" autoFocus onClick={togglePause}>▶ {text.resume}</button>
                <button type="button" className="bd-secondary" onClick={() => start(practice)}>↻ {text.restart}</button>
                {practice && <button type="button" className="bd-secondary" onClick={finish}>✓ {text.endPractice}</button>}
                <button type="button" className="bd-secondary" onClick={toStartScreen}>⌂ {text.toStart}</button>
              </div>
            </div>
          </div>
        )}

        {phase === 'over' && result && (
          <div className="bd-overlay" role="dialog" aria-modal="true" aria-labelledby="bd-over-title">
            <div className="bd-card is-result">
              <p className="bd-result-badge" aria-hidden="true">{result.practice ? '🎯' : '🌟'}</p>
              <h2 id="bd-over-title">{result.practice ? text.overPractice : result.title}</h2>
              <dl className="bd-result-stats">
                <div><dt>{text.time}</dt><dd>{n(clock(result.time))}</dd></div>
                <div><dt>{text.distance}</dt><dd>{text.metres(n(result.distance))}</dd></div>
                <div><dt>{text.stars}</dt><dd>⭐ {n(result.stars)}</dd></div>
              </dl>
              {result.isRecord && <p className="bd-record">🏆 {text.newRecord}</p>}
              {result.xp > 0 && <p className="bd-xp">{text.xpEarned(n(result.xp))}</p>}
              <p className="bd-small">{text.overText}</p>
              <div className="bd-card-actions">
                <button type="button" className="bd-primary" autoFocus onClick={() => start(result.practice)}>▶ {text.playAgain}</button>
                <button type="button" className="bd-secondary" onClick={toStartScreen}>⌂ {text.toStart}</button>
                {/* the game's public page only: no score, name or record goes into the invitation */}
                <ShareGameButton className="bd-secondary" variant="label" title={text.title} url={shareUrl('/games/ball-dash')} language={language} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
