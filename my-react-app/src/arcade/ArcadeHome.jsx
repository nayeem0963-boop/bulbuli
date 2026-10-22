import { Link } from 'react-router-dom'
import mascot from '../assets/mascot.webp'
import mathHeroMascot from '../assets/math-hero-mascot-cutout.webp'
import { GAMES } from '../games/registry.js'
import { useTutorialProgress } from '../hooks/useTutorialProgress.js'
import { formatDigits } from '../utils/mathHeroText.js'
import ArcadeHeader from './ArcadeHeader.jsx'
import DeveloperHub from './DeveloperHub.jsx'
import { useLanguage } from './preferences.js'
import { ARCADE_TEXT } from './text.js'
import './arcade.css'

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

export default function ArcadeHome({ session, playerId, theme, onToggleTheme }) {
  const [language] = useLanguage()
  const text = ARCADE_TEXT[language]
  const { gamification } = useTutorialProgress(playerId)
  const xp = formatDigits(gamification.totalXp, language)

  return (
    <div className="arcade" lang={language}>
      <ArcadeHeader theme={theme} onToggleTheme={onToggleTheme} />

      <main id="main" className="arcade-main">
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

        <DeveloperHub session={session} language={language} />
      </main>

      <footer className="arcade-footer">
        <p>{text.footer}</p>
      </footer>
    </div>
  )
}
