import { useRef } from 'react'
import { useZone, ZONES } from './zone.js'

const ICONS = { play: '🎮', learn: '📘' }

/**
 * One switch for the two zones: Play | Learn. A sliding thumb shows the active zone.
 * It is a radio group: Tab reaches it, the arrow keys switch zones, Enter/Space or a click picks one.
 */
export default function ZoneToggle({ text }) {
  const [zone, setZone] = useZone()
  const buttons = useRef({})
  const labels = { play: text.zonePlay, learn: text.zoneLearn }

  const onKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const next = ZONES[(ZONES.indexOf(zone) + 1) % ZONES.length]
    setZone(next)
    requestAnimationFrame(() => buttons.current[next]?.focus())
  }

  return (
    <div
      className={`zone-toggle is-${zone}`}
      role="radiogroup"
      aria-label={text.zoneLabel}
      onKeyDown={onKeyDown}
    >
      <span className="zone-toggle-thumb" aria-hidden="true" />
      {ZONES.map((id) => (
        <button
          key={id}
          ref={(el) => { buttons.current[id] = el }}
          type="button"
          role="radio"
          aria-checked={zone === id}
          tabIndex={zone === id ? 0 : -1}
          className="zone-toggle-option"
          onClick={() => setZone(id)}
        >
          <span aria-hidden="true">{ICONS[id]}</span> {labels[id]}
        </button>
      ))}
    </div>
  )
}
