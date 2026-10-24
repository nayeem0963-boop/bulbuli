import { useCallback, useEffect, useRef, useState } from 'react'
import runnerBird from '../../assets/bulbul-runner.webp'
import ForestScene from './ForestScene.jsx'
import { useTutorialProgress } from '../../hooks/useTutorialProgress.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import { playSound } from '../../utils/sound.js'
import { createRun, getLevel, LEVELS, nextLetter, pressKey, progress, results } from './engine.js'
import { TYPE_RUNNER_TEXT } from './text.js'
import './type-runner.css'

const GAME_ID = 'type-runner'
const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

function Stars({ count, label, size = 'md' }) {
  return (
    <span className={`tr-stars is-${size}`} role="img" aria-label={label}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= count ? 'is-on' : ''} aria-hidden="true">★</span>
      ))}
    </span>
  )
}

/** On-screen keyboard: shows where the next key is, and works as buttons on touch screens. */
function Keyboard({ next, wrongKey, onPress, text }) {
  return (
    <div className="tr-keyboard" role="group" aria-label={text.keyboardLabel}>
      {KEY_ROWS.map((row) => (
        <div key={row} className="tr-keyboard-row">
          {[...row].map((letter) => (
            <button
              key={letter}
              type="button"
              className={`tr-key${letter === next ? ' is-next' : ''}${letter === wrongKey ? ' is-wrong' : ''}${letter === 'f' || letter === 'j' ? ' is-home' : ''}`}
              aria-label={text.keyLabel(letter)}
              onClick={() => onPress(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function TypeRunner({ playerId, language }) {
  const text = TYPE_RUNNER_TEXT[language]
  const n = (value) => formatDigits(value, language)
  const { games, saveGameResult, storageError } = useTutorialProgress(playerId)
  const record = games[GAME_ID] ?? {}

  const [levelId, setLevelId] = useState(() => getLevel(record.levelId).id)
  const [run, setRun] = useState(null) // null = choosing a race
  const [result, setResult] = useState(null)
  const [wrongKey, setWrongKey] = useState(null)
  const [hops, setHops] = useState(0)
  const wrongTimer = useRef(null)
  const savedRun = useRef(null)
  const level = getLevel(levelId)

  useEffect(() => () => window.clearTimeout(wrongTimer.current), [])

  // The latest run lives in a ref too, so a key press never reads a stale run and
  // sounds play exactly once (state updaters can run twice in development).
  const runRef = useRef(null)
  useEffect(() => { runRef.current = run }, [run])


  const start = useCallback((nextLevelId = levelId) => {
    playSound('click')
    setLevelId(nextLevelId)
    setResult(null)
    setWrongKey(null)
    const fresh = createRun(getLevel(nextLevelId))
    runRef.current = fresh
    setRun(fresh)
  }, [levelId])

  const press = useCallback((key) => {
    const current = runRef.current
    if (!current) return
    const next = pressKey(current, key)
    if (next === current) return
    runRef.current = next
    setRun(next)
    if (next.last === 'wrong') {
      playSound('wrong')
      setWrongKey(key.toLowerCase())
      window.clearTimeout(wrongTimer.current)
      wrongTimer.current = window.setTimeout(() => setWrongKey(null), 450)
      return
    }
    playSound(next.finishedAt !== null ? 'complete' : next.last === 'word' ? 'correct' : 'click')
    setWrongKey(null)
    setHops((count) => count + 1)
  }, [])

  // A real keyboard works anywhere on the page while a race is on.
  useEffect(() => {
    if (!run || run.finishedAt !== null) return undefined
    const onKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return
      if (!/^[a-z]$/i.test(event.key)) return
      event.preventDefault()
      press(event.key)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [press, run])

  // Reaching the finish: save stars and XP once, then celebrate.
  useEffect(() => {
    if (!run || run.finishedAt === null || savedRun.current === run) return
    savedRun.current = run
    const score = results(run, level)
    saveGameResult(GAME_ID, (previous) => ({
      ...previous,
      levelId,
      plays: (previous.plays ?? 0) + 1,
      bestStars: { ...previous.bestStars, [levelId]: Math.max(previous.bestStars?.[levelId] ?? 0, score.stars) },
      bestPerMinute: { ...previous.bestPerMinute, [levelId]: Math.max(previous.bestPerMinute?.[levelId] ?? 0, score.perMinute) },
    }), score.xp)
    setResult({ ...score, cheer: text.cheers[Math.floor(Math.random() * text.cheers.length)] })
  }, [level, levelId, run, saveGameResult, text.cheers])

  if (!run) {
    return (
      <div className="tr" lang={language}>
        <header className="tr-header">
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
        </header>
        {storageError && <p className="notice" role="alert">{storageError}</p>}

        <section className="tr-setup" aria-labelledby="tr-level-heading">
          <h2 id="tr-level-heading">{text.pickLevel}</h2>
          <div className="tr-choices">
            {LEVELS.map((option) => {
              const best = record.bestStars?.[option.id] ?? 0
              const copy = text.levels[option.id]
              return (
                <button
                  key={option.id}
                  type="button"
                  className="tr-choice"
                  aria-pressed={option.id === levelId}
                  onClick={() => { playSound('click'); setLevelId(option.id) }}
                >
                  <span className="tr-choice-icon" aria-hidden="true">{option.kind === 'keys' ? '⌨️' : '🔤'}</span>
                  <span className="tr-choice-label">{copy.name}</span>
                  <span className="tr-choice-hint" lang="en">{copy.hint}</span>
                  <Stars count={best} size="sm" label={text.bestStars(n(best))} />
                </button>
              )
            })}
          </div>
        </section>

        <p className="tr-howto">{text.howTo}</p>
        <button type="button" className="tr-primary tr-start" onClick={() => start()}>{text.start}</button>
      </div>
    )
  }

  const target = run.targets[run.index] ?? run.targets.at(-1)
  const next = nextLetter(run)
  const done = run.index
  const finished = run.finishedAt !== null

  return (
    <div className="tr is-playing" lang={language}>
      <header className="tr-header is-compact">
        <h1>{text.title}</h1>
        <p>{text.levels[level.id].name}</p>
      </header>

      <div className={`tr-track${finished ? '' : ' is-running'}`}>
        {/* The bulbul runs through a scrolling forest; every correct key sends the forest rushing by. */}
        <ForestScene
          running={!finished}
          pulse={hops}
          label={`${text.trackLabel}: ${text.progressLabel(n(done), n(run.targets.length))}`}
        >
          <div className="tr-track-lane">
            <span className="tr-runner" style={{ '--progress': progress(run) }}>
              <span key={hops} className={hops ? 'tr-runner-bird is-hopping' : 'tr-runner-bird'}>
                <img src={runnerBird} alt="" width="240" height="236" draggable="false" />
              </span>
            </span>
            <span className="tr-finish" aria-hidden="true">🏁</span>
          </div>
        </ForestScene>
      </div>

      <div className="tr-bar">
        <p className="tr-count"><span>{text.done}</span><strong>{n(done)}/{n(run.targets.length)}</strong></p>
        <p className="tr-count"><span>{text.mistakes}</span><strong>{n(run.mistakes)}</strong></p>
        <div className="tr-bar-actions">
          <button type="button" className="tr-secondary" onClick={() => start()}>{text.restart}</button>
          <button type="button" className="tr-secondary" onClick={() => { runRef.current = null; setRun(null); setResult(null) }}>{text.changeLevel}</button>
        </div>
      </div>

      <section
        className={`tr-target${wrongKey ? ' is-wrong' : ''}${target.picture ? ' is-word' : ' is-key'}`}
        aria-label={target.picture ? text.typeWord(target.text) : text.typeLetter(target.text)}
      >
        <p className="visually-hidden">{text.typeThis}</p>
        {target.picture && <span className="tr-picture" aria-hidden="true">{target.picture}</span>}
        <p className="tr-letters" lang="en" aria-hidden="true">
          {[...target.text].map((letter, i) => (
            <span
              key={`${run.index}-${i}`}
              className={finished || i < run.position ? 'is-done' : i === run.position ? 'is-next' : ''}
            >
              {letter}
            </span>
          ))}
        </p>
        {target.picture && language === 'bn' && <p className="tr-meaning" lang="bn">{target.bn}</p>}
        {/* Keyboards print capital letters, so show which key to look for. */}
        {!target.picture && (
          <p className="tr-keycap-hint" aria-hidden="true">
            {text.keycap} <span className="tr-keycap" lang="en">{target.text.toUpperCase()}</span>
          </p>
        )}
      </section>
      <p className="visually-hidden" aria-live="polite">{next ? text.typeLetter(next) : ''}</p>

      <Keyboard next={next} wrongKey={wrongKey} onPress={press} text={text} />

      {result && (
        <div className="tr-win-backdrop">
          <section className="tr-win" role="dialog" aria-modal="true" aria-labelledby="tr-win-title">
            <p className="tr-win-cheer">{result.cheer}</p>
            <h2 id="tr-win-title">{text.wonTitle}</h2>
            <Stars count={result.stars} size="lg" label={text.starsLabel(n(result.stars))} />
            <p>{text.speed(n(result.perMinute))}</p>
            <p>{text.accuracy(n(result.accuracy))}</p>
            <p className="tr-win-xp">{text.xpEarned(n(result.xp))}</p>
            <div className="tr-win-actions">
              {level.id < LEVELS.length && (
                <button type="button" className="tr-primary" autoFocus onClick={() => start(level.id + 1)}>
                  {text.nextLevel}
                </button>
              )}
              <button
                type="button"
                className={level.id < LEVELS.length ? 'tr-secondary' : 'tr-primary'}
                autoFocus={level.id === LEVELS.length}
                onClick={() => start()}
              >
                {text.playAgain}
              </button>
              <button type="button" className="tr-secondary" onClick={() => { runRef.current = null; setRun(null); setResult(null) }}>
                {text.changeLevel}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
