import { useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, Check, Lightbulb, PartyPopper, Sparkles, X, Zap } from 'lucide-react'
import { correctSoFar, encouragement, starsFor } from '../engine.js'
import { Confetti, StarRow } from './Celebrate.jsx'
import { GOLD_BUTTON, LEVEL_ICONS, lvlStyle } from './theme.js'
import Visual, { FractionText } from './Visuals.jsx'

const KEYS = ['1', '2', '3', '4']

/** The bar over the card: back to missions, the mission, the question count, score and stars so far. */
function RoundBar({ round, level, language, text, n, onQuit }) {
  const total = round.questions.length
  const number = Math.min(round.index + 1, total)
  const correct = correctSoFar(round)
  const Icon = LEVEL_ICONS[level.icon]
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 @xl:gap-3">
      <button
        type="button"
        onClick={onQuit}
        aria-label={text.quitLabel}
        className="inline-flex min-h-12 cursor-pointer items-center gap-1.5 rounded-xl border-2 border-mf-line bg-mf-panel px-3.5 text-sm font-bold text-mf-text transition hover:border-mf-accent focus-visible:outline-3 focus-visible:outline-mf-focus"
      >
        <ArrowLeft size={16} strokeWidth={3} aria-hidden="true" focusable="false" />
        {text.quit}
      </button>
      <span className="order-last inline-flex min-h-12 w-full min-w-0 items-center gap-2 rounded-xl border-2 border-lvl/60 bg-lvl/10 px-3 text-sm font-extrabold text-lvl-ink @3xl:order-none @3xl:w-auto" title={text.missionLabel}>
        <Icon size={18} strokeWidth={3} aria-hidden="true" focusable="false" className="shrink-0" />
        <span className="truncate">{text.levelN(n(level.id))} · {level.title[language]}</span>
      </span>
      <span className="ml-auto inline-flex min-h-12 items-center gap-1.5 rounded-xl border-2 border-mf-line bg-mf-panel px-3 font-hero text-lg font-extrabold text-mf-text tabular-nums">
        {text.questionOf(n(number), n(total))}
      </span>
      <span className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border-2 border-mf-good/50 bg-mf-good-bg px-3 font-hero text-lg font-extrabold text-mf-good-ink tabular-nums">
        <Check size={18} strokeWidth={3} aria-hidden="true" focusable="false" />
        <span className="sr-only">{text.scoreLabel}:</span>
        <span key={correct} className="mhp-anim-pop inline-block">{n(correct)}</span>
      </span>
      <span className="hidden min-h-12 items-center gap-2 rounded-xl border-2 border-mf-line bg-mf-panel px-3 @md:inline-flex" title={text.starsSoFar}>
        <span className="sr-only">{text.starsSoFar}: {text.starsOf(n(starsFor(correct, total)), n(3))}</span>
        <StarRow stars={starsFor(correct, total)} size={20} />
      </span>
    </div>
  )
}

/** One segment per question: green = right, orange = missed, gold = now. */
function Segments({ round, text, n }) {
  const total = round.questions.length
  const done = round.responses.length
  return (
    <ol
      className="m-0 mb-4 grid gap-1.5 p-0"
      style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      role="progressbar"
      aria-label={text.questionOf(n(Math.min(round.index + 1, total)), n(total))}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
    >
      {round.questions.map((q, i) => {
        const r = round.responses[i]
        return (
          <li
            key={i}
            className={`h-2.5 list-none rounded-full transition-colors duration-300 @xl:h-3 ${
              r ? (r.correct ? 'bg-mf-good' : 'bg-mf-bad') : i === round.index ? 'bg-mf-gold shadow-[var(--mf-glow-gold)]' : 'bg-mf-track'
            }`}
          />
        )
      })}
    </ol>
  )
}

