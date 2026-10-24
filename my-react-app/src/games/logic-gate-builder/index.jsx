import { useEffect, useMemo, useRef, useState } from 'react'
import runnerBird from '../../assets/bulbul-runner.webp'
import { useTutorialProgress } from '../../hooks/useTutorialProgress.js'
import { playSound } from '../../utils/sound.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import {
  connect, disconnect, emptyCircuit, GATES, getLevel, isUnlocked, LEVELS, OUTPUT, OUTPUT_PIN, pinKey, pinsOf, placeGate,
  simulate, sourcesFor, startInputs, starsFor, truthTable, xpFor,
} from './engine.js'
import { LOGIC_TEXT } from './text.js'
import './logic-gate-builder.css'

const GAME_ID = 'logic-gate-builder'
const ROW_MS = 650 // time per truth-table row during a power test

/* ---------- board geometry (SVG viewBox 640 × 360) ---------- */

const SWITCH_X = 70
const DEVICE = { x: 575, y: 180, pinX: 508 }
const switchOut = (input) => ({ x: SWITCH_X + 52, y: input.y })
const gateIn = (socket, index, count) => ({ x: socket.x - 56, y: count === 1 ? socket.y : socket.y + (index === 0 ? -16 : 16) })
const gateOut = (socket) => ({ x: socket.x + 56, y: socket.y })
const wirePath = (from, to) => {
  const bend = Math.max(30, (to.x - from.x) / 2)
  return `M${from.x} ${from.y} C${from.x + bend} ${from.y} ${to.x - bend} ${to.y} ${to.x} ${to.y}`
}

const GATE_SHAPES = {
  AND: 'M-40 -28 H2 A28 28 0 0 1 2 28 H-40 Z',
  NAND: 'M-40 -28 H-4 A28 28 0 0 1 -4 28 H-40 Z',
  OR: 'M-42 -28 Q2 -28 40 0 Q2 28 -42 28 Q-28 0 -42 -28 Z',
  XOR: 'M-36 -28 Q6 -28 40 0 Q6 28 -36 28 Q-22 0 -36 -28 Z',
  NOT: 'M-34 -26 L26 0 L-34 26 Z',
}

const signalClass = (value) => (value === 1 ? 'is-high' : value === 0 ? 'is-low' : 'is-unknown')

/** A tappable SVG thing that also works with the keyboard. */
function Hit({ label, onActivate, className = '', children, ...rest }) {
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      className={`lg-hit ${className}`}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onActivate() }
      }}
      {...rest}
    >
      {children}
    </g>
  )
}

function Pin({ at, label, onActivate, state, value }) {
  return (
    <Hit label={label} onActivate={onActivate} className={`lg-pin ${state} ${signalClass(value)}`}>
      <circle className="lg-pin-target" cx={at.x} cy={at.y} r="15" />
      <circle className="lg-pin-dot" cx={at.x} cy={at.y} r="6.5" />
    </Hit>
  )
}

