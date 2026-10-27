import { useEffect, useRef, useState } from 'react'
import { displayAnswer, displayValue } from '../curriculum/index.js'

const LETTERS = ['A', 'B', 'C', 'D']

function Feedback({ question, record, outcomePoints, isLast, text, n, onContinue }) {
  const continueRef = useRef(null)
  // Move focus to Continue so Enter / Space carries on and screen readers hear the result first.
  useEffect(() => { continueRef.current?.focus({ preventScroll: true }) }, [])
  const status = record.correct ? 'correct' : record.timedOut ? 'timeout' : 'wrong'
  const title = status === 'correct' ? text.correct : status === 'timeout' ? text.timeUp : text.incorrect
  return (
    <div className={`mm-feedback is-${status}`} role="status" aria-live="polite">
      <p className="mm-feedback-title">
        <span aria-hidden="true">{status === 'correct' ? '✓' : status === 'timeout' ? '⏱' : '✗'}</span> {title}
        {record.correct && <span className="mm-feedback-points">{text.points(n(outcomePoints))}</span>}
      </p>
      {!record.correct && <p className="mm-feedback-answer">{text.correctAnswerIs(displayAnswer(question))}</p>}
      <p className="mm-feedback-why">{question.explanation}</p>
      {question.steps && (
        <div className="mm-working">
          <p className="mm-working-title">{text.working}</p>
          <ol>{question.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        </div>
      )}
      <button ref={continueRef} type="button" className="mm-btn is-primary" onClick={onContinue}>
        {isLast ? text.seeResults : text.continue} →
      </button>
    </div>
  )
}

function NumberAnswer({ question, disabled, text, onSubmit }) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus({ preventScroll: true }) }, [question.id])
  const toggleSign = () => {
    setValue((current) => (current.trim().startsWith('-') || current.trim().startsWith('−') ? current.trim().slice(1) : `-${current.trim()}`))
    inputRef.current?.focus()
  }
  return (
    <form
      className="mm-input"
      onSubmit={(event) => {
        event.preventDefault()
        if (!disabled && value.trim()) onSubmit(value)
      }}
    >
      <label htmlFor={`mm-answer-${question.id}`} className="visually-hidden">{text.answerLabel}</label>
      <button type="button" className="mm-btn is-ghost is-small mm-sign" onClick={toggleSign} disabled={disabled} aria-label="±">±</button>
      <input
        ref={inputRef}
        id={`mm-answer-${question.id}`}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder={text.answerPlaceholder}
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
      />
      {question.unit && <span className="mm-input-unit">{question.unit}</span>}
      <button type="submit" className="mm-btn is-primary" disabled={disabled || !value.trim()}>{text.submit}</button>
    </form>
  )
}

/** The question card: prompt, answers (buttons, a number box or A–D for tap-the-point), hint and feedback. */
export default function QuestionPanel({
  round, question, outcomePoints, text, n, onAnswer, onHint, onContinue, headingRef,
}) {
  const answered = round.phase === 'answered'
  const record = answered ? round.responses[round.responses.length - 1] : null
  const isLast = round.index + 1 >= round.questions.length
  const formatLabel = question.format === 'input' ? text.formatInput : question.format === 'pick' ? text.formatPick : text.formatChoice

  const stateOf = (choice) => {
    if (!answered) return ''
    if (choice === question.answer) return 'is-right'
    if (choice === record.response) return 'is-wrong'
    return 'is-dim'
  }

  return (
    <section className="mm-panel mm-question" aria-labelledby="mm-question-heading">
      <div className="mm-question-tags">
        <span className="mm-chip is-topic">{question.topic}</span>
        <span className="mm-chip">{formatLabel}</span>
      </div>
      <h2 id="mm-question-heading" className="mm-prompt" ref={headingRef} tabIndex={-1}>{question.prompt}</h2>

      {question.format === 'input' ? (
        <>
          <NumberAnswer key={question.id} question={question} disabled={answered} text={text} onSubmit={(value) => onAnswer({ value })} />
          {answered && (
            <p className={`mm-typed ${record.correct ? 'is-right' : 'is-wrong'}`}>
              {text.yourAnswer}: <strong>{record.response ?? '—'}</strong>
            </p>
          )}
        </>
      ) : (
        <div className={`mm-choices ${question.format === 'pick' ? 'is-pick' : ''}`} role="group" aria-label={formatLabel}>
          {question.choices.map((choice, index) => {
            const state = stateOf(choice)
            const shown = question.format === 'pick' ? text.point(choice) : displayValue(question, choice)
            return (
              <button
                key={choice}
                type="button"
                className={`mm-choice ${state}`}
                aria-disabled={answered}
                onClick={() => onAnswer({ choice })}
              >
                <span className="mm-choice-key" aria-hidden="true">{LETTERS[index]}</span>
                <span className="mm-choice-text">{shown}</span>
                {state === 'is-right' && <span className="mm-choice-mark">✓<span className="visually-hidden"> {text.rightAnswer}</span></span>}
                {state === 'is-wrong' && <span className="mm-choice-mark">✗<span className="visually-hidden"> {text.yourAnswer}</span></span>}
              </button>
            )
          })}
        </div>
      )}

      {round.hintUsed ? (
        <div className="mm-hint" role="note">
          <strong>💡 {text.hintTitle}:</strong> {question.hint}
        </div>
      ) : (
        !answered && (
          <button type="button" className="mm-btn is-ghost is-small mm-hint-button" onClick={onHint}>
            💡 {text.hint} <span className="mm-hint-cost">{text.hintCost}</span>
          </button>
        )
      )}

      {answered && (
        <Feedback
          key={question.id}
          question={question}
          record={record}
          outcomePoints={outcomePoints}
          isLast={isLast}
          text={text}
          n={n}
          onContinue={onContinue}
        />
      )}
      <p className="mm-keys" aria-hidden="true">{text.keysHint}</p>
    </section>
  )
}
