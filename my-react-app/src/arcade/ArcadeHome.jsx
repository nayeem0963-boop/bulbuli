import { lazy, Suspense, useCallback, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import mascot from '../assets/mascot.webp'
import {
  CATEGORY_FILTERS, GAMES, gamePath, gamesInCategory, gamesInZone, getGame, ZONE_ICONS,
} from '../games/registry.js'
import { useGameProgress } from '../hooks/useGameProgress.js'
import { useAuth } from '../auth/AuthContext.jsx'
import FavoriteButton from '../favorites/FavoriteButton.jsx'
import SaveProgressBanner from '../auth/SaveProgressBanner.jsx'
import InstallPwaBanner from '../pwa/InstallPwaBanner.jsx'
import BuddyInviteCard from '../buddies/BuddyInviteCard.jsx'
import { requestedHomeMode, searchWithoutMode } from '../games/categories.js'
import { formatDigits } from '../utils/mathHeroText.js'
import ArcadeHeader from './ArcadeHeader.jsx'
import CategoryPills from './CategoryPills.jsx'
import QuizTile, { showQuizTile } from './QuizTile.jsx'
import StudioTile from './StudioTile.jsx'
import { homeModePreference, useHomeMode, useLanguage } from './preferences.js'
import { homeCounts, modeWithFilter, QUIZ_ZONE } from './homeCatalog.js'
import { ARCADE_TEXT } from './text.js'
import { launchedGameFromSearch, launchPath, playPath, useGameCategory } from './zone.js'
import './arcade.css'

// The game launcher (and the game inside it) load only when a launcher tile is opened.
const GameModal = lazy(() => import('./GameModal.jsx'))

// The 3D Game Studio is a creative tool: its card sits in Build & Create (see StudioTile.jsx),
// under All Games and the Arcade (12+) pill.
const STUDIO_ZONE = 'build-create'
const STUDIO_FILTERS = ['all', 'arcade']
const showStudioTile = (filter) => STUDIO_FILTERS.includes(filter)

function GameTile({ game, language, text, category, search, index }) {
  const { Art } = game
  const title = game.title[language]
  // launcher games open in a dialog over the grid as it is now filtered (see GameModal.jsx);
  // the rest open their own page
  const modal = game.launch === 'modal'
  const to = modal ? launchPath(category, game.id, search) : gamePath(game)
  return (
    <li
      className={`game-tile is-${game.color}`}
      // a stable name per game lets a view transition glide each card to its new place
      // when the filter changes; --i staggers the fallback entrance animation
      style={{ viewTransitionName: `game-${game.id}`, '--i': index }}
    >
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
    else navigate(playPath(category, search), { replace: true })
  }, [navigate, state, category, search])
  if (!game || game.launch !== 'modal') return null
  return (
    <Suspense fallback={null}>
      <GameModal game={game} playerId={playerId} language={language} text={text} onClose={close} />
    </Suspense>
  )
}

/** The "More games are hatching" card: shown once, at the end of the last zone on the page. */
function HatchingTile({ text }) {
  return (
    <li className="game-tile is-hatching" aria-label={text.hatchingTitle} style={{ viewTransitionName: 'game-hatching' }}>
      <span className="hatching-egg" aria-hidden="true">🥚</span>
      <h3>{text.hatchingTitle}</h3>
      <p>{text.hatchingText}</p>
    </li>
  )
}

/**
 * One age zone (Play & Learn or Build & Create): its heading, age label, a short description
 * and its own game grid. Which games sit here comes from each game's `zone` in registry.js.
 */
function GameZone({ zone, games, withQuiz, withStudio, last, language, text, filter, search }) {
  const copy = text.zones[zone]
  const headingId = `zone-${zone}-title`
  const count = formatDigits(games.length + (withQuiz ? 1 : 0), language)
  return (
    <section className={`game-zone is-${zone}`} aria-labelledby={headingId} data-zone={zone}>
      <header className="game-zone-head">
        <span className="game-zone-icon" aria-hidden="true">{ZONE_ICONS[zone]}</span>
        <div className="game-zone-copy">
          <p className="game-zone-kind">{copy.kind}</p>
          <h2 id={headingId}>{copy.title}</h2>
          <p className="game-zone-text">{copy.text}</p>
        </div>
        <p className="game-zone-tags">
          <span className="game-zone-ages">{copy.ages}</span>
          <span className="game-zone-count">{text.gameCount(count)}</span>
        </p>
      </header>
      {/* re-keyed per filter so browsers without view transitions still get the staggered entrance */}
      <ul key={filter} className="game-grid" data-filter={filter}>
        {/* a creative tool, not a game, so first in Build & Create and not in the "N games" count */}
        {withStudio && <StudioTile text={text} index={0} />}
        {games.map((game, index) => (
          <GameTile key={game.id} game={game} language={language} text={text} category={filter} search={search} index={index + (withStudio ? 1 : 0)} />
        ))}
        {/* the standalone HTML course page (not a registry game, so it opens as its own page) */}
        {withQuiz && <QuizTile language={language} text={text} index={games.length + (withStudio ? 1 : 0)} />}
        {last && <HatchingTile text={text} />}
      </ul>
    </section>
  )
}

/** The hero's "Start playing": scrolls to the games (no change of address) and moves focus there. */
function goToGames(event) {
  const target = document.getElementById('games')
  if (!target) return
  event.preventDefault()
  const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
  target.focus({ preventScroll: true })
}