function Device({ type, value, won }) {
  const cls = `lg-device is-${type} ${signalClass(value)}`
  const { x, y } = DEVICE
  return (
    <g className={cls}>
      <line className="lg-device-lead" x1={DEVICE.pinX} y1={y} x2={x - 36} y2={y} />
      {type === 'bulb' && (
        <>
          <circle className="lg-bulb-glow" cx={x} cy={y - 10} r="54" />
          <circle className="lg-bulb-glass" cx={x} cy={y - 10} r="32" />
          <path className="lg-bulb-filament" d={`M${x - 10} ${y - 4} q5 -14 10 0 q5 -14 10 0`} />
          <rect className="lg-bulb-base" x={x - 15} y={y + 20} width="30" height="20" rx="4" />
        </>
      )}
      {type === 'door' && (
        <>
          <rect className="lg-door-frame" x={x - 36} y={y - 62} width="72" height="124" rx="6" />
          <rect className="lg-door-gap" x={x - 30} y={y - 56} width="60" height="112" />
          <g className="lg-door-panel" style={{ transformOrigin: `${x - 30}px ${y}px` }}>
            <rect x={x - 30} y={y - 56} width="60" height="112" rx="3" />
            <circle className="lg-door-knob" cx={x + 18} cy={y + 2} r="5" />
          </g>
        </>
      )}
      {type === 'alarm' && (
        <>
          <circle className="lg-alarm-light" cx={x} cy={y - 78} r="13" />
          <path className="lg-house-roof" d={`M${x - 46} ${y - 30} L${x} ${y - 70} L${x + 46} ${y - 30} Z`} />
          <rect className="lg-house-body" x={x - 36} y={y - 30} width="72" height="76" rx="4" />
          <circle className="lg-house-hole" cx={x} cy={y - 2} r="14" />
          <rect className="lg-house-perch" x={x - 4} y={y + 18} width="8" height="16" rx="2" />
        </>
      )}
      <image className={`lg-bird${won ? ' is-won' : ''}`} href={runnerBird} x={x - 32} y={y + 60} width="64" height="63" />
    </g>
  )
}

/* ---------- the board ---------- */

