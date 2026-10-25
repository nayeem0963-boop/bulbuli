import { useMemo, useState } from 'react'
import runnerBird from '../../assets/bulbul-runner.webp'
import { useGameProgress } from '../../hooks/useGameProgress.js'
import { playSound } from '../../utils/sound.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import {
  check, cssRule, getLevel, isUnlocked, LEVELS, PROPERTIES, setValue, startValues, starsFor, targetValues, toStyle, xpFor,
} from './engine.js'
import { DEVCRAFT_TEXT } from './text.js'
import './devcraft-studio.css'

const GAME_ID = 'devcraft-studio'

function Stars({ count, label, size = 'md' }) {
  return (
    <span className={`dc-stars is-${size}`} role="img" aria-label={label}>
      {[1, 2, 3].map((value) => (
        <span key={value} className={value <= count ? 'is-on' : ''} aria-hidden="true">★</span>
      ))}
    </span>
  )
}

/* ---------- the little web pages in the preview ---------- */

function Scene({ scene, styles, text }) {
  const words = text.scene
  switch (scene) {
    case 'avatar':
      return (
        <div className="dc-s-row" style={styles.row}>
          <span className="dc-s-avatar"><img src={runnerBird} alt="" width="240" height="236" /></span>
        </div>
      )
    case 'badge':
      return (
        <div className="dc-s-badge-card" style={styles.card}>
          <span className="dc-s-badge">{words.badge}</span>
        </div>
      )
    case 'toolbar':
      return (
        <div className="dc-s-toolbar" style={styles.toolbar}>
          <span className="dc-s-actions" style={styles.actions}>
            <b title={words.bold}>B</b>
            <i title={words.italic}>I</i>
            <u title={words.underline}>U</u>
          </span>
          <span className="dc-s-save">{words.save}</span>
        </div>
      )
    case 'grid':
      return (
        <div className="dc-s-grid" style={styles.cards}>
          {words.cards.map((name, index) => (
            <span key={name} className={`dc-s-tile is-${index + 1}`}>{name}</span>
          ))}
        </div>
      )
    case 'card':
      return (
        <div className="dc-s-profile" style={styles.card}>
          <span className="dc-s-profile-pic"><img src={runnerBird} alt="" width="240" height="236" /></span>
          <strong>{words.name}</strong>
          <span>{words.cardText}</span>
          <span className="dc-s-follow">{words.follow}</span>
        </div>
      )
    default:
      return null
  }
}

const stylesFor = (values) => Object.fromEntries(Object.entries(values).map(([key, element]) => [key, toStyle(element)]))

function Frame({ title, solved, children }) {
  return (
    <figure className={`dc-frame${solved ? ' is-solved' : ''}`}>
      <figcaption className="dc-frame-bar">
        <span className="dc-dots" aria-hidden="true"><i /><i /><i /></span>
        <span>{title}</span>
        {solved && <span className="dc-frame-ok" aria-hidden="true">✓</span>}
      </figcaption>
      <div className="dc-page">{children}</div>
    </figure>
  )
}

/* ---------- controls ---------- */

function Control({ prop, value, result, onChange, text, n }) {
  const spec = PROPERTIES[prop]
  const id = `dc-${prop}`
  const chipLabel = (option) => (prop === 'columns' ? text.columnLabel(n(option)) : String(option))
  const resultText = result && (result.ok ? text.result.ok : result.hint ? text.result[result.hint] : text.result.off)

  return (
    <fieldset className="dc-control">
      <legend>
        <code>{spec.css}</code>
        {result && <span className={`dc-result is-${result.ok ? 'ok' : 'off'}`}>{result.ok ? '✓' : '✗'} {resultText}</span>}
      </legend>
      <p className="dc-help">{text.help[prop]}</p>

      {spec.control === 'chips' && (
        <div className="dc-chips">
          {spec.options.map((option) => (
            <button
              key={option}
              type="button"
              className="dc-chip"
              aria-pressed={value === option}
              onClick={() => { playSound('click'); onChange(option) }}
            >
              {chipLabel(option)}
            </button>
          ))}
        </div>
      )}

      {spec.control === 'slider' && (
        <div className="dc-slider">
          <button type="button" className="dc-step" aria-label={`${spec.css} −${spec.step}`} disabled={value <= spec.min}
            onClick={() => { playSound('click'); onChange(Math.max(spec.min, value - spec.step)) }}>−</button>
          <input
            id={id}
            type="range"
            min={spec.min}
            max={spec.max}
            step={spec.step}
            value={value}
            aria-label={spec.css}
            aria-valuetext={`${value}${spec.unit}`}
            onChange={(event) => onChange(Number(event.target.value))}
          />
          <button type="button" className="dc-step" aria-label={`${spec.css} +${spec.step}`} disabled={value >= spec.max}
            onClick={() => { playSound('click'); onChange(Math.min(spec.max, value + spec.step)) }}>+</button>
          <output htmlFor={id} className="dc-output">{value}{spec.unit}</output>
        </div>
      )}

      {spec.control === 'swatches' && (
        <div className="dc-swatches">
          {spec.options.map((option) => (
            <button
              key={option}
              type="button"
              className="dc-swatch"
              aria-pressed={value === option}
              aria-label={`${text.colors[option]} (${option})`}
              title={`${text.colors[option]} ${option}`}
              style={{ '--swatch': option }}
              onClick={() => { playSound('click'); onChange(option) }}
            />
          ))}
        </div>
      )}
    </fieldset>
  )
}

