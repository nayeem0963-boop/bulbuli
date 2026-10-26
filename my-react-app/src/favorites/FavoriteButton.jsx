import { useState } from 'react'
import { FEEDBACK_TEXT } from '../feedback/text.js'
import { useFavorites } from './FavoritesContext.jsx'
import './favorite-button.css'

/**
 * The 🤍 / ❤️ heart. On a game tile it sits in the top-right corner of the art
 * (the "New" badge moves to its left). It is a sibling of the tile's link, not inside it,
 * so tapping it never opens the game.
 */
export default function FavoriteButton({ gameId, gameTitle, language = 'en', source = 'game_tile', className = '' }) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const on = isFavorite(gameId)
  const [pop, setPop] = useState(false)
  const text = FEEDBACK_TEXT[language] ?? FEEDBACK_TEXT.en
  const label = on ? text.favRemove(gameTitle) : text.favAdd(gameTitle)

  const onClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!on) setPop(true)
    toggleFavorite(gameId, { source })
  }

  return (
    <button
      type="button"
      className={`fav-button${on ? ' is-on' : ''}${pop ? ' is-pop' : ''}${className ? ` ${className}` : ''}`}
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={onClick}
      onAnimationEnd={() => setPop(false)}
    >
      <span aria-hidden="true">{on ? '❤️' : '🤍'}</span>
    </button>
  )
}
