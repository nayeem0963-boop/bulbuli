/**
 * Math Master — a 3D mathematics quiz for ages 12+ (/games/math-master).
 *
 *   curriculum/   100 verified questions in 10 levels (no React; tested by curriculum.test.js)
 *   engine.js     rounds, answer locking, scoring, stars, XP and unlocks (tested by engine.test.js)
 *   scene/        the React Three Fiber lab (its own lazy chunk)
 *   ui/           the level map, briefing, HUD, question card and results
 *
 * Saves through useGameProgress under its own id ('math-master'), so Math Hero's run and records are
 * never touched. XP goes into the player's shared total (and their account when signed in).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGameProgress } from '../../hooks/useGameProgress.js'
import { playSound } from '../../utils/sound.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import { getLevel, LEVELS, TIERS } from './curriculum/index.js'
import {
  answer, createRound, currentQuestion, GAME_ID, isCleared, isUnlocked, mergeRecord, next, rankFor, revealHint,
  suggestedLevel, summarize, xpForRound,
} from './engine.js'
import Briefing from './ui/Briefing.jsx'
import Hud from './ui/Hud.jsx'
import LevelMap from './ui/LevelMap.jsx'
import QuestionPanel from './ui/QuestionPanel.jsx'
import Results from './ui/Results.jsx'
import Stage from './ui/Stage.jsx'
import { preloadScene } from './ui/sceneLoader.js'
import { MATH_MASTER_TEXT } from './text.js'
import './math-master.css'
import { GameFullscreenButton } from '../../arcade/GameFullscreen.jsx'
import { Moon, Sun } from 'lucide-react'
import { useStoredTheme } from '../../shared/hooks/useStoredTheme.js'

// Math Master's own light/dark choice (dark is its usual look), kept on this device.
const THEME_KEY = 'bulbuli.math-master.theme'

function ThemeButton({ theme, onToggle, text }) {
  const label = theme === 'light' ? text.themeToDark : text.themeToLight
  const Icon = theme === 'light' ? Moon : Sun
  return (
    <button type="button" className="mm-tool-button" onClick={onToggle} aria-label={label} title={label}>
      <Icon aria-hidden="true" focusable="false" size={20} strokeWidth={2.5} />
    </button>
  )
}

const MAX_STARS = LEVELS.length * 3
const CHOICE_KEYS = ['1', '2', '3', '4']
const LETTER_KEYS = ['a', 'b', 'c', 'd']

function Header({ record, totalXp, compact, language, text, n, theme, onToggleTheme }) {
  const stars = record.totalStars ?? 0
  const cleared = LEVELS.filter((level) => isCleared(level.id, record)).length
  return (
    <header className={`mm-header ${compact ? 'is-compact' : ''}`}>
      <div className="mm-brand">
        <span className="mm-logo" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="48" height="48">
            <path d="M24 4 L42 14 L42 34 L24 44 L6 34 L6 14 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
            <path d="M24 4 L24 24 L42 34 M24 24 L6 34" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55" />
            <text x="24" y="31" textAnchor="middle" fontSize="15" fontWeight="800" fill="currentColor" fontFamily="var(--font-display)">∑</text>
          </svg>
        </span>
        <div>
          {!compact && <p className="mm-eyebrow">{text.eyebrow}</p>}
          <h1>{text.title}</h1>
          {!compact && <p className="mm-tagline">{text.tagline}</p>}
        </div>
      </div>
      {!compact && (
        <dl className="mm-stats">
          <div><dt>{text.rank}</dt><dd>{TIERS[rankFor(record)][language]}</dd></div>
          <div><dt>{text.stars}</dt><dd>★ {text.starsOf(n(stars), n(MAX_STARS))}</dd></div>
          <div><dt>{text.cleared}</dt><dd>{n(cleared)} / {n(LEVELS.length)}</dd></div>
          <div><dt>{text.totalXp}</dt><dd>{n(totalXp)}</dd></div>
        </dl>
      )}
      {/* the game's own controls: light/dark, then full screen (inside the arcade only) */}
      <div className="mm-header-tools">
        <ThemeButton theme={theme} onToggle={onToggleTheme} text={text} />
        <GameFullscreenButton className="mm-tool-button" iconSize={20} />
      </div>
    </header>
  )
}

