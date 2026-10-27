import { Component } from 'react'
import { lazyWithPreload } from '../shared/lib/lazyWithPreload.js'

// One lazy component per game, created once, so revisiting a game never reloads its code.
// Shared by the game page (/games/<id>) and the launcher modal on the Play page.
// lazyWithPreload: prefetch and render share one download, and a failed chunk is retried once.
const lazyGames = new Map()
/** @param {{ id: string, load: () => Promise<{ default: import('react').ComponentType<any> }> }} game */
export function getLazyGame(game) {
  if (!lazyGames.has(game.id)) lazyGames.set(game.id, lazyWithPreload(game.load))
  return lazyGames.get(game.id)
}

/** Starts downloading a game's code ahead of time (e.g. while its launcher is showing). */
export function prefetchGame(game) {
  if (game) getLazyGame(game).preload().catch(() => {})
}

/** Keeps a broken game from taking the whole arcade down with it. */
export class GameErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('A Pro Coder game stopped working.', error)
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
