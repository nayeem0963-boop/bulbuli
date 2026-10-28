import { Link } from 'react-router-dom'
import { useLanguage, useMuted } from './preferences.js'
import { ARCADE_TEXT } from './text.js'
import BrandMark from './BrandMark.jsx'
import AccountButton from '../auth/AccountButton.jsx'
import ModeToggle from './ModeToggle.jsx'
import { playPath } from './zone.js'
import { gamePath } from '../games/registry.js'
import ShareGameButton from '../buddies/ShareGameButton.jsx'
import { shareUrl } from '../buddies/shareLinks.js'

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
 *
 * Home page (navigation): the brand, the Play & Learn | Build & Create mode slider (ModeToggle.jsx),
 * then the language switch and the profile button.
 *
 * Game pages: `game` (or `back` = { to, label }) turns it into a game bar. A big "All games"
 * button replaces the navigation, and the in-game controls (sound, day/night) join the
 * language switch, a "share this game" button and the profile button. "All games" returns to the full grid.
 */
export default function ArcadeHeader({ theme, onToggleTheme, game = null, back = null, showControls = true, onBack = null }) {
  const [language, , toggleLanguage] = useLanguage()
  const { muted, toggleMuted } = useMuted()
  const text = ARCADE_TEXT[language]

  const backLink = back ?? (game ? { to: playPath('all'), label: text.backToGames } : null)
  const inGame = Boolean(backLink)

  return (
    <header className={`arcade-header${inGame ? ' is-game' : ''}`}>
      {inGame ? (
        <Link
          className="arcade-back"
          to={backLink.to}
          onClick={onBack ? (event) => {
            // keep ctrl/cmd-click "open in new tab" working
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            onBack(backLink.to)
          } : undefined}
        >
          <span aria-hidden="true">‹</span> <span className="arcade-back-label">{backLink.label}</span>
        </Link>
      ) : (
        <>
          <Link className="arcade-brand" to="/" aria-label={text.brandLabel}>
            <BrandMark />
            <span className="arcade-brand-name">Bulbuli</span>
          </Link>
          {/* the home page's two modes; the 3D Game Studio opens from its card in Build & Create */}
          <div className="arcade-toggles">
            <ModeToggle text={text} />
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
          {inGame && (
            <IconButton label={muted ? text.soundOn : text.soundOff} pressed={!muted} onClick={toggleMuted}>
              <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
            </IconButton>
          )}
          {inGame && onToggleTheme && (
            <IconButton
              label={theme === 'dark' ? text.themeLight : text.themeDark}
              pressed={theme === 'dark'}
              onClick={onToggleTheme}
            >
              <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
            </IconButton>
          )}
          {/* Bulbuli Buddies: send this game's public page to a friend (optional, never needed to play) */}
          {inGame && game && (
            <ShareGameButton
              className="arcade-icon-button"
              title={game.title[language] ?? game.title.en}
              url={shareUrl(gamePath(game))}
              language={language}
            />
          )}
          <AccountButton language={language} />
        </div>
      )}
    </header>
  )
}
