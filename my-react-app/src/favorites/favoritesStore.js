/**
 * Where favourite games are kept.
 *   guests   → localStorage on this device
 *   accounts → the `favorite_games` table (one row per user + game, RLS: own rows only)
 */
import { supabase } from '../supabaseClient.js'

const GUEST_KEY = 'bulbuli.favorites.v1.guest'
const GAME_ID_RE = /^[a-z0-9-]{1,40}$/

const cleanIds = (ids) => [...new Set((Array.isArray(ids) ? ids : []).filter((id) => typeof id === 'string' && GAME_ID_RE.test(id)))]

export function loadGuestFavorites() {
  try {
    return cleanIds(JSON.parse(window.localStorage.getItem(GUEST_KEY) ?? '[]'))
  } catch {
    return []
  }
}

export function saveGuestFavorites(ids) {
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(cleanIds(ids)))
  } catch {
    // storage blocked: hearts last for this visit only
  }
}

export function clearGuestFavorites() {
  try { window.localStorage.removeItem(GUEST_KEY) } catch { /* ignore */ }
}

export async function loadAccountFavorites() {
  // RLS returns only the signed-in player's rows
  const { data, error } = await supabase.from('favorite_games').select('game_id').order('created_at')
  if (error) throw error
  return cleanIds(data.map((row) => row.game_id))
}

/** user_id is filled in by the database (default auth.uid()), never sent by the app. */
export async function addAccountFavorites(gameIds) {
  const ids = cleanIds(gameIds)
  if (!ids.length) return
  const { error } = await supabase
    .from('favorite_games')
    .upsert(ids.map((game_id) => ({ game_id })), { onConflict: 'user_id,game_id', ignoreDuplicates: true })
  if (error) throw error
}

export async function removeAccountFavorite(gameId) {
  const { error } = await supabase.from('favorite_games').delete().eq('game_id', gameId)
  if (error) throw error
}
