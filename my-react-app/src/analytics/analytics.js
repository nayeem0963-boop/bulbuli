/**
 * Pro Coder's own, first-party analytics. No ad IDs, no third-party trackers.
 *
 *   trackEvent('game_started', { game_id: 'memory-match' })
 *
 * - Events are batched and written to the `game_events` table in Supabase
 *   (see supabase/migrations/20261026000000_favorites_feedback_events.sql).
 *   The table fills in user_id from the session itself (auth.uid()); guests are
 *   stored with no id at all, so there is nothing that follows a child around.
 * - Analytics must never break a game: nothing here throws, and a failed send
 *   is simply dropped.
 * - Turn it off with VITE_ANALYTICS=off (e.g. in .env.local while developing).
 * - In development every event is also printed as "[analytics] …".
 */
import { isSupabaseConfigured, supabase } from '../supabaseClient.js'
import { EVENT_NAMES } from './events.js'

const env = import.meta.env ?? {} // undefined under `node --test`
const isDev = Boolean(env.DEV)
const enabled = env.VITE_ANALYTICS !== 'off'

const FLUSH_MS = 4000
const MAX_BATCH = 25
const MAX_QUEUE = 200
const GAME_ID_RE = /^[a-z0-9-]{1,40}$/

let queue = []
let timer = null
const sinks = new Set()

/** Extra destinations (tests, a future GA4 bridge). Returns an unsubscribe function. */
export function addAnalyticsSink(fn) {
  sinks.add(fn)
  return () => sinks.delete(fn)
}

// Flat, small, JSON-safe params only. Arrays of short strings are allowed (feedback tags).
export function sanitizeParams(params = {}) {
  const out = {}
  for (const [key, value] of Object.entries(params)) {
    if (!/^[a-z_]{1,32}$/.test(key) || value === undefined || value === null) continue
    if (typeof value === 'number') { if (Number.isFinite(value)) out[key] = value }
    else if (typeof value === 'boolean') out[key] = value
    else if (typeof value === 'string') out[key] = value.slice(0, 60)
    else if (Array.isArray(value)) out[key] = value.filter((v) => typeof v === 'string').slice(0, 8).map((v) => v.slice(0, 30))
  }
  return out
}

async function flush() {
  timer = null
  if (!queue.length || !isSupabaseConfigured) { queue = []; return }
  const batch = queue.splice(0, MAX_BATCH)
  try {
    const { error } = await supabase.from('game_events').insert(batch)
    if (error) throw error
  } catch (error) {
    if (isDev) console.warn('[analytics] could not send events (dropped).', error)
  }
  if (queue.length) schedule()
}

function schedule() {
  if (!timer) timer = setTimeout(flush, FLUSH_MS)
}

export function trackEvent(name, params = {}) {
  try {
    if (!enabled || !EVENT_NAMES.has(name)) return
    const { game_id: gameId, ...rest } = sanitizeParams(params)
    const row = {
      event: name,
      game_id: GAME_ID_RE.test(gameId ?? '') ? gameId : null,
      params: rest,
    }

    if (isDev) console.info(`[analytics] ${name}`, { game_id: row.game_id, ...rest })
    sinks.forEach((sink) => { try { sink(name, row) } catch { /* a sink never breaks the game */ } })

    if (queue.length >= MAX_QUEUE) queue.shift()
    queue.push(row)
    schedule()
  } catch {
    // never let analytics throw into a game
  }
}

// Send what is waiting when the tab is hidden (switching apps on a tablet, closing the tab).
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && queue.length) {
      clearTimeout(timer)
      flush()
    }
  })
}
