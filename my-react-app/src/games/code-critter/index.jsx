import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useGameProgress } from '../../hooks/useGameProgress.js'
import { playSound } from '../../utils/sound.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import GridMap from '../../shared/ui/GridMap.jsx'
import {
  countBlocks, createBlock, findBlock, getLevel, insertBlock, isUnlocked, LEVELS, MAX_BLOCKS, moveBlock,
  parseLevel, removeBlock, REPEAT_MAX, REPEAT_MIN, run, shiftBlock, starsFor, updateBlock, xpFor,
} from './engine.js'
import { CODE_CRITTER_TEXT } from './text.js'
import './code-critter.css'

const GAME_ID = 'code-critter'
const STEP_MS = 520 // time between blocks while the code runs
const ICONS = { forward: '↑', right: '↻', left: '↺', repeat: '🔁', ifBlocked: '?' }

function Stars({ count, label, size = 'md' }) {
  return (
    <span className={`cc-stars is-${size}`} role="img" aria-label={label}>
      {[1, 2, 3].map((value) => (
        <span key={value} className={value <= count ? 'is-on' : ''} aria-hidden="true">★</span>
      ))}
    </span>
  )
}

/* ---------- the code ---------- */

function DropSlot({ parentId, index, ctx }) {
  const [over, setOver] = useState(false)
  if (!ctx.dragging) return null
  return (
    <li
      className={`cc-slot${over ? ' is-over' : ''}`}
      aria-hidden="true"
      onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => { event.preventDefault(); event.stopPropagation(); setOver(false); ctx.dropAt(parentId, index) }}
    />
  )
}

function BlockList({ list, parentId, ctx }) {
  // a Repeat cannot be dropped inside another Repeat
  const accepts = !(parentId !== null && ctx.dragging?.type === 'repeat')
  return (
    <ol className="cc-list">
      {list.map((block, index) => (
        <Fragment key={block.id}>
          {accepts && <DropSlot parentId={parentId} index={index} ctx={ctx} />}
          <CodeBlock block={block} index={index} count={list.length} ctx={ctx} />
        </Fragment>
      ))}
      {accepts && <DropSlot parentId={parentId} index={list.length} ctx={ctx} />}
    </ol>
  )
}

function CodeBlock({ block, index, count, ctx }) {
  const { text, n, locked } = ctx
  const name = text.blocks[block.type]
  const loop = ctx.loop?.id === block.id ? ctx.loop : null
  const classes = [
    'cc-block',
    `is-${block.type}`,
    ctx.activeId === block.id ? 'is-active' : '',
    ctx.bugId === block.id ? 'is-bug' : '',
    ctx.dragging?.id === block.id ? 'is-dragged' : '',
  ].filter(Boolean).join(' ')

  return (
    <li className={classes}>
      <div
        className="cc-block-row"
        draggable={!locked}
        onDragStart={(event) => ctx.startDrag(event, { kind: 'move', id: block.id, type: block.type })}
        onDragEnd={ctx.endDrag}
      >
        <span className="cc-block-icon" aria-hidden="true">{ICONS[block.type]}</span>
        <span className="cc-block-label">{name}</span>

        {block.type === 'repeat' && (
          <span className="cc-stepper">
            <button type="button" aria-label={text.fewer} disabled={locked || block.times <= REPEAT_MIN}
              onClick={() => ctx.update(block.id, { times: block.times - 1 })}>−</button>
            <span aria-live="polite">{text.times(n(block.times))}</span>
            <button type="button" aria-label={text.more} disabled={locked || block.times >= REPEAT_MAX}
              onClick={() => ctx.update(block.id, { times: block.times + 1 })}>+</button>
          </span>
        )}

        {block.type === 'ifBlocked' && (
          <button
            type="button"
            className="cc-turn-toggle"
            disabled={locked}
            aria-label={`${text.thenTurn[block.turn]}. ${text.switchTurn}`}
            onClick={() => ctx.update(block.id, { turn: block.turn === 'right' ? 'left' : 'right' })}
          >
            → {ICONS[block.turn]} {text.thenTurn[block.turn]}
          </button>
        )}

        {loop && <span className="cc-round">{text.round(n(loop.round), n(loop.times))}</span>}

        <span className="cc-block-tools">
          <button type="button" aria-label={`${text.moveUp}: ${name}`} disabled={locked || index === 0}
            onClick={() => ctx.shift(block.id, -1)}>▲</button>
          <button type="button" aria-label={`${text.moveDown}: ${name}`} disabled={locked || index === count - 1}
            onClick={() => ctx.shift(block.id, 1)}>▼</button>
          <button type="button" className="is-remove" aria-label={`${text.remove}: ${name}`} disabled={locked}
            onClick={() => ctx.remove(block.id)}>✕</button>
        </span>
      </div>

      {block.type === 'repeat' && (
        <div className={`cc-loop-body${ctx.target === block.id ? ' is-target' : ''}`}>
          <BlockList list={block.body} parentId={block.id} ctx={ctx} />
          <button
            type="button"
            className="cc-loop-add"
            aria-pressed={ctx.target === block.id}
            disabled={locked}
            onClick={() => ctx.setTarget(ctx.target === block.id ? null : block.id)}
          >
            {ctx.target === block.id ? `✓ ${text.addingInto}` : `＋ ${block.body.length ? text.addInside : text.emptyLoop}`}
          </button>
        </div>
      )}
    </li>
  )
}