function Board({ level, circuit, signals, inputs, pending, armed, locked, won, text, n, actions }) {
  const names = text.inputNames[level.id]
  const deviceName = text.devices[level.device]
  const socketNo = (socket) => n(level.sockets.indexOf(socket) + 1)
  const sourceAt = (id) => {
    const input = level.inputs.find((candidate) => candidate.id === id)
    return input ? switchOut(input) : gateOut(level.sockets.find((socket) => socket.id === id))
  }
  const pinAt = (key) => {
    if (key === OUTPUT_PIN) return { x: DEVICE.pinX, y: DEVICE.y }
    const [node, index] = key.split('.')
    const socket = level.sockets.find((candidate) => candidate.id === node)
    return gateIn(socket, Number(index), GATES[circuit.gates[node]].inputs)
  }

  // light up what the pending end may connect to
  const candidateSources = pending?.type === 'pin' ? sourcesFor(level, pending.key) : []
  const pinState = (key) => {
    if (pending?.type === 'pin' && pending.key === key) return 'is-picked'
    if (pending?.type === 'source' && sourcesFor(level, key).includes(pending.id)) return 'is-candidate'
    return ''
  }
  const sourceState = (id) => {
    if (pending?.type === 'source' && pending.id === id) return 'is-picked'
    if (candidateSources.includes(id)) return 'is-candidate'
    return ''
  }

  return (
    <svg className={`lg-board${locked ? ' is-locked' : ''}`} viewBox="0 0 640 360" role="group" aria-label={text.mission[level.id]}>
      {/* wires go underneath everything */}
      <g className="lg-wires">
        {Object.entries(circuit.wires).map(([pin, source]) => (
          <g key={pin} className={`lg-wire ${signalClass(signals[source])}`}>
            <path className="lg-wire-under" d={wirePath(sourceAt(source), pinAt(pin))} />
            <path className="lg-wire-line" d={wirePath(sourceAt(source), pinAt(pin))} />
          </g>
        ))}
      </g>

      {level.inputs.map((input) => {
        const on = inputs[input.id] === 1
        return (
          <g key={input.id}>
            <text className="lg-switch-name" x={SWITCH_X - 8} y={input.y - 32} textAnchor="middle">{names[input.id]}</text>
            <Hit
              label={text.toggle(names[input.id], inputs[input.id])}
              onActivate={() => actions.toggle(input.id)}
              className={`lg-switch${on ? ' is-on' : ''}`}
              aria-pressed={on}
            >
              <rect x={SWITCH_X - 50} y={input.y - 22} width="84" height="44" rx="22" />
              <text className="lg-switch-value" x={on ? SWITCH_X - 26 : SWITCH_X + 10} y={input.y + 7} textAnchor="middle">{on ? 'ON' : 'OFF'}</text>
              <circle className="lg-switch-knob" cx={on ? SWITCH_X + 12 : SWITCH_X - 28} cy={input.y} r="15" />
            </Hit>
            <line className={`lg-lead ${signalClass(inputs[input.id])}`} x1={SWITCH_X + 34} y1={input.y} x2={SWITCH_X + 52} y2={input.y} />
            <Pin at={switchOut(input)} label={text.sourceLabel(names[input.id])} value={inputs[input.id]}
              state={sourceState(input.id)} onActivate={() => actions.source(input.id)} />
          </g>
        )
      })}

      {level.sockets.map((socket) => {
        const type = circuit.gates[socket.id]
        const no = socketNo(socket)
        const drop = {
          onDragOver: (event) => { if (!locked) event.preventDefault() },
          onDrop: (event) => {
            event.preventDefault()
            const dropped = event.dataTransfer.getData('text/plain')
            if (GATES[dropped]) actions.place(socket.id, dropped)
          },
        }
        if (!type) {
          return (
            <Hit key={socket.id} label={`${text.socket(no)}: ${text.emptySocket}`} onActivate={() => actions.socket(socket.id)}
              className={`lg-socket is-empty${armed ? ' is-armed' : ''}`} {...drop}>
              <rect x={socket.x - 48} y={socket.y - 36} width="96" height="72" rx="14" />
              <text x={socket.x} y={socket.y - 2} textAnchor="middle">{text.socket(no)}</text>
              <text className="lg-socket-hint" x={socket.x} y={socket.y + 16} textAnchor="middle">{armed ?? '+'}</text>
            </Hit>
          )
        }
        const count = GATES[type].inputs
        const value = signals[socket.id]
        return (
          <g key={socket.id} className={`lg-gate ${signalClass(value)}`} {...drop}>
            {Array.from({ length: count }, (_, index) => {
              const at = gateIn(socket, index, count)
              return <line key={index} className="lg-lead" x1={at.x} y1={at.y} x2={socket.x - 34} y2={at.y} />
            })}
            <line className={`lg-lead ${signalClass(value)}`} x1={socket.x + 30} y1={socket.y} x2={socket.x + 56} y2={socket.y} />
            <Hit label={text.gateLabel(type, no, text.signalName[value])} onActivate={() => actions.socket(socket.id)} className="lg-gate-body">
              <path d={GATE_SHAPES[type]} transform={`translate(${socket.x} ${socket.y})`} />
              {(type === 'NOT' || type === 'NAND') && <circle className="lg-bubble" cx={socket.x + 31} cy={socket.y} r="5" />}
              {type === 'XOR' && <path className="lg-xor-arc" d={`M${socket.x - 46} ${socket.y - 28} Q${socket.x - 32} ${socket.y} ${socket.x - 46} ${socket.y + 28}`} />}
              <text className="lg-gate-name" x={socket.x - (type === 'NOT' ? 10 : 6)} y={socket.y + 5} textAnchor="middle">{type}</text>
            </Hit>
            {!locked && (
              <Hit label={text.removeGate(no)} onActivate={() => actions.place(socket.id, null)} className="lg-remove">
                <circle cx={socket.x + 30} cy={socket.y - 34} r="11" />
                <text x={socket.x + 30} y={socket.y - 30} textAnchor="middle">✕</text>
              </Hit>
            )}
            {Array.from({ length: count }, (_, index) => {
              const key = pinKey(socket.id, index)
              return (
                <Pin key={key} at={gateIn(socket, index, count)} label={text.pinLabel(`${type} ${text.socket(no)}`, n(index + 1))}
                  value={circuit.wires[key] ? signals[circuit.wires[key]] : null} state={pinState(key)} onActivate={() => actions.pin(key)} />
              )
            })}
            <Pin at={gateOut(socket)} label={text.sourceLabel(`${type} ${text.socket(no)}`)} value={value}
              state={sourceState(socket.id)} onActivate={() => actions.source(socket.id)} />
            <text className={`lg-value ${signalClass(value)}`} x={socket.x + 56} y={socket.y - 14} textAnchor="middle">{text.signal[value]}</text>
          </g>
        )
      })}

      <Device type={level.device} value={signals[OUTPUT]} won={won} />
      <Pin at={{ x: DEVICE.pinX, y: DEVICE.y }} label={`${text.deviceInput(deviceName)}: ${text.deviceState[level.device][signals[OUTPUT]]}`}
        value={signals[OUTPUT]} state={pinState(OUTPUT_PIN)} onActivate={() => actions.pin(OUTPUT_PIN)} />
      <text className="lg-device-name" x={DEVICE.x} y={34} textAnchor="middle">
        {deviceName}: {text.deviceState[level.device][signals[OUTPUT]]}
      </text>
    </svg>
  )
}

