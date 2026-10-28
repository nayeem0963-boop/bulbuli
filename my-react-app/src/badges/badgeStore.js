/**
 * Where a signed-in player's unlocked badges are kept.
 *
 *   - Supabase: profiles.unlocked_badges, written only through record_badges()
 *     (supabase/migrations/20261028000000_badges.sql). Follows the player to every device.
 *   - This device: localStorage 'bulbuli.badges.v1.<userId>', so badges show instantly,
 *     survive being offline, and still work before the migration has been run.
 *
 * Both are merged (earliest date per badge wins), so neither can lose a badge.
 */
import { isSupabaseConfigured, supabase } from '../supabaseClient.js'
import { mergeUnlocked, normalizeUnlocked } from './engine.js'

const localKey = (userId) => `bulbuli.badges.v1.${encodeURIComponent(userId)}`

// "the column / function isn't there yet": the migration hasn't been run
const MISSING_CODES = new Set(['42703', 'PGRST204', 'PGRST202', '42883'])
let warned = false
const warnMissing = () => {
  if (warned) return
  warned = true
  console.warn('[badges] Run supabase/migrations/20261028000000_badges.sql to save badges to accounts. Until then they are kept on this device.')
}

export function readLocalBadges(userId) {
  try {
    return normalizeUnlocked(JSON.parse(window.localStorage.getItem(localKey(userId)) ?? '[]'))
  } catch {
    return []
  }
}

export function writeLocalBadges(userId, list) {
  try {
    window.localStorage.setItem(localKey(userId), JSON.stringify(list))
  } catch {
    // private mode / storage full: the account copy (if any) still has them
  }
}

/** @returns {Promise<{ list: Array, available: boolean }>} available=false → keep badges on the device only */
export async function fetchRemoteBadges(userId) {
  if (!isSupabaseConfigured) return { list: [], available: false }
  const { data, error } = await supabase.from('profiles').select('unlocked_badges').eq('id', userId).maybeSingle()
  if (error) {
    if (MISSING_CODES.has(error.code)) warnMissing()
    else console.warn('[badges] could not load badges from the account', error)
    return { list: [], available: !MISSING_CODES.has(error.code) }
  }
  return { list: normalizeUnlocked(data?.unlocked_badges), available: true }
}

/**
 * Sends the list to the account; returns the account's merged list.
 * Throws { missing: true } when the migration hasn't been run.
 */
export async function pushRemoteBadges(list) {
  if (!isSupabaseConfigured) throw Object.assign(new Error('Supabase is not configured'), { missing: true })
  const { data, error } = await supabase.rpc('record_badges', { p_badges: list })
  if (error) {
    if (MISSING_CODES.has(error.code)) {
      warnMissing()
      throw Object.assign(new Error(error.message), { missing: true })
    }
    throw error
  }
  return mergeUnlocked(normalizeUnlocked(data))
}
