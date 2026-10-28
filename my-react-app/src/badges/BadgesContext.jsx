/**
 * Badges for the signed-in player, shared by the whole app.
 *
 *   const { unlocked, unlockedById, ready, toasts, dismissToast } = useBadges()
 *
 * How unlocks happen: games award XP → award_xp() saves it → AuthContext updates `profile`
 * (xp, level, stats) → this provider re-checks every badge against the new numbers, records
 * any new ones, and queues a toast for each. Nothing in the games has to change.
 *
 * Badges a player already qualifies for when they first load the app (say, from before badges
 * existed, or earned on another device) are recorded quietly, without a pile of toasts.
 * Guests have no badges: there's nowhere to show them, and their XP isn't on an account yet.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { BADGES } from '../data/badgesConfig.js'
import { playLevelUp } from '../utils/sound.js'
import { mergeUnlocked, newlyEarned, snapshotFromProfile } from './engine.js'
import { fetchRemoteBadges, pushRemoteBadges, readLocalBadges, writeLocalBadges } from './badgeStore.js'

const BadgesContext = createContext(null)

export function BadgesProvider({ children }) {
  const { user, profile } = useAuth()
  const userId = user?.id ?? null

  const [unlocked, setUnlocked] = useState([])
  const [ready, setReady] = useState(false)
  const [toasts, setToasts] = useState([])

  const unlockedRef = useRef([])
  const userRef = useRef(userId)
  const remoteAvailable = useRef(true)
  const baselined = useRef(false)

  const commit = useCallback((uid, list) => {
    if (uid !== userRef.current) return // the player changed while a request was out
    unlockedRef.current = list
    setUnlocked(list)
    writeLocalBadges(uid, list)
  }, [])

  const sync = useCallback((uid, list) => {
    if (!remoteAvailable.current) return
    pushRemoteBadges(list)
      .then((server) => commit(uid, mergeUnlocked(unlockedRef.current, server)))
      .catch((error) => {
        if (error?.missing) remoteAvailable.current = false
        else console.warn('[badges] could not save badges yet; they are kept on this device and sent next time', error)
      })
  }, [commit])

  /* ---------- load when the signed-in player changes ---------- */
  useEffect(() => {
    userRef.current = userId
    baselined.current = false
    remoteAvailable.current = true
    setReady(false)
    setToasts([])

    if (!userId) {
      unlockedRef.current = []
      setUnlocked([])
      return undefined
    }

    const local = readLocalBadges(userId)
    unlockedRef.current = local
    setUnlocked(local)

    let active = true
    fetchRemoteBadges(userId).then(({ list, available }) => {
      if (!active) return
      remoteAvailable.current = available
      const merged = mergeUnlocked(local, list)
      commit(userId, merged)
      // badges this device unlocked while offline (or before the migration): send them up
      if (available && merged.length > list.length) sync(userId, merged)
      setReady(true)
    })
    return () => {
      active = false
    }
  }, [userId, commit, sync])

  /* ---------- check for new badges whenever XP / stats change ---------- */
  useEffect(() => {
    if (!ready || !profile || profile.id !== userId) return
    const earned = newlyEarned(BADGES, snapshotFromProfile(profile), unlockedRef.current)
    const quiet = !baselined.current
    baselined.current = true
    if (earned.length === 0) return

    const now = new Date().toISOString()
    const merged = mergeUnlocked(unlockedRef.current, earned.map((badge) => ({ badgeId: badge.id, unlockedAt: now })))
    commit(userId, merged)
    sync(userId, merged)

    if (!quiet) {
      setToasts((current) => [...current, ...earned.map((badge) => ({ key: `${badge.id}:${now}`, badge, unlockedAt: now }))])
      playLevelUp()
    }
  }, [ready, profile, userId, commit, sync])

  const dismissToast = useCallback((key) => setToasts((current) => current.filter((toast) => toast.key !== key)), [])

  const value = useMemo(() => ({
    unlocked,
    unlockedById: new Map(unlocked.map((entry) => [entry.badgeId, entry])),
    ready,
    toasts,
    dismissToast,
  }), [unlocked, ready, toasts, dismissToast])

  return <BadgesContext.Provider value={value}>{children}</BadgesContext.Provider>
}

export function useBadges() {
  const context = useContext(BadgesContext)
  if (!context) throw new Error('useBadges() must be used inside <BadgesProvider>.')
  return context
}