function Stars({ count, label, size = 'md' }) {
  return (
    <span className={`lg-stars is-${size}`} role="img" aria-label={label}>
      {[1, 2, 3].map((value) => (
        <span key={value} className={value <= count ? 'is-on' : ''} aria-hidden="true">★</span>
      ))}
    </span>
  )
}

/* ---------- the game ---------- */

export default function LogicGateBuilder({ playerId, language }) {
  const text = LOGIC_TEXT[language]
  const n = (value) => formatDigits(value, language)
  const { games, saveGameResult, storageError } = useTutorialProgress(playerId)
  const record = games[GAME_ID] ?? {}
  const bestStars = record.bestStars ?? {}

  const [levelId, setLevelId] = useState(() => {
    const saved = getLevel(record.levelId).id
    return isUnlocked(saved, record.bestStars) ? saved : 1
  })
  const [screen, setScreen] = useState('pick') // 'pick' | 'play'
  const [circuit, setCircuit] = useState(() => emptyCircuit(getLevel(levelId)))
  const [inputs, setInputs] = useState(() => startInputs(getLevel(levelId)))
  const [pending, setPending] = useState(null) // { type: 'pin', key } | { type: 'source', id }
  const [armed, setArmed] = useState(null) // gate picked in the palette, waiting for a socket
  const [run, setRun] = useState(null) // { table, index, done } during and after a power test
  const [tests, setTests] = useState(0)
  const [result, setResult] = useState(null)
  const saved = useRef(null)

  const level = getLevel(levelId)
  const names = text.inputNames[level.id]
  const testing = Boolean(run && !run.done)
  const shownInputs = testing ? run.table[Math.min(run.index, run.table.length - 1)].inputs : inputs
  const signals = simulate(level, circuit, shownInputs)
  const table = useMemo(() => truthTable(level, circuit), [level, circuit])
  const won = Boolean(run?.done && run.table.every((row) => row.ok))

  const edit = (next) => {
    if (testing || won || next === circuit) return false
    setCircuit(next)
    setRun(null)
    return true
  }

  const actions = {
    toggle: (id) => {
      if (testing) return
      playSound('click')
      setInputs((current) => ({ ...current, [id]: 1 - current[id] }))
    },
    place: (socketId, type) => {
      if (edit(placeGate(level, circuit, socketId, type))) playSound('click')
      setArmed(null)
      setPending(null)
    },
    socket: (socketId) => {
      if (armed) actions.place(socketId, armed)
    },
    pin: (key) => {
      if (testing || won) return
      if (pending?.type === 'source') {
        const next = connect(level, circuit, key, pending.id)
        playSound(next === circuit ? 'wrong' : 'click')
        edit(next)
        setPending(null)
      } else if (pending?.type === 'pin' && pending.key === key) {
        if (edit(disconnect(circuit, key))) playSound('click')
        setPending(null)
      } else {
        playSound('click')
        setPending({ type: 'pin', key })
      }
    },
    source: (id) => {
      if (testing || won) return
      if (pending?.type === 'pin') {
        const next = connect(level, circuit, pending.key, id)
        playSound(next === circuit ? 'wrong' : 'click')
        edit(next)
        setPending(null)
      } else if (pending?.type === 'source' && pending.id === id) {
        setPending(null)
      } else {
        playSound('click')
        setPending({ type: 'source', id })
      }
    },
  }

  const onTest = () => {
    if (testing || won) return
    playSound('click')
    setPending(null)
    setArmed(null)
    setTests((count) => count + 1)
    setRun({ table, index: 0, done: false })
  }

  // Step through the truth table, one row at a time.
  useEffect(() => {
    if (!run || run.done) return undefined
    const timer = window.setTimeout(() => {
      const row = run.table[run.index]
      playSound(row.ok ? 'correct' : 'wrong')
      const next = run.index + 1
      setRun({ ...run, index: next, done: next >= run.table.length })
    }, ROW_MS)
    return () => window.clearTimeout(timer)
  }, [run])

  // A passed test: save stars and XP once, then celebrate.
  useEffect(() => {
    if (!won || saved.current === run) return
    saved.current = run
    playSound('complete')
    const stars = starsFor(tests)
    const xp = xpFor(stars)
    saveGameResult(GAME_ID, (previous) => ({
      ...previous,
      levelId: level.id,
      plays: (previous.plays ?? 0) + 1,
      bestStars: { ...previous.bestStars, [level.id]: Math.max(previous.bestStars?.[level.id] ?? 0, stars) },
    }), xp)
    const cheer = text.cheers[Math.floor(Math.random() * text.cheers.length)]
    setResult({ stars, xp, tests, cheer })
  }, [won, run, tests, level, saveGameResult, text])

  const open = (id) => {
    playSound('click')
    const next = getLevel(id)
    setLevelId(id)
    setCircuit(emptyCircuit(next))
    setInputs(startInputs(next))
    setPending(null)
    setArmed(null)
    setRun(null)
    setTests(0)
    setResult(null)
    setScreen('play')
  }

  /* ---------- level picker ---------- */

  if (screen === 'pick') {
    return (
      <div className="lg" lang={language}>
        <header className="lg-header">
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
        </header>
        {storageError && <p className="notice" role="alert">{storageError}</p>}
        <section aria-labelledby="lg-level-heading">
          <h2 id="lg-level-heading" className="lg-subheading">{text.pickLevel}</h2>
          <div className="lg-levels">
            {LEVELS.map((option) => {
              const unlocked = isUnlocked(option.id, bestStars)
              const best = bestStars[option.id] ?? 0
              return (
                <button key={option.id} type="button" className="lg-level" aria-pressed={option.id === levelId} disabled={!unlocked}
                  onClick={() => { playSound('click'); setLevelId(option.id) }}>
                  <span className="lg-level-name">{text.levelName(n(option.id))}</span>
                  <span className="lg-level-hint">{unlocked ? text.concept[option.id] : `🔒 ${text.locked}`}</span>
                  {unlocked && <Stars count={best} size="sm" label={text.bestStars(n(best))} />}
                </button>
              )
            })}
          </div>
        </section>
        <button type="button" className="lg-primary lg-start" onClick={() => open(levelId)}>⚡ {text.start}</button>
      </div>
    )
  }

  /* ---------- workbench ---------- */

  const okRows = run?.done ? run.table.filter((row) => row.ok).length : 0
  let status = { tone: 'info', message: text.idle }
  if (testing) status = { tone: 'info', message: text.testing(n(Math.min(run.index + 1, run.table.length)), n(run.table.length)) }
  else if (won) status = { tone: 'win', message: text.passed }
  else if (run?.done) {
    status = {
      tone: 'oops',
      message: text.failed(n(okRows), n(run.table.length)),
      tip: run.table.some((row) => row.actual === null) ? text.unknownTip : '',
    }
  } else if (pending?.type === 'pin') status = { tone: 'info', message: text.pickSource }
  else if (pending?.type === 'source') status = { tone: 'info', message: text.pickPin }
  else if (armed) status = { tone: 'info', message: text.armed(armed) }

  const rowMark = (index) => {
    if (!run || (!run.done && index >= run.index)) return null
    return run.table[index].ok
  }
  const isCurrentRow = (row) => level.inputs.every((input) => row.inputs[input.id] === shownInputs[input.id])
  const socketName = (socket) => text.socket(n(level.sockets.indexOf(socket) + 1))
  const sourceLabel = (id) => names[id] ?? `${socketName(level.sockets.find((s) => s.id === id))} (${circuit.gates[id] ?? '—'})`
  const hasNext = level.id < LEVELS.length

  return (
    <div className="lg is-playing" lang={language}>
      <header className="lg-header is-compact">
        <h1>{text.title}</h1>
        <p>{text.levelName(n(level.id))} · {text.concept[level.id]}</p>
      </header>
      {storageError && <p className="notice" role="alert">{storageError}</p>}

      <div className="lg-bar">
        <p className="lg-count"><span>{text.tests}</span><strong>{n(tests)}</strong></p>
        <Stars count={bestStars[level.id] ?? 0} size="sm" label={text.bestStars(n(bestStars[level.id] ?? 0))} />
        <div className="lg-bar-actions">
          <button type="button" className="lg-secondary" onClick={() => { setResult(null); setScreen('pick') }}>{text.allLevels}</button>
        </div>
      </div>

      <p className="lg-mission">{text.mission[level.id]}</p>

      <div className="lg-play">
        <div className="lg-bench">
          <section className="lg-panel lg-board-panel" aria-label={text.mission[level.id]}>
            <Board level={level} circuit={circuit} signals={signals} inputs={shownInputs} pending={pending} armed={armed}
              locked={testing || won} won={won} text={text} n={n} actions={actions} />
            <p className="lg-hint">{text.wiringHint}</p>
          </section>

          <section className="lg-panel" aria-labelledby="lg-gates-heading">
            <h2 id="lg-gates-heading" className="lg-subheading">{text.gatesHeading}</h2>
            <p className="lg-hint">{text.paletteHint}</p>
            <div className="lg-palette">
              {level.palette.map((type) => (
                <div
                  key={type}
                  role="button"
                  tabIndex={0}
                  aria-pressed={armed === type}
                  aria-disabled={testing || won || undefined}
                  className="lg-chip"
                  draggable={!testing && !won}
                  onDragStart={(event) => { event.dataTransfer.setData('text/plain', type); event.dataTransfer.effectAllowed = 'copy' }}
                  onClick={() => { if (testing || won) return; playSound('click'); setPending(null); setArmed(armed === type ? null : type) }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    if (!testing && !won) setArmed(armed === type ? null : type)
                  }}
                >
                  <strong>{type}</strong>
                  <span>{text.gateHelp[type]}</span>
                </div>
              ))}
            </div>
          </section>

          <div className={`lg-status is-${status.tone}`} aria-live="polite">
            <p>{status.message}</p>
            {status.tip && <p className="lg-status-tip">{status.tip}</p>}
          </div>
          <button type="button" className="lg-primary lg-test" onClick={onTest} disabled={testing || won}>⚡ {text.test}</button>
        </div>

        <div className="lg-side">
          <section className="lg-panel" aria-labelledby="lg-table-heading">
            <h2 id="lg-table-heading" className="lg-subheading">{text.table}</h2>
            <p className="lg-hint">{text.tableHint}</p>
            <div className="lg-table-wrap">
              <table className="lg-table">
                <thead>
                  <tr>
                    {level.inputs.map((input) => <th key={input.id} scope="col" title={names[input.id]}>{names[input.id]}</th>)}
                    <th scope="col" className="is-goal">{text.goal}</th>
                    <th scope="col">{text.yours}</th>
                    <th scope="col"><span className="visually-hidden">✓ / ✗</span></th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((row, index) => {
                    const mark = rowMark(index)
                    return (
                      <tr key={index} className={`${isCurrentRow(row) ? 'is-current' : ''}${mark === false ? ' is-bad' : ''}`}>
                        {level.inputs.map((input) => <td key={input.id} className={signalClass(row.inputs[input.id])}>{row.inputs[input.id]}</td>)}
                        <td className={`is-goal ${signalClass(row.goal)}`}>{row.goal}</td>
                        <td className={signalClass(row.actual)}>{text.signal[row.actual]}</td>
                        <td className="lg-mark">{mark === null ? '' : mark ? '✓' : '✗'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <details className="lg-panel lg-wiring">
            <summary className="lg-subheading">{text.wiringList}</summary>
            <p className="lg-hint">{text.wiringListHint}</p>
            {level.sockets.map((socket) => (
              <fieldset key={socket.id} className="lg-wiring-group">
                <legend>{socketName(socket)}</legend>
                <label>
                  <span>{text.gatesHeading}</span>
                  <select value={circuit.gates[socket.id] ?? ''} disabled={testing || won}
                    onChange={(event) => actions.place(socket.id, event.target.value || null)}>
                    <option value="">{text.noGate}</option>
                    {level.palette.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                {pinsOf(level, circuit).filter((pin) => pin.node === socket.id).map((pin) => (
                  <label key={pin.key}>
                    <span>{text.pinLabel(circuit.gates[socket.id], n(pin.index + 1))}</span>
                    <select value={circuit.wires[pin.key] ?? ''} disabled={testing || won}
                      onChange={(event) => edit(event.target.value ? connect(level, circuit, pin.key, event.target.value) : disconnect(circuit, pin.key))}>
                      <option value="">{text.notConnected}</option>
                      {sourcesFor(level, pin.key).map((id) => <option key={id} value={id}>{sourceLabel(id)}</option>)}
                    </select>
                  </label>
                ))}
              </fieldset>
            ))}
            <fieldset className="lg-wiring-group">
              <legend>{text.devices[level.device]}</legend>
              <label>
                <span>{text.deviceInput(text.devices[level.device])}</span>
                <select value={circuit.wires[OUTPUT_PIN] ?? ''} disabled={testing || won}
                  onChange={(event) => edit(event.target.value ? connect(level, circuit, OUTPUT_PIN, event.target.value) : disconnect(circuit, OUTPUT_PIN))}>
                  <option value="">{text.notConnected}</option>
                  {sourcesFor(level, OUTPUT_PIN).map((id) => <option key={id} value={id}>{sourceLabel(id)}</option>)}
                </select>
              </label>
            </fieldset>
          </details>
        </div>
      </div>

      {result && (
        <div className="lg-win-backdrop">
          <section className="lg-win" role="dialog" aria-modal="true" aria-labelledby="lg-win-title">
            <p className="lg-win-cheer">{result.cheer}</p>
            <h2 id="lg-win-title">{text.wonTitle[level.device]}</h2>
            <Stars count={result.stars} size="lg" label={text.starsLabel(n(result.stars))} />
            <p>{text.wonText(n(result.tests))}</p>
            <p className="lg-win-xp">{text.xpEarned(n(result.xp))}</p>
            <div className="lg-win-actions">
              {hasNext && <button type="button" className="lg-primary" autoFocus onClick={() => open(level.id + 1)}>{text.nextLevel}</button>}
              <button type="button" className={hasNext ? 'lg-secondary' : 'lg-primary'} autoFocus={!hasNext} onClick={() => open(level.id)}>{text.playAgain}</button>
              <button type="button" className="lg-secondary" onClick={() => { setResult(null); setScreen('pick') }}>{text.allLevels}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
