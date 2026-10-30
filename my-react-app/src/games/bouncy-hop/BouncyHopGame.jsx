/**
 * Bulbuli Bouncy Hop 3D — the game screen around the 3D scene (BouncyHopScene.jsx).
 *
 * Flow: start screen (pick a learning target) → play (or practice) → pause any time → results → Play Again.
 * The rules live in engine.js (tested in engine.test.js); this file is controls, screens, sound and saving.
 *
 * Controls (the ball bounces by itself; players only steer)
 *   keyboard   hold ← → / A D to steer · P / Esc pause
 *              (only while a round is on, never while typing in a field, never with Ctrl/Alt/⌘)
 *   mouse      drag anywhere on the sky, or hold the ◀ ▶ buttons
 *   touch      drag with a finger, or hold the ◀ ▶ buttons
 *
 * Saving, like the other arcade games:
 *   • each good hop's points → useScoreSync.addPoints (signed-in players' total score), flushed at the end
 *   • XP + high scores → useGameProgress.saveGameResult (local, and the player's account if signed in).
 *     A round is saved once, when it ends; practice gives no XP.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGameProgress } from '../../hooks/useGameProgress.js'
import { useScoreSync } from '../../hooks/useScoreSync.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import { useMuted } from '../../arcade/preferences.js'
import { GameFullscreenButton } from '../../arcade/GameFullscreen.jsx'
import { useReducedMotion } from '../../shared/hooks/useReducedMotion.js'
import ShareGameButton from '../../buddies/ShareGameButton.jsx'
import { shareUrl } from '../../buddies/shareLinks.js'
import { MODE_IDS, MODES, createRun, multiplier, summary, targetFor, xpForRun } from './engine.js'
import { music, say, sfx } from './audio.js'
import { BOUNCY_HOP_TEXT } from './text.js'
import BouncyHopArt from './Art.jsx'
import './bouncy-hop.css'

// three.js + the scene load only when the game opens; fetched while the start screen shows.
const loadScene = () => import('./BouncyHopScene.jsx')
const BouncyHopScene = lazy(loadScene)

const GAME_ID = 'bouncy-hop'
const SETTINGS_KEY = 'bulbuli.bouncy-hop.settings' // { music, mode } on this device (sound is the arcade's)
const HUD_REFRESH_MS = 100
const TOAST_MS = 2400
const MODE_ICONS = { by2: '2️⃣', by3: '3️⃣', by5: '5️⃣', by10: '🔟', vowels: '🔤' }

function readSettings() {
  try {
    const value = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? '{}')
    return { music: value?.music !== false, mode: MODES[value?.mode] ? value.mode : 'by2' }
  } catch {
    return { music: true, mode: 'by2' }
  }
}

const isTyping = (target) => target instanceof HTMLElement
  && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

function Hearts({ count, max, label }) {
  return (
    <span className="bh-hearts" role="img" aria-label={label}>
      {Array.from({ length: max }, (_, i) => <span key={i} className={i < count ? 'is-on' : ''} aria-hidden="true">♥</span>)}
    </span>
  )
}

/** The Learning Target badge: "Count by 2s · 0, 2, 4 → ?" or "Hop on a vowel · A E I O U". */
function TargetBadge({ target, text, n }) {
  if (!target) return null
  if (target.kind === 'count') {
    return (
      <div className="bh-target" role="status" aria-live="polite" aria-label={`${text.countBy(n(target.step))}: ${target.trail.map(n).join(', ')}, ?`}>
        <span className="bh-target-label">🎯 {text.countBy(n(target.step))}</span>
        <span className="bh-target-main" aria-hidden="true">
          {target.trail.map((v, i) => <span key={`${v}-${i}`} className="bh-trail">{n(v)}</span>)}
          <span className="bh-arrow">→</span>
          <span className="bh-next">?</span>
        </span>
      </div>
    )
  }
  return (
    <div className="bh-target" role="status" aria-label={`${text.findVowel}: ${target.vowels.join(' ')}`}>
      <span className="bh-target-label">🎯 {text.findVowel}</span>
      <span className="bh-target-main is-letters" aria-hidden="true">
        {target.vowels.map((v) => <span key={v} className="bh-trail">{v}</span>)}
      </span>
    </div>
  )
}

