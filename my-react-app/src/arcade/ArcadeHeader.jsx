import { Link } from 'react-router-dom'
import { useLanguage, useMuted } from './preferences.js'
import { ARCADE_TEXT } from './text.js'
import BrandMark from './BrandMark.jsx'
import ZoneToggle, { TrackToggle } from './ZoneToggle.jsx'

function IconButton({ label, pressed, onClick, children, lang }) {
  return (
    <button
      type="button"
      className="arcade-icon-button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      lang={lang}
    >
      {children}
    </button>
  )
}

/**
 * The bar across the top of every arcade screen.
 * `game` (optional) turns it into a game bar: a big "All games" button replaces the toggles.
 * `back` ({ to, label }, optional) does the same with another destination (the Grammar quizzes use it).
 * In the Learn zone a second switch, Coding | Grammar, sits beside Play | Learn.
 */
export default function ArcadeHeader({ theme, onToggleTheme, game = null, back = null, showControls = true }) {
  const [language, , toggleLanguage] = useLanguage()
  const { muted, toggleMuted } = useMuted()
  const text = ARCADE_TEXT[language]

  const backLink = back ?? (game ? { to: '/', label: text.backToGames } : null)

  return (
    <header className={`arcade-header${backLink ? ' is-game' : ''}`}>
      {backLink ? (
        <Link className="arcade-back" to={backLink.to}>
          <span aria-hidden="true">‹</span> {backLink.label}
        </Link>
      ) : (
        <>
          <Link className="arcade-brand" to="/" aria-label={text.brandLabel}>
            <BrandMark />
            <span>bulbuli</span>
          </Link>
          <div className="arcade-toggles">
            <ZoneToggle text={text} />
            <TrackToggle text={text} />
          </div>
        </>
      )}

      {showControls && (
        <div className="arcade-controls">
          <button
            type="button"
            className="arcade-lang"
            onClick={toggleLanguage}
            lang={language === 'en' ? 'bn' : 'en'}
            aria-label={text.switchLanguageLabel}
            title={text.switchLanguageLabel}
          >
            {text.switchLanguage}
          </button>
          <IconButton label={muted ? text.soundOn : text.soundOff} pressed={!muted} onClick={toggleMuted}>
            <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
          </IconButton>
          {onToggleTheme && (
            <IconButton
              label={theme === 'dark' ? text.themeLight : text.themeDark}
              pressed={theme === 'dark'}
              onClick={onToggleTheme}
            >
              <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
            </IconButton>
          )}
        </div>
      )}
    </header>
  )
}
