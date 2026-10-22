import { Link, NavLink } from 'react-router-dom'
import { useLanguage, useMuted } from './preferences.js'
import { ARCADE_TEXT } from './text.js'
import BrandMark from './BrandMark.jsx'

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
 * `game` (optional) turns it into a game bar: a big "All games" button replaces the nav.
 */
export default function ArcadeHeader({ theme, onToggleTheme, game = null, showControls = true }) {
  const [language, , toggleLanguage] = useLanguage()
  const { muted, toggleMuted } = useMuted()
  const text = ARCADE_TEXT[language]

  return (
    <header className={`arcade-header${game ? ' is-game' : ''}`}>
      {game ? (
        <Link className="arcade-back" to="/">
          <span aria-hidden="true">‹</span> {text.backToGames}
        </Link>
      ) : (
        <>
          <Link className="arcade-brand" to="/" aria-label={text.brandLabel}>
            <BrandMark />
            <span>bulbuli</span>
          </Link>
          <nav className="arcade-nav" aria-label="Main">
            <NavLink to="/" end>{text.navGames}</NavLink>
            <a href="#developer-hub">{text.navGrownUps}</a>
          </nav>
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
