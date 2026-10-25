import { Component, lazy } from 'react'

// One lazy component per game, created once, so revisiting a game never reloads its code.
// Shared by the game page (/games/<id>) and the launcher modal on the Play page.
const lazyGames = new Map()
export function getLazyGame(game) {
  if (!lazyGames.has(game.id)) lazyGames.set(game.id, lazy(game.load))
  return lazyGames.get(game.id)
}

/** Starts downloading a game's code ahead of time (e.g. while its launcher is showing). */
export function prefetchGame(game) {
  game?.load().catch(() => {})
}

/** Keeps a broken game from taking the whole arcade down with it. */
export class GameErrorBoundary extends Component {
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
