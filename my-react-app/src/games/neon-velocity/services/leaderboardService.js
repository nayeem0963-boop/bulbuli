import { FirebaseRestClient, firebaseConfig } from './firestoreRest'

/*
 * Leaderboard service — one interface, two backends.
 *
 *   submit(boardId, entry, ghost?) → { rank, improved, id }
 *   top(boardId, limit)            → entries sorted by score desc
 *   rankOf(boardId, score)         → 1-based rank a score would have
 *   ghost(boardId, entryId)        → packed ghost or null
 *
 * Data layout (Firestore):
 *   boards/{boardId}/entries/{uid}   best run per player per board
 *     { name, score, distance, timeMs, crystals, maxSpeedKmh, surges, skin, trail, wings,
 *       ghostId, version, createdAt }
 *   ghosts/{boardId}_{uid}            { uid, boardId, score, ghost: { v, hz, count, data } }
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

// ─── Firestore ───────────────────────────────────────────────────

export class FirestoreLeaderboard {
  constructor(client) {
    this.client = client
    this.isGlobal = true
    this.label = 'Global'
  }

  async submit(boardId, entry, ghost) {
    const { client } = this
    await client.token() // ensures uid
    const uid = client.uid
    const path = `boards/${boardId}/entries/${uid}`
    const existing = await client.getDoc(path)
    const improved = !existing || entry.score > existing.score

    if (improved) {
      const ghostId = ghost ? `${boardId}_${uid}` : null
      if (ghost) {
        await client.setDoc(`ghosts/${ghostId}`, { uid, boardId, score: entry.score, ghost, createdAt: new Date() })
      }
      await client.setDoc(path, { ...entry, ghostId, version: ENTRY_VERSION, createdAt: new Date() })
    }
    const best = improved ? entry.score : existing.score
    const rank = (await client.countGreater(`boards/${boardId}`, 'entries', 'score', best)) + 1
    return { id: uid, rank, improved, bestScore: best }
  }

  async top(boardId, limit = 50) {
    return this.client.query(`boards/${boardId}`, 'entries', { orderBy: 'score', limit })
  }

  async rankOf(boardId, score) {
    return (await this.client.countGreater(`boards/${boardId}`, 'entries', 'score', score)) + 1
  }

  async ghost(boardId, entryId) {
    const doc = await this.client.getDoc(`ghosts/${boardId}_${entryId}`)
    return doc?.ghost ?? null
  }

  get uid() { return this.client.uid }
}

// ─── Selection ───────────────────────────────────────────────────

let globalBackend
export const localLeaderboard = new LocalLeaderboard()

/** Firestore backend if configured via env vars, otherwise null (local only). */
export function getGlobalLeaderboard() {
  if (globalBackend !== undefined) return globalBackend
  const config = firebaseConfig()
  globalBackend = config ? new FirestoreLeaderboard(new FirebaseRestClient(config)) : null
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
    skin: profile.equipped.skin,
    trail: profile.equipped.trail,
    wings: profile.equipped.wings,
  }
}
