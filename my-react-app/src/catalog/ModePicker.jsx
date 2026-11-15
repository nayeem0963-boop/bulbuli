import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gamePath, getGame } from '../games/registry.js'
import { formatDigits } from '../utils/mathHeroText.js'
import { CATEGORY_ICONS, CATEGORY_LABELS, playableModes } from './learningCatalog.js'
import { CatalogArt } from './CatalogTile.jsx'
import './catalog.css'
import './mode-picker.css'

/**
 * The mode picker: a dialog over the Play page for a catalogue card with several modes
 * (Math Hero, Shape Lab 3D, Bulbuli Adventure Run 3D). Opened by its address
 * ('/?learn=<entry>', see zone.js), so Back closes it and the link can be shared.
 *
 * Each playable mode is a plain link to the game's existing address (e.g. /games/math-hero-pro):
 * the game, its saved progress and its XP are exactly the ones it always had.
 * "Coming soon" modes are shown as disabled cards: no link, a disabled button, nothing to play.
 *
 * Styled like the game launcher (.game-modal in arcade.css) plus mode-picker.css.
 * Keys: Esc closes; Tab stays inside the dialog.
 */

const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

function ModeCard({ mode, language, text }) {
  const title = mode.title[language]
  if (mode.comingSoon) {
    return (
      <li className="mode-card is-soon" aria-disabled="true">
        <div className="mode-card-art" aria-hidden="true"><span className="mode-card-lock">🔒</span></div>
        <div className="mode-card-body">
          <h3>{title}</h3>
          <p className="mode-card-learn">{text.comingSoon}</p>
        </div>
        <button type="button" className="mode-card-action is-soon" disabled aria-label={text.comingSoonLabel(title)}>
          {text.comingSoon}
        </button>
      </li>
    )
  }

  const game = getGame(mode.gameId)
  const Art = game?.Art
  return (
    <li className={`mode-card is-${game?.color ?? 'sky'}`}>
      <Link className="mode-card-link" to={`${gamePath(game)}${mode.search ?? ''}`} aria-label={text.playMode(title)}>
        <div className="mode-card-art" aria-hidden="true">{Art && <Art />}</div>
        <div className="mode-card-body">
          <h3>{title}</h3>
          <p className="mode-card-learn">{mode.learn[language]}</p>
          {mode.ages && <p className="mode-card-meta"><span>{text.ages(formatDigits(mode.ages, language))}</span></p>}
        </div>
        <span className="mode-card-action" aria-hidden="true">{text.play}</span>
      </Link>
    </li>
  )
}

export default function ModePicker({ entry, language, text, onClose }) {
  const dialog = useRef(null)
  const titleId = useId()
  const title = entry.title[language]
  const ready = playableModes(entry).length
  const categoryName = (CATEGORY_LABELS[language] ?? CATEGORY_LABELS.en)[entry.category]

  // the page behind doesn't scroll; focus moves into the dialog and back to the card on close
  useEffect(() => {
    const opener = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    dialog.current?.querySelector('.mode-card-link')?.focus({ preventScroll: true })
    return () => {
      document.body.style.overflow = overflow
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const items = [...dialog.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="game-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        ref={dialog}
        className={`game-modal mode-picker is-${entry.color}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        data-entry={entry.id}
      >
        <div className="game-modal-bar">
          <h2 id={titleId} className="game-modal-title">{title}</h2>
          <button type="button" className="game-modal-icon is-close" onClick={onClose} aria-label={text.closeModes} title={text.closeModes}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="mode-picker-scroll">
          <div className="mode-picker-intro">
            <div className="mode-picker-art" aria-hidden="true"><CatalogArt entry={entry} /></div>
            <div>
              <p className="game-modal-meta">
                <span><i className="catalog-chip-icon" aria-hidden="true">{CATEGORY_ICONS[entry.category]} </i>{categoryName}</span>
                <span>{text.levelLabel(entry.level[language])}</span>
                <span>{text.ages(formatDigits(entry.ages, language))}</span>
              </p>
              <p className="game-modal-tagline">{entry.tagline[language]}</p>
              <p className="mode-picker-learn"><strong>🎓 {text.learnLabel}:</strong> {entry.learn[language]}</p>
            </div>
          </div>

          <h3 className="mode-picker-heading">
            {text.chooseMode}
            <span className="mode-picker-count">
              {text.modesAvailable(formatDigits(ready, language), formatDigits(entry.modes.length, language))}
            </span>
          </h3>
          <ul className="mode-list">
            {entry.modes.map((mode) => <ModeCard key={mode.id} mode={mode} language={language} text={text} />)}
          </ul>
        </div>
      </div>
    </div>
  )
}
