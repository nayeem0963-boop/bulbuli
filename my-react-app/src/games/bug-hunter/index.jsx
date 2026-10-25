import { useEffect, useMemo, useRef, useState } from 'react'
import runnerBird from '../../assets/bulbul-runner.webp'
import { useGameProgress } from '../../hooks/useGameProgress.js'
import { playSound } from '../../utils/sound.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import GridMap from '../../shared/ui/GridMap.jsx'
import {
  applyChoices, cycleChoice, getLevel, hasEmptySlot, HINT_AFTER, isUnlocked, isUntouched, LEVELS, parseLevel,
  startChoices, startFrames, starsFor, test, xpFor,
} from './engine.js'
import { BUG_HUNTER_TEXT } from './text.js'
import './bug-hunter.css'

const GAME_ID = 'bug-hunter'
const STEP_MS = 520 // time between blocks while the code runs
const ICONS = { forward: '↑', right: '↻', left: '↺', repeat: '🔁', ifBlocked: '?', missing: '…' }

function Stars({ count, label, size = 'md' }) {
  return (
    <span className={`bh-stars is-${size}`} role="img" aria-label={label}>
      {[1, 2, 3].map((value) => (
        <span key={value} className={value <= count ? 'is-on' : ''} aria-hidden="true">★</span>
      ))}
    </span>
  )
}

/** The 🐞 (or ✓ once fixed) on a bug the player can tap. */
const BugMark = ({ fixed }) => <span className={`bh-mark${fixed ? ' is-fixed' : ''}`} aria-hidden="true">{fixed ? '✓' : '🐞'}</span>

/** One line of Bulbuli's code. Bug blocks (or the bug part of a block) are buttons. */
function Line({ block, ctx }) {
  const { text, n } = ctx
  const bugIndex = ctx.bugAt.get(block.id)
  const bug = bugIndex === undefined ? null : ctx.level.bugs[bugIndex]
  const fix = () => ctx.cycle(bugIndex)
  const classes = [
    'bh-line',
    `is-${block.type}`,
    ctx.activeId === block.id ? 'is-active' : '',
    ctx.stuckId === block.id ? 'is-stuck' : '',
  ].filter(Boolean).join(' ')

  const name = block.type === 'missing' ? text.blocks.missing : text.blocks[block.type]

  // a whole block is the bug: wrong arrow, or an empty slot
  if (bug && (bug.kind === 'move' || bug.kind === 'missing')) {
    return (
      <li className={classes}>
        <button
          type="button"
          className="bh-row bh-bug"
          disabled={ctx.locked}
          aria-label={ctx.fixed ? text.fixedLabel(name) : text.bugLabel(name)}
          onClick={fix}
        >
          <span className="bh-icon" aria-hidden="true">{ICONS[block.type]}</span>
          <span className="bh-label">{block.type === 'missing' ? text.emptySlot : name}</span>
          <BugMark fixed={ctx.fixed} />
        </button>
      </li>
    )
  }

  // a setting on the block is the bug: the Repeat count or the turn of "If path blocked"
  const setting = (value, label) => (bug ? (
    <button
      type="button"
      className="bh-pill bh-bug"
      disabled={ctx.locked}
      aria-label={ctx.fixed ? text.fixedLabel(`${name}, ${label}`) : text.bugLabel(`${name}, ${label}`)}
      onClick={fix}
    >
      {value}<BugMark fixed={ctx.fixed} />
    </button>
  ) : <span className="bh-pill">{value}</span>)

  return (
    <li className={classes}>
      <div className="bh-row">
        <span className="bh-icon" aria-hidden="true">{ICONS[block.type]}</span>
        <span className="bh-label">{name}</span>
        {block.type === 'repeat' && setting(text.times(n(block.times)), text.times(n(block.times)))}
        {block.type === 'ifBlocked' && setting(`→ ${ICONS[block.turn]} ${text.thenTurn[block.turn]}`, text.thenTurn[block.turn])}
        {ctx.loop?.id === block.id && <span className="bh-round">{n(ctx.loop.round)}/{n(ctx.loop.times)}</span>}
      </div>
      {block.body && (
        <ol className="bh-list bh-loop-body">
          {block.body.map((child) => <Line key={child.id} block={child} ctx={ctx} />)}
        </ol>
      )}
    </li>
  )
}

