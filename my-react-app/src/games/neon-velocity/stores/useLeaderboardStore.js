import { create } from 'zustand'
import { decodeGhost, encodeGhost } from '../services/ghostCodec'
import {
  buildEntry, getGlobalLeaderboard, localLeaderboard,
} from '../services/leaderboardService'
import { useProfileStore } from './useProfileStore'

/*
 * Leaderboard state for the UI.
 *
 *   boards[`${scope}:${boardId}`] = { status, entries, error, fetchedAt }
 *   submission                   = result of the last run's submit (rank, improved, …)
 *   ghosts[boardId]              = decoded ghost ready for <GhostRunner/>
 *
 * scope 'global' uses Supabase (public.leaderboards) when configured, else transparently falls back
 * to 'local'. Every run is always saved locally as well.
 */

const CACHE_MS = 30_000
const key = (scope, boardId) => `${scope}:${boardId}`

export const useLeaderboardStore = create((set, get) => ({
  hasGlobal: !!getGlobalLeaderboard(),
  boards: {},
  submission: null,     // { boardId, status: 'pending'|'saving'|'done'|'error', local, global, error }
  ghosts: {},           // boardId → { source: 'pb'|'top', name, score, data: decoded }

  backendFor(scope) {
    return scope === 'global' ? getGlobalLeaderboard() ?? localLeaderboard : localLeaderboard
  },

  async fetchBoard(boardId, scope = 'global', { force = false } = {}) {
    const k = key(scope, boardId)
    const cached = get().boards[k]
    if (!force && cached?.status === 'ready' && Date.now() - cached.fetchedAt < CACHE_MS) return cached.entries
    set((s) => ({ boards: { ...s.boards, [k]: { ...cached, status: 'loading', entries: cached?.entries ?? [] } } }))
    try {
      const entries = await get().backendFor(scope).top(boardId, 50)
      set((s) => ({ boards: { ...s.boards, [k]: { status: 'ready', entries, fetchedAt: Date.now() } } }))
      return entries
    } catch (error) {
      set((s) => ({ boards: { ...s.boards, [k]: { status: 'error', entries: cached?.entries ?? [], error: error.message } } }))
      return []
    }
  },

  /**
   * Save a finished run: always locally, globally if configured and the player has a name.
   * `ghostFrames` is the raw recorder output (only kept for ghost-eligible courses).
   */
  async submitRun(run, ghostFrames) {
    const profile = useProfileStore.getState()
    const entry = buildEntry(run, profile)
    const ghost = ghostFrames?.length ? encodeGhost(ghostFrames) : null
    const boardId = run.boardId
    set({ submission: { boardId, status: 'saving', score: entry.score } })

    const local = await localLeaderboard.submit(boardId, entry, ghost)
    let global = null
    let error = null
    const remote = getGlobalLeaderboard()
    if (remote && profile.name) {
      try {
        global = await remote.submit(boardId, entry, ghost)
      } catch (e) {
        error = e.message
      }
    }
    set({
      submission: {
        boardId, status: error ? 'error' : remote && !profile.name ? 'needs-name' : 'done',
        score: entry.score, local, global, error, run, ghost,
      },
    })
    // refresh boards in the background
    get().fetchBoard(boardId, 'local', { force: true })
    if (global) get().fetchBoard(boardId, 'global', { force: true })
    return { local, global, error }
  },

  /** After the player enters a name for the first time, push the pending run globally. */
  async submitPendingGlobal() {
    const sub = get().submission
    const remote = getGlobalLeaderboard()
    if (!sub?.run || !remote) return
    set({ submission: { ...sub, status: 'saving' } })
    try {
      const entry = buildEntry(sub.run, useProfileStore.getState())
      const global = await remote.submit(sub.boardId, entry, sub.ghost)
      set({ submission: { ...sub, status: 'done', global, error: null } })
      get().fetchBoard(sub.boardId, 'global', { force: true })
    } catch (e) {
      set({ submission: { ...sub, status: 'error', error: e.message } })
    }
  },

  /**
   * Load a ghost to race: 'pb' = your personal best on this device,
   * 'top' = the global #1 (falls back to PB when offline / not configured).
   */
  async loadGhost(boardId, source = 'pb') {
    let packed = null
    let meta = { source, name: 'Personal best', score: 0 }
    try {
      const remote = getGlobalLeaderboard()
      if (source === 'top' && remote) {
        const [leader] = await remote.top(boardId, 1)
        if (leader?.ghostId) {
          packed = await remote.ghost(boardId, leader.id)
          meta = { source, name: leader.name, score: leader.score }
        }
      }
      if (!packed) {
        packed = await localLeaderboard.personalBestGhost(boardId)
        const [best] = await localLeaderboard.top(boardId, 1)
        meta = { source: 'pb', name: 'Personal best', score: best?.score ?? 0 }
      }
    } catch { /* fall through */ }
    const data = decodeGhost(packed)
    set((s) => ({ ghosts: { ...s.ghosts, [boardId]: data ? { ...meta, data } : null } }))
    return !!data
  },

  clearSubmission: () => set({ submission: null }),
}))
