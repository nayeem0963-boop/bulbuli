/**
 * Cloud XP for signed-in players.
 *
 *   awardXp(playerId, 'memory-match', 25)
 *
 * - Guests (playerId 'guest') → does nothing and returns false. Their XP stays on
 *   this device through useGameProgress, exactly as before. Games never need
 *   to check who is playing.
 * - Signed-in players → awards for the same game that land within BATCH_MS are
 *   merged (Math Hero gives 5 XP per answer; one request, not twenty), then put in
 *   a small queue in localStorage and sent to the award_xp() SQL function.
 *
 * Every queued award carries its own UUID, and award_xp() ignores a UUID it has
 * already counted, so a request that times out can be retried without ever
 * doubling XP. Awards made offline, or just before the tab closes, are sent the
 * next time the app opens with that player signed in.
 *
 * After each successful save a `bulbuli:xp-awarded` window event carries the new
 * totals; AuthContext listens to it to refresh the player's level everywhere.
 */
import { isSupabaseConfigured, supabase } from '../supabaseClient.js'
import { splitAward } from './levels.js'

export const XP_AWARDED_EVENT = 'bulbuli:xp-awarded'

const QUEUE_KEY = 'bulbuli.xp-queue.v1'
const GUEST_PROGRESS_KEY = 'bulbuli.tutorial-progress.v1.guest' // see useGameProgress.js
const GUEST_CLAIMED_KEY = 'bulbuli.guest-xp-claimed.v1'
/** Most guest XP carried into an account on first sign-in on a device. */
export const GUEST_CARRYOVER_MAX = 500

const BATCH_MS = 1200
const RETRY_BASE_MS = 2000
const RETRY_MAX_MS = 60000
const GAME_ID_RE = /^[a-z0-9-]{1,40}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MISSING_FUNCTION_CODES = new Set(['PGRST202', '42883'])
const INVALID_INPUT_CODE = '22023'

/** True for a Supabase user id; false for 'guest' and anything else. */
export const isAccountId = (id) => typeof id === 'string' && UUID_RE.test(id)

const newId = () => (globalThis.crypto?.randomUUID
  ? globalThis.crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  }))

/* ---------- the persisted queue ---------- */
let memoryQueue = [] // used only if localStorage is unavailable

function readQueue() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? '[]')
    return Array.isArray(saved)
      ? saved.filter((item) => item && UUID_RE.test(item.id) && isAccountId(item.userId)
        && GAME_ID_RE.test(item.gameId) && Number.isSafeInteger(item.amount) && item.amount > 0)
      : []
  } catch {
    return memoryQueue
  }
}

function writeQueue(queue) {
  memoryQueue = queue
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // private mode or storage full: the in-memory copy still gets sent this visit
  }
}

const removeFromQueue = (id) => writeQueue(readQueue().filter((item) => item.id !== id))

/* ---------- batching ---------- */
const batch = new Map() // `${userId}|${gameId}` → XP not yet queued
let batchTimer = null
let retryTimer = null
let retryDelay = RETRY_BASE_MS
let sending = false

function moveBatchToQueue() {
  if (batch.size === 0) return
  const queue = readQueue()
  for (const [key, amount] of batch) {
    const [userId, gameId] = key.split('|')
    for (const part of splitAward(amount)) {
      queue.push({ id: newId(), userId, gameId, amount: part, createdAt: new Date().toISOString() })
    }
  }
  batch.clear()
  writeQueue(queue)
}

function scheduleRetry() {
  clearTimeout(retryTimer)
  retryTimer = setTimeout(() => {
    retryTimer = null
    flushXp()
  }, retryDelay)
  retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS)
}

/**
 * Records XP earned by a signed-in player. Call it when a game or activity ends.
 * Safe to call for guests (returns false and does nothing).
 *
 * @param {string} playerId  Supabase user id, or 'guest'
 * @param {string} gameId    e.g. 'memory-match' (lowercase letters, digits, dashes)
 * @param {number} amount    whole XP earned, > 0
 * @returns {boolean} true if the award will be saved to the player's account
 */
export function awardXp(playerId, gameId, amount) {
  if (!isSupabaseConfigured || !isAccountId(playerId)) return false
  if (!GAME_ID_RE.test(gameId) || !Number.isSafeInteger(amount) || amount <= 0) return false

  const key = `${playerId}|${gameId}`
  batch.set(key, (batch.get(key) ?? 0) + amount)
  clearTimeout(batchTimer)
  batchTimer = setTimeout(flushXp, BATCH_MS)
  return true
}

/** Sends everything waiting for the signed-in player now. Never throws. */
export async function flushXp() {
  clearTimeout(batchTimer)
  batchTimer = null
  moveBatchToQueue()
  if (!isSupabaseConfigured || sending) return
  sending = true

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) return // kept for when this player signs in again

    for (;;) {
      // re-read every time: awards made mid-flush join this same loop
      const item = readQueue().find((queued) => queued.userId === userId)
      if (!item) break

      const { data, error } = await supabase.rpc('award_xp', {
        p_game_id: item.gameId,
        p_amount: item.amount,
        p_event_id: item.id,
      })

      if (error) {
        if (error.code === INVALID_INPUT_CODE) {
          console.warn('[xp] award rejected by the server, dropping it', item, error.message)
          removeFromQueue(item.id)
          continue
        }
        if (MISSING_FUNCTION_CODES.has(error.code)) {
          console.warn('[xp] award_xp() not found. Run supabase/migrations/20261025000000_profiles_and_xp.sql. Awards are kept and will be sent later.')
        }
        throw error
      }

      removeFromQueue(item.id)
      const row = Array.isArray(data) ? data[0] : data
      if (row) {
        window.dispatchEvent(new CustomEvent(XP_AWARDED_EVENT, {
          detail: {
            userId,
            gameId: item.gameId,
            awarded: row.awarded,
            xp: row.new_xp,
            level: row.new_level,
            activitiesCompleted: row.new_activities_completed,
          },
        }))
      }
    }
    retryDelay = RETRY_BASE_MS
  } catch (error) {
    console.warn('[xp] could not save XP yet, will retry', error)
    scheduleRetry()
  } finally {
    sending = false
  }
}

/**
 * The first time someone signs in on this device, carry the XP they earned as a
 * guest into their account (up to GUEST_CARRYOVER_MAX), so "sign in to keep your
 * stars" is true. Each guest XP point is offered to an account only once.
 * @returns {number} XP queued for the account
 */
export function claimGuestXp(userId) {
  if (!isSupabaseConfigured || !isAccountId(userId)) return 0
  try {
    const guest = JSON.parse(window.localStorage.getItem(GUEST_PROGRESS_KEY) ?? 'null')
    const guestTotal = Number(guest?.gamification?.totalXp) || 0
    const claimed = Number(window.localStorage.getItem(GUEST_CLAIMED_KEY)) || 0
    const unclaimed = Math.floor(guestTotal - claimed)
    if (unclaimed <= 0) return 0

    window.localStorage.setItem(GUEST_CLAIMED_KEY, String(guestTotal))
    const amount = Math.min(unclaimed, GUEST_CARRYOVER_MAX)
    awardXp(userId, 'guest-play', amount)
    flushXp()
    return amount
  } catch (error) {
    console.warn('[xp] could not read guest XP', error)
    return 0
  }
}

// Save before the page goes away; anything that doesn't make it stays queued.
if (typeof window !== 'undefined') {
  const onHide = () => {
    if (document.visibilityState === 'hidden') flushXp()
  }
  document.addEventListener('visibilitychange', onHide)
  window.addEventListener('pagehide', onHide)
  window.addEventListener('online', () => flushXp())
}