/**
 * The Play page: the audience pills, then one zone, the mode picked with the header's
 * Play & Learn | Build & Create slider (the other zone isn't rendered at all), then the
 * Bulbuli Buddies invite card. The pills filter that zone and show only the audiences it has.
 */
function PlayZone({ language, text, playerId, category, mode }) {
  const { gamification } = useGameProgress(playerId)
  const { profile } = useAuth()
  const { search } = useLocation()
  // Signed in: the account's XP (every device). Guest: the XP kept on this device.
  const xp = formatDigits(profile?.xp ?? gamification.totalXp, language)
  const filter = CATEGORY_FILTERS.includes(category) ? category : 'all'
  const counts = homeCounts(mode)
  // pills for the audiences this mode has (All Games always)
  const pills = CATEGORY_FILTERS.filter((id) => id === 'all' || (counts[id] ?? 0) > 0)
  const games = gamesInCategory(GAMES, filter)
  const quizShown = showQuizTile(filter)
  const filterName = text.filters[filter]
  const count = formatDigits(counts[filter] ?? 0, language)
  const zones = [mode]
    .map((zone) => ({
      zone,
      games: gamesInZone(games, zone),
      withQuiz: quizShown && QUIZ_ZONE === zone,
      withStudio: showStudioTile(filter) && STUDIO_ZONE === zone,
    }))
    .filter(({ games: zoneGames, withQuiz, withStudio }) => zoneGames.length > 0 || withQuiz || withStudio)

  return (
    <>
      <section className="arcade-hero" aria-labelledby="arcade-title">
        <div className="arcade-hero-copy">
          <p className="arcade-bubble">{text.greeting}</p>
          <h1 id="arcade-title">{text.heroTitle}</h1>
          <p className="arcade-hero-text">{text.heroText}</p>
          <div className="arcade-hero-actions">
            <a className="arcade-hero-cta" href="#games" onClick={goToGames} aria-label={text.heroCtaLabel}>
              <span aria-hidden="true">▶</span> {mode === 'build-create' ? text.heroCtaBuild : text.heroCta}
            </a>
            <p className="arcade-xp" aria-label={text.xpLabel(xp)}>
              <span aria-hidden="true">⭐</span> {text.xp(xp)}
            </p>
          </div>
        </div>
        <img className="arcade-hero-mascot" src={mascot} alt="" width="410" height="530" />
      </section>

      <SaveProgressBanner language={language} localXp={gamification.totalXp} />

      <div id="games" className="arcade-games" role="region" aria-label={text.gamesHeadingFor(filterName)} tabIndex={-1}>
        <CategoryPills category={filter} counts={counts} filters={pills} text={text} language={language} />
        {/* announces the new count when a pill is picked */}
        <p className="visually-hidden" role="status" aria-live="polite">{text.showingGames(count, filterName)}</p>
        {zones.map(({ zone, games: zoneGames, withQuiz, withStudio }, index) => (
          <GameZone
            key={zone}
            zone={zone}
            games={zoneGames}
            withQuiz={withQuiz}
            withStudio={withStudio}
            last={index === zones.length - 1}
            language={language}
            text={text}
            filter={filter}
            search={search}
          />
        ))}
        {zones.length === 0 && (
          <ul className="game-grid" data-filter={filter}>
            <li className="game-grid-empty">{text.emptyFilter}</li>
            <HatchingTile text={text} />
          </ul>
        )}
      </div>

      {/* Bulbuli Buddies: invite a friend (always optional; nothing is promised for it) */}
      <BuddyInviteCard language={language} />
    </>
  )
}

/**
 * The home page: the games. The audience pills above the grid pick a filter (in the address,
 * ?category=young|logic|arcade, see zone.js); a launcher game opens in a dialog over the grid.
 */
export default function ArcadeHome({ playerId, theme, onToggleTheme }) {
  const [language] = useLanguage()
  const text = ARCADE_TEXT[language]
  const [category] = useGameCategory()
  const [mode] = useHomeMode()
  const { search } = useLocation()
  const navigate = useNavigate()
  const gameOpen = Boolean(launchedGameFromSearch(search))

  // A shared link to a filter only the other mode has (e.g. /?category=arcade while in Play & Learn)
  // opens that mode. Only when the filter changes: switching modes resets the filter itself.
  useEffect(() => {
    const current = homeModePreference.get()
    const target = modeWithFilter(category ?? 'all', current)
    if (target && target !== current) homeModePreference.set(target)
  }, [category])

  // An invitation link to a mode (/?mode=build-create, see src/buddies/shareLinks.js) opens that
  // mode, then the ?mode= is dropped from the address. Anything that isn't a mode is ignored.
  useEffect(() => {
    if (!new URLSearchParams(search).has('mode')) return
    const requested = requestedHomeMode(search)
    if (requested) homeModePreference.set(requested)
    navigate({ search: searchWithoutMode(search) }, { replace: true })
  }, [search, navigate])

  return (
    <div className="arcade" data-zone="play" data-mode={mode} data-category={category ?? undefined} lang={language}>
      <ArcadeHeader theme={theme} onToggleTheme={onToggleTheme} />

      {/* Not re-keyed per filter: only the grid animates when a pill is picked, the hero stays put. */}
      <main id="main" className="arcade-main zone-panel is-play">
        <PlayZone language={language} text={text} playerId={playerId} category={category} mode={mode} />
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
