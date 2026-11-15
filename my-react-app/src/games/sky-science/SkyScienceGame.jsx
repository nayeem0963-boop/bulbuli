/**
 * Sky Science Explorer: the game screens (design 8.1, 2.11, 4.3).
 *
 * Flow: band picker → mission menu → flight (gates + return questions) → Quick Checks → results.
 *
 * Learning data goes ONLY through the learning adapter (useLearningAdapter): every answer is
 * committed before its feedback is shown, and the flight's XP is committed once at the end. The
 * game never imports storage, XP, Supabase or progress code (isolation tests I3/I4).
 *
 * Props:
 *   language       'en' | 'bn'
 *   items          learning items to play (preview: all items; release: shippable items only)
 *   isReviewed     (item) => boolean; unreviewed items get a visible badge
 *   dark           boolean, for the 3D sky colours
 *   onStepShown    optional (step, options) callback (the dev preview uses it for automated tests)
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLearningAdapter } from '../../learning/adapters/adapterContext.js'
import { useLearningSnapshot } from '../../learning/store/learningStore.js'
import { useReducedMotion } from '../../shared/hooks/useReducedMotion.js'
import { isMuted, playSound, setMuted } from '../../utils/sound.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import { BAND_RULES, BANDS, HEARTS, answerFor, buildPlan, heartsAfterCloud, missionPlayable, nextStep, progress, starsFor, stepView } from './flight.js'
import { Picture } from './pictures.js'
import { MISSIONS, SKY_SCIENCE_TEXT } from './text.js'
import { LANE_COLORS } from './laneColors.js'
import './sky-science.css'

const SkyScienceCanvas = lazy(() => import('./SkyScienceCanvas.jsx'))
const RESUME_WINDOW_MS = 24 * 60 * 60 * 1000 // D6 (subject to the corrected proposal)
const CRUISE_MS = 2200

/* ------------------------------------------------------------------ speech */

function speak(words, language) {
  if (!words || isMuted() || typeof window === 'undefined' || !window.speechSynthesis) return false
  const lang = language === 'bn' ? 'bn' : 'en'
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith(lang))
  if (!voice && lang === 'bn') return false // no Bangla voice on this device: pictures + chime instead (D7)
  const u = new SpeechSynthesisUtterance(words)
  u.lang = voice?.lang ?? 'en-US'
  if (voice) u.voice = voice
  u.rate = 0.92
  u.pitch = 1.1
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
  return true
}

/* ------------------------------------------------------------------ small pieces */

function Stars({ count, label, size = 'md' }) {
  return (
    <span className={`ssx-stars is-${size}`} role="img" aria-label={label}>
      {[1, 2, 3].map((i) => <span key={i} className={i <= count ? 'is-on' : ''} aria-hidden="true">★</span>)}
    </span>
  )
}

function UnreviewedBadge({ show, text }) {
  return show ? <span className="ssx-badge" title="Awaiting science and Bangla review">{text}</span> : null
}

function OptionCard({ index, option, pictures, language, onChoose, disabled, selected, state }) {
  return (
    <button
      type="button"
      className={`ssx-option lane-${index}${selected ? ' is-selected' : ''}${state ? ` is-${state}` : ''}`}
      style={{ '--lane': LANE_COLORS[index] }}
      onClick={() => onChoose(index)}
      disabled={disabled}
      aria-label={`${index + 1}: ${option[language] ?? option.en}`}
      data-lane={index}
    >
      <span className="ssx-option-num" aria-hidden="true">{formatDigits(index + 1, language)}</span>
      {pictures && option.pic ? <Picture name={option.pic} label={option[language] ?? option.en} size={86} /> : null}
      <span className={`ssx-option-text${pictures ? ' is-caption' : ''}`}>{option[language] ?? option.en}</span>
    </button>
  )
}

/* ------------------------------------------------------------------ session: adapter or practice */

