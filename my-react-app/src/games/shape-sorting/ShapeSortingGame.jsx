/**
 * Shape Sorting Factory — shapes roll down a 3D conveyor belt; the child drags
 * each one into the matching bin before it falls off the end.
 *
 * Rules live in engine.js (tested), words in text.js, the 3D factory in
 * SortingCanvas.jsx (lazy-loaded behind a <Suspense> loader, so the level picker
 * appears at once while three.js downloads).
 *
 * Saving, like the other arcade games:
 *   • XP + best stars per level → useTutorialProgress (home-page XP total).
 *   • Stars earned for the level → useScoreSync (signed-in players' profiles.total_score),
 *     flushed as soon as the level is complete.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTutorialProgress } from '../../hooks/useTutorialProgress.js'
import { useScoreSync } from '../../hooks/useScoreSync.js'
import { playSound } from '../../utils/sound.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import {
  CORRECT_DELAY, createGame, createRng, dropItem, getColor, getLevel, getShape, LEVELS, missItem, nextItem,
  starsFor, xpFor,
} from './engine.js'
import { speak, stopSpeaking } from './speech.js'
import { SHAPE_SORTING_TEXT } from './text.js'
import './ShapeSortingGame.css'

const loadCanvas = () => import('./SortingCanvas.jsx')
const SortingCanvas = lazy(loadCanvas)

const GAME_ID = 'shape-sorting'
const SHAPE_BIN_COLOR = '#7f95b8' // neutral, so on shape levels colour is never a clue

function Stars({ count, label, size = 'md' }) {
  return (
    <span className={`ssf-stars is-${size}`} role="img" aria-label={label}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= count ? 'is-on' : ''} aria-hidden="true">★</span>
      ))}
    </span>
  )
}

function StageLoader({ label }) {
  return (
    <div className="ssf-stage-loading" role="status">
      <span className="ssf-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export default function ShapeSortingGame({ playerId, language }) {
  const text = SHAPE_SORTING_TEXT[language] ?? SHAPE_SORTING_TEXT.en
  const n = useCallback((value) => formatDigits(value, language), [language])
  const nameOf = useCallback(
    (kind, id) => (kind === 'color' ? getColor(id) : getShape(id))?.name[language] ?? id,
    [language],
  )
  const itemName = useCallback(
    (item, sortBy) => text.itemName(nameOf('shape', item.shape), nameOf('color', item.color), sortBy),
    [text, nameOf],
  )

  const { games, saveGameResult, storageError } = useTutorialProgress(playerId)
  const { addPoints, flush } = useScoreSync({ userId: playerId })
  const record = games[GAME_ID] ?? {}

  const [levelId, setLevelId] = useState(() => record.levelId ?? 1)
  const level = getLevel(levelId)
  const [game, setGame] = useState(null)
  const [result, setResult] = useState(null) // { stars, xp, mistakes, points } when a level ends
  const [message, setMessage] = useState('')
  const [paused, setPaused] = useState(false)

  const rng = useRef(createRng())
  const gameRef = useRef(game)
  gameRef.current = game
  const advanceTimer = useRef(null)
  const commandRef = useRef(null) // { dropInto(binId) } from the 3D scene, for the keyboard buttons

  useEffect(() => () => {
    clearTimeout(advanceTimer.current)
    stopSpeaking()
  }, [])

  // Fetch the 3D code while the child is still picking a level.
  useEffect(() => {
    loadCanvas().catch(() => {})
  }, [])

  const say = useCallback((words, options) => {
    setMessage(words)
    speak(words, language, options)
  }, [language])

  const start = useCallback((id = levelId) => {
    playSound('click')
    clearTimeout(advanceTimer.current)
    const next = createGame(getLevel(id), rng.current)
    gameRef.current = next
    setLevelId(id)
    setResult(null)
    setMessage('')
    setPaused(false)
    setGame(next)
  }, [levelId])

  // Announce each new item as it rolls out (queued after any "Yes!" still being spoken).
  const itemId = game && !game.finished ? game.item.id : null
  useEffect(() => {
    const current = gameRef.current
    if (!itemId || !current) return
    say(text.comes(itemName(current.item, current.sortBy), current.sortBy), { interrupt: false })
  }, [itemId, text, itemName, say])

  const repeatPrompt = useCallback(() => {
    const current = gameRef.current
    if (!current || current.finished) return
    say(text.comes(itemName(current.item, current.sortBy), current.sortBy))
  }, [text, itemName, say])

  const finish = useCallback((finished) => {
    const stars = starsFor(finished.mistakes, finished.total)
    const xp = xpFor(finished.total, stars)
    saveGameResult(GAME_ID, (previous) => ({
      ...previous,
      levelId: finished.levelId,
      plays: (previous.plays ?? 0) + 1,
      bestStars: {
        ...previous.bestStars,
        [finished.levelId]: Math.max(previous.bestStars?.[finished.levelId] ?? 0, stars),
      },
      bestPoints: {
        ...previous.bestPoints,
        [finished.levelId]: Math.max(previous.bestPoints?.[finished.levelId] ?? 0, finished.points),
      },
    }), xp)
    addPoints(stars)
    flush()
    playSound('complete')
    speak(text.wonSpeech, language, { interrupt: false })
    setResult({ stars, xp, mistakes: finished.mistakes, points: finished.points })
  }, [saveGameResult, addPoints, flush, text, language])

  /** Called by the 3D scene the moment a shape lands in a bin. Must answer synchronously. */
  const handleDrop = useCallback((binId) => {
    const current = gameRef.current
    if (!current) return 'ignored'
    const { game: next, result: outcome } = dropItem(current, binId)
    if (outcome === 'ignored') return outcome
    gameRef.current = next
    setGame(next)

    const { item, sortBy } = current
    if (outcome === 'wrong') {
      playSound('wrong')
      const bin = nameOf(sortBy, item.bin)
      say(sortBy === 'color'
        ? text.wrongColor(nameOf('color', item.color), bin)
        : text.wrongShape(nameOf('shape', item.shape), bin))
      return outcome
    }

    playSound('correct')
    say(text.correct(itemName(item, sortBy)))
    clearTimeout(advanceTimer.current)
    advanceTimer.current = setTimeout(() => {
      const latest = gameRef.current
      const advanced = nextItem(latest, getLevel(latest.levelId), rng.current)
      gameRef.current = advanced
      setGame(advanced)
      if (advanced.finished) finish(advanced)
    }, CORRECT_DELAY)
    return outcome
  }, [finish, itemName, nameOf, say, text])

  const handleMiss = useCallback(() => {
    const current = gameRef.current
    if (!current) return
    const next = missItem(current)
    if (next === current) return
    gameRef.current = next
    setGame(next)
    playSound('wrong')
    say(text.missed(itemName(current.item, current.sortBy)))
  }, [itemName, say, text])

  const handleBinInfo = useCallback((binId) => {
    const current = gameRef.current
    if (!current) return
    playSound('click')
    say(text.binSpoken(nameOf(current.sortBy, binId)))
  }, [nameOf, say, text])

  const togglePause = useCallback(() => {
    playSound('click')
    setPaused((value) => !value)
  }, [])

  // Props for the 3D scene, memoised so it only re-renders when they really change.
  const binSpecs = useMemo(() => level.bins.map((id) => (level.sortBy === 'shape'
    ? { id, kind: 'shape', shape: id, color: SHAPE_BIN_COLOR, label: text.binLabel(nameOf('shape', id)) }
    : { id, kind: 'color', color: getColor(id)?.hex ?? '#999', label: text.binLabel(nameOf('color', id)) })),
  [level, text, nameOf])

  // Only a new item matters to the 3D view; attempts/solved changes must not re-render it.
  const currentItem = game?.item
  const itemKey = currentItem?.id
  const itemShape = currentItem?.shape
  const itemColor = currentItem?.color
  const itemSpec = useMemo(
    () => (itemKey ? { id: itemKey, shape: itemShape, color: getColor(itemColor)?.hex ?? '#ff5a5f' } : null),
    [itemKey, itemShape, itemColor],
  )
  const itemLabel = currentItem && currentItem.attempts > 0 ? itemName(currentItem, game.sortBy) : null

  /* ---------- Level picker ---------- */
  if (!game) {
    return (
      <div className="ssf" lang={language}>
        <header className="ssf-header">
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
        </header>
        {storageError && <p className="notice" role="alert">{storageError}</p>}

        <section className="ssf-setup" aria-labelledby="ssf-level-heading">
          <h2 id="ssf-level-heading">{text.pickLevel}</h2>
          <div className="ssf-choices">
            {LEVELS.map((option) => {
              const best = record.bestStars?.[option.id] ?? 0
              return (
                <button
                  key={option.id}
                  type="button"
                  className="ssf-choice"
                  aria-pressed={option.id === levelId}
                  onClick={() => { playSound('click'); setLevelId(option.id) }}
                >
                  <span className="ssf-choice-label">{text.levelName(n(option.id))}</span>
                  <span className="ssf-choice-hint">{text.levelHint[option.id]}</span>
                  <Stars count={best} size="sm" label={text.bestStars(n(best))} />
                </button>
              )
            })}
          </div>
        </section>

        <button type="button" className="ssf-primary ssf-start" onClick={() => start()}>
          {text.start}
        </button>
      </div>
    )
  }

  /* ---------- Finished ---------- */
  if (game.finished && result) {
    const hasNext = LEVELS.some((option) => option.id === level.id + 1)
    return (
      <div className="ssf" lang={language}>
        <section className="ssf-result" aria-labelledby="ssf-won">
          <span className="ssf-result-badge" aria-hidden="true">🏭</span>
          <h1 id="ssf-won">{text.wonTitle}</h1>
          <Stars count={result.stars} size="lg" label={text.starsLabel(n(result.stars))} />
          <p>{text.wonText(n(result.mistakes))}</p>
          <p className="ssf-points-line">{text.points(n(result.points))}</p>
          <p className="ssf-xp">{text.xpEarned(n(result.xp))}</p>
          <div className="ssf-actions">
            {hasNext && result.stars >= 2 && (
              <button type="button" className="ssf-primary" onClick={() => start(level.id + 1)}>{text.nextLevel}</button>
            )}
            <button type="button" className="ssf-secondary" onClick={() => start(level.id)}>{text.playAgain}</button>
            <button type="button" className="ssf-secondary" onClick={() => { playSound('click'); setGame(null) }}>
              {text.changeLevel}
            </button>
          </div>
        </section>
      </div>
    )
  }

  /* ---------- Playing ---------- */
  const solved = game.item.solved
  const progress = Math.round((game.sorted / game.total) * 100)

  return (
    <div className="ssf is-playing" lang={language}>
      <header className="ssf-header is-compact">
        <h1>{text.title}</h1>
        <p>{text.levelName(n(level.id))} · {text.itemOf(n(game.itemNumber), n(game.total))}</p>
      </header>

      <div className="ssf-hud">
        <div
          className="ssf-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={game.total}
          aria-valuenow={game.sorted}
          aria-label={text.itemOf(n(game.sorted), n(game.total))}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <span className="ssf-points">{text.points(n(game.points))}</span>
        <button type="button" className="ssf-secondary ssf-pause" onClick={togglePause} aria-pressed={paused}>
          {paused ? `▶ ${text.resume}` : `⏸ ${text.pause}`}
        </button>
      </div>

      <div className="ssf-prompt">
        <p className={`ssf-prompt-text ${solved ? 'is-solved' : ''}`} aria-live="polite">{message}</p>
        <button type="button" className="ssf-secondary ssf-hear" onClick={repeatPrompt} aria-label={text.hear}>
          🔊
        </button>
      </div>

      <div className="ssf-stage">
        <Suspense fallback={<StageLoader label={text.loading} />}>
          <SortingCanvas
            bins={binSpecs}
            item={itemSpec}
            itemLabel={itemLabel}
            speed={level.speed}
            paused={paused}
            onDrop={handleDrop}
            onMiss={handleMiss}
            onBinInfo={handleBinInfo}
            commandRef={commandRef}
            loadingLabel={text.loading}
            noWebglMessage={text.noWebgl}
          />
        </Suspense>
        {paused && (
          <button type="button" className="ssf-paused" onClick={togglePause}>
            <span>⏸ {text.paused}</span>
            <span className="ssf-paused-cta">▶ {text.resume}</span>
          </button>
        )}
      </div>
      <p className="ssf-tip">{text.tip}</p>

      {/* Keyboard / switch access: the same bins as buttons. */}
      <div className="ssf-keys" role="group" aria-label={text.keyboardHint}>
        <span className="ssf-keys-hint" aria-hidden="true">{text.keyboardHint}</span>
        {binSpecs.map((bin) => (
          <button
            key={bin.id}
            type="button"
            className="ssf-key"
            aria-disabled={solved || paused}
            onClick={() => { if (!solved && !paused) commandRef.current?.dropInto(bin.id) }}
          >
            {bin.kind === 'color' && <span className="ssf-swatch" style={{ background: bin.color }} aria-hidden="true" />}
            {text.binButton(bin.label)}
          </button>
        ))}
      </div>
    </div>
  )
}
