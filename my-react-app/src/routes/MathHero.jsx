import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import mathHeroMascot from '../assets/math-hero-mascot-cutout.webp'
import AnimatedAnswerOption from '../components/AnimatedAnswerOption.jsx'
import AnimatedQuizCard from '../components/AnimatedQuizCard.jsx'
import LifeCounter from '../components/LifeCounter.jsx'
import MathHeroMascot from '../components/MathHeroMascot.jsx'
import MilestoneBanner from '../components/MilestoneBanner.jsx'
import useSoundToggle from '../hooks/useSoundToggle.js'
import useQuizFeedback from '../hooks/useQuizFeedback.js'
import { useGameProgress } from '../hooks/useGameProgress.js'
import { FEEDBACK_TIMING } from '../utils/feedbackConfig.js'
import {
  applyMathHeroCorrectAnswer,
  applyMathHeroMiss,
  createInitialMathHeroProgress,
  createMathHeroDeadline,
  createMathHeroGameOverProgress,
  createNextMathHeroProgress,
  MATH_HERO_QUESTIONS_PER_LEVEL,
} from '../utils/mathHero.js'
import { formatDigits, MATH_HERO_TEXT } from '../utils/mathHeroText.js'
import { useLanguage } from '../arcade/preferences.js'
import { GameFullscreenButton } from '../arcade/GameFullscreen.jsx'
import GameThemeToggle from '../shared/components/GameThemeToggle.jsx'
import { useStoredTheme } from '../shared/hooks/useStoredTheme.js'
import { loadRecords, saveRecords, stageForLevel, withLevelReached, withRun } from '../games/math-hero/journey.js'
import Dashboard from '../games/math-hero/ui/Dashboard.jsx'
import Results from '../games/math-hero/ui/Results.jsx'
import '../shared/styles/math-family-theme.css'
import '../games/math-hero/math-hero.css'

// Math Hero's own light/dark choice (light is its usual look), kept on this device.
const THEME_KEY = 'bulbuli.math-hero.theme'
const CHOICE_KEYS = ['1', '2', '3', '4']

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function getRemainingSeconds(deadline) {
  if (!deadline) return 0
  return Math.max(0, Math.ceil((Date.parse(deadline) - Date.now()) / 1000))
}

function Header({ compact, question, gameOver, muted, language, text, theme, onToggleTheme }) {
  return (
    <header className={`mh-header${compact ? ' is-compact' : ''}`}>
      <div className="mh-brand">
        <MathHeroMascot
          src={mathHeroMascot}
          question={question}
          gameOver={gameOver}
          muted={muted}
          language={language}
        />
        <div className="mh-brand-copy">
          {!compact && (
            <p className="mh-eyebrow">
              <span>{text.eyebrow}</span>
              <span className="mh-age">{text.ages}</span>
            </p>
          )}
          <h1>{text.title}</h1>
          {!compact && <p className="mh-tagline">{text.subtitle}</p>}
        </div>
      </div>
      {/* the game's own controls: light/dark, then full screen (inside the arcade only) */}
      <div className="mh-tools">
        <GameThemeToggle
          theme={theme}
          onToggle={onToggleTheme}
          labels={{ toLight: text.themeToLight, toDark: text.themeToDark }}
          className="mh-tool"
        />
        <GameFullscreenButton className="mh-tool" iconSize={20} />
      </div>
    </header>
  )
}

