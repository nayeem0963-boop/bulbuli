/**
 * <FavoritesProvider>: owns the state behind useFavorites(). The context object and the hook live in
 * FavoritesContext.jsx, so this file exports only a component (Fast Refresh boundary).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { isSupabaseConfigured } from '../supabaseClient.js'
import { useLatest } from '../shared/hooks/useLatest.js'
import { trackFavoriteToggled } from '../analytics/trackers.js'
import {
  addAccountFavorites,
  clearGuestFavorites,
  loadAccountFavorites,
  loadGuestFavorites,
  removeAccountFavorite,
  saveGuestFavorites,
} from './favoritesStore.js'
import { FavoritesContext } from './FavoritesContext.jsx'

export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const userId = isSupabaseConfigured ? user?.id ?? null : null
  const [favorites, setFavorites] = useState(() => new Set(loadGuestFavorites()))
  const [loading, setLoading] = useState(Boolean(userId))
  const favoritesRef = useLatest(favorites)
  const userRef = useLatest(userId)

  // When who is playing changes: a guest sees this device's hearts at once; a player keeps seeing
  // the current hearts while the account loads. Adjusted during render, not in an effect.
  const [owner, setOwner] = useState(userId)
  if (owner !== userId) {
    setOwner(userId)
    if (userId) setLoading(true)
    else setFavorites(new Set(loadGuestFavorites()))
  }

  // load whenever who is playing changes (and carry guest hearts into the account)
  useEffect(() => {
    if (!userId) return undefined
    let active = true
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
  }, [favoritesRef, userRef])

  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite, loading }),
    [favorites, isFavorite, toggleFavorite, loading],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}
