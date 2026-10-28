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
import './game-shell.css'

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

  // The "How was it?" card shows on this page, so a game in full screen steps out of it first.
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
        {/* Every game sits in its own frame, which fills the screen under the game bar (immersive by
            default) and is the element that goes browser full screen: just the game, not this page.
            The game shows the button in its own header (GameFullscreenButton). See game-shell.css. */}
        {!game ? (
          <div className="game-message">
            <h1>{text.gameMissing}</h1>
            <Link className="arcade-cta" to="/">{text.backToGames}</Link>
          </div>
        ) : (
          <GameFullscreenFrame key={game.id} gameId={game.id} language={language} forceExit={feedbackOpen}>
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
          </GameFullscreenFrame>
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
