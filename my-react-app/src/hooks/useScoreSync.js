/**
 * useScoreSync.js
 *
 * Optimistic score + batched Supabase writes.
 *
 *   tap → score updates instantly on screen
 *       → points pile up in `pending` (a ref, no re-render)
 *       → flushed to Supabase after DEBOUNCE_MS of quiet,
 *         or every MAX_WAIT_MS during non-stop tapping,
 *         or immediately when the tab is hidden / the component unmounts.
 *
 * Writes send a *delta* to the `increment_score` RPC
 * (supabase/migrations/20261024000000_increment_score.sql), so two tabs or
 * devices can never overwrite each other's points. If that function hasn't
 * been created yet, the hook notices on the first save and falls back to
 * `profiles.update({ total_score })` by itself.
 *
 * Guests (playerId 'guest', or no signed-in user) play with a local score
 * only — nothing is sent to Supabase.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient.js' // the app's single shared client

const DEBOUNCE_MS = 800
const MAX_WAIT_MS = 3000
const RETRY_BASE_MS = 2000
const RETRY_MAX_MS = 30000

// ⚙️ Change these if your schema differs (and in the SQL migration too).
const TABLE = 'profiles'
const SCORE_COLUMN = 'total_score'

// Postgres / PostgREST codes meaning "the RPC doesn't exist".
const MISSING_FUNCTION_CODES = new Set(['PGRST202', '42883'])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isSupabaseUser = (id) => typeof id === 'string' && UUID_RE.test(id)

/**
 * @param {object}  opts
 * @param {string|null} opts.userId    Supabase auth user id; 'guest' or null → local only
 * @param {boolean} [opts.useRpc=true] atomic increment via RPC (recommended)
 * @returns {{
 *   score: number,               optimistic total shown in the UI
 *   addPoints: (n:number)=>void, stable — safe to pass to memoised children
 *   flush: ()=>Promise<void>,    force a save now (e.g. a "Finish" button)
 *   status: 'guest'|'loading'|'idle'|'saving'|'error',
 * }}
 */
export function useScoreSync({ userId, useRpc = true }) {
  const online = isSupabaseUser(userId)
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState(online ? 'loading' : 'guest')

  const pending = useRef(0)        // points not yet saved
  const confirmed = useRef(0)      // last total the server agreed on
  const loaded = useRef(false)     // true once the starting score is known
  const rpcMode = useRef(useRpc)   // flips to false if the RPC is missing
  const inFlight = useRef(false)
  const debounceTimer = useRef(null)
  const maxWaitTimer = useRef(null)
  const retryTimer = useRef(null)
  const retryDelay = useRef(RETRY_BASE_MS)
  const flushRef = useRef(null)    // lets timers call the latest flush

  const clearTimers = () => {
    clearTimeout(debounceTimer.current)
    clearTimeout(maxWaitTimer.current)
    clearTimeout(retryTimer.current)
    debounceTimer.current = maxWaitTimer.current = retryTimer.current = null
  }

  /* ---------- Debounce + maxWait scheduler ---------- */
  const schedule = useCallback(() => {
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => flushRef.current?.(), DEBOUNCE_MS)
    // maxWait: guarantees a save even if the child never stops tapping.
    if (!maxWaitTimer.current) {
      maxWaitTimer.current = setTimeout(() => flushRef.current?.(), MAX_WAIT_MS)
    }
  }, [])

  /* ---------- Load the starting score (and reset on user change) ---------- */
  useEffect(() => {
    clearTimers()
    pending.current = 0
    confirmed.current = 0
    loaded.current = false
    rpcMode.current = useRpc
    setScore(0)

    if (!online) {
      setStatus('guest')
      return
    }

    let cancelled = false
    setStatus('loading')

    supabase
      .from(TABLE)
      .select(SCORE_COLUMN)
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          // e.g. column missing or no profile row. Keep playing; the RPC path
          // only needs deltas, so saving can still work.
          console.error('[score] load failed', error)
          setStatus('error')
        } else {
          confirmed.current = data?.[SCORE_COLUMN] ?? 0
          loaded.current = true
          setStatus('idle')
        }
        // Keep any taps made while loading, then save them.
        setScore(confirmed.current + pending.current)
        if (pending.current > 0) schedule()
      })

    return () => {
      cancelled = true
    }
  }, [userId, online, useRpc, schedule])

  /* ---------- Write pending points to Supabase ---------- */
  const flush = useCallback(async () => {
    clearTimeout(debounceTimer.current)
    clearTimeout(maxWaitTimer.current)
    debounceTimer.current = null
    maxWaitTimer.current = null

    if (!online || inFlight.current || pending.current === 0) return
    // The absolute-update fallback needs a trusted starting total; the RPC
    // doesn't. Without either, wait — the load effect reschedules us.
    if (!loaded.current && !rpcMode.current) return

    // Take a snapshot; taps during the request go into the next batch.
    const delta = pending.current
    pending.current = 0
    inFlight.current = true
    setStatus('saving')

    try {
      let newTotal
      if (rpcMode.current) {
        const { data, error } = await supabase.rpc('increment_score', { delta })
        if (error) {
          if (MISSING_FUNCTION_CODES.has(error.code)) {
            console.warn('[score] increment_score() not found — using profiles.update instead. Run the SQL migration to enable atomic saves.')
            rpcMode.current = false
            const err = new Error('rpc missing, retrying with update')
            err.retryNow = true
            throw err
          }
          throw error
        }
        newTotal = data
      } else {
        if (!loaded.current) {
          const err = new Error('starting score not loaded yet')
          err.retryNow = true
          throw err
        }
        newTotal = confirmed.current + delta
        const { error } = await supabase
          .from(TABLE)
          .update({ [SCORE_COLUMN]: newTotal })
          .eq('id', userId)
        if (error) throw error
      }

      confirmed.current = newTotal
      loaded.current = true
      retryDelay.current = RETRY_BASE_MS
      // Reconcile with the server's truth (picks up points from other devices).
      setScore(newTotal + pending.current)
      setStatus('idle')
    } catch (err) {
      pending.current += delta // put the points back — never lose a tap
      if (err.retryNow) {
        setStatus(loaded.current ? 'idle' : 'error')
      } else {
        console.warn('[score] save failed, will retry', err)
        setStatus('error')
        // Exponential backoff (2s → 4s → … → 30s). Taps keep counting meanwhile.
        clearTimeout(retryTimer.current)
        retryTimer.current = setTimeout(() => {
          retryTimer.current = null
          flushRef.current?.()
        }, retryDelay.current)
        retryDelay.current = Math.min(retryDelay.current * 2, RETRY_MAX_MS)
      }
    } finally {
      inFlight.current = false
      // Taps that landed mid-request get their own debounced save.
      if (pending.current > 0 && !retryTimer.current && (loaded.current || rpcMode.current)) schedule()
    }
  }, [online, userId, schedule])

  flushRef.current = flush

  /* ---------- Public: called on every tap ---------- */
  const addPoints = useCallback(
    (n = 1) => {
      pending.current += n
      setScore((s) => s + n) // optimistic UI — no network wait
      // Guests never save; during a retry wait the retry sends everything.
      if (online && !retryTimer.current) schedule()
    },
    [online, schedule],
  )

  /* ---------- Save when the tab is hidden or the game unmounts ---------- */
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushRef.current?.()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
      flushRef.current?.() // best-effort final save on route change
      clearTimers()
    }
  }, [])

  return { score, addPoints, flush, status }
}
