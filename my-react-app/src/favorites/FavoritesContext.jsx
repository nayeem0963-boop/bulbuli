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
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { isSupabaseConfigured } from '../supabaseClient.js'
import { trackFavoriteToggled } from '../analytics/trackers.js'
import {
  addAccountFavorites,
  clearGuestFavorites,
  loadAccountFavorites,
  loadGuestFavorites,
  removeAccountFavorite,
  saveGuestFavorites,
} from './favoritesStore.js'

const FavoritesContext = createContext(null)

export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const userId = isSupabaseConfigured ? user?.id ?? null : null
  const [favorites, setFavorites] = useState(() => new Set(loadGuestFavorites()))
  const [loading, setLoading] = useState(false)
  const favoritesRef = useRef(favorites)
  favoritesRef.current = favorites
  const userRef = useRef(userId)
  userRef.current = userId

  // load whenever who is playing changes (and carry guest hearts into the account)
  useEffect(() => {
    if (!userId) {
      setFavorites(new Set(loadGuestFavorites()))
      return undefined
    }
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        const guestIds = loadGuestFavorites()
        if (guestIds.length) {
          await addAccountFavorites(guestIds)
          clearGuestFavorites()
        }
        const ids = await loadAccountFavorites()
        if (active) setFavorites(new Set(ids))
      } catch (error) {
        console.warn('Unable to load favourite games.', error)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [userId])

  const isFavorite = useCallback((gameId) => favorites.has(gameId), [favorites])

  const toggleFavorite = useCallback((gameId, { source = 'game_tile' } = {}) => {
    const next = !favoritesRef.current.has(gameId)
    const apply = (on) => setFavorites((current) => {
      const updated = new Set(current)
      if (on) updated.add(gameId)
      else updated.delete(gameId)
      if (!userRef.current) saveGuestFavorites([...updated])
      return updated
    })

    apply(next)
    trackFavoriteToggled({ gameId, isFavorite: next, source })

    const accountId = userRef.current
    if (accountId) {
      const save = next ? addAccountFavorites([gameId]) : removeAccountFavorite(gameId)
      save.catch((error) => {
        console.warn('Unable to save a favourite game.', error)
        if (userRef.current === accountId) apply(!next)
      })
    }
    return next
  }, [])

  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite, loading }),
    [favorites, isFavorite, toggleFavorite, loading],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) throw new Error('useFavorites() must be used inside <FavoritesProvider>.')
  return context
}
