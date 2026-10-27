import { Suspense, useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getGame } from '../games/registry.js'
import FeedbackModal from '../feedback/FeedbackModal.jsx'
import useGameSession from '../session/useGameSession.js'
import ArcadeHeader from './ArcadeHeader.jsx'
import { GameErrorBoundary, getLazyGame } from './gameLoader.jsx'
import { useLanguage } from './preferences.js'
import { ARCADE_TEXT } from './text.js'
import './arcade.css'

export default function GamePage({ playerId, theme, onToggleTheme, gameId: fixedGameId }) {
  // /games/:gameId, or a game with its own route (e.g. /play/html-architect) passes its id
  const { gameId: routeGameId } = useParams()
  const gameId = fixedGameId ?? routeGameId
  const game = getGame(gameId)
  const [language] = useLanguage()
  const text = ARCADE_TEXT[language]
  const GameComponent = useMemo(() => (game ? getLazyGame(game) : null), [game])
  const navigate = useNavigate()
  // analytics (started / completed / exited) and when to ask "How was it?"
  const session = useGameSession(game, { surface: 'page', language })

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
        onBack={(to) => session.requestExit(() => navigate(to))}
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
              <GameComponent
                key={playerId}
                playerId={playerId}
                language={language}
                game={game}
                onRoundComplete={session.roundComplete}
              />
            </Suspense>
          </GameErrorBoundary>
        )}
      </main>

      <FeedbackModal
        open={session.feedback.open}
        trigger={session.feedback.trigger}
        game={game}
        language={language}
        onClose={session.closeFeedback}
      />
    </div>
  )
}