export default function BugHunter({ playerId, language }) {
  const text = BUG_HUNTER_TEXT[language]
  const n = (value) => formatDigits(value, language)
  const { games, saveGameResult, storageError } = useGameProgress(playerId)
  const record = games[GAME_ID] ?? {}
  const bestStars = record.bestStars ?? {}

  const [levelId, setLevelId] = useState(() => {
    const saved = getLevel(record.levelId).id
    return isUnlocked(saved, record.bestStars) ? saved : 1
  })
  const [screen, setScreen] = useState('pick') // 'pick' | 'play'
  const [choices, setChoices] = useState(() => startChoices(getLevel(levelId)))
  const [exec, setExec] = useState(null) // { frames, outcome, index, playing, untouched } while code runs
  const [fails, setFails] = useState(0) // wrong tests after changing something
  const [hintUsed, setHintUsed] = useState(false)
  const [notice, setNotice] = useState('') // "fill the empty block first"
  const [result, setResult] = useState(null)
  const handled = useRef({ frames: null, index: -1, done: false })

  const level = getLevel(levelId)
  const board = useMemo(() => parseLevel(level), [level])
  const program = useMemo(() => applyChoices(level, choices), [level, choices])
  const bugAt = useMemo(() => new Map(level.bugs.map((bug, index) => [bug.blockId, index])), [level])
  const preview = useMemo(() => startFrames(level), [level])
  const frames = exec?.frames ?? preview
  const index = exec?.index ?? 0
  const frame = frames[index]
  const finished = Boolean(exec) && index === exec.frames.length - 1
  const playing = Boolean(exec?.playing)
  const won = finished && exec.outcome.status === 'win'
  const untouched = isUntouched(level, choices)

  const ctx = {
    text,
    n,
    level,
    bugAt,
    locked: playing || won,
    fixed: won,
    activeId: exec && !finished ? frame.blockId : null,
    stuckId: finished && ['bump', 'edge'].includes(exec.outcome.status) ? frame.blockId : null,
    loop: exec && !finished ? frame.loop : null,
    cycle: (bugIndex) => {
      if (playing || won) return
      playSound('click')
      setChoices((current) => cycleChoice(level, current, bugIndex))
      setExec(null)
      setNotice('')
    },
  }

  const onRun = () => {
    if (playing) return
    if (hasEmptySlot(level, choices)) {
      playSound('wrong')
      setNotice(text.fillFirst)
      return
    }
    playSound('click')
    setNotice('')
    const { frames: next, outcome } = test(level, choices)
    setExec({ frames: next, outcome, index: 0, playing: next.length > 1, untouched })
  }

  // Play the frames one after another.
  useEffect(() => {
    if (!exec?.playing) return undefined
    const timer = window.setTimeout(() => {
      setExec((current) => {
        if (!current?.playing) return current
        const nextIndex = current.index + 1
        return { ...current, index: nextIndex, playing: nextIndex < current.frames.length - 1 }
      })
    }, exec.index === 0 ? 250 : STEP_MS)
    return () => window.clearTimeout(timer)
  }, [exec])

  // Sounds, counting wrong fixes, and saving stars and XP: once per frame, once per run.
  useEffect(() => {
    if (!exec) return
    if (handled.current.frames !== exec.frames) handled.current = { frames: exec.frames, index: -1, done: false }
    const seen = handled.current
    if (seen.index === exec.index) return
    seen.index = exec.index

    if (exec.frames[exec.index].event === 'seed') playSound('correct')
    if (exec.index < exec.frames.length - 1 || seen.done) return
    seen.done = true

    if (exec.outcome.status !== 'win') {
      playSound('wrong')
      // Watching the original bug happen is good debugging, so only changed code counts as a try.
      if (!exec.untouched) setFails((count) => count + 1)
      return
    }
    playSound('complete')
    const stars = starsFor({ fails, hintUsed })
    const xp = xpFor(stars)
    saveGameResult(GAME_ID, (previous) => ({
      ...previous,
      levelId: level.id,
      plays: (previous.plays ?? 0) + 1,
      bestStars: { ...previous.bestStars, [level.id]: Math.max(previous.bestStars?.[level.id] ?? 0, stars) },
    }), xp)
    const cheer = text.cheers[Math.floor(Math.random() * text.cheers.length)]
    setResult({ stars, xp, cheer })
  }, [exec, fails, hintUsed, level, saveGameResult, text])

  const open = (id) => {
    playSound('click')
    setLevelId(id)
    setChoices(startChoices(getLevel(id)))
    setExec(null)
    setFails(0)
    setHintUsed(false)
    setNotice('')
    setResult(null)
    setScreen('play')
  }

  /* ---------- puzzle picker ---------- */

  if (screen === 'pick') {
    return (
      <div className="bh" lang={language}>
        <header className="bh-header">
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
        </header>
        {storageError && <p className="notice" role="alert">{storageError}</p>}

        <section aria-labelledby="bh-level-heading">
          <h2 id="bh-level-heading" className="bh-subheading">{text.pickLevel}</h2>
          <div className="bh-levels">
            {LEVELS.map((option) => {
              const unlocked = isUnlocked(option.id, bestStars)
              const best = bestStars[option.id] ?? 0
              return (
                <button
                  key={option.id}
                  type="button"
                  className="bh-level"
                  aria-pressed={option.id === levelId}
                  disabled={!unlocked}
                  onClick={() => { playSound('click'); setLevelId(option.id) }}
                >
                  <span className="bh-level-name">{text.levelName(n(option.id))}</span>
                  <span className="bh-level-hint">
                    {unlocked ? `🐞 ${text.concept[option.id]}` : `🔒 ${text.locked}`}
                  </span>
                  {unlocked && <Stars count={best} size="sm" label={text.bestStars(n(best))} />}
                </button>
              )
            })}
          </div>
        </section>

        <button type="button" className="bh-primary bh-start" onClick={() => open(levelId)}>
          {text.start}
        </button>
      </div>
    )
  }

  /* ---------- puzzle ---------- */

  let status = { tone: 'info', message: untouched ? text.ready : text.changed }
  if (playing) status = { tone: 'info', message: text.running }
  else if (notice) status = { tone: 'oops', message: notice }
  else if (won) status = { tone: 'win', message: text.wonTitle[level.goal] }
  else if (finished) {
    const { outcome } = exec
    const message = outcome.status === 'missingSeeds' ? text.outcome.missingSeeds() : text.outcome[outcome.status]
    status = { tone: 'oops', message, tip: ['bump', 'edge'].includes(outcome.status) ? text.stuckHere : '' }
  }

  const hintReady = fails >= HINT_AFTER
  const hasNext = level.id < LEVELS.length
  const emptySlot = hasEmptySlot(level, choices)

  return (
    <div className="bh is-playing" lang={language}>
      <header className="bh-header is-compact">
        <h1>{text.title}</h1>
        <p>{text.levelName(n(level.id))} · {text.concept[level.id]}</p>
      </header>
      {storageError && <p className="notice" role="alert">{storageError}</p>}

      <div className="bh-bar">
        <p className="bh-count">
          <span>{text.bugsLeft}</span>
          <strong>{won ? '✓' : `🐞 ${n(level.bugs.length)}`}</strong>
        </p>
        <p className="bh-count">
          <span>{text.tries}</span>
          <strong>{n(fails)}</strong>
        </p>
        <Stars count={bestStars[level.id] ?? 0} size="sm" label={text.bestStars(n(bestStars[level.id] ?? 0))} />
        <div className="bh-bar-actions">
          <button type="button" className="bh-secondary" onClick={() => { setExec(null); setResult(null); setScreen('pick') }}>
            {text.allLevels}
          </button>
        </div>
      </div>

      <p className="bh-mission">{text.mission[level.id]}</p>

      <div className="bh-play">
        <section className="bh-stage" aria-label={text.map}>
          <GridMap board={board} frames={frames} index={index} text={text} n={n} goal={level.goal} open={won} />

          <div className="bh-controls">
            <button type="button" className="bh-primary" onClick={onRun} disabled={playing || won}>
              ▶ {untouched ? text.run : text.test}
            </button>
          </div>

          <div className={`bh-status is-${status.tone}`} aria-live="polite">
            <p>{status.message}</p>
            {status.tip && <p className="bh-status-tip">{status.tip}</p>}
          </div>
        </section>

        <div className="bh-side">
          <section className={`bh-panel${emptySlot && notice ? ' is-nudging' : ''}`} aria-labelledby="bh-code-heading">
            <h2 id="bh-code-heading" className="bh-subheading">{text.code}</h2>
            <p className="bh-hint-line">{text.tapToFix}</p>
            <ol className="bh-list">
              {program.map((block) => <Line key={block.id} block={block} ctx={ctx} />)}
            </ol>
          </section>

          <section className="bh-panel bh-help">
            {hintUsed ? (
              <div className="bh-hint" aria-live="polite">
                <img src={runnerBird} alt="" width="240" height="236" />
                <div>
                  <p className="bh-hint-title">{text.hintTitle}</p>
                  <p>{text.hints[level.id]}</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="bh-secondary bh-hint-button"
                disabled={!hintReady || won}
                onClick={() => { playSound('click'); setHintUsed(true) }}
              >
                💡 {hintReady ? text.hint : text.hintLocked(n(HINT_AFTER - fails))}
              </button>
            )}
          </section>
        </div>
      </div>

      {result && (
        <div className="bh-win-backdrop">
          <section className="bh-win" role="dialog" aria-modal="true" aria-labelledby="bh-win-title">
            <p className="bh-win-cheer">{result.cheer}</p>
            <h2 id="bh-win-title">{text.wonTitle[level.goal]}</h2>
            <Stars count={result.stars} size="lg" label={text.starsLabel(n(result.stars))} />
            <p>{text.wonStars[result.stars]}</p>
            <p className="bh-win-xp">{text.xpEarned(n(result.xp))}</p>
            <div className="bh-win-actions">
              {hasNext && (
                <button type="button" className="bh-primary" autoFocus onClick={() => open(level.id + 1)}>
                  {text.nextLevel}
                </button>
              )}
              <button
                type="button"
                className={hasNext ? 'bh-secondary' : 'bh-primary'}
                autoFocus={!hasNext}
                onClick={() => open(level.id)}
              >
                {text.playAgain}
              </button>
              <button type="button" className="bh-secondary" onClick={() => { setExec(null); setResult(null); setScreen('pick') }}>
                {text.allLevels}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
