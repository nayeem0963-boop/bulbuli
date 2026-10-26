import { isSupabaseConfigured, supabase } from '../../../supabaseClient.js'

/*
 * Global leaderboard on Supabase (PostgREST via supabase-js).
 * Table: public.leaderboards — see supabase/migrations/20261026120000_neon_velocity_leaderboards.sql
 *
 *   one row per (board_id, user_id) = that player's best run on that board
 *   board_id  'daily-2026-10-26-easy' | 'endless-hard' | …  (split by difficulty)
 *   ghost     packed replay { v, hz, count, data } (jsonb), only fetched when racing it
 *
 * Reads are public. Writes need a signed-in player (RLS: user_id = auth.uid()), so a
 * signed-out run is saved on the device only — submit() returns null and the UI
 * shows the device board, exactly as before.
 *
 * Same interface as LocalLeaderboard: submit / top / rankOf / ghost / personalBestGhost.
 */

const TABLE = 'leaderboards'
const LIST_COLUMNS =
  'user_id, name, score, distance, time_ms, crystals, max_speed_kmh, surges, difficulty, skin, trail, wings, has_ghost, updated_at'

const toEntry = (row) => ({
  id: row.user_id,
  name: row.name,
  score: row.score,
  distance: row.distance,
  timeMs: row.time_ms,
  crystals: row.crystals,
  maxSpeedKmh: row.max_speed_kmh,
  surges: row.surges,
  difficulty: row.difficulty,
  skin: row.skin,
  trail: row.trail,
  wings: row.wings,
  ghostId: row.has_ghost ? row.user_id : null,
})

const fail = (error, what) => {
  if (error) throw new Error(`Leaderboard ${what} failed: ${error.message}`)
}

export class SupabaseLeaderboard {
  constructor(client = supabase) {
    this.client = client
    this.isGlobal = true
    this.label = 'Global'
  }

  async userId() {
    const { data } = await this.client.auth.getSession()
    return data.session?.user?.id ?? null
  }

  async submit(boardId, entry, ghost) {
    const uid = await this.userId()
    if (!uid) return null // signed out: device-only

    const { data: existing, error: readError } = await this.client
      .from(TABLE).select('score').eq('board_id', boardId).eq('user_id', uid).maybeSingle()
    fail(readError, 'read')
    const improved = !existing || entry.score > existing.score

    if (improved) {
      const row = {
        board_id: boardId,
        user_id: uid,
        name: entry.name,
        score: entry.score,
        distance: entry.distance,
        time_ms: entry.timeMs,
        crystals: entry.crystals,
        max_speed_kmh: entry.maxSpeedKmh,
        surges: entry.surges,
        difficulty: entry.difficulty,
        skin: entry.skin ?? null,
        trail: entry.trail ?? null,
        wings: entry.wings ?? null,
        ghost: ghost ?? null,
      }
      const { error } = await this.client.from(TABLE).upsert(row, { onConflict: 'board_id,user_id' })
      fail(error, 'save')
    }

    const best = improved ? entry.score : existing.score
    return { id: uid, rank: await this.rankOf(boardId, best), improved, bestScore: best }
  }

  async top(boardId, limit = 50) {
    const { data, error } = await this.client
      .from(TABLE).select(LIST_COLUMNS)
      .eq('board_id', boardId)
      .order('score', { ascending: false })
      .order('updated_at', { ascending: true }) // ties: whoever got there first
      .limit(limit)
    fail(error, 'load')
    return (data ?? []).map(toEntry)
  }

  async rankOf(boardId, score) {
    const { count, error } = await this.client
      .from(TABLE).select('user_id', { count: 'exact', head: true })
      .eq('board_id', boardId).gt('score', score)
    fail(error, 'rank')
    return (count ?? 0) + 1
  }

  async ghost(boardId, entryId) {
    const { data, error } = await this.client
      .from(TABLE).select('ghost').eq('board_id', boardId).eq('user_id', entryId).maybeSingle()
    fail(error, 'ghost')
    return data?.ghost ?? null
  }

  async personalBestGhost(boardId) {
    const uid = await this.userId()
    return uid ? this.ghost(boardId, uid) : null
  }
}

export const createSupabaseLeaderboard = () => (isSupabaseConfigured ? new SupabaseLeaderboard() : null)