export default function BouncyHopGame({ playerId, language }) {
  const text = BOUNCY_HOP_TEXT[language] ?? BOUNCY_HOP_TEXT.en
  const n = useCallback((value) => formatDigits(value, language), [language])
  const formatLabel = useCallback((label) => formatDigits(label, language), [language])
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
  const [roundMode, setRoundMode] = useState('by2')
  const [paused, setPaused] = useState(false)
  const [runId, setRunId] = useState(0)
  const [hud, setHud] = useState({ score: 0, combo: 0, hearts: 3, target: null })
  const [toast, setToast] = useState(null)
  const [popup, setPopup] = useState(null)
  const [hintOpen, setHintOpen] = useState(false)
  const [result, setResult] = useState(null)
  const [bump, setBump] = useState(0)
  const [comboPop, setComboPop] = useState(0)

  const run = useRef(null)
  const stage = useRef(null)
  const toastTimer = useRef(null)
  const saved = useRef(false)
  const held = useRef({ left: false, right: false, btnLeft: false, btnRight: false })

  useEffect(() => { loadScene().catch(() => {}) }, [])
  // read-only hook for automated play-testing: only with ?bh-debug in the address
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('bh-debug')) return undefined
    window.__bouncyHop = run
    return () => { delete window.__bouncyHop }
  }, [])
  useEffect(() => () => { clearTimeout(toastTimer.current); music.stop() }, [])

  const showToast = useCallback((message, tone = 'info') => {
    clearTimeout(toastTimer.current)
    setToast({ message, tone, id: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  const saveSettings = useCallback((next) => {
    setSettings(next)
    try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)) } catch { /* fine for this visit */ }
  }, [])

  /* ---------- music follows the game state ---------- */
  const playing = phase === 'playing'
  useEffect(() => {
    if (playing && !paused && settings.music && !muted) music.start()
    else music.stop()
  }, [playing, paused, settings.music, muted])

  /* ---------- start / end ---------- */
  /** Saves a round once (game over, finishing practice, or leaving); returns its results. */
  const saveRun = useCallback(() => {
    const current = run.current
    if (!current || saved.current) return null
    saved.current = true
    flush()
    const stats = summary(current)
    const previous = recordRef.current
    const xp = xpForRun(stats, current.practice)
    const prevBest = previous.bestByMode?.[stats.mode] ?? 0
    const isRecord = !current.practice && stats.score > prevBest && stats.score > 0
    saveGameResult(GAME_ID, (rec) => ({
      ...rec,
      plays: (rec.plays ?? 0) + (current.practice ? 0 : 1),
      practiceRuns: (rec.practiceRuns ?? 0) + (current.practice ? 1 : 0),
      totalCorrect: (rec.totalCorrect ?? 0) + stats.correct,
      bestScore: current.practice ? rec.bestScore ?? 0 : Math.max(rec.bestScore ?? 0, stats.score),
      bestByMode: current.practice ? rec.bestByMode ?? {} : {
        ...rec.bestByMode,
        [stats.mode]: Math.max(rec.bestByMode?.[stats.mode] ?? 0, stats.score),
      },
      bestCombo: Math.max(rec.bestCombo ?? 0, stats.bestCombo),
      badges: {
        ...rec.badges,
        ...(stats.bestCombo >= 10 ? { streak10: true } : {}),
        ...(stats.correct >= 25 ? { hopper25: true } : {}),
      },
    }), xp)
    return { ...stats, xp, isRecord, practice: current.practice }
  }, [flush, saveGameResult])

  const start = useCallback((asPractice, modeOverride) => {
    sfx.tap()
    clearTimeout(toastTimer.current)
    setToast(null)
    setPopup(null)
    const mode = modeOverride ?? settings.mode
    run.current = createRun({ seed: Date.now() >>> 0, mode, alphabet: language === 'bn' ? 'bn' : 'en', practice: asPractice })
    held.current = { left: false, right: false, btnLeft: false, btnRight: false }
    saved.current = false
    setPractice(asPractice)
    setRoundMode(run.current.mode)
    setPaused(false)
    setResult(null)
    setHud({ score: 0, combo: 0, hearts: run.current.hearts, target: targetFor(run.current) })
    setHintOpen(!recordRef.current.plays && !recordRef.current.practiceRuns)
    setRunId((id) => id + 1)
    setPhase('playing')
    say(text.modes[mode]?.say, language)
    requestAnimationFrame(() => stage.current?.focus({ preventScroll: true }))
  }, [settings.mode, language, text])

  const finish = useCallback(() => {
    const res = saveRun()
    if (!res) return
    sfx.over()
    setResult({ ...res, title: text.overTitle[Math.floor(Math.random() * text.overTitle.length)] })
    setPaused(false)
    setPhase('over')
  }, [saveRun, text])

  const toStartScreen = useCallback(() => {
    sfx.tap()
    if (phase === 'playing') saveRun() // points and bests from a left round still count
    setPaused(false)
    setPhase('start')
  }, [phase, saveRun])

  // leaving the page mid-round keeps what was earned (through a ref: this must run on unmount only)
  const saveRunRef = useRef(saveRun)
  useEffect(() => { saveRunRef.current = saveRun }, [saveRun])
  useEffect(() => () => { if (run.current && !saved.current && run.current.correct > 0) saveRunRef.current() }, [])

  /* ---------- events from the engine (via the scene, once per frame at most) ---------- */
  const onEvents = useCallback((events) => {
    for (const e of events) {
      switch (e.type) {
        case 'hop': sfx.bounce(run.current?.combo ?? 0); break
        case 'land':
          if (!run.current?.practice) addPoints(e.points)
          sfx.correct(e.combo)
          setPopup({ id: Date.now() + Math.random(), points: e.points, multiplier: e.multiplier })
          if (e.combo > 1 && e.combo % 5 === 0) setComboPop((c) => c + 1)
          break
        case 'wrong': {
          sfx.wrong()
          navigator.vibrate?.(50)
          setBump((b) => b + 1)
          const isCount = MODES[run.current?.mode]?.kind === 'count'
          showToast(isCount ? text.wrongCount(formatLabel(e.label), formatLabel(e.answer)) : text.wrongVowel(e.label), 'bump')
          break
        }
        case 'fall':
          sfx.fall()
          setBump((b) => b + 1)
          showToast(e.answer && MODES[run.current?.mode]?.kind === 'count' ? text.fellAnswer(formatLabel(e.answer)) : text.fell, 'bump')
          break
        case 'boost':
          sfx.boost()
          showToast(text.superBounce(n(e.combo)), 'good')
          break
        case 'milestone':
          sfx.milestone()
          showToast(text.milestone(n(e.correct)), 'good')
          break
        case 'pace': // the hops just got a little quicker: say so, kindly, so it never comes as a surprise
          showToast(text.paceUp, 'good')
          break
        case 'over': setTimeout(finish, 450); break
        default: break
      }
    }
  }, [addPoints, finish, formatLabel, n, showToast, text])

  // the first-round control hint hides itself after a while (it can also be closed)
  useEffect(() => {
    if (!hintOpen) return undefined
    const id = setTimeout(() => setHintOpen(false), 7000)
    return () => clearTimeout(id)
  }, [hintOpen, runId])

  /* ---------- HUD: read the engine a few times a second (not every frame) ---------- */
  useEffect(() => {
    if (phase !== 'playing' || paused) return undefined
    const id = setInterval(() => {
      const r = run.current
      if (!r) return
      setHud((prev) => {
        if (prev.score === r.score && prev.combo === r.combo && prev.hearts === r.hearts && prev.row === r.row) return prev
        return { score: r.score, combo: r.combo, hearts: r.hearts, row: r.row, target: targetFor(r) }
      })
    }, HUD_REFRESH_MS)
    return () => clearInterval(id)
  }, [phase, paused, runId])

  /* ---------- pause ---------- */
  const togglePause = useCallback(() => {
    sfx.tap()
    held.current = { left: false, right: false, btnLeft: false, btnRight: false }
    if (run.current) { run.current.input.dir = 0; run.current.input.dragX = null }
    setPaused((value) => !value)
  }, [])

  /* ---------- steering (keyboard, buttons and drags all come here) ---------- */
  const applyDir = useCallback(() => {
    const r = run.current
    if (!r) return
    const h = held.current
    r.input.dir = (h.right || h.btnRight ? 1 : 0) - (h.left || h.btnLeft ? 1 : 0)
  }, [])

  useEffect(() => {
    if (!playing) return undefined
    const keys = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' }
    const onDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      const key = e.key.toLowerCase()
      if (key === 'p' || key === 'escape') {
        if (e.repeat) return
        e.preventDefault() // (Esc in browser full screen also leaves full screen; we pause too)
        togglePause()
        return
      }
      const side = keys[key]
      if (!side) {
        if (key === ' ' || key === 'arrowup' || key === 'arrowdown') e.preventDefault() // no page scroll
        return
      }
      e.preventDefault()
      held.current[side] = true
      applyDir()
    }
    const onUp = (e) => {
      const side = keys[e.key.toLowerCase()]
      if (!side) return
      held.current[side] = false
      applyDir()
    }
    const onBlur = () => { held.current = { left: false, right: false, btnLeft: false, btnRight: false }; applyDir() }
    const onHide = () => { if (document.visibilityState === 'hidden') setPaused(true) }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [playing, applyDir, togglePause])

  // dragging on the sky: the ball follows the finger / mouse sideways (relative to where it started)
  const drag = useRef(null)
  const onPointerDown = (e) => {
    if (!playing || paused || !run.current || e.target.closest('button')) return
    const width = stage.current?.clientWidth || 600
    drag.current = { id: e.pointerId, x: e.clientX, ballX: run.current.x, perUnit: Math.max(36, width / 8.5) }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId || !run.current) return
    run.current.input.dragX = d.ballX + (e.clientX - d.x) / d.perUnit
  }
  const onPointerEnd = (e) => {
    if (!drag.current || drag.current.id !== e.pointerId) return
    drag.current = null
    if (run.current) run.current.input.dragX = null
  }
  const holdButton = (side, on) => (e) => {
    e.preventDefault()
    held.current[side] = on
    applyDir()
  }

  const touch = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches, [])

  /* ---------- screens ---------- */
  const bestFor = (mode) => record.bestByMode?.[mode] ?? 0

  if (phase === 'start') {
    return (
      <div className="bh" lang={language}>
        <header className="bh-header game-fs-header">
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
          <GameFullscreenButton />
        </header>
        {storageError && <p className="notice" role="alert">{text.saveError}</p>}

        <div className="bh-start">
          <div className="bh-preview"><BouncyHopArt large /></div>

          <div className="bh-start-main">
            <section className="bh-modes" aria-labelledby="bh-modes-title">
              <h2 id="bh-modes-title">{text.chooseTarget}</h2>
              <div className="bh-mode-list" role="radiogroup" aria-labelledby="bh-modes-title">
                {MODE_IDS.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={settings.mode === mode}
                    className={`bh-mode${settings.mode === mode ? ' is-on' : ''}`}
                    onClick={() => { sfx.tap(); saveSettings({ ...settings, mode }) }}
                  >
                    <span className="bh-mode-icon" aria-hidden="true">{MODE_ICONS[mode]}</span>
                    <span className="bh-mode-name">{text.modes[mode].name}</span>
                    <span className="bh-mode-short">{bestFor(mode) > 0 ? `🏆 ${n(bestFor(mode))}` : text.modes[mode].short}</span>
                  </button>
                ))}
              </div>
            </section>

            <div className="bh-start-actions">
              <button type="button" className="bh-primary" onClick={() => start(false)}>▶ {text.play}</button>
              <button type="button" className="bh-secondary" onClick={() => start(true)} aria-describedby="bh-practice-info">
                🎯 {text.practice}
              </button>
            </div>
            <p id="bh-practice-info" className="bh-small">{text.practiceInfo}</p>

            <section className="bh-howto" aria-labelledby="bh-howto-title">
              <h2 id="bh-howto-title">{text.howTo}</h2>
              <ul>
                {text.moves.map((move) => (
                  <li key={move.name}>
                    <span className="bh-move-icon" aria-hidden="true">{move.icon}</span>
                    <span>
                      <strong>{move.name}</strong> <span className="bh-keys">{move.keys}</span>
                      <br />{move.what}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="bh-start-row">
              <section className="bh-best" aria-labelledby="bh-best-title">
                <h2 id="bh-best-title">{text.best}</h2>
                {(record.plays ?? 0) > 0 ? (
                  <dl>
                    <div><dt>{text.bestScore}</dt><dd>🏆 {n(record.bestScore ?? 0)}</dd></div>
                    <div><dt>{text.bestCombo}</dt><dd>🔥 {n(record.bestCombo ?? 0)}</dd></div>
                    <div><dt>{text.totalCorrect}</dt><dd>⭐ {n(record.totalCorrect ?? 0)}</dd></div>
                  </dl>
                ) : <p className="bh-small">{text.noBest}</p>}
              </section>

              <section className="bh-settings" aria-labelledby="bh-settings-title">
                <h2 id="bh-settings-title">{text.settings}</h2>
                <button type="button" className="bh-switch" aria-pressed={!muted} onClick={toggleMuted}>
                  <span>{text.sound}</span><span className="bh-switch-state">{muted ? text.off : text.on}</span>
                </button>
                <button type="button" className="bh-switch" aria-pressed={settings.music} onClick={() => saveSettings({ ...settings, music: !settings.music })}>
                  <span>{text.music}</span><span className="bh-switch-state">{settings.music ? text.on : text.off}</span>
                </button>
              </section>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const mult = multiplier(hud.combo)
  const modeNow = roundMode
  const high = Math.max(bestFor(modeNow), practice ? 0 : hud.score)

  return (
    <div className={`bh is-playing${paused ? ' is-paused' : ''}`} lang={language}>
      <header className="bh-header is-compact game-fs-header">
        <h1>{text.title}</h1>
        <p>{practice ? text.practiceBadge : text.modes[modeNow].name}</p>
        <GameFullscreenButton />
      </header>

      <div
        ref={stage}
        className="bh-stage"
        tabIndex={-1}
        role="group"
        aria-label={text.playArea}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <Suspense fallback={<div className="bh-loading" role="status">{text.loading}</div>}>
          <BouncyHopScene
            key={runId}
            runRef={run}
            running={phase === 'playing'}
            paused={paused || phase !== 'playing'}
            onEvents={onEvents}
            formatLabel={formatLabel}
            reducedMotion={reducedMotion}
            noWebglMessage={text.noWebgl}
          />
        </Suspense>

        {/* top bar: stats on the left, the learning target in the middle, controls on the right */}
        <div className="bh-hud">
          <div className="bh-hud-group bh-stats">
            <span className="bh-pill is-score" aria-label={`${text.score} ${hud.score}`}>
              <small>{text.score}</small><b>{n(hud.score)}</b>
            </span>
            <span className="bh-pill is-high" aria-label={`${text.high} ${high}`}>
              <small>{text.high}</small><b>🏆 {n(high)}</b>
            </span>
            <span key={comboPop} className={`bh-pill is-combo${hud.combo >= 5 ? ' is-hot' : ''}${comboPop ? ' is-popped' : ''}`} aria-label={`${text.combo} ${hud.combo}, ×${mult}`}>
              <small>{text.combo}</small><b>🔥 {n(hud.combo)} <em>×{n(mult)}</em></b>
            </span>
          </div>
          <div className="bh-hud-target">
            <TargetBadge target={hud.target} text={text} n={n} />
          </div>
          <div className="bh-hud-group bh-controls">
            {practice
              ? <span className="bh-pill is-practice">🎯 {text.practiceBadge}</span>
              : <span key={bump} className={`bh-pill is-hearts${bump ? ' is-bumped' : ''}`}><Hearts count={hud.hearts} max={3} label={text.hearts(n(hud.hearts))} /></span>}
            <button type="button" className="bh-icon" onClick={toggleMuted} aria-label={muted ? text.soundOn : text.soundOff} title={muted ? text.soundOn : text.soundOff}>
              <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
            </button>
            <button type="button" className="bh-pause" onClick={togglePause} disabled={phase !== 'playing'} title={`${text.pause} (P)`}>
              <span aria-hidden="true">⏸</span> <span className="bh-pause-label">{text.pause}</span>
            </button>
          </div>
        </div>

        {popup && (
          <p key={popup.id} className={`bh-popup${popup.multiplier > 1 ? ' is-multi' : ''}`} aria-hidden="true">
            +{n(popup.points)}{popup.multiplier > 1 && <small> ×{n(popup.multiplier)}</small>}
          </p>
        )}
        {toast && (
          <p key={toast.id} className={`bh-toast is-${toast.tone}`} role="status" aria-live="polite">{toast.message}</p>
        )}

        {hintOpen && phase === 'playing' && !paused && (
          <div className="bh-hint">
            <span>{touch ? text.controlHintTouch : text.controlHint}</span>
            <button type="button" onClick={() => setHintOpen(false)} aria-label={text.dismiss}>✕</button>
          </div>
        )}

        {/* hold-to-steer buttons in the bottom corners (dragging anywhere works too) */}
        {phase === 'playing' && (
          <div className="bh-pad">
            {[['btnLeft', '◀', text.left], ['btnRight', '▶', text.right]].map(([side, icon, label]) => (
              <button
                key={side}
                type="button"
                className="bh-pad-btn"
                aria-label={label}
                onPointerDown={holdButton(side, true)}
                onPointerUp={holdButton(side, false)}
                onPointerLeave={holdButton(side, false)}
                onPointerCancel={holdButton(side, false)}
                onContextMenu={(e) => e.preventDefault()}
              >
                <span aria-hidden="true">{icon}</span>
              </button>
            ))}
          </div>
        )}

        {paused && phase === 'playing' && (
          <div className="bh-overlay" role="dialog" aria-modal="true" aria-labelledby="bh-paused-title">
            <div className="bh-card">
              <h2 id="bh-paused-title">⏸ {text.paused}</h2>
              <div className="bh-card-actions">
                <button type="button" className="bh-primary" autoFocus onClick={togglePause}>▶ {text.resume}</button>
                <button type="button" className="bh-secondary" onClick={() => start(practice, modeNow)}>↻ {text.restart}</button>
                {practice && <button type="button" className="bh-secondary" onClick={finish}>✓ {text.endPractice}</button>}
                <button type="button" className="bh-secondary" onClick={toStartScreen}>⌂ {text.toStart}</button>
              </div>
            </div>
          </div>
        )}

        {phase === 'over' && result && (
          <div className="bh-overlay" role="dialog" aria-modal="true" aria-labelledby="bh-over-title">
            <div className="bh-card is-result">
              <p className="bh-result-badge" aria-hidden="true">{result.practice ? '🎯' : '🌟'}</p>
              <h2 id="bh-over-title">{result.practice ? text.overPractice : result.title}</h2>
              <p className="bh-result-score">{n(result.score)}</p>
              <dl className="bh-result-stats">
                <div><dt>{text.correct}</dt><dd>⭐ {n(result.correct)}</dd></div>
                <div><dt>{text.streak}</dt><dd>🔥 {n(result.bestCombo)}</dd></div>
                <div>
                  <dt>{MODES[result.mode].kind === 'count' ? text.reached : text.vowelsFound}</dt>
                  <dd>{n(result.reached)}</dd>
                </div>
              </dl>
              {result.isRecord && <p className="bh-record">🏆 {text.newRecord}</p>}
              {result.xp > 0 && <p className="bh-xp">{text.xpEarned(n(result.xp))}</p>}
              <p className="bh-small">{text.overText}</p>
              <div className="bh-card-actions">
                <button type="button" className="bh-primary" autoFocus onClick={() => start(result.practice, result.mode)}>▶ {text.playAgain}</button>
                <button type="button" className="bh-secondary" onClick={toStartScreen}>⌂ {text.toStart}</button>
                <ShareGameButton className="bh-secondary" variant="label" title={text.title} url={shareUrl('/games/bouncy-hop')} language={language} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
