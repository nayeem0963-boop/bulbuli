/**
 * World Explorer 3D: the game screens (design 8.2, 4.4, 4.4.2, 2.11).
 *
 * Flow: expedition menu → expedition (3D map + five stations) → report (set A, one retry with
 * set B) → back to the menu. A journal is reachable from the menu and the expedition.
 *
 * Learning data goes ONLY through the learning adapter's world.* transactions. Each station step,
 * Explain attempt and Record is committed BEFORE the learner sees its result (persistence points,
 * design 2.11). A visit-scoped action refused with 'visit-sealed' means another tab or window
 * continued this expedition: the stale-tab dialog appears and nothing is written (design 4.4.2).
 * The game never imports storage, XP, Supabase or progress code (isolation tests I3/I4).
 *
 * Props:
 *   language    'en' | 'bn'
 *   items       learning items (preview: all; release: shippable only)
 *   isReviewed  (item) => boolean; unreviewed items get a visible badge
 *   dark        boolean, for the 3D colours
 *   onQa        optional callback for the dev preview's automated tests
 */
import Investigation from './Investigation.jsx'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useLearningAdapter } from '../../learning/adapters/adapterContext.js'
import { useLearningSnapshot } from '../../learning/store/learningStore.js'
import { useReducedMotion } from '../../shared/hooks/useReducedMotion.js'
import { useFullscreen } from '../../shared/hooks/useFullscreen.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import { useInputState, useKeyboardInput } from '../skyward-explorer/input.js'
import { BIOMES } from './biomes/index.js'
import {
  completedCount, createPracticeWorld, expeditionContent, expeditionPlayable, explainHelp, journalFor,
  optionsFor, reportStatus, starsForScore, stationPhase, stationRecord, wrongAttempts,
} from './session.js'
import { EXPEDITIONS, WORLD_TEXT } from './text.js'
import './world-explorer.css'

const ExpeditionCanvas = lazy(() => import('./ExpeditionCanvas.jsx'))

/* ------------------------------------------------------------------ session: adapter or practice */

const noSubscribe = () => () => {}
const noRecord = () => null

function useWorldSession(adapter, snapshot) {
  const pw = useMemo(() => (snapshot.practice ? createPracticeWorld() : null), [snapshot.practice])
  const practiceRecord = useSyncExternalStore(pw ? pw.subscribe : noSubscribe, pw ? pw.getRecord : noRecord, pw ? pw.getRecord : noRecord)
  if (pw) return { api: pw, record: practiceRecord, unfinished: [], practice: true }
  return { api: adapter.world, record: snapshot.world, unfinished: snapshot.unfinishedVisits ?? [], practice: false }
}

/* ------------------------------------------------------------------ small pieces */

function Stars({ count, label }) {
  return (
    <span className="wx-stars" role="img" aria-label={label}>
      {[1, 2, 3].map((i) => <span key={i} className={i <= count ? 'is-on' : ''} aria-hidden="true">★</span>)}
    </span>
  )
}

function Badge({ show, text }) {
  return show ? <span className="wx-badge" title="Awaiting science and Bangla review">{text}</span> : null
}

