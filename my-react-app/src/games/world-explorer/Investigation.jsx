/**
 * The hands-on Investigate stage of a World Explorer station (content: station.interaction, see
 * src/learning/content/world-explorer/interactions.js).
 *
 *   compare  1. predict  2. test every condition (reading shown as a relative level gauge)
 *            3. see whether the prediction held, with the reason
 *   order    tap the items in order, check, fix mistakes until right
 *
 * Learning, not scoring: predictions and order attempts never change XP. The stage is finished
 * (onDone → saveStationProgress 'investigate') only when every condition has been tested / the
 * order is right. Keyboard and screen-reader friendly (buttons, aria-live results).
 * Pure helpers live in investigation.js (tested in investigation.test.js).
 */
import { useMemo, useState } from 'react'
import { compareComplete, orderMarks, shuffledOrder } from './investigation.js'

function Gauge({ level, label }) {
  return (
    <span className="wx-gauge" role="img" aria-label={label}>
      {[1, 2, 3, 4].map((i) => <span key={i} className={i <= level ? 'is-on' : ''} />)}
    </span>
  )
}

function Compare({ spec, L, text, onDone }) {
  const [prediction, setPrediction] = useState(null)
  const [tested, setTested] = useState([])
  const complete = compareComplete(spec.conditions, tested)
  return (
    <div className="wx-investigation" data-kind="compare">
      <p className="wx-prompt">{L(spec.predict)}</p>
      <div className="wx-options" role="group" aria-label={L(spec.predict)}>
        {spec.conditions.map((c) => (
          <button key={c.id} type="button" className={`wx-option${prediction === c.id ? ' is-picked' : ''}`}
            disabled={prediction !== null} aria-pressed={prediction === c.id} onClick={() => setPrediction(c.id)} data-predict={c.id}>
            {L(c.label)}
          </button>
        ))}
      </div>
      {prediction !== null ? (
        <>
          <p className="wx-muted">{text.testEach(L(spec.measure))}</p>
          <ul className="wx-tests">
            {spec.conditions.map((c) => {
              const done = tested.includes(c.id)
              return (
                <li key={c.id}>
                  <button type="button" className="wx-secondary" disabled={done} onClick={() => setTested((t) => [...t, c.id])} data-condition={c.id}>
                    {done ? '✓ ' : ''}{text.test}: {L(c.label)}
                  </button>
                  {done ? (
                    <span className="wx-reading" aria-live="polite">
                      <Gauge level={c.level} label={`${L(spec.measure)}: ${c.level}/4`} /> {L(c.reading)}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </>
      ) : null}
      {complete ? (
        <div className={`wx-feedback ${prediction === spec.expect ? 'is-right' : 'is-wrong'}`} aria-live="polite" data-testid="wx-investigation-result">
          <p className="wx-feedback-title">{prediction === spec.expect ? text.predictionRight : text.predictionWrong}</p>
          <p>{L(spec.explain)}</p>
          <button type="button" className="wx-primary" onClick={onDone} data-action="investigate">{text.investigationDone}</button>
        </div>
      ) : null}
    </div>
  )
}

function Order({ spec, L, text, seed, onDone }) {
  const correct = spec.items.map((i) => i.id)
  const start = useMemo(() => shuffledOrder(spec.items, seed), [spec.items, seed])
  const byId = Object.fromEntries(spec.items.map((i) => [i.id, i]))
  const [picked, setPicked] = useState([])
  const [marks, setMarks] = useState(null)
  const solved = marks !== null && marks.every(Boolean)
  const remaining = start.filter((id) => !picked.includes(id))
  return (
    <div className="wx-investigation" data-kind="order">
      <p className="wx-prompt">{L(spec.prompt)}</p>
      <ol className="wx-order" aria-label={text.yourOrder}>
        {picked.map((id, i) => (
          <li key={id} className={marks ? (marks[i] ? 'is-right' : 'is-wrong') : ''}>{L(byId[id].label)}</li>
        ))}
      </ol>
      {!solved ? (
        <div className="wx-options" role="group" aria-label={text.tapNext}>
          {remaining.map((id) => (
            <button key={id} type="button" className="wx-option" onClick={() => { setPicked((p) => [...p, id]); setMarks(null) }} data-order-item={id}>
              {L(byId[id].label)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="wx-row" aria-live="polite">
        {!solved && picked.length === correct.length && marks === null
          ? <button type="button" className="wx-primary" onClick={() => setMarks(orderMarks(correct, picked))} data-action="check-order">{text.checkOrder}</button> : null}
        {!solved && picked.length > 0 ? <button type="button" className="wx-small" onClick={() => { setPicked([]); setMarks(null) }}>{text.startOver}</button> : null}
        {marks !== null && !solved ? <p className="wx-muted">{text.orderNotYet(marks.filter(Boolean).length, correct.length)}</p> : null}
      </div>
      {solved ? (
        <div className="wx-feedback is-right" data-testid="wx-investigation-result">
          <p className="wx-feedback-title">{text.orderRight}</p>
          <p>{L(spec.explain)}</p>
          <button type="button" className="wx-primary" onClick={onDone} data-action="investigate">{text.investigationDone}</button>
        </div>
      ) : null}
    </div>
  )
}

export default function Investigation({ spec, L, text, seed, onDone }) {
  if (!spec) return <button type="button" className="wx-primary" onClick={onDone} data-action="investigate">{text.investigateDo}</button>
  return spec.kind === 'order'
    ? <Order spec={spec} L={L} text={text} seed={seed} onDone={onDone} />
    : <Compare spec={spec} L={L} text={text} onDone={onDone} />
}
