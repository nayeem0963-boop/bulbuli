import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { PLAY_CATEGORIES, useGameCategory } from './zone.js'

/**
 * A two-way sliding switch. A thumb slides under the active option.
 * It is a radio group: Tab reaches it, the arrow keys switch, Enter/Space or a click picks one.
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

const CATEGORY_ICONS = { educational: '🧠', adventure: '🗺️' }

/** The "Play" tab: the site's one section. Always current; links home to the games. */
export default function PlayTab({ text }) {
  return (
    <Link className="play-tab" to="/" aria-current="page">
      <span aria-hidden="true">🎮</span> {text.navPlay}
    </Link>
  )
}

/**
 * Educational | Adventure. Shown only on the Play home page; renders nothing anywhere else.
 */
export function CategoryToggle({ text }) {
  const [category, setCategory] = useGameCategory()
  if (!category) return null
  const labels = { educational: text.categoryEducational, adventure: text.categoryAdventure }
  return (
    <SlideToggle
      className="is-track is-category"
      label={text.categoryLabel}
      value={category}
      onChange={setCategory}
      options={PLAY_CATEGORIES.map((id) => ({ id, icon: CATEGORY_ICONS[id], label: labels[id] }))}
    />
  )
}
