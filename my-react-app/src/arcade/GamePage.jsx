import { Component, lazy, Suspense, useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getGame } from '../games/registry.js'
import ArcadeHeader from './ArcadeHeader.jsx'
import { useLanguage } from './preferences.js'
import { ARCADE_TEXT } from './text.js'
import './arcade.css'

// One lazy component per game, created once, so revisiting a game never reloads its code.
const lazyGames = new Map()
function getLazyGame(game) {
  if (!lazyGames.has(game.id)) lazyGames.set(game.id, lazy(game.load))
  return lazyGames.get(game.id)
}

/** Keeps a broken game from taking the whole arcade down with it. */
class GameErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('A Bulbuli game stopped working.', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const { text } = this.props
    return (
      <div className="game-message" role="alert">
        <p>{text.gameCrashed}</p>
        <button type="button" className="arcade-cta" onClick={() => this.setState({ failed: false })}>
          {text.tryAgain}
        </button>
      </div>
    )
  }
}

export default function GamePage({ playerId, theme, onToggleTheme }) {
  const { gameId } = useParams()
  const game = getGame(gameId)
  const [language] = useLanguage()
  const text = ARCADE_TEXT[language]
  const GameComponent = useMemo(() => (game ? getLazyGame(game) : null), [game])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [gameId])

  return (
    <div className={`arcade is-game-page game-page-${gameId}`} lang={language}>
      <ArcadeHeader
        theme={theme}
        onToggleTheme={onToggleTheme}
        game={game}
        showControls={!game?.ownControls}
      />
      <main id="main" className="game-stage">
        {!game ? (
          <div className="game-message">
            <h1>{text.gameMissing}</h1>
            <Link className="arcade-cta" to="/">{text.backToGames}</Link>
          </div>
        ) : (
          <GameErrorBoundary key={game.id} text={text}>
            <Suspense fallback={<p className="game-message" role="status">{text.loadingGame}</p>}>
              {/* Remount when the player changes, so a game never mixes two players' saves. */}
              <GameComponent key={playerId} playerId={playerId} language={language} game={game} />
            </Suspense>
          </GameErrorBoundary>
        )}
      </main>
    </div>
  )
}
