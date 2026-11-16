import { Component, createElement } from 'react'
import { getLazyGame } from './lazyGames.js'

/**
 * Renders a game's lazily loaded component. getLazyGame() returns the SAME cached lazy component
 * for a game id every time, so the component identity is stable across renders (no remounts, no
 * lost state); creating the element here keeps that lookup out of the pages' render code.
 * Wrap it in <Suspense>; use `key` to remount it (e.g. when the player changes).
 */
export function LazyGame({ game, ...props }) {
  return createElement(getLazyGame(game), { ...props, game })
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
