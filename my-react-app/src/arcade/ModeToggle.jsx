import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GAME_ZONES, ZONE_ICONS } from '../games/categories.js'
import { categoryOnPage, playPath } from './zone.js'
import { homeCounts } from './homeCatalog.js'
import { useHomeMode } from './preferences.js'

/**
 * The home page's mode slider: Play & Learn | Build & Create. One sliding thumb marks the chosen
 * mode (its shape and the bold label, not just its colour), and the home page shows that zone only.
 * It replaces the old separate "Play" and "3D Game Studio" tabs: the studio now opens from its
 * card in Build & Create, and choosing a mode never launches anything by itself.
 *
 * A radio group: Tab reaches the chosen option, arrow keys (and Home / End) move the choice.
 * The choice lives in homeModePreference (src/arcade/preferences.js), saved on this device.
 * On another page (the Math Hero share page) choosing a mode also goes back home.
 */
export default function ModeToggle({ text }) {
  const [mode, setMode] = useHomeMode()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const options = useRef([])
  const active = Math.max(0, GAME_ZONES.indexOf(mode))

  const choose = (zone, { focus = false } = {}) => {
    setMode(zone) // no-op when it's already the mode
    if (pathname !== '/') {
      navigate('/')
    } else {
      // a filter with nothing in the new mode would show an empty grid: drop back to All Games
      const category = categoryOnPage(pathname, search)
      if (!((homeCounts(zone)[category] ?? 0) > 0)) navigate(playPath('all', search), { preventScrollReset: true })
    }
    if (focus) options.current[GAME_ZONES.indexOf(zone)]?.focus()
  }

  const onKeyDown = (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    let next = null
    if (step) next = (active + step + GAME_ZONES.length) % GAME_ZONES.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = GAME_ZONES.length - 1
    if (next === null) return
    event.preventDefault()
    choose(GAME_ZONES[next], { focus: true })
  }

  return (
    <div
      className="zone-toggle is-mode"
      role="radiogroup"
      aria-label={text.modeLabel}
      data-mode={mode}
      style={{ '--active': active }}
    >
      <span className="zone-toggle-thumb" aria-hidden="true" />
      {GAME_ZONES.map((zone, index) => {
        const checked = index === active
        return (
          <button
            key={zone}
            ref={(element) => { options.current[index] = element }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className="zone-toggle-option"
            onClick={() => choose(zone)}
            onKeyDown={onKeyDown}
          >
            <span className="zone-toggle-icon" aria-hidden="true">{ZONE_ICONS[zone]}</span>
            <span className="zone-toggle-label">{text.zones[zone].title}</span>
          </button>
        )
      })}
    </div>
  )
}