function ChoiceButton({ value, index, state, disabled, onPick, n, isFraction, xpLabel, celebrate }) {
  const styles = {
    idle: 'border-mf-line bg-mf-panel-2 text-mf-text shadow-[0_5px_0_var(--mf-line)] hover:-translate-y-1 hover:border-mf-gold hover:shadow-[0_8px_0_var(--mf-line),0_0_26px_-8px_rgba(250,204,21,0.8)] active:translate-y-0.5 active:shadow-[0_2px_0_var(--mf-line)]',
    right: 'border-mf-good bg-mf-good-bg text-mf-good-ink shadow-[0_5px_0_var(--mf-good),0_0_32px_-6px_rgba(250,204,21,0.7)] mhp-anim-pop',
    wrong: 'border-mf-bad bg-mf-bad-bg text-mf-bad-ink shadow-[0_5px_0_var(--mf-bad)] mhp-anim-shake',
    dim: 'border-mf-line-soft bg-mf-sunken text-mf-faint',
  }[state]
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      disabled={disabled}
      aria-keyshortcuts={KEYS[index]}
      className={`relative flex h-full min-h-[clamp(4.75rem,16cqh,11rem)] w-full items-center justify-center rounded-3xl border-[3px] px-4 py-3 font-hero text-[clamp(2rem,1.2rem+2.6cqmin,4rem)] leading-none font-extrabold tabular-nums transition duration-150 ${styles} ${
        disabled ? 'cursor-default' : 'cursor-pointer'
      } focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-mf-focus`}
    >
      <span className="absolute top-2.5 left-3.5 grid size-7 place-items-center rounded-lg bg-mf-panel font-copy text-sm font-extrabold text-mf-muted" aria-hidden="true">{n(KEYS[index])}</span>
      {isFraction ? <FractionText value={value} n={n} className="text-[clamp(1.6rem,1rem+2cqmin,3.2rem)]" /> : n(value)}
      {state === 'right' && (
        <>
          <Check className="absolute top-2.5 right-3 text-mf-good-ink" size={26} strokeWidth={3} aria-hidden="true" focusable="false" />
          {celebrate && <span className="mhp-anim-sparkle pointer-events-none absolute top-1 left-1/2 rounded-full bg-mf-gold px-2.5 py-0.5 font-copy text-sm font-extrabold text-mf-on-gold" aria-hidden="true">{xpLabel}</span>}
        </>
      )}
      {state === 'wrong' && <X className="absolute top-2.5 right-3 text-mf-bad-ink" size={26} strokeWidth={3} aria-hidden="true" focusable="false" />}
    </button>
  )
}

