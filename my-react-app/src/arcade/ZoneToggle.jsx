import { useRef } from 'react'
import { LEARN_TRACKS, useLearnTrack, useZone, ZONES } from './zone.js'

/**
 * A two-way sliding switch. A thumb slides under the active option.
 * It is a radio group: Tab reaches it, the arrow keys switch, Enter/Space or a click picks one.
 * Both the Play | Learn and the Coding | Grammar switches are built from it.
 */
function SlideToggle({ options, value, onChange, label, className }) {
  const buttons = useRef({})
  const ids = options.map((option) => option.id)
  const active = Math.max(0, ids.indexOf(value))

  const onKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
    const next = ids[(active + step + ids.length) % ids.length]
    onChange(next)
    requestAnimationFrame(() => buttons.current[next]?.focus())
  }

  return (
    <div
      className={`zone-toggle ${className} is-${value}`}
      style={{ '--active': active }}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      <span className="zone-toggle-thumb" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.id}
          ref={(el) => { buttons.current[option.id] = el }}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          tabIndex={value === option.id ? 0 : -1}
          className="zone-toggle-option"
          onClick={() => onChange(option.id)}
        >
          <span aria-hidden="true">{option.icon}</span> {option.label}
        </button>
      ))}
    </div>
  )
}

const ZONE_ICONS = { play: '🎮', learn: '📘' }
const TRACK_ICONS = { coding: '💻', grammar: '✏️' }

/** Play | Learn. */
export default function ZoneToggle({ text }) {
  const [zone, setZone] = useZone()
  const labels = { play: text.zonePlay, learn: text.zoneLearn }
  return (
    <SlideToggle
      className="is-zone"
      label={text.zoneLabel}
      value={zone}
      onChange={setZone}
      options={ZONES.map((id) => ({ id, icon: ZONE_ICONS[id], label: labels[id] }))}
    />
  )
}

/** Coding | Grammar. Shown only while the Learn zone is open; renders nothing anywhere else. */
export function TrackToggle({ text }) {
  const [track, setTrack] = useLearnTrack()
  if (!track) return null
  const labels = { coding: text.trackCoding, grammar: text.trackGrammar }
  return (
    <SlideToggle
      className="is-track"
      label={text.trackLabel}
      value={track}
      onChange={setTrack}
      options={LEARN_TRACKS.map((id) => ({ id, icon: TRACK_ICONS[id], label: labels[id] }))}
    />
  )
}