function useFlightSession(adapter, snapshot) {
  const practice = snapshot.practice
  const [local, setLocal] = useState(null) // practice mode only: nothing is saved
  const flight = practice ? local : snapshot.sky?.activeFlight ?? null

  const start = useCallback(async ({ missionId, band, plan }) => {
    if (practice) {
      setLocal({ flightKey: 'practice', missionId, band, plan, answers: [], startedAt: new Date().toISOString() })
      return { ok: true }
    }
    return adapter.sky.startFlight({ missionId, band, primaryCount: plan.gates.length, quickCheckCount: plan.quickChecks.length, plan })
  }, [adapter, practice])

  const answer = useCallback(async (ans) => {
    if (practice) {
      setLocal((f) => ({ ...f, answers: [...f.answers, { ...ans, at: new Date().toISOString() }] }))
      return { ok: true }
    }
    return adapter.sky.recordAnswer(flight.flightKey, ans)
  }, [adapter, practice, flight])

  const commit = useCallback(async () => {
    if (practice) {
      const s = starsFor(local.plan, local.answers)
      setLocal(null)
      return { ok: true, stars: s.stars, xp: 0, practice: true }
    }
    return adapter.sky.commitFlight(flight.flightKey)
  }, [adapter, practice, flight, local])

  const discard = useCallback(async () => {
    if (practice) { setLocal(null); return { ok: true } }
    return flight ? adapter.sky.discardFlight(flight.flightKey) : { ok: true }
  }, [adapter, practice, flight])

  return { flight, start, answer, commit, discard, practice }
}

/* ------------------------------------------------------------------ band picker + menu */

function BandPicker({ text, current, onPick }) {
  return (
    <section className="ssx-panel" aria-labelledby="ssx-band-h">
      <h2 id="ssx-band-h">{text.whoFlying}</h2>
      <div className="ssx-bands">
        {BANDS.map((b) => (
          <button key={b} type="button" className="ssx-band" aria-pressed={current === b} onClick={() => onPick(b)} data-band={b}>
            <span className="ssx-band-name">{text.bands[b]}</span>
            <span className="ssx-band-hint">{text.bandHints[b]}</span>
          </button>
        ))}
      </div>
      <p className="ssx-muted">{text.bandChangeNote}</p>
    </section>
  )
}