function StaleDialog({ text, onContinue, onRefresh }) {
  const first = useRef(null)
  useEffect(() => { first.current?.focus() }, [])
  return (
    <div className="wx-dialog-backdrop">
      <div className="wx-dialog" role="alertdialog" aria-modal="true" aria-labelledby="wx-stale-h" aria-describedby="wx-stale-b" data-testid="wx-stale">
        <h2 id="wx-stale-h">{text.staleTitle}</h2>
        <p id="wx-stale-b">{text.staleBody}</p>
        <div className="wx-row">
          <button ref={first} type="button" className="wx-primary" onClick={onContinue}>{text.staleContinue}</button>
          <button type="button" className="wx-secondary" onClick={onRefresh}>{text.staleRefresh}</button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ menu */

function ExpeditionMenu({ text, language, contentById, record, unfinished, practice, onStart, onJournal }) {
  const n = (v) => formatDigits(v, language)
  return (
    <section aria-labelledby="wx-menu-h">
      <h2 id="wx-menu-h" className="wx-visually-hidden">{text.title}</h2>
      <div className="wx-cards">
        {EXPEDITIONS.map((e) => {
          const content = contentById[e.id]
          const playable = Boolean(content && expeditionPlayable(content))
          const done = completedCount(record, e.id)
          const rs = reportStatus(record, e.id)
          const open = unfinished.filter((v) => v.expedition === e.id && (v.rewards?.length ?? 0) > 0)
          const savedXp = open.reduce((sum, v) => sum + (v.xp ?? 0), 0)
          return (
            <article key={e.id} className={`wx-card${playable ? '' : ' is-soon'}`} data-expedition={e.id}>
              <span className="wx-card-icon" aria-hidden="true">{e.icon}</span>
              <h3>{e.name[language]}</h3>
              <p className="wx-muted">{e.blurb[language]}</p>
              {playable ? (
                <>
                  <p className="wx-progress-line">
                    {text.stationsDone(n(done))}
                    {rs.filings > 0 ? <Stars count={rs.bestStars} label={text.stars(n(rs.bestStars))} /> : null}
                  </p>
                  {open.length > 0 && !practice ? (
                    <div className="wx-banner" role="status" data-testid={`wx-unfinished-${e.id}`}>
                      <p>{text.unfinished(e.name[language], n(done), n(savedXp))}</p>
                      <div className="wx-row">
                        <button type="button" className="wx-primary" onClick={() => onStart(e.id)}>{text.continueExp}</button>
                        <button type="button" className="wx-secondary" onClick={() => onJournal(e.id)}>{text.viewJournal}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="wx-row">
                      <button type="button" className="wx-primary" onClick={() => onStart(e.id)} data-start={e.id}>{done > 0 ? text.continueExp : text.start}</button>
                      {done > 0 || rs.filings > 0 ? <button type="button" className="wx-secondary" onClick={() => onJournal(e.id)}>{text.viewJournal}</button> : null}
                    </div>
                  )}
                </>
              ) : (
                <span className="wx-soon">{text.comingSoon}</span>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ station panel */

function StationPanel({ text, language, item, record, expedition, isReviewed, run, onClose, practice, preview, onQa }) {
  const s = stationRecord(record, expedition, item.station.n)
  const phase = stationPhase(s)
  const [replaying, setReplaying] = useState(false)
  const [feedback, setFeedback] = useState(null) // { correct, key } after a committed attempt
  const [xpResult, setXpResult] = useState(null)
  const options = useMemo(() => optionsFor(item), [item])
  const L = (v) => v?.[language] ?? v?.en
  const wrong = wrongAttempts(s)
  const help = explainHelp(wrong)
  const triedWrong = new Set((replaying ? s.replayAttempts ?? [] : s.attempts ?? []).filter((a) => !a.correct).map((a) => a.choice))
  const heading = useRef(null)
  useEffect(() => { heading.current?.focus() }, [])
  useEffect(() => {
    onQa?.({ screen: 'station', station: item.station.n, phase: replaying ? 'replay' : phase, correctKey: options.find((o) => o.correct).key, interaction: item.station.interaction })
  }, [onQa, item, phase, replaying, options])

  const step = (name) => run(['saveStationProgress', item.station.n, name])

  const choose = async (opt) => {
    setFeedback(null)
    const result = await run(['recordExplainAttempt', item.station.n, opt.key, opt.correct])
    if (result?.ok) setFeedback({ correct: opt.correct, key: opt.key })
  }

  const doRecord = async () => {
    const result = await run(['completeStation', item.station.n])
    if (result?.ok) {
      setXpResult(result.xp ?? 0)
      setReplaying(false)
      setFeedback(null)
    }
  }

  const showExplain = phase === 'explain' || phase === 'record' || replaying
  const lastFeedbackOption = feedback ? options.find((o) => o.key === feedback.key) : null
  const replayCorrect = replaying && (s.replayAttempts ?? []).some((a) => a.correct)

  return (
    <section className="wx-station" aria-labelledby="wx-station-h" data-testid="wx-station" data-phase={replaying ? 'replay' : phase}>
      <div className="wx-row">
        <h2 id="wx-station-h" ref={heading} tabIndex={-1}>
          {text.stationLabel(formatDigits(item.station.n, language))}: {L(item.station.title)}
          <Badge show={!isReviewed(item)} text={text.unreviewed} />
        </h2>
        <button type="button" className="wx-small" onClick={onClose}>{text.close}</button>
      </div>
      <ol className="wx-steps" aria-label="Steps">
        {['observe', 'investigate', 'explain', 'record'].map((k) => {
          const order = ['observe', 'investigate', 'explain', 'record', 'complete']
          const state = order.indexOf(phase) > order.indexOf(k) ? 'done' : phase === k ? 'now' : 'later'
          return <li key={k} className={`is-${state}`} aria-current={state === 'now' ? 'step' : undefined}>{text.steps[k]}</li>
        })}
      </ol>

      <div className="wx-block">
        <h3>{text.steps.observe}</h3>
        <p>{L(item.station.observe)}</p>
        {phase === 'observe' ? <button type="button" className="wx-primary" onClick={() => step('observe')} data-action="observe">{text.observeDone}</button> : null}
      </div>

      {phase !== 'observe' ? (
        <div className="wx-block">
          <h3>{text.steps.investigate}</h3>
          <p>{L(item.station.investigate)}</p>
          {phase === 'investigate'
            ? <Investigation spec={item.station.interaction} L={L} text={text} seed={item.id} onDone={() => step('investigate')} />
            : <p className="wx-finding"><strong>{text.finding}:</strong> {L(item.station.finding)}</p>}
        </div>
      ) : null}

      {showExplain ? (
        <div className="wx-block">
          <h3>{text.steps.explain}</h3>
          {replaying ? <p className="wx-muted">{text.replayNote}</p> : null}
          <p className="wx-prompt">{L(item.prompt)}</p>
          <p className="wx-muted">{text.explainPick}</p>
          <div className="wx-options" role="group" aria-label={L(item.prompt)}>
            {options.map((o) => {
              const solved = replaying ? replayCorrect : phase !== 'explain'
              const isRight = solved && o.correct
              return (
                <button
                  key={o.key}
                  type="button"
                  className={`wx-option${isRight ? ' is-right' : ''}${triedWrong.has(o.key) ? ' is-wrong' : ''}`}
                  disabled={solved || triedWrong.has(o.key)}
                  onClick={() => choose(o)}
                  data-key={o.key}
                >
                  {L(o.text)}
                </button>
              )
            })}
          </div>
          <div aria-live="polite">
            {feedback && !feedback.correct ? (
              <div className="wx-feedback is-wrong">
                <p className="wx-feedback-title">{text.tryAgain}</p>
                {lastFeedbackOption?.misconception ? <p><strong>{text.whyWrong}:</strong> {L(lastFeedbackOption.misconception)}</p> : null}
              </div>
            ) : null}
            {!replaying && phase === 'explain' && help === 'hint' ? <p className="wx-hint" data-testid="wx-hint"><strong>{text.hint}:</strong> {L(item.station.hint)}</p> : null}
            {!replaying && phase === 'explain' && help === 'explanation' ? <p className="wx-hint" data-testid="wx-explanation"><strong>{text.explanation}:</strong> {L(item.explanation)}</p> : null}
            {(phase === 'record' || phase === 'complete' || replayCorrect) && (feedback?.correct || phase === 'record') ? (
              <div className="wx-feedback is-right">
                <p className="wx-feedback-title">{text.right}</p>
                <p>{L(item.explanation)}</p>
                <p className="wx-source">{text.source}: <a href={item.source.url} target="_blank" rel="noreferrer">{item.source.publisher}</a></p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {phase === 'record' || replayCorrect ? (
        <div className="wx-block">
          <h3>{text.steps.record}</h3>
          <blockquote className="wx-record">{L(item.station.record)}</blockquote>
          <button type="button" className="wx-primary" onClick={doRecord} data-action="record">{text.recordDo}</button>
        </div>
      ) : null}

      {phase === 'complete' && !replaying ? (
        <div className="wx-block">
          <h3>{text.recorded} ✓</h3>
          <blockquote className="wx-record">{L(item.station.record)}</blockquote>
          {xpResult !== null ? <p className="wx-xp" data-testid="wx-station-xp">{practice ? text.xpPractice : text.xpEarned(formatDigits(xpResult, language))}</p> : null}
          {xpResult !== null && preview && !practice ? <p className="wx-muted">{text.xpPreview}</p> : null}
          <button type="button" className="wx-link" onClick={() => { setReplaying(true); setFeedback(null); setXpResult(null) }}>{text.replay}</button>
        </div>
      ) : null}
    </section>
  )
}

/* ------------------------------------------------------------------ report */

function ReportScreen({ text, language, items, set, onFile, onDone, onRetry, canRetry, practice, preview, isReviewed, onQa }) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState([]) // { itemId, key, correct }
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const L = (v) => v?.[language] ?? v?.en
  const n = (v) => formatDigits(v, language)
  const item = items[index]
  const options = useMemo(() => (item ? optionsFor(item) : []), [item])
  const current = answers[index]

  useEffect(() => {
    if (!result && item) onQa?.({ screen: 'report', set, index, correctKey: options.find((o) => o.correct).key })
  }, [onQa, result, item, index, set, options])

  const pick = (o) => setAnswers((prev) => { const next = prev.slice(); next[index] = { itemId: item.id, key: o.key, correct: o.correct }; return next })

  const file = async () => {
    setBusy(true)
    const r = await onFile(answers.map(({ itemId, correct, key }) => ({ itemId, correct, choice: key })))
    setBusy(false)
    if (r?.ok) setResult({ ...r, correct: answers.filter((a) => a.correct).length })
  }

  if (result) {
    const stars = starsForScore(result.correct)
    return (
      <section className="wx-panel wx-report" aria-labelledby="wx-report-h" data-testid="wx-report-result">
        <h2 id="wx-report-h">{text.reportTitle(set)}</h2>
        <p className="wx-score">{text.reportResult(n(result.correct))} <Stars count={stars} label={text.stars(n(stars))} /></p>
        <p className="wx-muted">{text.starsRule}</p>
        <p className="wx-xp" data-testid="wx-report-xp">{practice ? text.xpPractice : text.xpEarned(n(result.xp ?? 0))}</p>
        {preview && !practice ? <p className="wx-muted">{text.xpPreview}</p> : null}
        <h3>{text.review}</h3>
        <ol className="wx-review">
          {items.map((it, i) => {
            const a = answers[i]
            const chosen = optionsFor(it).find((o) => o.key === a.key)
            return (
              <li key={it.id} className={a.correct ? 'is-right' : 'is-wrong'}>
                <p className="wx-prompt">{L(it.prompt)}</p>
                <p>{text.yourAnswer}: {L(chosen.text)} {a.correct ? '✓' : '✗'}</p>
                {!a.correct ? <p>{text.correctAnswer}: {L(it.answer)}</p> : null}
                <p className="wx-muted">{L(it.explanation)}</p>
              </li>
            )
          })}
        </ol>
        <div className="wx-row">
          {canRetry ? <button type="button" className="wx-primary" onClick={onRetry} data-action="retry-b">{text.retryB}</button> : null}
          <button type="button" className="wx-secondary" onClick={onDone}>{text.backToMenu}</button>
        </div>
        {canRetry ? <p className="wx-muted">{text.retryNote}</p> : null}
      </section>
    )
  }

  return (
    <section className="wx-panel wx-report" aria-labelledby="wx-report-h" data-testid="wx-report">
      <h2 id="wx-report-h">{text.reportTitle(set)}</h2>
      <p className="wx-muted">{text.question(n(index + 1), n(items.length))}<Badge show={!isReviewed(item)} text={text.unreviewed} /></p>
      <p className="wx-prompt">{L(item.prompt)}</p>
      <div className="wx-options" role="radiogroup" aria-label={L(item.prompt)}>
        {options.map((o) => (
          <button key={o.key} type="button" role="radio" aria-checked={current?.key === o.key} className={`wx-option${current?.key === o.key ? ' is-picked' : ''}`} onClick={() => pick(o)} data-key={o.key}>
            {L(o.text)}
          </button>
        ))}
      </div>
      <div className="wx-row">
        {index > 0 ? <button type="button" className="wx-secondary" onClick={() => setIndex(index - 1)}>{text.back}</button> : <span />}
        {index < items.length - 1
          ? <button type="button" className="wx-primary" disabled={!current} onClick={() => setIndex(index + 1)} data-action="next">{text.next}</button>
          : <button type="button" className="wx-primary" disabled={!current || busy || answers.filter(Boolean).length !== items.length} onClick={file} data-action="file">{busy ? text.saving : text.submitReport}</button>}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ journal */

function JournalScreen({ text, language, expedition, record, content, onBack }) {
  const L = (v) => v?.[language] ?? v?.en
  const n = (v) => formatDigits(v, language)
  const entries = journalFor(record, expedition.id)
  const byN = Object.fromEntries(content.stations.map((s) => [s.station.n, s]))
  return (
    <section className="wx-panel" aria-labelledby="wx-journal-h" data-testid="wx-journal">
      <div className="wx-row">
        <h2 id="wx-journal-h">{text.journalTitle(expedition.name[language])}</h2>
        <button type="button" className="wx-small" onClick={onBack}>{text.back}</button>
      </div>
      {entries.length === 0 ? <p className="wx-muted">{text.journalEmpty}</p> : (
        <ol className="wx-journal">
          {entries.map((e, i) => (
            <li key={`${e.at}-${i}`}>
              {e.kind === 'report' ? <p><strong>{text.journalReport(e.set, n(e.correct), e.stars)}</strong></p> : null}
              {e.kind === 'replay' ? <p>{text.journalReplay(n(e.n))}</p> : null}
              {e.kind === 'station' && byN[e.n] ? (
                <>
                  <p><strong>{text.journalStation(n(e.n), L(byN[e.n].station.title))}</strong>{e.xp > 0 ? ` · +${n(e.xp)} XP` : ''}</p>
                  <p>{L(byN[e.n].station.record)}</p>
                </>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      <p className="wx-muted">{text.savedLocally}</p>
    </section>
  )
}

/* ------------------------------------------------------------------ expedition */

/**
 * The shared input object lives in `inputRef.current` (skyward-explorer/input.js useInputState) and is
 * written outside React: only from these event handlers and the keyboard hook; the 3D loop reads it.
 */
function setTouch(inputRef, axis, value) { inputRef.current[axis] = value }
function pressJump(inputRef, down) {
  if (down) inputRef.current.jumpPresses += 1
  inputRef.current.touchJump = down
}

function TouchPad({ inputRef, text }) {
  const hold = (axis, value) => ({
    onPointerDown: (e) => { e.preventDefault(); setTouch(inputRef, axis, value) },
    onPointerUp: () => setTouch(inputRef, axis, 0),
    onPointerLeave: () => setTouch(inputRef, axis, 0),
    onPointerCancel: () => setTouch(inputRef, axis, 0),
  })
  return (
    <div className="wx-touch" aria-hidden="false">
      <div className="wx-dpad">
        <button type="button" aria-label={text.move.forward} {...hold('touchY', 1)}>▲</button>
        <button type="button" aria-label={text.move.left} {...hold('touchX', -1)}>◀</button>
        <button type="button" aria-label={text.move.right} {...hold('touchX', 1)}>▶</button>
        <button type="button" aria-label={text.move.back} {...hold('touchY', -1)}>▼</button>
      </div>
      <button
        type="button"
        className="wx-jump"
        aria-label={text.move.jump}
        onPointerDown={(e) => { e.preventDefault(); pressJump(inputRef, true) }}
        onPointerUp={() => pressJump(inputRef, false)}
        onPointerLeave={() => pressJump(inputRef, false)}
      >⤒</button>
    </div>
  )
}

/** Key caps for the floating controls hint. */
function KeyHints({ text }) {
  return (
    <ul className="wx-keys" aria-label={text.controls}>
      {text.controlKeys.map((k) => (
        <li key={k.label}>
          {k.keys.map((key) => <kbd key={key}>{key}</kbd>)}
          <span>{k.label}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * The expedition: an immersive arcade frame around the 3D world (design 8.2). Everything the
 * player needs floats over the scene, so they never scroll away from it:
 *   top HUD      expedition, progress dots, Mission Log / Journal / full screen / Leave
 *   bottom HUD   key hints (keyboard) or the touch pad, and the "open station" prompt
 *   Mission Log  slide-out drawer with the five stations and the report button (M toggles it)
 *   station      the Observe → Investigate → Explain → Record panel opens as a sheet over the scene
 * Behaviour, saving and the data-* hooks used by the tests are unchanged.
 */
function ExpeditionScreen({ text, language, expedition, content, record, dark, isReviewed, run, onLeave, onReport, onJournal, practice, preview, paused, onQa }) {
  const biome = BIOMES[expedition.id]
  const reducedMotion = useReducedMotion()
  const inputRef = useInputState()
  const [open, setOpen] = useState(null) // station number with its panel open
  const [near, setNear] = useState(null)
  const [logOpen, setLogOpen] = useState(false)
  const activeRef = useRef(true)
  const teleportRef = useRef(null)
  const frameRef = useRef(null)
  const logButtonRef = useRef(null)
  const { isFullscreen, isFilled, toggle: toggleFullscreen } = useFullscreen(frameRef, { escapeExitsFallback: false })
  useEffect(() => { activeRef.current = open === null && !logOpen && !paused }, [open, logOpen, paused])
  useKeyboardInput(inputRef, activeRef)
  const n = (v) => formatDigits(v, language)
  const L = (v) => v?.[language] ?? v?.en
  const completed = biome.stations.map((s) => s.n).filter((k) => stationRecord(record, expedition.id, k).complete)
  const rs = reportStatus(record, expedition.id)
  const discTop = (id) => biome.discs.find((d) => d.id === id).top
  const typing = (e) => e.target instanceof HTMLElement && e.target.closest('button, a, input, textarea, select')

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && activeRef.current && near && !typing(e)) {
        e.preventDefault()
        setOpen(near)
      } else if ((e.key === 'm' || e.key === 'M') && open === null && !typing(e) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setLogOpen((v) => !v)
      } else if (e.key === 'Escape' && open !== null && !logOpen) {
        setOpen(null)
      } else if (e.key === 'Escape' && logOpen) {
        setLogOpen(false)
        logButtonRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [near, open, logOpen])

  useEffect(() => { if (open === null) onQa?.({ screen: 'expedition', near, expedition: expedition.id }) }, [onQa, open, near, expedition])

  const travel = (s) => {
    teleportRef.current = { x: s.x - 1.2, y: discTop(s.disc), z: s.z - 1.2 }
    setNear(s.n)
    setLogOpen(false)
    setOpen(s.n)
  }

  return (
    <section ref={frameRef} className={`wx-expedition wx-arcade${isFilled ? ' is-filled' : ''}${isFullscreen ? ' is-fullscreen' : ''}`} aria-labelledby="wx-exp-h">
      <div className="wx-stage">
        <Suspense fallback={<p className="wx-loading" role="status">{text.loading}</p>}>
          <ExpeditionCanvas
            biome={biome}
            dark={dark}
            inputRef={inputRef}
            activeRef={activeRef}
            teleportRef={teleportRef}
            onNear={setNear}
            near={near}
            completed={completed}
            reducedMotion={reducedMotion}
            label={text.canvasLabel(expedition.name[language])}
            noWebglMessage={text.noWebgl}
            stationLabel={(k) => text.stationLabel(n(k))}
            paused={paused || open !== null}
          />
        </Suspense>

        {/* top HUD */}
        <div className="wx-hud-top">
          <div className="wx-hud-card wx-hud-title">
            <span className="wx-hud-icon" aria-hidden="true">{expedition.icon}</span>
            <div>
              <h2 id="wx-exp-h">{expedition.name[language]}</h2>
              <div className="wx-hud-progress">
                <span className="wx-dots" role="img" aria-label={text.stationsDone(n(completed.length))}>
                  {biome.stations.map((s) => <span key={s.n} className={completed.includes(s.n) ? 'is-on' : ''} />)}
                </span>
                <span>{text.stationsDone(n(completed.length))}</span>
              </div>
            </div>
          </div>
          <div className="wx-hud-actions" role="toolbar" aria-label={text.gameMenu}>
            <button ref={logButtonRef} type="button" className="wx-pill" onClick={() => setLogOpen((v) => !v)}
              aria-expanded={logOpen} aria-controls="wx-mission-log" data-action="mission-log">
              <span aria-hidden="true">🗺️</span><span className="wx-pill-label">{text.missionLog}</span>
            </button>
            <button type="button" className="wx-pill" onClick={onJournal}>
              <span aria-hidden="true">📓</span><span className="wx-pill-label">{text.journal}</span>
            </button>
            <button type="button" className="wx-pill wx-pill-icon" onClick={toggleFullscreen} aria-pressed={isFullscreen || isFilled}
              aria-label={isFullscreen || isFilled ? text.exitFullscreen : text.fullscreen} title={isFullscreen || isFilled ? text.exitFullscreen : text.fullscreen}>
              <span aria-hidden="true">{isFullscreen || isFilled ? '🗗' : '⛶'}</span>
            </button>
            <button type="button" className="wx-pill wx-pill-leave" onClick={onLeave} data-action="leave">
              <span aria-hidden="true">🚪</span><span className="wx-pill-label">{text.leave}</span>
            </button>
          </div>
        </div>

        {/* bottom HUD */}
        {open === null ? (
          <div className="wx-hud-bottom">
            <div className="wx-hud-card wx-hud-keys"><KeyHints text={text} /></div>
            {near ? (
              <div className="wx-hud-card wx-near" role="status">
                <span>{text.near(n(near), L(content.stations[near - 1].station.title))}</span>
                <button type="button" className="wx-primary" onClick={() => setOpen(near)} data-action="open-near">{text.openStation(n(near))}</button>
              </div>
            ) : null}
          </div>
        ) : null}
        {open === null && !logOpen ? <TouchPad inputRef={inputRef} text={text} /> : null}

        {/* Mission Log drawer */}
        <div className={`wx-scrim${logOpen ? ' is-open' : ''}`} onClick={() => setLogOpen(false)} aria-hidden="true" />
        <nav id="wx-mission-log" className={`wx-drawer wx-station-list${logOpen ? ' is-open' : ''}`} aria-labelledby="wx-list-h" inert={!logOpen}>
          <div className="wx-drawer-head">
            <h3 id="wx-list-h"><span aria-hidden="true">🗺️</span> {text.missionLog}</h3>
            <button type="button" className="wx-pill wx-pill-icon" onClick={() => { setLogOpen(false); logButtonRef.current?.focus() }} aria-label={text.closeLog}>✕</button>
          </div>
          <p className="wx-drawer-sub">{text.stationList} · {text.stationsDone(n(completed.length))}</p>
          <ol>
            {content.stations.map((it) => {
              const k = it.station.n
              const st = biome.stations[k - 1]
              const phase = stationPhase(stationRecord(record, expedition.id, k))
              return (
                <li key={k} className={`is-${phase}`} data-station={k}>
                  <span className="wx-station-num" aria-hidden="true">{phase === 'complete' ? '✓' : n(k)}</span>
                  <span className="wx-station-title">{L(it.station.title)}<Badge show={!isReviewed(it)} text={text.unreviewed} /></span>
                  <button type="button" className="wx-pill" onClick={() => travel(st)} data-travel={k}>{text.travel}</button>
                </li>
              )
            })}
          </ol>
          <div className="wx-report-cta">
            {rs.canFile
              ? <button type="button" className="wx-primary" onClick={() => onReport(rs.nextSet)} data-action="file-report">{text.fileReport}</button>
              : <p className="wx-drawer-sub">{rs.filings >= 2 ? text.reportDone : text.reportLocked}</p>}
          </div>
        </nav>

        {/* station sheet */}
        {open !== null ? (
          <div className="wx-sheet-wrap">
            <div className="wx-sheet">
              <StationPanel
                key={open}
                text={text}
                language={language}
                item={content.stations[open - 1]}
                record={record}
                expedition={expedition.id}
                isReviewed={isReviewed}
                run={run}
                practice={practice}
                preview={preview}
                onClose={() => setOpen(null)}
                onQa={onQa}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default function WorldExplorerGame({ language = 'en', items, isReviewed = () => false, dark = false, preview = false, onQa }) {
  const adapter = useLearningAdapter()
  const snapshot = useLearningSnapshot(adapter.store)
  const { api, record, unfinished, practice } = useWorldSession(adapter, snapshot)
  const text = WORLD_TEXT[language] ?? WORLD_TEXT.en
  const [screen, setScreen] = useState('menu') // menu | expedition | journal | report
  const [expId, setExpId] = useState(null)
  const [visitKey, setVisitKey] = useState(null)
  const [reportSet, setReportSet] = useState(null)
  const [stale, setStale] = useState(false)
  const [error, setError] = useState(null)
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)

  useEffect(() => { adapter.ready() }, [adapter])
  useEffect(() => {
    const onVis = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
  useEffect(() => { if (screen === 'menu') onQa?.({ screen: 'menu' }) }, [onQa, screen])

  const contentById = useMemo(() => Object.fromEntries(EXPEDITIONS.map((e) => [e.id, expeditionContent(items, e.id)])), [items])
  const expedition = EXPEDITIONS.find((e) => e.id === expId)
  const content = expId ? contentById[expId] : null

  /** Runs one visit-scoped transaction ([method, ...args] after visitKey and expedition); shows the stale-tab dialog when the visit was sealed elsewhere. */
  const run = useCallback(async (call) => {
    const [method, ...args] = call
    setError(null)
    let result
    try {
      result = await api[method](visitKey, expId, ...args)
    } catch (e) {
      console.warn('World Explorer: save failed', e)
      result = { ok: false, reason: 'error' }
    }
    if (!result?.ok) {
      if (result?.reason === 'visit-sealed' || result?.reason === 'visit-not-found') setStale(true)
      else setError(text.saveFailed)
    }
    return result
  }, [api, visitKey, expId, text])

  const startExpedition = async (id) => {
    setError(null)
    const r = await api.startVisit(id)
    if (!r?.ok) { setError(text.saveFailed); return }
    setExpId(id)
    setVisitKey(r.visit.roundKey)
    setScreen('expedition')
  }

  const leave = async () => {
    if (visitKey) await api.sealVisit(visitKey)
    setVisitKey(null)
    setScreen('menu')
  }

  const fileReport = async (answers) => {
    const r = await run(['fileReport', reportSet, answers])
    if (r?.ok) setVisitKey(null) // filing seals the visit
    return r
  }

  const retry = async () => {
    const r = await api.startVisit(expId)
    if (!r?.ok) { setError(text.saveFailed); return }
    setVisitKey(r.visit.roundKey)
    setReportSet('B')
    setScreen('report')
  }

  const continueHere = async () => {
    const r = await api.joinVisit(expId)
    setStale(false)
    if (r?.ok) setVisitKey(r.visit.roundKey)
    else { setVisitKey(null); setScreen('menu') }
  }

  const refreshAfterStale = () => {
    setStale(false)
    setVisitKey(null)
    setScreen('menu')
  }

  if (!snapshot.ready) return <div className="wx" lang={language}><p className="wx-loading" role="status">{text.loading}</p></div>

  return (
    <div className="wx" lang={language}>
{screen !== 'expedition' ? (
      <header className="wx-header">
        <div>
          <h1>{text.title}</h1>
          <p className="wx-muted">{text.ages} · {text.intro}</p>
        </div>
      </header>
      ) : null}
      {practice ? <p className="wx-notice" role="status">{text.practiceMode}</p> : null}
      {error ? <p className="wx-error" role="alert">{error}</p> : null}

      {screen === 'menu' ? (
        <ExpeditionMenu
          text={text}
          language={language}
          contentById={contentById}
          record={record}
          unfinished={unfinished}
          practice={practice}
          onStart={startExpedition}
          onJournal={(id) => { setExpId(id); setScreen('journal') }}
        />
      ) : null}

      {screen === 'expedition' && expedition ? (
        <ExpeditionScreen
          text={text}
          language={language}
          expedition={expedition}
          content={content}
          record={record}
          dark={dark}
          isReviewed={isReviewed}
          run={run}
          practice={practice}
          preview={preview}
          paused={hidden || stale}
          onLeave={leave}
          onJournal={() => setScreen('journal')}
          onReport={(set) => { setReportSet(set); setScreen('report') }}
          onQa={onQa}
        />
      ) : null}

      {screen === 'journal' && expedition ? (
        <JournalScreen
          text={text}
          language={language}
          expedition={expedition}
          record={record}
          content={content}
          onBack={() => setScreen(visitKey ? 'expedition' : 'menu')}
        />
      ) : null}

      {screen === 'report' && expedition ? (
        <ReportScreen
          key={reportSet}
          text={text}
          language={language}
          items={reportSet === 'B' ? content.reportB : content.reportA}
          set={reportSet}
          onFile={fileReport}
          onDone={() => setScreen('menu')}
          onRetry={retry}
          canRetry={reportSet === 'A' && reportStatus(record, expId).nextSet === 'B'}
          practice={practice}
          preview={preview}
          isReviewed={isReviewed}
          onQa={onQa}
        />
      ) : null}

      {stale ? <StaleDialog text={text} onContinue={continueHere} onRefresh={refreshAfterStale} /> : null}
    </div>
  )
}
