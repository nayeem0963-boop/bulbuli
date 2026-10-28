/**
 * Shape Hunt 3D — Bulbuli names a 3D shape; the child taps it.
 *
 * Rules live in engine.js (tested), the 3D view in ShapeScene.jsx.
 * The 3D view (three.js + R3F + drei, ~1 MB) is its own chunk: the level picker shows at once, the
 * scene downloads while the child chooses, and <GameViewport> covers any wait that's left.
 * Saves like every arcade game: stars + XP through useGameProgress.
 * Signed-in players also get one Supabase star per correct answer
 * (useScoreSync → profiles.total_score), batched so it's one request per few taps.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useGameProgress } from '../../hooks/useGameProgress.js'
import { useScoreSync } from '../../hooks/useScoreSync.js'
import { isMuted, playSound } from '../../utils/sound.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import {
  chooseShape, CORRECT_DELAY, createGame, createRng, getLevel, getShape, LEVELS, nextRound, starsFor, xpFor,
} from './engine.js'
import GameViewport from '../../components/game/GameViewport.jsx'
import { lazyWithPreload } from '../../shared/lib/lazyWithPreload.js'
import { SHAPE_HUNT_TEXT } from './text.js'
import './shape-hunt.css'
import { GameFullscreenButton } from '../../arcade/GameFullscreen.jsx'

// three.js and the scene load only when this game opens (and start downloading on the level picker).
const ShapeScene = lazyWithPreload(() => import('./ShapeScene.jsx'))

const GAME_ID = 'shape-hunt'

/** Says the words out loud when the browser has a voice for that language. Silent otherwise. */
function speak(words, language) {
  if (isMuted() || typeof window === 'undefined' || !window.speechSynthesis) return
  const lang = language === 'bn' ? 'bn' : 'en'
  const voice = window.speechSynthesis.getVoices().find((candidate) => candidate.lang?.toLowerCase().startsWith(lang))
  if (!voice && lang === 'bn') return
  const utterance = new SpeechSynthesisUtterance(words)
  utterance.lang = voice?.lang ?? 'en-US'
  if (voice) utterance.voice = voice
  utterance.rate = 0.9
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

function Stars({ count, label, size = 'md' }) {
  return (
    <span className={`sh-stars is-${size}`} role="img" aria-label={label}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= count ? 'is-on' : ''} aria-hidden="true">★</span>
      ))}
    </span>
  )
}

