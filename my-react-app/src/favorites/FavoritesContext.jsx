/**
 * Favourite games, for guests and signed-in players alike.
 *
 *   <FavoritesProvider> … </FavoritesProvider>      (inside AuthProvider; see App.jsx)
 *   const { isFavorite, toggleFavorite, favorites } = useFavorites()
 *
 * - Guests: kept on this device (localStorage).
 * - Signed in: kept on the account (Supabase `favorite_games`), so they follow the player.
 *   Hearts a guest gave on this device are added to the account at sign-in.
 * - A tap changes the heart at once; if saving to the account fails, it changes back.
 */
import { createContext, useContext } from 'react'

/** Value provided by <FavoritesProvider> (FavoritesProvider.jsx). */
export const FavoritesContext = createContext(null)

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) throw new Error('useFavorites() must be used inside <FavoritesProvider>.')
  return context
}