function Feedback({ correct, question, index, language, text, n, isLast, onContinue, continueRef }) {
  const cheer = encouragement(correct, index)[language]
  const Icon = correct ? PartyPopper : Lightbulb
  const answerText = question.answer.includes('/')
    ? `${n(question.answer)} (${text.fraction(...question.answer.split('/').map(n))})`
    : n(question.answer)
  return (
    <div
      className={`mhp-anim-rise flex flex-col gap-3 rounded-2xl border-2 p-4 @xl:flex-row @xl:items-center @xl:gap-5 @xl:p-5 ${
        correct ? 'border-mf-good/60 bg-mf-good-bg' : 'border-mf-bad/50 bg-mf-bad-bg'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className={`grid size-12 shrink-0 place-items-center rounded-full text-mf-on-gold ${correct ? 'bg-mf-good' : 'bg-mf-gold'}`}>
          <Icon size={24} strokeWidth={2.75} aria-hidden="true" focusable="false" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 font-hero text-xl font-extrabold text-mf-text @xl:text-2xl">
            {correct ? text.correctTitle : text.wrongTitle} <span className={correct ? 'text-mf-good-ink' : 'text-mf-bad-ink'}>{cheer}</span>
          </p>
          {!correct && (
            <p className="m-0 mt-1 text-base text-mf-text @xl:text-lg">
              {text.theAnswerIs}: <strong className="font-extrabold text-mf-good-ink">{answerText}</strong>
            </p>
          )}
          <p className="m-0 mt-1 text-base text-mf-muted @xl:text-lg">{n(question.explain[language])}</p>
          <p className="m-0 mt-2 flex items-start gap-2 rounded-xl bg-mf-panel px-3 py-2 text-sm text-mf-text ring-1 ring-mf-accent/30 @xl:text-base">
            <Sparkles size={16} strokeWidth={2.75} className="mt-0.5 shrink-0 text-mf-accent" aria-hidden="true" focusable="false" />
            <span><strong className="font-extrabold text-mf-accent">{text.tipLabel}:</strong> {n(question.tip[language])}</span>
          </p>
        </div>
      </div>
      <button type="button" ref={continueRef} onClick={onContinue} className={`${GOLD_BUTTON} w-full shrink-0 @xl:w-auto @xl:min-w-56`}>
        {isLast ? text.seeResults : text.nextQuestion}
        <ArrowRight size={20} strokeWidth={3} aria-hidden="true" focusable="false" />
      </button>
    </div>
  )
}

export default function QuestionCard({ round, question, level, language, text, n, onAnswer, onContinue, onQuit, headingRef }) {
  const continueRef = useRef(null)
  const answered = round.phase === 'answered'
  const response = answered ? round.responses[round.responses.length - 1] : null
  const isFraction = question.choices.some((c) => c.includes('/'))
  const hasVisual = Boolean(question.visual)

  // After answering, move focus to "Next", so Enter / Space carries on and screen readers hear the feedback.
  useEffect(() => {
    if (answered) continueRef.current?.focus({ preventScroll: true })
  }, [answered])

  const stateOf = (choice) => {
    if (!answered) return 'idle'
    if (choice === question.answer) return 'right'
    if (choice === response.choice) return 'wrong'
    return 'dim'
  }

  return (
    <section aria-labelledby="mhp-question" className="mhp-lvl relative z-10 flex w-full flex-1 flex-col" style={lvlStyle(level.accent)}>
      <RoundBar round={round} level={level} language={language} text={text} n={n} onQuit={onQuit} />
      <Segments round={round} text={text} n={n} />

      <div className="relative flex w-full flex-1 flex-col gap-4 overflow-clip rounded-3xl border-2 border-lvl/50 bg-mf-panel/95 p-4 shadow-[0_0_60px_-30px_var(--lvl),var(--mf-shadow)] @xl:gap-5 @xl:p-7">
        {answered && response.correct && <Confetti key={`confetti-${question.id}`} count={36} spread="burst" />}

        <div
          key={question.id}
          className="mhp-anim-rise grid flex-1 content-center gap-4 @xl:gap-6 @5xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] @5xl:items-center"
        >
          {/* the question: words, the sum itself, and its picture */}
          <div className="flex min-w-0 flex-col items-center justify-center gap-3 text-center">
            <h2
              id="mhp-question"
              ref={headingRef}
              tabIndex={-1}
              className="m-0 max-w-[30ch] font-hero text-[clamp(1.35rem,0.9rem+1.3cqi,2.4rem)] leading-snug font-extrabold text-mf-text outline-none"
            >
              {n(question.prompt[language])}
            </h2>
            {question.equation && (
              <p className="m-0 font-hero text-[clamp(2.6rem,1.4rem+4.2cqmin,6rem)] leading-none font-extrabold tracking-wide text-mf-gold-ink tabular-nums drop-shadow-[0_0_14px_rgba(252,211,77,0.35)]">
                {n(question.equation)}
              </p>
            )}
            {hasVisual && (
              <div className="mt-1 w-full">
                <Visual visual={question.visual} n={n} />
              </div>
            )}
          </div>

          {/* the four answers: big targets, in a 2 × 2 grid */}
          <div
            role="group"
            aria-label={text.choicesLabel}
            className="mx-auto grid w-full max-w-5xl grid-cols-2 content-center gap-3 @xl:gap-4"
          >
            {question.choices.map((choice, i) => (
              <ChoiceButton
                key={choice}
                value={choice}
                index={i}
                state={stateOf(choice)}
                disabled={answered}
                onPick={onAnswer}
                n={n}
                isFraction={isFraction}
                xpLabel={n('+1')}
                celebrate={answered && response.correct}
              />
            ))}
          </div>
        </div>

        <div aria-live="polite">
          {answered && (
            <Feedback
              correct={response.correct}
              question={question}
              index={round.index}
              language={language}
              text={text}
              n={n}
              isLast={round.index === round.questions.length - 1}
              onContinue={onContinue}
              continueRef={continueRef}
            />
          )}
        </div>
      </div>
      <p className="m-0 mt-2 hidden items-center justify-center gap-1.5 text-center text-xs text-mf-faint @3xl:flex">
        <Zap size={12} strokeWidth={3} aria-hidden="true" focusable="false" />
        {text.keyboardHint}
      </p>
    </section>
  )
}
