import { lazy, Suspense, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import mascot from '../assets/mascot.webp'
import mathHeroMascot from '../assets/math-hero-mascot-cutout.webp'
import { GAMES, gamesInCategory, getGame } from '../games/registry.js'
import { useGameProgress } from '../hooks/useGameProgress.js'
import { useAuth } from '../auth/AuthContext.jsx'
import FavoriteButton from '../favorites/FavoriteButton.jsx'
import SaveProgressBanner from '../auth/SaveProgressBanner.jsx'
import InstallPwaBanner from '../pwa/InstallPwaBanner.jsx'
import { formatDigits } from '../utils/mathHeroText.js'
import ArcadeHeader from './ArcadeHeader.jsx'
import { useLanguage } from './preferences.js'
import { ARCADE_TEXT } from './text.js'
import { launchedGameFromSearch, launchPath, playPath, useGameCategory } from './zone.js'
import './arcade.css'

// The game launcher (and the game inside it) load only when a launcher tile is opened.
const GameModal = lazy(() => import('./GameModal.jsx'))

function GameTile({ game, language, text }) {
  const { Art } = game
  const title = game.title[language]
  // launcher games open in a dialog on this page (see GameModal.jsx); the rest open their own page
  const modal = game.launch === 'modal'
  const to = modal ? launchPath(game.category, game.id) : `/games/${game.id}`
  return (
    <li className={`game-tile is-${game.color}`}>
      <Link
        className="game-tile-link"
        to={to}
        state={modal ? { fromTile: true } : undefined}
        aria-label={text.playGame(title)}
        aria-haspopup={modal ? 'dialog' : undefined}
      >
        <div className="game-tile-art">
          <Art />
          {game.isNew && <span className="game-tile-badge">{text.newBadge}</span>}
        </div>
        <div className="game-tile-body">
          <h3>{title}</h3>
          <p>{game.tagline[language]}</p>
          <p className="game-tile-meta">
            <span>{game.skill[language]}</span>
            <span>{text.ages(formatDigits(game.ages, language))}</span>
          </p>
        </div>
        <span className="game-tile-play" aria-hidden="true">{text.play}</span>
      </Link>
      {/* beside the link, not inside it: a button can't live in a link, and tapping it must not open the game */}
      <FavoriteButton gameId={game.id} gameTitle={title} language={language} className="is-on-tile" />
    </li>
  )
}

/** The launcher dialog for '?play=<id>', when that game opens in one. */
function Launcher({ language, text, playerId, category }) {
  const { search, state } = useLocation()
  const navigate = useNavigate()
  const game = getGame(launchedGameFromSearch(search))
  const close = useCallback(() => {
    // opened from a tile: step back, so Back after closing doesn't reopen it; opened from a link: just leave
    if (state?.fromTile) navigate(-1)
    else navigate(playPath(category), { replace: true })
  }, [navigate, state, category])
  if (!game || game.launch !== 'modal') return null
  return (
    <Suspense fallback={null}>
      <GameModal game={game} playerId={playerId} language={language} text={text} onClose={close} />
    </Suspense>
  )
}

/**
 * The Play zone: the games in the chosen category (Educational or Adventure),
 * and the Math Hero ad (shown only here).
 */
function PlayZone({ language, text, playerId, category }) {
  const { gamification } = useGameProgress(playerId)
  const { profile } = useAuth()
  // Signed in: the account's XP (every device). Guest: the XP kept on this device.
  const xp = formatDigits(profile?.xp ?? gamification.totalXp, language)
  const games = gamesInCategory(GAMES, category)
  const categoryName = category === 'adventure' ? text.categoryAdventure : text.categoryEducational

  return (
    <>
      <section className="arcade-hero" aria-labelledby="arcade-title">
        <div className="arcade-hero-copy">
          <p className="arcade-bubble">{text.greeting}</p>
          <h1 id="arcade-title">{text.heroTitle}</h1>
          <p className="arcade-hero-text">{text.heroText}</p>
          <p className="arcade-xp" aria-label={text.xpLabel(xp)}>
            <span aria-hidden="true">⭐</span> {text.xp(xp)}
          </p>
        </div>
        <img className="arcade-hero-mascot" src={mascot} alt="" width="410" height="530" />
      </section>

      <SaveProgressBanner language={language} localXp={gamification.totalXp} />

      <section className="arcade-games" aria-labelledby="games-heading">
        <h2 id="games-heading" className="visually-hidden">{text.gamesHeadingFor(categoryName)}</h2>
        <ul className="game-grid">
          {games.map((game) => <GameTile key={game.id} game={game} language={language} text={text} />)}
          <li className="game-tile is-hatching" aria-label={text.hatchingTitle}>
            <span className="hatching-egg" aria-hidden="true">🥚</span>
            <h3>{text.hatchingTitle}</h3>
            <p>{text.hatchingText}</p>
          </li>
        </ul>
      </section>

      <section className="share-strip" aria-labelledby="share-strip-title">
        <img src={mathHeroMascot} alt="" width="64" height="78" loading="lazy" />
        <div className="share-strip-copy">
          <h2 id="share-strip-title">{text.shareTitle}</h2>
          <p>{text.shareText}</p>
        </div>
        <Link className="share-strip-button" to="/share/math-hero">{text.shareButton}</Link>
      </section>
    </>
  )
}

/**
 * The home page: the games. The Educational | Adventure switch in the header picks the category
 * (in the address, see zone.js); a launcher game opens in a dialog over the grid.
 */
export default function ArcadeHome({ playerId, theme, onToggleTheme }) {
  const [language] = useLanguage()
  const text = ARCADE_TEXT[language]
  const [category] = useGameCategory()
  const { search } = useLocation()
  const gameOpen = Boolean(launchedGameFromSearch(search))

  return (
    <div className="arcade" data-zone="play" data-category={category ?? undefined} lang={language}>
      <ArcadeHeader theme={theme} onToggleTheme={onToggleTheme} />

      {/* Re-keyed per category, so each switch plays the entrance animation. */}
      <main id="main" key={category} className="arcade-main zone-panel is-play">
        <PlayZone language={language} text={text} playerId={playerId} category={category} />
      </main>

      {/* Outside <main>: its entrance animation uses a transform, which would trap a fixed dialog inside it. */}
      <Launcher language={language} text={text} playerId={playerId} category={category} />

      <footer className="arcade-footer">
        <p>{text.footer}</p>
      </footer>

      {/* "📲 Install Bulbuli App": phones/tablets only, never over an open game */}
      {!gameOpen && <InstallPwaBanner />}
    </div>
  )
}