/* ---------- the game ---------- */

export default function CodeCritter({ playerId, language }) {
  const text = CODE_CRITTER_TEXT[language]
  const n = (value) => formatDigits(value, language)
  const { games, saveGameResult, storageError } = useGameProgress(playerId)
  const record = games[GAME_ID] ?? {}
  const bestStars = record.bestStars ?? {}

  const [levelId, setLevelId] = useState(() => {
    const saved = getLevel(record.levelId).id
    return isUnlocked(saved, record.bestStars) ? saved : 1
  })
  const [screen, setScreen] = useState('pick') // 'pick' | 'play'
  const [programs, setPrograms] = useState({}) // the code for each level, kept while the page is open
  const [target, setTarget] = useState(null) // id of the Repeat that tapped blocks go into
  const [exec, setExec] = useState(null) // { frames, outcome, index, playing, blocks } while code runs
  const [result, setResult] = useState(null)
  const [announcement, setAnnouncement] = useState('')
  const [dragging, setDragging] = useState(null)
  const dragRef = useRef(null)
  const handled = useRef({ frames: null, index: -1, done: false })

  const level = getLevel(levelId)
  const board = useMemo(() => parseLevel(level), [level])
  const program = programs[levelId] ?? []
  const blocks = countBlocks(program)
  const preview = useMemo(() => run(level, []).frames, [level])
  const frames = exec?.frames ?? preview
  const index = exec?.index ?? 0
  const frame = frames[index]
  const finished = Boolean(exec) && index === exec.frames.length - 1
  const playing = Boolean(exec?.playing)
  const insideLoop = target && findBlock(program, target) ? target : null

  /* editing: any change sends Bulbuli back to the start */
  const edit = (change) => {
    setPrograms((all) => ({ ...all, [levelId]: change(all[levelId] ?? []) }))
    setExec(null)
    setAnnouncement('')
  }

  const addBlock = (type, parentId = type === 'repeat' ? null : insideLoop, at = Infinity) => {
    if (playing) return
    const block = createBlock(type)
    const next = insertBlock(program, block, parentId, at)
    if (next === program) {
      setAnnouncement(text.full)
      return
    }
    playSound('click')
    edit(() => next)
    if (type === 'repeat' && parentId === null) setTarget(block.id)
  }

  const ctx = {
    text,
    n,
    locked: playing,
    target: insideLoop,
    setTarget: (id) => { playSound('click'); setTarget(id) },
    activeId: exec && !finished ? frame.blockId : null,
    bugId: finished && ['bump', 'edge'].includes(exec.outcome.status) ? frame.blockId : null,
    loop: exec && !finished ? frame.loop : null,
    dragging,
    update: (id, patch) => { playSound('click'); edit((list) => updateBlock(list, id, patch)) },
    shift: (id, delta) => { playSound('click'); edit((list) => shiftBlock(list, id, delta)) },
    remove: (id) => {
      playSound('click')
      edit((list) => removeBlock(list, id))
      if (id === target) setTarget(null)
    },
    startDrag: (event, info) => {
      if (playing) { event.preventDefault(); return }
      dragRef.current = info
      event.dataTransfer.effectAllowed = info.kind === 'new' ? 'copy' : 'move'
      event.dataTransfer.setData('text/plain', info.type)
      // Changing the page during dragstart can cancel the drag in some browsers, so wait a tick.
      window.setTimeout(() => setDragging(info), 0)
    },
    endDrag: () => {
      dragRef.current = null
      setDragging(null)
    },
    dropAt: (parentId, at) => {
      const info = dragRef.current
      ctx.endDrag()
      if (!info) return
      if (info.kind === 'new') addBlock(info.type, parentId, at)
      else { playSound('click'); edit((list) => moveBlock(list, info.id, parentId, at)) }
    },
  }

  /* running */
  const startRun = (stepOnly = false) => {
    const { frames: next, outcome } = run(level, program)
    const last = next.length - 1
    setExec({ frames: next, outcome, index: stepOnly ? Math.min(1, last) : 0, playing: !stepOnly && last > 0, blocks })
    setAnnouncement('')
    setTarget(null)
  }

  const onRun = () => {
    playSound('click')
    if (exec && !finished) setExec({ ...exec, playing: true })
    else startRun()
  }
  const onPause = () => setExec((current) => current && { ...current, playing: false })
  const onStep = () => {
    playSound('click')
    if (!exec || finished) startRun(true)
    else setExec({ ...exec, index: index + 1, playing: false })
  }
  const onReset = () => {
    playSound('click')
    setExec(null)
    setAnnouncement('')
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

  // Sounds, the result, and saving stars and XP: once per frame, once per run.
  useEffect(() => {
    if (!exec) return
    if (handled.current.frames !== exec.frames) handled.current = { frames: exec.frames, index: -1, done: false }
    const seen = handled.current
    if (seen.index === exec.index) return
    seen.index = exec.index

    const current = exec.frames[exec.index]
    if (current.event === 'seed') {
      playSound('correct')
      setAnnouncement(text.seedFound)
    }
    if (exec.index < exec.frames.length - 1 || seen.done) return
    seen.done = true

    if (exec.outcome.status !== 'win') {
      if (exec.outcome.status !== 'empty') playSound('wrong')
      return
    }
    playSound('complete')
    const stars = starsFor(exec.blocks, level.par)
    const xp = xpFor(stars)
    saveGameResult(GAME_ID, (previous) => ({
      ...previous,
      levelId: level.id,
      plays: (previous.plays ?? 0) + 1,
      bestStars: { ...previous.bestStars, [level.id]: Math.max(previous.bestStars?.[level.id] ?? 0, stars) },
    }), xp)
    const cheer = text.cheers[Math.floor(Math.random() * text.cheers.length)]
    setResult({ stars, xp, blocks: exec.blocks, cheer })
  }, [exec, level, saveGameResult, text])

  const open = (id) => {
    playSound('click')
    setLevelId(id)
    setExec(null)
    setTarget(null)
    setResult(null)
    setAnnouncement('')
    setScreen('play')
  }

  const backToLevels = () => {
    setExec(null)
    setResult(null)
    setScreen('pick')
  }

  /* ---------- level picker ---------- */

  if (screen === 'pick') {
    return (
      <div className="cc" lang={language}>
        <header className="cc-header">
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
        </header>
        {storageError && <p className="notice" role="alert">{storageError}</p>}

        <section aria-labelledby="cc-level-heading">
          <h2 id="cc-level-heading" className="cc-subheading">{text.pickLevel}</h2>
          <div className="cc-levels">
            {LEVELS.map((option) => {
              const unlocked = isUnlocked(option.id, bestStars)
              const best = bestStars[option.id] ?? 0
              return (
                <button
                  key={option.id}
                  type="button"
                  className="cc-level"
                  aria-pressed={option.id === levelId}
                  disabled={!unlocked}
                  onClick={() => { playSound('click'); setLevelId(option.id) }}
                >
                  <span className="cc-level-name">{text.levelName(n(option.id))}</span>
                  <span className="cc-level-hint">{unlocked ? text.concept[option.id] : `🔒 ${text.locked}`}</span>
                  {unlocked && <Stars count={best} size="sm" label={text.bestStars(n(best))} />}
                </button>
              )
            })}
          </div>
        </section>

        <button type="button" className="cc-primary cc-start" onClick={() => open(levelId)}>
          {text.start}
        </button>
      </div>
    )
  }

  /* ---------- playing ---------- */

  let status = { tone: 'info', message: text.goal[level.id] }
  if (playing) status = { tone: 'info', message: text.running }
  else if (exec && !finished) status = { tone: 'info', message: text.paused }
  else if (finished && exec.outcome.status === 'win') status = { tone: 'win', message: text.wonTitle }
  else if (finished) {
    const { outcome } = exec
    const message = outcome.status === 'missingSeeds' ? text.outcome.missingSeeds(n(outcome.left)) : text.outcome[outcome.status]
    status = { tone: 'oops', message, tip: ['bump', 'edge'].includes(outcome.status) ? text.bugTip : '' }
  }

  const hasNext = level.id < LEVELS.length

  return (
    <div className="cc is-playing" lang={language}>
      <header className="cc-header is-compact">
        <h1>{text.title}</h1>
        <p>{text.levelName(n(level.id))} · {text.concept[level.id]}</p>
      </header>
      {storageError && <p className="notice" role="alert">{storageError}</p>}

      <div className="cc-bar">
        {board.seeds.length > 0 && (
          <p className="cc-count">
            <span>{text.seeds}</span>
            <strong>{n(frame.collected.length)}/{n(board.seeds.length)}</strong>
          </p>
        )}
        <p className="cc-count">
          <span>{text.blockCount}</span>
          <strong>{n(blocks)}/{n(MAX_BLOCKS)}</strong>
        </p>
        <Stars count={bestStars[level.id] ?? 0} size="sm" label={text.bestStars(n(bestStars[level.id] ?? 0))} />
        <div className="cc-bar-actions">
          <button type="button" className="cc-secondary" onClick={backToLevels}>{text.allLevels}</button>
        </div>
      </div>

      <div className="cc-play">
        <section className="cc-stage" aria-label={text.map}>
          <GridMap board={board} frames={frames} index={index} text={text} n={n} />

          <div className="cc-controls">
            {playing ? (
              <button type="button" className="cc-primary" onClick={onPause}>⏸ {text.pause}</button>
            ) : (
              <button type="button" className="cc-primary" onClick={onRun}>
                ▶ {exec && !finished ? text.resume : text.run}
              </button>
            )}
            <button type="button" className="cc-secondary" onClick={onStep}>⏭ {text.step}</button>
            <button type="button" className="cc-secondary" onClick={onReset} disabled={!exec}>↺ {text.reset}</button>
          </div>

          <div className={`cc-status is-${status.tone}`} aria-live="polite">
            <p>{status.message}</p>
            {status.tip && <p className="cc-status-tip">{status.tip}</p>}
          </div>
          <p className="visually-hidden" aria-live="polite">{announcement}</p>
        </section>

        <div className="cc-code">
          <section className="cc-panel" aria-labelledby="cc-palette-heading">
            <h2 id="cc-palette-heading" className="cc-subheading">{text.palette}</h2>
            <p className="cc-hint">{text.paletteHint}</p>
            <div className="cc-palette">
              {level.palette.map((type) => (
                <div
                  key={type}
                  role="button"
                  tabIndex={playing ? -1 : 0}
                  aria-disabled={playing || undefined}
                  aria-label={text.add(text.blocks[type])}
                  className={`cc-chip is-${type}`}
                  draggable={!playing}
                  onDragStart={(event) => ctx.startDrag(event, { kind: 'new', type })}
                  onDragEnd={ctx.endDrag}
                  onClick={() => addBlock(type)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); addBlock(type) }
                  }}
                >
                  <span className="cc-block-icon" aria-hidden="true">{ICONS[type]}</span>
                  {text.blocks[type]}
                </div>
              ))}
            </div>
          </section>

          <section
            className={`cc-panel cc-workspace${dragging ? ' is-dragging' : ''}`}
            aria-labelledby="cc-code-heading"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); ctx.dropAt(null, Infinity) }}
          >
            <div className="cc-workspace-head">
              <h2 id="cc-code-heading" className="cc-subheading">{text.workspace}</h2>
              <button
                type="button"
                className="cc-secondary is-small"
                disabled={playing || program.length === 0}
                onClick={() => { playSound('click'); setTarget(null); edit(() => []) }}
              >
                {text.clearAll}
              </button>
            </div>
            <p className="cc-hint">{text.parGoal(n(level.par))}</p>

            {insideLoop && (
              <p className="cc-into">
                <span>🔁 {text.addingInto}</span>
                <button type="button" className="cc-secondary is-small" onClick={() => ctx.setTarget(null)}>{text.done}</button>
              </p>
            )}

            {program.length === 0 && !dragging && <p className="cc-empty">{text.emptyCode}</p>}
            <BlockList list={program} parentId={null} ctx={ctx} />
          </section>
        </div>
      </div>

      {result && (
        <div className="cc-win-backdrop">
          <section className="cc-win" role="dialog" aria-modal="true" aria-labelledby="cc-win-title">
            <p className="cc-win-cheer">{result.cheer}</p>
            <h2 id="cc-win-title">{text.wonTitle}</h2>
            <Stars count={result.stars} size="lg" label={text.starsLabel(n(result.stars))} />
            <p>{text.wonText(n(result.blocks))}</p>
            {result.stars < 3 && <p>{text.parText(n(level.par))}</p>}
            <p className="cc-win-xp">{text.xpEarned(n(result.xp))}</p>
            <div className="cc-win-actions">
              {hasNext && (
                <button type="button" className="cc-primary" autoFocus onClick={() => open(level.id + 1)}>
                  {text.nextLevel}
                </button>
              )}
              <button
                type="button"
                className={hasNext ? 'cc-secondary' : 'cc-primary'}
                autoFocus={!hasNext}
                onClick={() => { setResult(null); setExec(null) }}
              >
                {text.playAgain}
              </button>
              <button type="button" className="cc-secondary" onClick={backToLevels}>{text.allLevels}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
