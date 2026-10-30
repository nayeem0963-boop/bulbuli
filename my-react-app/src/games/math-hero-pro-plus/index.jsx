/**
 * Math Hero Pro+ — maths missions for ages 10–12 (/games/math-hero-pro-plus), in the Play & Learn zone.
 * The bridge between Math Hero Pro (6–11) and Math Master (12+): five levels of ten questions each —
 * order of operations, decimals & percentages, ratios & rates, pre-algebra, geometry & measurement.
 *
 *   questions.js   question makers for each level (no React)
 *   engine.js      levels, rounds, stars, XP, unlocks and the saved record (tested by engine.test.js)
 *   text.js        English and Bangla words
 *   ui/            header, level select, question card, completion screen, pictures, confetti
 *   styles/        Tailwind source + the GENERATED, scoped math-hero-pro-plus.css (npm run build:math-hero-pro-plus-css)
 *
 * Saves through useGameProgress under its own id ('math-hero-pro-plus'), so Math Hero Pro and Math Master records
 * are never touched. XP goes into the player's shared total (and their account when signed in).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGameProgress } from '../../hooks/useGameProgress.js'
import { playSound } from '../../utils/sound.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import {
  answer, bestStars, createRound, currentQuestion, GAME_ID, getLevel, isUnlocked, LEVELS, mergeRecord, next,
  suggestedLevel, summarize, xpForRound,
} from './engine.js'
import { MATH_HERO_PRO_PLUS_TEXT } from './text.js'
import Completion from './ui/Completion.jsx'
import Header from './ui/Header.jsx'
import LevelSelect from './ui/LevelSelect.jsx'
import QuestionCard from './ui/QuestionCard.jsx'
import { useStoredTheme } from '../../shared/hooks/useStoredTheme.js'
// The family's shared light/dark tokens (--mf-*), read by the Tailwind classes below.
import '../../shared/styles/math-family-theme.css'
// Precompiled Tailwind, scoped to #math-hero-pro-plus-root so it can't leak into (or be restyled by) the site.
import './styles/math-hero-pro-plus.css'

export const ROOT_ID = 'math-hero-pro-plus-root'
const CHOICE_KEYS = ['1', '2', '3', '4']
const LETTER_KEYS = ['a', 'b', 'c', 'd']
// Math Hero Pro+'s own light/dark choice (dark is its usual look), kept on this device.
const THEME_KEY = 'bulbuli.math-hero-pro-plus.theme'

export default function MathHeroProPlus({ playerId, language }) {
  const [theme, toggleTheme] = useStoredTheme(THEME_KEY, 'dark')
  const text = MATH_HERO_PRO_PLUS_TEXT[language] ?? MATH_HERO_PRO_PLUS_TEXT.en
  const n = useCallback((value) => formatDigits(value, language), [language])
  const { games, saveGameResult, totalXp, storageError } = useGameProgress(playerId)
  const record = useMemo(() => games[GAME_ID] ?? {}, [games])
  // Handlers read the latest saved record through a ref, so they never act on a stale copy.
  const recordRef = useRef(record)
  useEffect(() => { recordRef.current = record }, [record])

  const [view, setView] = useState('levels') // levels → play → results
  const [levelId, setLevelId] = useState(1)
  const [round, setRound] = useState(null)
  const [result, setResult] = useState(null)
  const roundRef = useRef(null)
  const savedRef = useRef(null)
  const headingRef = useRef(null)
  const rootRef = useRef(null)

  const level = getLevel(levelId) ?? LEVELS[0]
  const question = round ? currentQuestion(round) : null

  // New screen or new question: move focus to its heading (keyboard and screen-reader users) and
  // bring the top of the game into view if it scrolled away.
  const focusKey = view === 'play' ? `play-${round?.seed}-${round?.index}` : view
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    const top = rootRef.current?.getBoundingClientRect().top ?? 0
    if (top < 0) rootRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
    // the game frame scrolls by itself (game-shell.css): a new screen starts at its top
    rootRef.current?.closest('.game-fs-viewport')?.scrollTo({ top: 0 })
  }, [focusKey])

  const setRoundState = useCallback((value) => {
    roundRef.current = value
    setRound(value)
  }, [])

  const start = useCallback((id) => {
    if (!getLevel(id) || !isUnlocked(id, recordRef.current)) return
    playSound('click')
    savedRef.current = null
    setLevelId(id)
    setRoundState(createRound(id))
    setResult(null)
    setView('play')
  }, [setRoundState])

  const finish = useCallback((done) => {
    if (savedRef.current === done.seed) return // never save (or pay XP for) the same round twice
    savedRef.current = done.seed
    const summary = summarize(done)
    const previous = recordRef.current
    const chosen = getLevel(done.levelId)
    const before = bestStars(previous, done.levelId)
    const xp = xpForRound({ maxXp: chosen.maxXp, previousBestStars: before, stars: summary.stars, correct: summary.correct })
    const unlockedNext = summary.stars >= 1 && done.levelId < LEVELS.length && !isUnlocked(done.levelId + 1, previous)
    saveGameResult(GAME_ID, (saved) => mergeRecord(saved, summary), xp)
    playSound(summary.stars >= 1 ? 'complete' : 'click')
    setResult({
      summary,
      xp,
      unlockedNext,
      nextOpen: done.levelId < LEVELS.length && (summary.stars >= 1 || isUnlocked(done.levelId + 1, previous)),
      badgeNew: summary.stars >= 1 && !(previous.badges ?? []).includes(chosen.badge.id),
      badgeOwned: summary.stars >= 1 || (previous.badges ?? []).includes(chosen.badge.id),
      missed: done.questions.filter((q, i) => !done.responses[i]?.correct),
      review: done.questions.map((question, i) => ({ question, response: done.responses[i] })),
    })
    setView('results')
  }, [saveGameResult])

  const submit = useCallback((choice) => {
    const { round: answered, outcome } = answer(roundRef.current, choice)
    if (outcome === 'ignored') return
    setRoundState(answered)
    playSound(outcome.correct ? 'correct' : 'wrong')
  }, [setRoundState])

  const advance = useCallback(() => {
    const current = roundRef.current
    const moved = next(current)
    if (moved === current) return
    setRoundState(moved)
    if (moved.phase === 'done') finish(moved)
    else playSound('click')
  }, [finish, setRoundState])

  const backToLevels = useCallback(() => {
    playSound('click')
    setRoundState(null)
    setView('levels')
  }, [setRoundState])

  // Keyboard: 1–4 or A–D answer. (Enter / Space on the focused "Next" button carries on.)
  useEffect(() => {
    if (view !== 'play') return undefined
    const onKey = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return
      const current = roundRef.current
      const q = currentQuestion(current)
      if (!q || current.phase !== 'asking') return
      const key = event.key.toLowerCase()
      const index = CHOICE_KEYS.includes(key) ? CHOICE_KEYS.indexOf(key) : LETTER_KEYS.indexOf(key)
      if (index >= 0 && q.choices[index] !== undefined) {
        event.preventDefault()
        submit(q.choices[index])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, submit])

  return (
    <div id={ROOT_ID} ref={rootRef} lang={language} data-mf-theme={theme} className={`mhpp-root is-${view}`}>
      <div className="mhpp-shell @container relative isolate flex min-h-full w-full flex-1 flex-col overflow-clip rounded-[28px] border-[3px] border-mf-edge bg-mf-bg [background-image:var(--mf-page)] px-4 py-4 font-copy text-mf-text shadow-[0_7px_0_var(--mf-edge)] @xl:px-7 @xl:py-6">
        {/* deep-space backdrop: twinkling stars and two soft nebula glows */}
        <div className="mhpp-starfield pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-32 -left-24 -z-10 size-96 rounded-full bg-sky-500/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-24 -bottom-32 -z-10 size-96 rounded-full bg-violet-500/15 blur-3xl" aria-hidden="true" />

        <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col">
          <Header record={record} totalXp={totalXp} compact={view !== 'levels'} text={text} n={n} theme={theme} onToggleTheme={toggleTheme} />
          {storageError && (
            <p role="alert" className="m-0 mb-4 rounded-xl border border-mf-bad/50 bg-mf-bad-bg px-4 py-2 text-sm text-mf-bad-ink">
              {text.saveError}
            </p>
          )}

          {view === 'levels' && (
            <LevelSelect
              record={record}
              suggested={suggestedLevel(record)}
              language={language}
              text={text}
              n={n}
              onOpen={start}
              headingRef={headingRef}
            />
          )}

          {/* play and results: the card is centred in whatever height the frame has (normal or full screen) */}
          {view === 'play' && round && question && (
            <div className="flex w-full flex-1 flex-col">
              <QuestionCard
                round={round}
                question={question}
                level={level}
                language={language}
                text={text}
                n={n}
                onAnswer={submit}
                onContinue={advance}
                onQuit={backToLevels}
                headingRef={headingRef}
              />
            </div>
          )}

          {view === 'results' && result && (
            <div className="flex w-full flex-1 flex-col">
              <Completion
                level={level}
                result={result}
                language={language}
                text={text}
                n={n}
                onNext={() => start(level.id + 1)}
                onRetry={() => start(level.id)}
                onLevels={backToLevels}
                headingRef={headingRef}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