function LiveCss({ level, values, results, text }) {
  return (
    <pre className="dc-code" aria-live="polite"><code>
      {level.elements.map((element) => {
        const rule = cssRule(element, values)
        return (
          <span key={element.key} className="dc-rule">
            <span className="dc-sel">{rule.selector}</span>{' {\n'}
            {rule.lines.map((line) => {
              const result = results[`${element.key}.${line.prop}`]
              const state = line.fixed ? 'is-fixed' : result ? (result.ok ? 'is-ok' : 'is-off') : ''
              return (
                <span key={line.prop} className={`dc-line ${state}`}>
                  {'  '}<span className="dc-prop">{line.css}</span>: <span className="dc-val">{line.value}</span>;
                  {line.fixed && <span className="dc-comment">{` /* ${text.fixedNote} */`}</span>}
                  {line.inactive && <span className="dc-comment">{` /* ${text.noEffect} */`}</span>}
                  {'\n'}
                </span>
              )
            })}
            {'}\n'}
          </span>
        )
      })}
    </code></pre>
  )
}

/* ---------- the game ---------- */

export default function DevCraftStudio({ playerId, language }) {
  const text = DEVCRAFT_TEXT[language]
  const n = (value) => formatDigits(value, language)
  const { games, saveGameResult, storageError } = useGameProgress(playerId)
  const record = games[GAME_ID] ?? {}
  const bestStars = record.bestStars ?? {}

  const [levelId, setLevelId] = useState(() => {
    const saved = getLevel(record.levelId).id
    return isUnlocked(saved, record.bestStars) ? saved : 1
  })
  const [screen, setScreen] = useState('pick') // 'pick' | 'play'
  const [values, setValues] = useState(() => startValues(getLevel(levelId)))
  const [activeKey, setActiveKey] = useState(() => getLevel(levelId).elements[0].key)
  const [overlay, setOverlay] = useState(false)
  const [checks, setChecks] = useState(0)
  const [results, setResults] = useState({}) // last check, per "element.prop"; cleared for a property when it changes
  const [summary, setSummary] = useState(null) // { ok, total } from the last check
  const [result, setResult] = useState(null)

  const level = getLevel(levelId)
  const targetStyles = useMemo(() => stylesFor(targetValues(level)), [level])
  const yourStyles = stylesFor(values)
  const element = level.elements.find((el) => el.key === activeKey) ?? level.elements[0]
  const solved = Boolean(result)

  const change = (key, prop, value) => {
    if (solved) return
    setValues((current) => setValue(level, current, key, prop, value))
    setResults((current) => {
      const next = { ...current }
      delete next[`${key}.${prop}`]
      return next
    })
    setSummary(null)
  }

  const onCheck = () => {
    const count = checks + 1
    setChecks(count)
    const outcome = check(level, values)
    setResults(Object.fromEntries(outcome.results.map((r) => [`${r.key}.${r.prop}`, r])))
    setSummary({ ok: outcome.results.filter((r) => r.ok).length, total: outcome.results.length })
    if (!outcome.solved) {
      playSound('wrong')
      return
    }
    playSound('complete')
    const stars = starsFor(count)
    const xp = xpFor(stars)
    saveGameResult(GAME_ID, (previous) => ({
      ...previous,
      levelId: level.id,
      plays: (previous.plays ?? 0) + 1,
      bestStars: { ...previous.bestStars, [level.id]: Math.max(previous.bestStars?.[level.id] ?? 0, stars) },
    }), xp)
    const cheer = text.cheers[Math.floor(Math.random() * text.cheers.length)]
    setResult({ stars, xp, checks: count, cheer })
  }

  const onReset = () => {
    playSound('click')
    setValues(startValues(level))
    setResults({})
    setSummary(null)
  }

  const open = (id) => {
    playSound('click')
    const next = getLevel(id)
    setLevelId(id)
    setValues(startValues(next))
    setActiveKey(next.elements[0].key)
    setChecks(0)
    setResults({})
    setSummary(null)
    setResult(null)
    setScreen('play')
  }

  /* ---------- level picker ---------- */

  if (screen === 'pick') {
    return (
      <div className="dc" lang={language}>
        <header className="dc-header">
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
        </header>
        {storageError && <p className="notice" role="alert">{storageError}</p>}

        <section aria-labelledby="dc-level-heading">
          <h2 id="dc-level-heading" className="dc-subheading">{text.pickLevel}</h2>
          <div className="dc-levels">
            {LEVELS.map((option) => {
              const unlocked = isUnlocked(option.id, bestStars)
              const best = bestStars[option.id] ?? 0
              return (
                <button
                  key={option.id}
                  type="button"
                  className="dc-level"
                  aria-pressed={option.id === levelId}
                  disabled={!unlocked}
                  onClick={() => { playSound('click'); setLevelId(option.id) }}
                >
                  <span className="dc-level-name">{text.levelName(n(option.id))}</span>
                  <span className="dc-level-hint">{unlocked ? text.concept[option.id] : `🔒 ${text.locked}`}</span>
                  {unlocked && <Stars count={best} size="sm" label={text.bestStars(n(best))} />}
                </button>
              )
            })}
          </div>
        </section>

        <button type="button" className="dc-primary dc-start" onClick={() => open(levelId)}>{text.start}</button>
      </div>
    )
  }

  /* ---------- studio ---------- */

  let status = { tone: 'info', message: text.idle }
  if (solved) status = { tone: 'win', message: text.solved }
  else if (summary) status = { tone: 'oops', message: text.notYet(n(summary.ok), n(summary.total)) }

  const hasNext = level.id < LEVELS.length

  return (
    <div className="dc is-playing" lang={language}>
      <header className="dc-header is-compact">
        <h1>{text.title}</h1>
        <p>{text.levelName(n(level.id))} · {text.concept[level.id]}</p>
      </header>
      {storageError && <p className="notice" role="alert">{storageError}</p>}

      <div className="dc-bar">
        <p className="dc-count">
          <span>{text.checks}</span>
          <strong>{n(checks)}</strong>
        </p>
        <Stars count={bestStars[level.id] ?? 0} size="sm" label={text.bestStars(n(bestStars[level.id] ?? 0))} />
        <div className="dc-bar-actions">
          <button type="button" className="dc-secondary" onClick={() => { setResult(null); setScreen('pick') }}>{text.allLevels}</button>
        </div>
      </div>

      <p className="dc-mission">{text.mission[level.id]}</p>

      <div className="dc-play">
        <div className="dc-previews">
          <Frame title={text.target}>
            <div aria-hidden="true"><Scene scene={level.scene} styles={targetStyles} text={text} /></div>
          </Frame>
          <Frame title={text.yours} solved={solved}>
            <div aria-hidden="true" className="dc-live">
              <Scene scene={level.scene} styles={yourStyles} text={text} />
              {overlay && !solved && (
                <div className="dc-ghost"><Scene scene={level.scene} styles={targetStyles} text={text} /></div>
              )}
            </div>
          </Frame>
          <label className="dc-toggle">
            <input type="checkbox" checked={overlay} onChange={(event) => setOverlay(event.target.checked)} />
            <span>{text.overlay}</span>
          </label>
        </div>

        <div className="dc-side">
          <section className="dc-panel" aria-labelledby="dc-controls-heading">
            <h2 id="dc-controls-heading" className="dc-subheading">{text.controls}</h2>
            {level.elements.length > 1 && (
              <div className="dc-tabs" role="group" aria-label={text.element}>
                {level.elements.map((el) => (
                  <button key={el.key} type="button" className="dc-tab" aria-pressed={el.key === element.key}
                    onClick={() => { playSound('click'); setActiveKey(el.key) }}>
                    <code>{el.selector}</code>
                  </button>
                ))}
              </div>
            )}
            {level.elements.length === 1 && <p className="dc-selector"><code>{element.selector}</code></p>}

            {element.controls.map((prop) => (
              <Control
                key={`${element.key}.${prop}`}
                prop={prop}
                value={values[element.key][prop]}
                result={results[`${element.key}.${prop}`]}
                onChange={(value) => change(element.key, prop, value)}
                text={text}
                n={n}
              />
            ))}
          </section>

          <section className="dc-panel" aria-labelledby="dc-code-heading">
            <h2 id="dc-code-heading" className="dc-subheading">{text.code}</h2>
            <LiveCss level={level} values={values} results={results} text={text} />
          </section>

          <div className={`dc-status is-${status.tone}`} aria-live="polite"><p>{status.message}</p></div>

          <div className="dc-actions">
            <button type="button" className="dc-primary" onClick={onCheck} disabled={solved}>✓ {text.check}</button>
            <button type="button" className="dc-secondary" onClick={onReset} disabled={solved}>↺ {text.reset}</button>
          </div>
        </div>
      </div>

      {result && (
        <div className="dc-win-backdrop">
          <section className="dc-win" role="dialog" aria-modal="true" aria-labelledby="dc-win-title">
            <p className="dc-win-cheer">{result.cheer}</p>
            <h2 id="dc-win-title">{text.wonTitle}</h2>
            <Stars count={result.stars} size="lg" label={text.starsLabel(n(result.stars))} />
            <p>{text.wonText(n(result.checks))}</p>
            <p className="dc-win-xp">{text.xpEarned(n(result.xp))}</p>
            <div className="dc-win-actions">
              {hasNext && (
                <button type="button" className="dc-primary" autoFocus onClick={() => open(level.id + 1)}>{text.nextLevel}</button>
              )}
              <button type="button" className={hasNext ? 'dc-secondary' : 'dc-primary'} autoFocus={!hasNext} onClick={() => open(level.id)}>
                {text.playAgain}
              </button>
              <button type="button" className="dc-secondary" onClick={() => { setResult(null); setScreen('pick') }}>{text.allLevels}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
