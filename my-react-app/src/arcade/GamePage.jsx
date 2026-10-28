import { Suspense, useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getGame } from '../games/registry.js'
import FeedbackModal from '../feedback/FeedbackModal.jsx'
import useGameSession from '../session/useGameSession.js'
import GameLoadingSpinner from '../components/game/GameLoadingSpinner.jsx'
import ArcadeHeader from './ArcadeHeader.jsx'
import { GameErrorBoundary, getLazyGame } from './gameLoader.jsx'
import { GameFullscreenFrame } from './GameFullscreen.jsx'
import { exitFullscreen } from '../shared/lib/fullscreen.js'
import { useLanguage } from './preferences.js'
import { ARCADE_TEXT } from './text.js'
import './arcade.css'

function MaybeFullscreen({ game, language, forceExit, children }) {
  if (!game.fullscreen) return children
  return (
    <GameFullscreenFrame key={game.id} gameId={game.id} language={language} forceExit={forceExit}>
      {children}
    </GameFullscreenFrame>
  )
}

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

  // The "How was it?" card shows on this page, so a game in full screen (including Pattern Quest,
  // which goes full screen from inside its own frame) steps out of it first.
  const feedbackOpen = session.feedback.open
  useEffect(() => {
    if (feedbackOpen) exitFullscreen()
  }, [feedbackOpen])

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
        {/* Games with `fullscreen: true` sit in a frame that can go full screen on its own: just the
            game, not this page. The game shows the button in its own header (GameFullscreenButton). */}
        {!game ? (
          <div className="game-message">
            <h1>{text.gameMissing}</h1>
            <Link className="arcade-cta" to="/">{text.backToGames}</Link>
          </div>
        ) : (
          <MaybeFullscreen game={game} language={language} forceExit={feedbackOpen}>
            <GameErrorBoundary key={game.id} text={text}>
              <Suspense fallback={<GameLoadingSpinner label={text.loadingGame} />}>
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
          </MaybeFullscreen>
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