function MathHero({ userId }) {
  // Language and sound are switched from the arcade's game bar, which is shared by every game.
  const { muted } = useSoundToggle()
  const [language] = useLanguage()
  const [theme, toggleTheme] = useStoredTheme(THEME_KEY, 'light')
  const text = MATH_HERO_TEXT[language]
  const n = useCallback((value) => formatDigits(value, language), [language])
  // The level-up banner is created inside a memoised callback, so it reads the language from a ref.
  const languageRef = useRef(language)
  useEffect(() => {
    languageRef.current = language
  }, [language])
  const {
    feedback,
    milestone,
    triggerClick,
    triggerCorrect,
    triggerWrong,
    triggerBonus,
    triggerLevelUp,
    triggerGameOver,
    clearFeedback,
    clearMilestone,
  } = useQuizFeedback()
  const {
    gamification,
    mathHeroProgress: savedProgress,
    saveMathHeroProgress,
    storageError,
  } = useGameProgress(userId)
  const [gameProgress, setGameProgress] = useState(
    () => savedProgress ?? createInitialMathHeroProgress(),
  )
  const [timeRemaining, setTimeRemaining] = useState(
    () => getRemainingSeconds(gameProgress.deadline),
  )
  const [answerRevealVisible, setAnswerRevealVisible] = useState(
    () => Boolean(
      gameProgress.feedback
      && !gameProgress.feedback.ready
      && Date.now() - Date.parse(gameProgress.feedback.createdAt) < FEEDBACK_TIMING.answerTransition,
    ),
  )
  const [celebrating, setCelebrating] = useState(false)
  const [bonusLifeAwarded, setBonusLifeAwarded] = useState(false)
  const [levelUp, setLevelUp] = useState(0)
  // Screens: the dashboard first; the run itself; a finished run shows its results (see `screen`).
  const [view, setView] = useState('home')
  // Dashboard-only extras, kept beside (never inside) the saved run: how far runs have gone, the
  // current streak of right answers, and the question that ended the last run.
  const [records, setRecords] = useState(() => loadRecords(userId))
  const [streak, setStreak] = useState(0)
  const [lastMiss, setLastMiss] = useState(null)
  const [recordsBefore, setRecordsBefore] = useState(null)
  const transitionInProgress = useRef(false)
  const firstSavePending = useRef(!savedProgress)
  const pendingExitReset = useRef(null)
  const answerTransitionTimer = useRef(null)
  const animationTimers = useRef([])
  const previousLevel = useRef(gameProgress.level)
  const recordedRun = useRef(gameProgress.gameOver)
  const headingRef = useRef(null)
  const rootRef = useRef(null)
  const scheduleAnimation = useCallback((callback, delay) => {
    const timerId = window.setTimeout(() => {
      animationTimers.current = animationTimers.current.filter((activeId) => activeId !== timerId)
      callback()
    }, delay)
    animationTimers.current.push(timerId)
    return timerId
  }, [])
  const animateLevelChange = useCallback((nextLevel) => {
    if (nextLevel === previousLevel.current) return
    previousLevel.current = nextLevel
    // the dashboard's records remember the highest level any run reaches
    setRecords((current) => withLevelReached(current, nextLevel))
    setLevelUp(nextLevel)
    scheduleAnimation(() => setLevelUp(0), FEEDBACK_TIMING.fast)

    if (nextLevel > 10 && nextLevel % 10 === 1) {
      const lang = languageRef.current
      triggerLevelUp(MATH_HERO_TEXT[lang].complexity(formatDigits(nextLevel, lang)))
    } else {
      triggerLevelUp()
    }
  }, [scheduleAnimation, triggerLevelUp])

  useEffect(() => {
    if (!firstSavePending.current) return
    firstSavePending.current = false
    saveMathHeroProgress(gameProgress)
  }, [gameProgress, saveMathHeroProgress])

  useEffect(() => {
    if (pendingExitReset.current !== null) {
      window.clearTimeout(pendingExitReset.current)
      pendingExitReset.current = null
    }

    const resetOnExit = () => {
      const initialProgress = createInitialMathHeroProgress()
      previousLevel.current = initialProgress.level
      saveMathHeroProgress(initialProgress)
      setGameProgress(initialProgress)
      setTimeRemaining(getRemainingSeconds(initialProgress.deadline))
      setAnswerRevealVisible(false)
      setCelebrating(false)
      setBonusLifeAwarded(false)
      setLevelUp(0)
      clearFeedback()
      clearMilestone()
      transitionInProgress.current = false
    }
    const handlePageHide = () => resetOnExit()
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      pendingExitReset.current = window.setTimeout(() => {
        pendingExitReset.current = null
        resetOnExit()
      }, 0)
    }
  }, [clearFeedback, clearMilestone, saveMathHeroProgress])

  useEffect(() => () => {
    if (answerTransitionTimer.current !== null) {
      window.clearTimeout(answerTransitionTimer.current)
    }
    animationTimers.current.forEach((timerId) => window.clearTimeout(timerId))
  }, [])

  useEffect(() => {
    if (!gameProgress.deadline) return undefined

    const timerId = window.setInterval(() => {
      setTimeRemaining(getRemainingSeconds(gameProgress.deadline))
    }, 250)
    return () => window.clearInterval(timerId)
  }, [gameProgress.deadline])

  useEffect(() => {
    const feedback = gameProgress.feedback
    if (!feedback) return undefined

    const wait = feedback.ready
      ? 0
      : Math.max(0, FEEDBACK_TIMING.answerTransition - (Date.now() - Date.parse(feedback.createdAt)))
    const timeoutId = window.setTimeout(() => {
      const updated = gameProgress.lives > 0
        ? createNextMathHeroProgress(gameProgress)
        : createMathHeroGameOverProgress(gameProgress)

      if (updated.gameOver) triggerGameOver()
      animateLevelChange(updated.level)
      setGameProgress(updated)
      saveMathHeroProgress(updated)
      setTimeRemaining(getRemainingSeconds(updated.deadline))
      setAnswerRevealVisible(false)
      setCelebrating(false)
      setBonusLifeAwarded(false)
      clearFeedback()
      transitionInProgress.current = false
    }, wait)
    return () => window.clearTimeout(timeoutId)
  }, [animateLevelChange, clearFeedback, gameProgress, saveMathHeroProgress, triggerGameOver])

  // Records: the highest level any run has reached, and each finished run (once).
  const recordsRef = useRef(records)
  useEffect(() => { recordsRef.current = records }, [records])
  useEffect(() => {
    const over = gameProgress.gameOver
    if (!over || over === recordedRun.current) return
    recordedRun.current = over
    const before = recordsRef.current
    setRecordsBefore(before)
    setRecords(withRun(before, over))
  }, [gameProgress.gameOver])
  useEffect(() => { saveRecords(userId, records) }, [records, userId])

  const handleMiss = useCallback((type, target = null) => {
    if (transitionInProgress.current) return
    transitionInProgress.current = true
    triggerWrong(target)
    setStreak(0)
    setLastMiss({ question: gameProgress.question, type })
    const missedProgress = applyMathHeroMiss(gameProgress, type)
    const updated = missedProgress.lives === 0
      ? createMathHeroGameOverProgress(missedProgress)
      : missedProgress

    if (updated.gameOver) triggerGameOver()
    setGameProgress(updated)
    saveMathHeroProgress(updated)
    setTimeRemaining(0)
    setAnswerRevealVisible(Boolean(updated.feedback))
    if (updated.gameOver) transitionInProgress.current = false
  }, [gameProgress, saveMathHeroProgress, triggerGameOver, triggerWrong])

  // The question clock only runs on the play screen: the dashboard is a pause.
  useEffect(() => {
    if (view !== 'play') return
    if (timeRemaining > 0 || !gameProgress.deadline || gameProgress.feedback || gameProgress.gameOver) return
    handleMiss('timeout')
  }, [gameProgress.deadline, gameProgress.feedback, gameProgress.gameOver, handleMiss, timeRemaining, view])

  useEffect(() => {
    if (!celebrating) return undefined
    const timeoutId = window.setTimeout(() => setCelebrating(false), 1400)
    return () => window.clearTimeout(timeoutId)
  }, [celebrating])

  const selectAnswer = (answer) => {
    if (gameProgress.feedback || gameProgress.gameOver || transitionInProgress.current) return
    triggerClick()
    if (getRemainingSeconds(gameProgress.deadline) === 0) {
      setTimeRemaining(0)
      return
    }

    if (answer === gameProgress.question.answer) {
      transitionInProgress.current = true
      triggerCorrect(answer)
      setStreak((count) => count + 1)
      answerTransitionTimer.current = window.setTimeout(() => {
        const { progress: updated, bonusLifeAwarded } = applyMathHeroCorrectAnswer(gameProgress)
        animateLevelChange(updated.level)
        setGameProgress(updated)
        saveMathHeroProgress(updated, 5)
        setTimeRemaining(getRemainingSeconds(updated.deadline))
        setAnswerRevealVisible(false)
        setCelebrating(true)
        setBonusLifeAwarded(bonusLifeAwarded)
        if (bonusLifeAwarded) triggerBonus()
        transitionInProgress.current = false
        answerTransitionTimer.current = null
      }, FEEDBACK_TIMING.answerTransition)
      return
    }

    handleMiss('incorrect', answer)
  }

  const startNewRun = () => {
    if (transitionInProgress.current) return
    transitionInProgress.current = true
    triggerClick()
    const updated = createInitialMathHeroProgress()
    previousLevel.current = updated.level
    setGameProgress(updated)
    saveMathHeroProgress(updated)
    setTimeRemaining(getRemainingSeconds(updated.deadline))
    setAnswerRevealVisible(false)
    setCelebrating(false)
    setBonusLifeAwarded(false)
    setLevelUp(0)
    setStreak(0)
    setLastMiss(null)
    clearFeedback()
    clearMilestone()
    transitionInProgress.current = false
  }

  // Dashboard → play. A finished run starts a new one; otherwise the run carries on, and the
  // question waiting for an answer gets a fresh clock (time on the dashboard doesn't count).
  const playFromDashboard = () => {
    if (gameProgress.gameOver) {
      startNewRun()
    } else {
      triggerClick()
      if (!gameProgress.feedback && gameProgress.deadline) {
        const updated = { ...gameProgress, deadline: createMathHeroDeadline() }
        setGameProgress(updated)
        saveMathHeroProgress(updated)
        setTimeRemaining(getRemainingSeconds(updated.deadline))
      }
    }
    setView('play')
  }

  const pauseToDashboard = () => {
    if (transitionInProgress.current || gameProgress.feedback) return
    triggerClick()
    setView('home')
  }

  // Results → dashboard: the finished run is put away, ready for the next one.
  const resultsToDashboard = () => {
    startNewRun()
    setView('home')
  }

  const {
    level,
    questionNumber,
    question,
    feedback: gameFeedback,
    gameOver,
    lives,
  } = gameProgress
  const screen = view === 'home' ? 'home' : gameOver ? 'results' : 'play'
  const showCorrectAnswer = Boolean(gameFeedback && !gameFeedback.ready && answerRevealVisible)
  const answeredInLevel = questionNumber - 1
  const runStarted = level > 1 || questionNumber > 1 || gameProgress.correctAnswers > 0
  const stage = stageForLevel(level)
  const locked = Boolean(gameFeedback || gameOver) || timeRemaining === 0

  // Keyboard on the play screen: 1–4 pick the answers, in reading order.
  const selectRef = useRef(selectAnswer)
  useEffect(() => { selectRef.current = selectAnswer })
  useEffect(() => {
    if (screen !== 'play') return undefined
    const onKey = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return
      const index = CHOICE_KEYS.indexOf(event.key)
      if (index < 0) return
      const option = gameProgress.question.options[index]
      if (option === undefined) return
      event.preventDefault()
      selectRef.current(option)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, gameProgress.question])

  // New screen: move focus to its heading (keyboard and screen-reader users), keep the top in view.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    const top = rootRef.current?.getBoundingClientRect().top ?? 0
    if (top < 0) rootRef.current?.scrollIntoView({ block: 'start' })
    // the game frame scrolls by itself (game-shell.css): a new screen starts at its top
    rootRef.current?.closest('.game-fs-viewport')?.scrollTo({ top: 0 })
  }, [screen])

  const segments = useMemo(
    () => Array.from({ length: MATH_HERO_QUESTIONS_PER_LEVEL }, (_, i) => (
      i < answeredInLevel ? 'is-done' : i === answeredInLevel ? 'is-now' : ''
    )),
    [answeredInLevel],
  )

  return (
    <div className={`mh is-${screen}`} data-mf-theme={theme} lang={language} ref={rootRef}>
      <Header
        compact={screen !== 'home'}
        question={question}
        gameOver={gameOver}
        muted={muted}
        language={language}
        text={text}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {storageError && <p className="mh-notice" role="alert">{storageError}</p>}

      {screen === 'home' && (
        <Dashboard
          records={records}
          totalXp={gamification.totalXp}
          level={level}
          runStarted={runStarted && !gameOver}
          text={text}
          n={n}
          onPlay={playFromDashboard}
          headingRef={headingRef}
        />
      )}

      {screen === 'results' && (
        <Results
          gameOver={gameOver}
          before={recordsBefore}
          lastMiss={lastMiss}
          text={text}
          n={n}
          onReplay={startNewRun}
          onDashboard={resultsToDashboard}
          headingRef={headingRef}
        />
      )}

      {screen === 'play' && (
        <div className="mh-play">
          <aside className="mh-side" aria-label={text.statsLabel}>
            <div className="mh-level-card" style={{ '--mh-stage': stage.color }}>
              <span className="mh-level-icon" aria-hidden="true">{stage.icon}</span>
              <div>
                <p
                  key={level}
                  className={`mh-level-name${levelUp === level ? ' is-leveling-up' : ''}`}
                >
                  {text.level(n(level))}
                </p>
                <p className="mh-level-topic">{text.stages[stage.id - 1].topic}</p>
              </div>
            </div>
            <div className="mh-stat is-xp" aria-label={text.mathHeroXpLabel(n(gameProgress.totalXp))}>
              <span className="mh-stat-icon" aria-hidden="true">⭐</span>
              <strong key={gameProgress.totalXp} className="mh-count">{n(gameProgress.totalXp)}</strong>
              <span className="mh-stat-label">{text.mathHeroXp}</span>
            </div>
            <LifeCounter
              lives={lives}
              event={gameOver
                ? null
                : milestone?.type === 'bonus' ? milestone : feedback?.type === 'wrong' ? feedback : null}
              className="mh-stat is-lives"
              labels={{ ...text, formatNumber: n }}
            />
            <div className={`mh-stat is-streak${streak >= 3 ? ' is-hot' : ''}`}>
              <span className="mh-stat-icon" aria-hidden="true">🔥</span>
              <strong>{n(streak)}</strong>
              <span className="mh-stat-label">{text.streak}</span>
            </div>
            <div className="mh-stat is-total">
              <span className="mh-stat-icon" aria-hidden="true">🏆</span>
              <strong>{n(gamification.totalXp)}</strong>
              <span className="mh-stat-label">{text.totalXp}</span>
            </div>
            <p className="mh-side-note">{text.bonusRule}</p>
          </aside>

          <AnimatedQuizCard
            className="mh-card"
            feedback={feedback}
            aria-labelledby="mh-question"
          >
            <div className="mh-card-top">
              <h2 id="mh-question" ref={headingRef} tabIndex={-1}>
                {text.question(n(questionNumber), n(MATH_HERO_QUESTIONS_PER_LEVEL))}
              </h2>
              <div
                className={`mh-timer${timeRemaining <= 15 ? ' is-urgent' : ''}`}
                role="timer"
                aria-label={text.timeRemaining(n(formatTime(timeRemaining)))}
              >
                <span aria-hidden="true">⏱</span>
                {n(formatTime(timeRemaining))}
              </div>
              <button
                type="button"
                className="mh-btn is-ghost is-small mh-pause"
                onClick={pauseToDashboard}
                disabled={Boolean(gameFeedback)}
                aria-label={text.pauseLabel}
              >
                <span aria-hidden="true">⏸</span> {text.pause}
              </button>
            </div>

            <div
              className="mh-progress"
              role="progressbar"
              aria-label={text.levelProgressLabel(n(level))}
              aria-valuemin="1"
              aria-valuemax={MATH_HERO_QUESTIONS_PER_LEVEL}
              aria-valuenow={questionNumber}
            >
              {segments.map((state, i) => <span key={i} className={state} />)}
            </div>

            <MilestoneBanner
              event={milestone?.type === 'level-up' ? milestone : null}
              className="mh-banner"
            />

            <p className="mh-problem" aria-live="polite" key={`${level}-${questionNumber}-${question.left}-${question.right}`}>
              <span>{n(question.left)}</span>
              <span className="mh-op">{question.operator === '-' ? '−' : question.operator}</span>
              <span>{n(question.right)}</span>
              <span className="mh-eq">=</span>
              <span className="mh-q">?</span>
            </p>

            <div className="mh-message-slot">
              {celebrating && !gameFeedback && (
                <p className="mh-message is-correct" role="status">
                  {bonusLifeAwarded ? text.greatWithBonus : text.great}
                </p>
              )}
              {gameFeedback && (
                <p className={`mh-message ${gameFeedback.type === 'timeout' ? 'is-timeout' : 'is-incorrect'}`} role="status">
                  {showCorrectAnswer
                    ? `${gameFeedback.type === 'timeout' ? text.timeUp : text.almost} ${text.theAnswerIs(n(question.answer))}`
                    : text.nextReady}
                </p>
              )}
            </div>

            <div className="mh-options" role="group" aria-label={text.chooseAnswer}>
              {question.options.map((option, index) => (
                <AnimatedAnswerOption
                  key={`${option}-${index}`}
                  className={`mh-option${showCorrectAnswer && option === question.answer ? ' is-answer' : ''}`}
                  feedback={feedback}
                  option={option}
                  type="button"
                  disabled={locked}
                  aria-keyshortcuts={CHOICE_KEYS[index]}
                  onClick={() => selectAnswer(option)}
                >
                  <span className="mh-key" aria-hidden="true">{n(index + 1)}</span>
                  {n(option)}
                  {feedback?.target === option && feedback.type === 'correct' && (
                    <span key={feedback.id} className="mh-sparkle" aria-hidden="true">
                      {text.answerXp}
                    </span>
                  )}
                </AnimatedAnswerOption>
              ))}
            </div>

            <div className="mh-card-foot">
              <span>{text.earnXp}</span>
              <span className="mh-keys">{text.keyboardHint}</span>
            </div>
          </AnimatedQuizCard>
        </div>
      )}
    </div>
  )
}

export default MathHero