export default function ShapeHunt({ playerId, language }) {
  const text = SHAPE_HUNT_TEXT[language] ?? SHAPE_HUNT_TEXT.en
  const n = useCallback((value) => formatDigits(value, language), [language])
  const shapeName = useCallback((id) => getShape(id)?.name[language] ?? id, [language])

  const { games, saveGameResult, storageError } = useGameProgress(playerId)
  const { addPoints } = useScoreSync({ userId: playerId })
  const record = games[GAME_ID] ?? {}

  const [levelId, setLevelId] = useState(() => record.levelId ?? 1)
  const level = getLevel(levelId)
  const [game, setGame] = useState(null)
  const [result, setResult] = useState(null) // { stars, xp, mistakes } when a game ends
  const [message, setMessage] = useState('')  // spoken/announced feedback
  const [focusedId, setFocusedId] = useState(null)

  const rng = useRef(createRng())
  const gameRef = useRef(game)
  gameRef.current = game
  const advanceTimer = useRef(null)
  useEffect(() => () => clearTimeout(advanceTimer.current), [])
  // Warm the 3D chunk while the level picker is up, so Start is (almost) instant.
  useEffect(() => { ShapeScene.preload().catch(() => {}) }, [])

  const start = useCallback((id = levelId) => {
    playSound('click')
    clearTimeout(advanceTimer.current)
    setLevelId(id)
    setResult(null)
    setMessage('')
    setGame(createGame(getLevel(id), rng.current))
  }, [levelId])

  // Announce each new round's shape.
  const target = game && !game.finished ? game.round.target : null
  const roundNumber = game?.roundNumber
  useEffect(() => {
    if (!target) return
    const words = text.find(shapeName(target))
    setMessage(words)
    speak(words, language)
  }, [target, roundNumber, text, shapeName, language])

  const repeatPrompt = useCallback(() => {
    const current = gameRef.current
    if (!current || current.finished) return
    speak(text.find(shapeName(current.round.target)), language)
  }, [text, shapeName, language])

  const finish = useCallback((finished) => {
    const stars = starsFor(finished.mistakes, finished.rounds)
    const xp = xpFor(finished.rounds, stars)
    saveGameResult(GAME_ID, (previous) => ({
      ...previous,
      levelId: finished.levelId,
      plays: (previous.plays ?? 0) + 1,
      bestStars: {
        ...previous.bestStars,
        [finished.levelId]: Math.max(previous.bestStars?.[finished.levelId] ?? 0, stars),
      },
    }), xp)
    playSound('complete')
    setResult({ stars, xp, mistakes: finished.mistakes })
  }, [saveGameResult])

  const pick = useCallback((optionId) => {
    const current = gameRef.current
    if (!current) return
    const { game: next, result: outcome, shape } = chooseShape(current, optionId)
    if (outcome === 'ignored') return
    gameRef.current = next
    setGame(next)

    if (outcome === 'wrong') {
      playSound('wrong')
      const words = text.thatIs(shapeName(shape))
      setMessage(words)
      speak(words, language)
      return
    }

    playSound('correct')
    addPoints(1)
    const words = text.yes(shapeName(shape))
    setMessage(words)
    speak(words, language)
    advanceTimer.current = setTimeout(() => {
      const advanced = nextRound(gameRef.current, getLevel(gameRef.current.levelId), rng.current)
      gameRef.current = advanced
      setGame(advanced)
      if (advanced.finished) finish(advanced)
    }, CORRECT_DELAY)
  }, [addPoints, finish, language, shapeName, text])

  /* ---------- Level picker ---------- */
  if (!game) {
    return (
      <div className="sh" lang={language}>
        <header className="sh-header game-fs-header">
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
          <GameFullscreenButton />
        </header>
        {storageError && <p className="notice" role="alert">{storageError}</p>}

        <section className="sh-setup" aria-labelledby="sh-level-heading">
          <h2 id="sh-level-heading">{text.pickLevel}</h2>
          <div className="sh-choices">
            {LEVELS.map((option) => {
              const best = record.bestStars?.[option.id] ?? 0
              return (
                <button
                  key={option.id}
                  type="button"
                  className="sh-choice"
                  aria-pressed={option.id === levelId}
                  onClick={() => { playSound('click'); setLevelId(option.id) }}
                >
                  <span className="sh-choice-label">{text.levelName(n(option.id))}</span>
                  <span className="sh-choice-hint">{text.levelHint[option.id]}</span>
                  <Stars count={best} size="sm" label={text.bestStars(n(best))} />
                </button>
              )
            })}
          </div>
        </section>

        <button type="button" className="sh-primary sh-start" onClick={() => start()}>
          {text.start}
        </button>
      </div>
    )
  }

  /* ---------- Finished ---------- */
  if (game.finished && result) {
    const hasNext = LEVELS.some((option) => option.id === level.id + 1)
    return (
      <div className="sh" lang={language}>
        <section className="sh-result" aria-labelledby="sh-won">
          <h1 id="sh-won">{text.wonTitle}</h1>
          <Stars count={result.stars} size="lg" label={text.starsLabel(n(result.stars))} />
          <p>{text.wonText(n(result.mistakes))}</p>
          <p className="sh-xp">{text.xpEarned(n(result.xp))}</p>
          <div className="sh-actions">
            {hasNext && result.stars >= 2 && (
              <button type="button" className="sh-primary" onClick={() => start(level.id + 1)}>{text.nextLevel}</button>
            )}
            <button type="button" className="sh-secondary" onClick={() => start(level.id)}>{text.playAgain}</button>
            <button type="button" className="sh-secondary" onClick={() => { playSound('click'); setGame(null) }}>
              {text.changeLevel}
            </button>
            <GameFullscreenButton />
          </div>
        </section>
      </div>
    )
  }

  /* ---------- Playing ---------- */
  const { round } = game
  const statusOf = (id) => {
    const option = round.options.find((candidate) => candidate.id === id)
    if (round.solved) return option?.shape === round.target ? 'correct' : 'faded'
    return round.wrong.includes(id) ? 'wrong' : 'idle'
  }
  const labelOf = (id) => {
    const status = statusOf(id)
    if (status !== 'wrong' && status !== 'correct') return null
    return shapeName(round.options.find((candidate) => candidate.id === id).shape)
  }

  return (
    <div className="sh is-playing" lang={language}>
      <header className="sh-header is-compact game-fs-header">
        <h1>{text.title}</h1>
        <p>{text.levelName(n(level.id))} · {text.roundOf(n(game.roundNumber), n(game.rounds))}</p>
        <GameFullscreenButton />
      </header>

      <div className="sh-prompt">
        <p className={`sh-prompt-text ${round.solved ? 'is-solved' : ''}`} aria-live="polite">{message}</p>
        <button type="button" className="sh-secondary sh-hear" onClick={repeatPrompt} aria-label={text.hear}>
          🔊
        </button>
      </div>

      <GameViewport label={text.loading} frameClassName="sh-canvas">
        <ShapeScene
          options={round.options}
          statusOf={statusOf}
          labelOf={labelOf}
          badgeOf={(index) => n(index + 1)}
          focusedId={focusedId}
          onPick={pick}
          onBirdTap={repeatPrompt}
          noWebglMessage={text.noWebgl}
          loadingLabel={text.loading}
        />
      </GameViewport>
      <p className="sh-tip">{text.birdTip}</p>

      {/* Keyboard / switch access: the same choices as buttons, numbered in reading order.
          Focusing a button highlights its shape in 3D. */}
      <div className="sh-keys" role="group" aria-label={text.keyboardHint}>
        <span className="sh-keys-hint" aria-hidden="true">{text.keyboardHint}</span>
        {round.options.map((option, index) => {
          const status = statusOf(option.id)
          return (
            <button
              key={option.id}
              type="button"
              className="sh-key"
              aria-disabled={status !== 'idle'}
              onFocus={() => setFocusedId(option.id)}
              onBlur={() => setFocusedId(null)}
              onClick={() => pick(option.id)}
            >
              {text.shapeButton(n(index + 1))}
            </button>
          )
        })}
      </div>
    </div>
  )
}