function MissionMenu({ text, language, band, items, record, onStart, onChangeBand, resume, thinkingPause, setThinkingPause }) {
  const playable = useMemo(() => Object.fromEntries(MISSIONS.map((m) => [m.id, missionPlayable(items, m.id)])), [items])
  return (
    <section className="ssx-panel" aria-labelledby="ssx-menu-h">
      <div className="ssx-row">
        <p className="ssx-band-chip">{text.bands[band]}</p>
        <button type="button" className="ssx-link" onClick={onChangeBand}>{text.changeBand}</button>
      </div>
      {resume}
      <h2 id="ssx-menu-h">{text.pickMission}</h2>
      <div className="ssx-missions">
        {MISSIONS.map((m) => {
          const ok = playable[m.id]
          const best = record?.missions?.[m.id]?.bestStarsByBand?.[band] ?? 0
          return (
            <button key={m.id} type="button" className="ssx-mission" disabled={!ok} onClick={() => onStart(m.id)} data-mission={m.id}>
              <span className="ssx-mission-icon" aria-hidden="true">{m.icon}</span>
              <span className="ssx-mission-title">{m.title[language]}</span>
              <span className="ssx-mission-blurb">{ok ? m.blurb[language] : text.comingSoon}</span>
              {ok ? <Stars count={best} size="sm" label={text.bestStars(formatDigits(best, language))} /> : <span className="ssx-soon">{text.comingSoon}</span>}
            </button>
          )
        })}
      </div>
      <p className="ssx-howto">{text.howTo[band]}</p>
      {BAND_RULES[band].thinkingPauseOption && (
        <label className="ssx-toggle">
          <input type="checkbox" checked={thinkingPause} onChange={(e) => setThinkingPause(e.target.checked)} />
          <span>{text.thinkingPause}</span>
        </label>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ feedback */

function Feedback({ text, language, feedback, onContinue, reviewedBadge }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  const { correct, chosen, item, wasPrimary } = feedback
  const pick = correct ? text.correct[item.id.length % text.correct.length] : text.wrong
  return (
    <div className={`ssx-feedback ${correct ? 'is-right' : 'is-wrong'}`} role="status" aria-live="polite">
      <p className="ssx-feedback-title">{correct ? '✔ ' : '✦ '}{pick} {reviewedBadge}</p>
      {!correct && <p>{text.rightAnswerIs(item.answer[language])}</p>}
      {!correct && chosen?.misconception && <p className="ssx-muted"><strong>{text.whyWrong}</strong> {chosen.misconception[language]}</p>}
      <p>{item.explanation[language]}</p>
      {!correct && wasPrimary && <p className="ssx-muted">{text.comeBack}</p>}
      <button ref={ref} type="button" className="ssx-primary" onClick={onContinue}>{text.continue}</button>
    </div>
  )
}

/* ------------------------------------------------------------------ the flight (gates) */

function FlightScreen({ text, language, flight, items, session, isReviewed, dark, decoderPath, thinkingPause, onStepShown }) {
  const { plan, answers, band } = flight
  const rules = BAND_RULES[band]
  const reducedMotion = useReducedMotion()
  const step = nextStep(plan, answers)
  const view = step.kind === 'primary' || step.kind === 'return' ? stepView(plan, step, items) : null
  const stepKey = `${step.kind}-${step.gate ?? step.index}`

  const [phase, setPhase] = useState('cruise')
  const [lane, setLane] = useState(1)
  const [hearts, setHearts] = useState(HEARTS)
  const [calm, setCalm] = useState(false)
  const [paused, setPaused] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const steered = useRef(false)
  const bumpRef = useRef(0)
  const motion = useRef({ phase: 'cruise', progress: 0, lane: 1, clouds: true, paused: false })
  useEffect(() => {
    motion.current.lane = lane
    motion.current.paused = paused
    motion.current.clouds = !calm
  }, [lane, paused, calm])

  // phase timeline: cruise → approach (window) → hover; feedback is shown after a committed answer
  useEffect(() => {
    if (feedback || paused || calm || !view) return undefined
    let raf = 0
    let timer = 0
    if (phase === 'cruise') {
      motion.current.phase = 'cruise'
      timer = setTimeout(() => {
        steered.current = false
        setPhase('approach')
      }, reducedMotion ? 1200 : CRUISE_MS)
    } else if (phase === 'approach') {
      motion.current.phase = 'approach'
      if (rules.autoSpeak) speak(`${view.item.prompt[language]} ${view.options.map((o, i) => `${i + 1}. ${o[language]}`).join('. ')}`, language)
      const startAt = performance.now()
      const total = rules.windowSeconds * 1000
      const tick = () => {
        const p = Math.min(1, (performance.now() - startAt) / total)
        motion.current.progress = p
        if (p < 1) raf = requestAnimationFrame(tick)
        else setPhase('hover')
      }
      raf = requestAnimationFrame(tick)
    } else if (phase === 'hover') {
      motion.current.phase = 'hover'
    }
    return () => { cancelAnimationFrame(raf); clearTimeout(timer) }
  }, [phase, feedback, paused, calm, stepKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (view) onStepShown?.(step, view.options) }, [stepKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const choose = useCallback(async (index) => {
    if (saving || feedback || !view) return
    setLane(index)
    setSaving(true)
    setError('')
    const ans = answerFor(plan, step, items, index)
    const result = await session.answer(ans)
    setSaving(false)
    if (!result?.ok) {
      setError(text.saveFailed)
      return
    }
    // committed: now (and only now) show feedback
    motion.current.phase = 'through'
    playSound(ans.correct ? 'correct' : 'wrong').catch(() => {})
    const fb = { correct: ans.correct, chosen: view.options[index], item: view.item, wasPrimary: step.kind === 'primary' }
    setFeedback(fb)
    if (rules.autoSpeak) speak(`${ans.correct ? text.correct[0] : text.wrong} ${view.item.explanation[language]}`, language)
  }, [saving, feedback, view, plan, step, items, session, text, rules.autoSpeak, language])

  // arriving at the gate after steering = choosing that lane (unless the thinking pause is on)
  useEffect(() => {
    if (phase === 'hover' && steered.current && !thinkingPause && !feedback) choose(lane)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => {
    setFeedback(null)
    motion.current.progress = 0
    setPhase('cruise')
  }, [])

  const onCloudHit = useCallback(() => {
    bumpRef.current = 0.5
    playSound('click').catch(() => {})
    if (!rules.cloudsCostHearts) return // ages 4–6: no heart cost, ever
    setHearts((h) => {
      const left = heartsAfterCloud(band, h)
      if (left === 0) setCalm(true)
      return left
    })
  }, [rules.cloudsCostHearts, band])

  // keyboard: ← → steer, 1 2 3 choose, Enter choose current lane / continue, P or Esc pause
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat) return
      const k = e.key
      if (feedback) {
        if (k === 'Enter' || k === ' ') { e.preventDefault(); next() }
        return
      }
      if (k === 'p' || k === 'P' || k === 'Escape') { e.preventDefault(); setPaused((p) => !p); return }
      if (paused) return
      if (k === 'ArrowLeft') { e.preventDefault(); steered.current = true; setLane((l) => Math.max(0, l - 1)) }
      if (k === 'ArrowRight') { e.preventDefault(); steered.current = true; setLane((l) => Math.min(2, l + 1)) }
      if (['1', '2', '3'].includes(k)) { e.preventDefault(); choose(Number(k) - 1) }
      if ((k === 'Enter') && (phase === 'hover' || phase === 'approach' || calm)) { e.preventDefault(); choose(lane) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [feedback, paused, phase, calm, lane, choose, next])

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') setPaused(true) }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  if (!view) return null
  const prog = progress(plan, answers)
  const n = (v) => formatDigits(v, language)
  const showPrompt = phase !== 'cruise' || calm
  const isReturn = step.kind === 'return'

  return (
    <div className="ssx-flight">
      <div className="ssx-hud">
        <span className="ssx-hud-gate">{text.gate(n(Math.min(prog.gatesDone + (isReturn ? 0 : 1), prog.gatesTotal)), n(prog.gatesTotal))}</span>
        <span className="ssx-progress" role="progressbar" aria-valuemin={0} aria-valuemax={prog.gatesTotal} aria-valuenow={prog.gatesDone}>
          <span style={{ width: `${(prog.gatesDone / prog.gatesTotal) * 100}%` }} />
        </span>
        {rules.cloudsCostHearts
          ? <span className="ssx-hearts" role="img" aria-label={text.hearts(n(hearts))}>{Array.from({ length: HEARTS }, (_, i) => <span key={i} className={i < hearts ? 'is-on' : ''} aria-hidden="true">♥</span>)}</span>
          : <span className="ssx-muted ssx-nohearts" title={text.noHearts}>☁️</span>}
        <button type="button" className="ssx-small" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>{paused ? `▶ ${text.resume}` : `⏸ ${text.pause}`}</button>
      </div>

      <div className={`ssx-stage${calm ? ' is-calm' : ''}`}>
        {!calm && (
          <Suspense fallback={<p className="ssx-loading" role="status">{text.loading}</p>}>
            <SkyScienceCanvas motion={motion} onCloudHit={onCloudHit} decoderPath={decoderPath} reducedMotion={reducedMotion} dark={dark} label={text.title} noWebglMessage={text.noWebgl} bumpRef={bumpRef} paused={paused} />
          </Suspense>
        )}
        {calm && <p className="ssx-rest">{text.rest}</p>}
        {showPrompt && !feedback && (
          <div className="ssx-prompt" aria-live="polite">
            {isReturn && <p className="ssx-return-label">{text.returnLabel}</p>}
            <p className="ssx-prompt-text" data-testid="ssx-prompt">{view.item.prompt[language]} <UnreviewedBadge show={!isReviewed(view.item)} text={text.unreviewed} /></p>
            <button type="button" className="ssx-small ssx-listen" onClick={() => speak(view.item.prompt[language], language)} aria-label={text.listen}>🔊</button>
            {phase === 'hover' && !calm && <p className="ssx-muted ssx-hover">{text.hover}</p>}
          </div>
        )}
        {paused && <button type="button" className="ssx-paused" onClick={() => setPaused(false)}>⏸ {text.paused} · ▶ {text.resume}</button>}
      </div>

      {feedback
        ? <Feedback text={text} language={language} feedback={feedback} onContinue={next} reviewedBadge={null} />
        : (
          <div className="ssx-options" role="group" aria-label={view.item.prompt[language]}>
            {view.options.map((o, i) => (
              <OptionCard key={`${stepKey}-${i}`} index={i} option={o} pictures={rules.pictures} language={language} onChoose={choose} disabled={saving || paused || (!showPrompt && !calm)} selected={lane === i && !calm} />
            ))}
          </div>
        )}
      {saving && <p className="ssx-muted" role="status">{text.saving}</p>}
      {error && <p className="ssx-error" role="alert">{error}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ Quick Checks */

function QuickCheckScreen({ text, language, flight, items, session, isReviewed, onStepShown }) {
  const { plan, answers, band } = flight
  const step = nextStep(plan, answers)
  const view = step.kind === 'quickcheck' ? stepView(plan, step, items) : null
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const rules = BAND_RULES[band]
  useEffect(() => {
    if (!view) return
    onStepShown?.(step, view.options)
    if (rules.autoSpeak) speak(`${view.item.prompt[language]} ${view.options.map((o, i) => `${i + 1}. ${o[language]}`).join('. ')}`, language)
  }, [step.index]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!view) return null
  const choose = async (index) => {
    if (saving || feedback) return
    setSaving(true)
    const ans = answerFor(plan, step, items, index)
    const r = await session.answer(ans)
    setSaving(false)
    if (!r?.ok) { setError(text.saveFailed); return }
    playSound(ans.correct ? 'correct' : 'wrong').catch(() => {})
    setFeedback({ correct: ans.correct, chosen: view.options[index], item: view.item, wasPrimary: false })
  }
  return (
    <section className="ssx-panel ssx-qc" aria-labelledby="ssx-qc-h">
      <h2 id="ssx-qc-h">{text.quickChecks} · {text.qcCount(formatDigits(step.index + 1, language), formatDigits(plan.quickChecks.length, language))}</h2>
      <p className="ssx-muted">{text.quickCheckIntro}</p>
      <p className="ssx-prompt-text" data-testid="ssx-prompt">{view.item.prompt[language]} <UnreviewedBadge show={!isReviewed(view.item)} text={text.unreviewed} /></p>
      {feedback
        ? <Feedback text={text} language={language} feedback={feedback} onContinue={() => setFeedback(null)} />
        : <div className="ssx-options">{view.options.map((o, i) => <OptionCard key={`${step.index}-${i}`} index={i} option={o} pictures={rules.pictures} language={language} onChoose={choose} disabled={saving} />)}</div>}
      {error && <p className="ssx-error" role="alert">{error}</p>}
    </section>
  )
}

/* ------------------------------------------------------------------ results */

function Results({ text, language, result, onAgain, onMenu, preview }) {
  const n = (v) => formatDigits(v, language)
  const { stars, summary, xp, band, learned, practice } = result
  return (
    <section className="ssx-panel ssx-results" aria-labelledby="ssx-res-h">
      <h2 id="ssx-res-h">{text.results}</h2>
      <Stars count={stars} size="lg" label={text.stars(n(stars))} />
      <ul className="ssx-rules">
        {text.starRules[band].map((rule, i) => <li key={i} className={i < stars ? 'is-met' : ''}>{rule}</li>)}
      </ul>
      <p className="ssx-muted">{text.summary({ firstTry: n(summary.firstTry), total: n(summary.total), secured: n(summary.secured), checksRight: n(summary.checksRight), checksTotal: n(summary.checksTotal) })}</p>
      {practice ? <p className="ssx-muted">{text.practice}</p> : <p className="ssx-xp" data-testid="ssx-xp">{xp > 0 ? text.xpEarned(n(xp)) : text.xpNone} {preview && <span className="ssx-muted">{text.xpPreview}</span>}</p>}
      <h3>{text.learned}</h3>
      <ul className="ssx-learned">{learned.map((l) => <li key={l.id}>{l.explanation[language]}</li>)}</ul>
      <div className="ssx-row">
        <button type="button" className="ssx-primary" onClick={onAgain}>{text.again}</button>
        <button type="button" className="ssx-secondary" onClick={onMenu}>{text.menu}</button>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the game */

export default function SkyScienceGame({ language = 'en', items, isReviewed = () => false, dark = false, onStepShown, preview = false }) {
  const text = SKY_SCIENCE_TEXT[language] ?? SKY_SCIENCE_TEXT.en
  const adapter = useLearningAdapter()
  const snapshot = useLearningSnapshot(adapter.store)
  const session = useFlightSession(adapter, snapshot)
  const [practiceBand, setPracticeBand] = useState(null)
  const [choosingBand, setChoosingBand] = useState(false)
  const [result, setResult] = useState(null)
  const [thinkingPause, setThinkingPause] = useState(false)
  const [muted, setMutedState] = useState(isMuted())
  const [startError, setStartError] = useState('')
  const [playing, setPlaying] = useState(false)
  const committing = useRef(false)

  useEffect(() => { adapter.ready() }, [adapter])

  const band = snapshot.practice ? practiceBand : snapshot.sky?.band ?? null
  const flight = session.flight
  // a flight older than the resume window when the game opened starts fresh (D6)
  const [openedAt] = useState(() => Date.now())
  const flightStale = Boolean(flight && openedAt - Date.parse(flight.startedAt) > RESUME_WINDOW_MS)
  const resumable = flight && flight.plan && !flightStale
  useEffect(() => { if (flightStale) session.discard() }, [flightStale]) // eslint-disable-line react-hooks/exhaustive-deps

  const pickBand = async (b) => {
    if (snapshot.practice) setPracticeBand(b)
    else await adapter.sky.setBand(b)
    setChoosingBand(false)
  }

  const startMission = async (missionId) => {
    setStartError('')
    if (flight) await session.discard()
    let plan
    try {
      plan = buildPlan(items, { missionId, band, seed: Math.floor(Math.random() * 2 ** 31) })
    } catch {
      setStartError(text.comingSoon)
      return
    }
    const r = await session.start({ missionId, band, plan })
    if (!r?.ok) { setStartError(text.saveFailed); return }
    setResult(null)
    setPlaying(true)
  }

  // the flight is finished: commit once (XP + stars), then show results
  const step = flight?.plan ? nextStep(flight.plan, flight.answers) : null
  useEffect(() => {
    if (step?.kind !== 'done' || committing.current) return
    committing.current = true
    const plan = flight.plan
    const answers = flight.answers
    session.commit().then((r) => {
      committing.current = false
      if (!r?.ok) { setStartError(text.saveFailed); return }
      const summary = starsFor(plan, answers)
      const learnedIds = [...plan.gates.map((g) => g.primaryId), ...plan.quickChecks.map((q) => q.itemId)]
      setPlaying(false)
      setResult({ stars: r.stars ?? summary.stars, summary, xp: r.xp ?? 0, band: flight.band, missionId: flight.missionId, learned: learnedIds.map((id) => items.find((i) => i.id === id)).filter(Boolean), practice: r.practice })
      playSound('complete').catch(() => {})
    })
  }, [step?.kind]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = () => { setMuted(!muted); setMutedState(!muted); if (!muted) window.speechSynthesis?.cancel() }

  if (!snapshot.ready) return <div className="ssx" lang={language}><p className="ssx-loading" role="status">{text.loading}</p></div>

  const showFlight = playing && resumable && step && step.kind !== 'done'
  let body
  if (result) {
    body = <Results text={text} language={language} result={result} preview={preview} onAgain={() => startMission(result.missionId)} onMenu={() => setResult(null)} />
  } else if (!band || choosingBand) {
    body = <BandPicker text={text} current={band} onPick={pickBand} />
  } else if (showFlight) {
    body = step.kind === 'quickcheck'
      ? <QuickCheckScreen text={text} language={language} flight={flight} items={items} session={session} isReviewed={isReviewed} onStepShown={onStepShown} />
      : <FlightScreen key={flight.flightKey} text={text} language={language} flight={flight} items={items} session={session} isReviewed={isReviewed} dark={dark} decoderPath={adapter.decoderPath} thinkingPause={thinkingPause} onStepShown={onStepShown} />
  } else {
    const prog = resumable ? progress(flight.plan, flight.answers) : null
    const resumeCard = resumable && step?.kind !== 'done'
      ? (
        <div className="ssx-resume" role="region" aria-label={text.continueFlight}>
          <p><strong>{text.continueFlight}</strong> · {MISSIONS.find((m) => m.id === flight.missionId)?.title[language]} · {text.bands[flight.band]}</p>
          <p className="ssx-muted">{text.continueHint(formatDigits(prog.gatesDone, language), formatDigits(prog.gatesTotal, language))}</p>
          <div className="ssx-row">
            <button type="button" className="ssx-primary" onClick={() => setPlaying(true)} data-testid="ssx-continue">{text.continueFlight}</button>
            <button type="button" className="ssx-secondary" onClick={() => session.discard()}>{text.discard}</button>
          </div>
        </div>
      )
      : flightStale ? <p className="ssx-muted">{text.expired}</p> : null
    body = (
      <MissionMenu
        text={text} language={language} band={band} items={items} record={snapshot.sky}
        onStart={startMission} onChangeBand={() => setChoosingBand(true)}
        thinkingPause={thinkingPause} setThinkingPause={setThinkingPause}
        resume={resumeCard}
      />
    )
  }

  return (
    <div className="ssx" lang={language}>
      <header className="ssx-header">
        <div>
          <h1>{text.title}</h1>
          <p className="ssx-muted">{text.tagline}</p>
        </div>
        <button type="button" className="ssx-small" onClick={toggleMute} aria-pressed={muted}>{muted ? `🔇 ${text.unmute}` : `🔊 ${text.mute}`}</button>
      </header>
      {snapshot.practice && <p className="ssx-notice" role="alert">{text.practice}</p>}
      {startError && <p className="ssx-error" role="alert">{startError}</p>}
      {body}
    </div>
  )
}