export default function MathMaster({ playerId, language }) {
  const [theme, toggleTheme] = useStoredTheme(THEME_KEY, 'dark')
  const text = MATH_MASTER_TEXT[language] ?? MATH_MASTER_TEXT.en
  const n = useCallback((value) => formatDigits(value, language), [language])
  const { games, saveGameResult, totalXp, storageError } = useGameProgress(playerId)
  const record = useMemo(() => games[GAME_ID] ?? {}, [games])
  // Handlers read the latest saved record through a ref, so they never act on a stale copy.
  const recordRef = useRef(record)
  useEffect(() => { recordRef.current = record }, [record])

  const [view, setView] = useState('map') // map → brief → play → results
  const [levelId, setLevelId] = useState(() => suggestedLevel(record))
  const [mode, setMode] = useState(() => record.levels?.[record.lastLevel]?.lastMode ?? 'practice')
  const [round, setRound] = useState(null)
  const [lastPoints, setLastPoints] = useState(0)
  const [feedback, setFeedback] = useState(null) // { kind, key } drives the 3D reaction
  const [timeLeft, setTimeLeft] = useState(null)
  const [result, setResult] = useState(null)

  const level = getLevel(levelId) ?? LEVELS[0]
  const roundRef = useRef(null)
  const timeLeftRef = useRef(null)
  const finishedRef = useRef(null)
  const headingRef = useRef(null)
  const rootRef = useRef(null)

  useEffect(() => { preloadScene() }, [])

  // New screen (or new question): bring it into view and move focus to its heading for keyboard and
  // screen-reader users. Typed-answer questions focus their input box instead (QuestionPanel).
  const question = round ? currentQuestion(round) : null
  const focusKey = view === 'play' ? `play-${round?.index}` : view
  useEffect(() => {
    if (view === 'play' && question?.format === 'input') return
    headingRef.current?.focus({ preventScroll: true })
    const top = rootRef.current?.getBoundingClientRect().top ?? 0
    if (top < 0) rootRef.current?.scrollIntoView({ block: 'start' })
  }, [focusKey, view, question?.format])

  const setRoundState = useCallback((next) => {
    roundRef.current = next
    setRound(next)
  }, [])

  const resetTimer = useCallback((limit) => {
    timeLeftRef.current = limit
    setTimeLeft(limit)
  }, [])

  const openLevel = useCallback((id) => {
    if (!isUnlocked(id, recordRef.current)) return
    playSound('click')
    setLevelId(id)
    setView('brief')
  }, [])

  const start = useCallback((id = levelId) => {
    const chosen = getLevel(id)
    if (!chosen || !isUnlocked(id, recordRef.current)) return
    playSound('click')
    const fresh = createRound(chosen, mode)
    finishedRef.current = null
    setLevelId(id)
    setRoundState(fresh)
    setFeedback(null)
    setResult(null)
    resetTimer(fresh.timeLimit)
    setView('play')
  }, [levelId, mode, resetTimer, setRoundState])

  const finish = useCallback((done) => {
    if (finishedRef.current === done.startedAt) return // never save (or pay XP for) a round twice
    finishedRef.current = done.startedAt
    const summary = summarize(done)
    const previous = recordRef.current
    const before = previous.levels?.[done.levelId] ?? {}
    const xp = xpForRound({ previousBestStars: before.bestStars ?? 0, stars: summary.stars, correct: summary.correct, mode: done.mode })
    const unlockedNext = done.levelId < LEVELS.length && summary.stars >= 1 && !isUnlocked(done.levelId + 1, previous)
    saveGameResult(GAME_ID, (saved) => mergeRecord(saved, summary), xp)
    playSound(summary.stars >= 1 ? 'complete' : 'click')
    setResult({
      summary,
      xp,
      unlockedNext,
      badge: summary.stars >= 1 && !(before.bestStars >= 1),
      newBest: (before.bestScore ?? 0) > 0 && summary.score > before.bestScore,
      questions: done.questions,
      responses: done.responses,
    })
    setView('results')
  }, [saveGameResult])

  const submit = useCallback((response) => {
    const { round: answered, outcome } = answer(roundRef.current, response, { timeLeft: timeLeftRef.current })
    if (outcome === 'ignored') return
    setRoundState(answered)
    setLastPoints(outcome.points)
    setFeedback({ kind: outcome.correct ? 'correct' : 'wrong', key: answered.responses.length })
    playSound(outcome.correct ? 'correct' : 'wrong')
  }, [setRoundState])

  const advance = useCallback(() => {
    const current = roundRef.current
    const moved = next(current)
    if (moved === current) return
    playSound('click')
    setRoundState(moved)
    setFeedback(null)
    if (moved.phase === 'done') finish(moved)
    else resetTimer(moved.timeLimit)
  }, [finish, resetTimer, setRoundState])

  const showHint = useCallback(() => {
    const current = roundRef.current
    const hinted = revealHint(current)
    if (hinted !== current) {
      playSound('click')
      setRoundState(hinted)
    }
  }, [setRoundState])

  const quit = useCallback(() => {
    playSound('click')
    roundRef.current = null
    setRound(null)
    setFeedback(null)
    setView('map')
  }, [])

  // Challenge countdown. It only runs while the question is open and the tab is visible: a gap
  // longer than a second between ticks means the page was hidden or asleep, and isn't counted.
  const timerKey = round && round.mode === 'challenge' && round.phase === 'asking' && view === 'play'
    ? `${round.startedAt}-${round.index}` : null
  const submitRef = useRef(submit)
  useEffect(() => { submitRef.current = submit }, [submit])
  useEffect(() => {
    if (!timerKey) return undefined
    let last = performance.now()
    let remaining = (timeLeftRef.current ?? 0) * 1000
    const id = setInterval(() => {
      const now = performance.now()
      const gap = now - last
      last = now
      if (document.visibilityState === 'hidden') return
      remaining -= Math.min(gap, 1000)
      const seconds = Math.max(0, Math.ceil(remaining / 1000))
      timeLeftRef.current = remaining / 1000
      setTimeLeft(seconds)
      if (remaining <= 0) {
        clearInterval(id)
        timeLeftRef.current = 0
        submitRef.current({ timeout: true })
      }
    }, 200)
    return () => clearInterval(id)
  }, [timerKey])

  // Keyboard: 1–4 or A–D answer, H opens the hint, Enter continues (when focus isn't on a button).
  useEffect(() => {
    if (view !== 'play') return undefined
    const onKey = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return
      const current = roundRef.current
      const q = currentQuestion(current)
      if (!q) return
      const key = event.key.toLowerCase()
      if (current.phase === 'asking') {
        if (key === 'h') { event.preventDefault(); showHint(); return }
        if (q.format === 'input') return
        const index = CHOICE_KEYS.includes(key) ? CHOICE_KEYS.indexOf(key) : LETTER_KEYS.indexOf(key)
        if (index >= 0 && q.choices[index] !== undefined) {
          event.preventDefault()
          submit({ choice: q.choices[index] })
        }
      } else if (current.phase === 'answered' && key === 'enter' && target?.tagName !== 'BUTTON') {
        event.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, submit, advance, showHint])

  const onPick = useCallback((label) => submit({ choice: label }), [submit])
  const lastResponse = round?.responses[round.responses.length - 1]
  const reveal = useMemo(() => (
    question?.format === 'pick' && round?.phase === 'answered'
      ? { chosen: lastResponse?.response ?? null, answer: question.answer }
      : null
  ), [question, round?.phase, lastResponse])

  const inArena = view === 'brief' || view === 'play'

  return (
    <div className="mm" data-mm-theme={theme} lang={language} ref={rootRef}>
      <Header
        record={record}
        totalXp={totalXp}
        compact={view === 'play'}
        language={language}
        text={text}
        n={n}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      {storageError && <p className="mm-notice" role="alert">{storageError}</p>}

      {view === 'map' && (
        <LevelMap record={record} suggested={suggestedLevel(record)} language={language} text={text} n={n} onOpen={openLevel} headingRef={headingRef} />
      )}

      {view === 'play' && round && (
        <Hud level={level} round={round} timeLeft={timeLeft} language={language} text={text} n={n} onQuit={quit} />
      )}

      {inArena && (
        <div className="mm-arena">
          <Stage
            level={level}
            question={view === 'play' ? question : null}
            figureKey={view === 'play' && question ? question.id : `brief-${level.id}`}
            feedback={view === 'play' ? feedback : null}
            pickable={view === 'play' && question?.format === 'pick' && round?.phase === 'asking'}
            onPick={onPick}
            reveal={reveal}
            text={text}
          />
          {view === 'brief' ? (
            <Briefing
              level={level}
              record={record}
              mode={mode}
              onMode={setMode}
              onStart={() => start(level.id)}
              onBack={() => { playSound('click'); setView('map') }}
              language={language}
              text={text}
              n={n}
              headingRef={headingRef}
            />
          ) : question && (
            <QuestionPanel
              round={round}
              question={question}
              outcomePoints={lastPoints}
              text={text}
              n={n}
              onAnswer={submit}
              onHint={showHint}
              onContinue={advance}
              headingRef={headingRef}
            />
          )}
        </div>
      )}

      {view === 'results' && result && (
        <Results
          level={level}
          result={result}
          language={language}
          text={text}
          n={n}
          onRetry={() => start(level.id)}
          onNext={() => openLevel(level.id + 1)}
          onLevels={() => { playSound('click'); setView('map') }}
          headingRef={headingRef}
        />
      )}
    </div>
  )
}
