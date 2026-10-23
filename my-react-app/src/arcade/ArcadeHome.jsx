import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import mascot from '../assets/mascot.webp'
import mathHeroMascot from '../assets/math-hero-mascot-cutout.webp'
import { GAMES } from '../games/registry.js'
import { useTutorialProgress } from '../hooks/useTutorialProgress.js'
import { formatDigits } from '../utils/mathHeroText.js'
import ArcadeHeader from './ArcadeHeader.jsx'
import LearnZone from './LearnZone.jsx'
import { useLanguage } from './preferences.js'
import { ARCADE_TEXT } from './text.js'
import { useLearnTrack, useZone } from './zone.js'
import './arcade.css'

// Grammar carries 60 questions; load them only when someone opens the Grammar track.
const GrammarZone = lazy(() => import('../grammar/GrammarZone.jsx'))

function GameTile({ game, language, text }) {
  const { Art } = game
  const title = game.title[language]
  return (
    <li className={`game-tile is-${game.color}`}>
      <Link className="game-tile-link" to={`/games/${game.id}`} aria-label={text.playGame(title)}>
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
    </li>
  )
}

/** The Play zone: the games, and the Math Hero ad (shown only here). */
function PlayZone({ language, text, playerId }) {
  const { gamification } = useTutorialProgress(playerId)
  const xp = formatDigits(gamification.totalXp, language)

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

      <section className="arcade-games" aria-labelledby="games-heading">
        <h2 id="games-heading" className="visually-hidden">{text.gamesHeading}</h2>
        <ul className="game-grid">
          {GAMES.map((game) => <GameTile key={game.id} game={game} language={language} text={text} />)}
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
 * The home page. The Play | Learn toggle in the header picks the zone (see zone.js);
 * Play is the default. In Learn, a second Coding | Grammar toggle picks the track.
 * Each zone has its own look, set by data-zone on the page.
 */
export default function ArcadeHome({ session, playerId, theme, onToggleTheme }) {
  const [language] = useLanguage()
  const text = ARCADE_TEXT[language]
  const [zone] = useZone()
  const [track] = useLearnTrack()

  return (
    <div className="arcade" data-zone={zone} data-track={track ?? undefined} lang={language}>
      <ArcadeHeader theme={theme} onToggleTheme={onToggleTheme} />

      {/* Re-keyed per zone and track, so each switch plays the entrance animation. */}
      <main id="main" key={`${zone}-${track}`} className={`arcade-main zone-panel is-${zone}`}>
        {zone === 'play' && <PlayZone language={language} text={text} playerId={playerId} />}
        {track === 'coding' && <LearnZone session={session} text={text} />}
        {track === 'grammar' && (
          <Suspense fallback={<p className="game-message" role="status">{text.loadingGame}</p>}>
            <GrammarZone language={language} text={text} />
          </Suspense>
        )}
      </main>

      <footer className="arcade-footer">
        <p>{text.footer}</p>
      </footer>
    </div>
  )
}
