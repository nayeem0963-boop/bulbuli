import { createSupabaseLeaderboard } from './supabaseLeaderboard.js'

/*
 * Leaderboard service — one interface, two backends.
 *
 *   submit(boardId, entry, ghost?) → { rank, improved, id }
 *   top(boardId, limit)            → entries sorted by score desc
 *   rankOf(boardId, score)         → 1-based rank a score would have
 *   ghost(boardId, entryId)        → packed ghost or null
 *
 * Global backend: Supabase, table public.leaderboards (services/supabaseLeaderboard.js),
 * one best run per (board_id, user_id) with its ghost. Boards are split by difficulty.
 * The old Firestore REST backend (firestoreRest.js, firestore.rules) is no longer used.
 *
 * The local backend mirrors the same shapes in localStorage (top 50 per board,
 * one personal-best ghost per board), so the UI never cares which one it's using.
 * Every run is always written locally too, so offline play still has history.
 */

export const ENTRY_VERSION = 1
const LOCAL_LIMIT = 50

// ─── Local ───────────────────────────────────────────────────────

export class LocalLeaderboard {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage
    this.isGlobal = false
    this.label = 'This device'
  }
  key(boardId) { return `neonVelocity.lb.${boardId}` }
  ghostKey(boardId) { return `neonVelocity.ghost.${boardId}` }
  read(boardId) {
    try { return JSON.parse(this.storage.getItem(this.key(boardId)) ?? '[]') } catch { return [] }
  }
  write(boardId, rows) {
    try { this.storage.setItem(this.key(boardId), JSON.stringify(rows)) } catch { /* quota */ }
  }

  async submit(boardId, entry, ghost) {
    const rows = this.read(boardId)
    const id = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    const prevBest = rows.reduce((m, r) => Math.max(m, r.score), 0)
    const improved = entry.score > prevBest
    const row = { ...entry, id, local: true, createdAt: new Date().toISOString() }
    if (ghost && improved) {
      try {
        this.storage.setItem(this.ghostKey(boardId), JSON.stringify({ entryId: id, score: entry.score, ghost }))
        row.ghostId = id
      } catch { /* quota: keep the score, drop the ghost */ }
    }
    rows.push(row)
    rows.sort((a, b) => b.score - a.score || a.timeMs - b.timeMs)
    const rank = rows.findIndex((r) => r.id === id) + 1
    this.write(boardId, rows.slice(0, LOCAL_LIMIT))
    return { id, rank, improved }
  }

  async top(boardId, limit = LOCAL_LIMIT) {
    return this.read(boardId).slice(0, limit)
  }

  async rankOf(boardId, score) {
    return this.read(boardId).filter((r) => r.score > score).length + 1
  }

  async ghost(boardId, entryId) {
    try {
      const saved = JSON.parse(this.storage.getItem(this.ghostKey(boardId)) ?? 'null')
      if (!saved) return null
      if (entryId && saved.entryId !== entryId) return null
      return saved.ghost
    } catch { return null }
  }

  /** Best local ghost for a board (personal best). */
  async personalBestGhost(boardId) {
    return this.ghost(boardId)
  }
}

// ─── Selection ───────────────────────────────────────────────────

let globalBackend
export const localLeaderboard = new LocalLeaderboard()

/** Supabase backend when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set, otherwise null (local only). */
export function getGlobalLeaderboard() {
  if (globalBackend !== undefined) return globalBackend
  globalBackend = createSupabaseLeaderboard()
  return globalBackend
}

/** Builds the entry document from a finished run + player profile. */
export function buildEntry(run, profile) {
  return {
    name: (profile.name || 'Bulbuli').slice(0, 16),
    score: Math.floor(run.score),
    distance: Math.floor(run.distance),
    timeMs: Math.round(run.timeMs),
    crystals: run.crystals,
    maxSpeedKmh: Math.round(run.maxSpeedKmh),
    surges: run.surges,
    difficulty: run.difficulty ?? 'hard',
    skin: profile.equipped.skin,
    trail: profile.equipped.trail,
    wings: profile.equipped.wings,
  }
}
