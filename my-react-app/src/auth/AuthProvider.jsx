/**
 * <AuthProvider>: owns the state behind useAuth(). The context object and the hook live in
 * AuthContext.jsx, so this file exports only a component (Fast Refresh boundary).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { authCallbackUrl, isSupabaseConfigured, supabase } from '../supabaseClient.js'
import { claimGuestXp, flushXp, XP_AWARDED_EVENT } from '../lib/xp.js'
import { rememberReturnPath } from './returnPath.js'
import { AuthContext } from './AuthContext.jsx'

const PROFILE_COLUMNS = 'id, username, avatar_url, xp, level, activities_completed, stats, last_played_at, created_at'
const currentPath = () => `${window.location.pathname}${window.location.search}`

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [authError, setAuthError] = useState('')
  const [checkAttempt, setCheckAttempt] = useState(0)

  // The loaded profile is stored together with whose it is and which load produced it; what the
  // app sees (profile / profileLoading / profileError) is derived from that during render, so a
  // user change never needs a synchronous reset inside an effect.
  const [profileState, setProfileState] = useState({ userId: null, profile: null, loadedKey: null, error: '' })
  const [profileRefresh, setProfileRefresh] = useState(0)

  const [authModal, setAuthModal] = useState({ open: false, reason: 'save-xp', mode: 'signin' })
  // true after arriving from a password-reset email: the dashboard then asks for a new password
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  const user = session?.user ?? null
  const userId = user?.id ?? null

  /* ---------- session ---------- */
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let active = true

    // Keep this callback synchronous: Supabase warns against awaiting other
    // supabase calls inside it. Follow-up work happens in the effects below.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setAuthError('')
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (event === 'SIGNED_OUT') setPasswordRecovery(false)
      if (event === 'SIGNED_IN') setAuthModal((modal) => (modal.open ? { ...modal, open: false } : modal))
    })

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error
        if (!active) return
        setSession(data.session)
        setAuthError('')
        setLoading(false)
      })
      .catch((error) => {
        console.error('Unable to check the Pro Coder sign-in session.', error)
        if (!active) return
        setAuthError('We could not check if you are signed in. Please try again.')
        setLoading(false)
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [checkAttempt])

  const retryAuth = useCallback(() => {
    setLoading(true)
    setCheckAttempt((n) => n + 1)
  }, [])

  /* ---------- profile ---------- */
  const profileKey = userId ? `${userId}#${profileRefresh}` : null
  const profile = userId && profileState.userId === userId ? profileState.profile : null
  const profileLoading = Boolean(userId) && profileState.loadedKey !== profileKey
  const profileError = userId && profileState.loadedKey === profileKey ? profileState.error : ''

  useEffect(() => {
    if (!userId) return undefined
    let active = true
    const key = `${userId}#${profileRefresh}`

    supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error('Unable to load the player profile.', error)
          // keep showing the profile we had for this player, with the error
          setProfileState((current) => ({
            userId,
            profile: current.userId === userId ? current.profile : null,
            loadedKey: key,
            error: 'Your profile could not be loaded.',
          }))
        } else {
          // No row yet (e.g. the migration ran after sign-up): show an empty profile;
          // award_xp() creates the row on the first award.
          setProfileState({
            userId,
            profile: data ?? { id: userId, username: null, avatar_url: null, xp: 0, level: 1, activities_completed: 0, stats: {} },
            loadedKey: key,
            error: '',
          })
        }
      })

    return () => {
      active = false
    }
  }, [userId, profileRefresh])

  const refreshProfile = useCallback(() => setProfileRefresh((n) => n + 1), [])

  // When a player signs in: send any XP saved while offline, and carry over guest XP once.
  useEffect(() => {
    if (!userId) return
    claimGuestXp(userId)
    flushXp()
  }, [userId])

  // Keep level/XP current everywhere as games award XP.
  useEffect(() => {
    const onAwarded = (event) => {
      const detail = event.detail
      if (!detail || detail.userId !== userId) return
      setProfileState((state) => {
        const current = state.userId === userId ? state.profile : null
        if (!current) return state
        const previous = current.stats?.[detail.gameId] ?? {}
        return { ...state, profile: {
          ...current,
          xp: detail.xp,
          level: detail.level,
          activities_completed: detail.activitiesCompleted,
          last_played_at: new Date().toISOString(),
          stats: detail.awarded > 0
            ? {
              ...current.stats,
              [detail.gameId]: {
                xp: (previous.xp ?? 0) + detail.awarded,
                plays: (previous.plays ?? 0) + 1,
                last_played_at: new Date().toISOString(),
              },
            }
            : current.stats,
        } }
      })
    }
    window.addEventListener(XP_AWARDED_EVENT, onAwarded)
    return () => window.removeEventListener(XP_AWARDED_EVENT, onAwarded)
  }, [userId])

  const updateProfile = useCallback(async (changes) => {
    if (!userId) throw new Error('Sign in to edit your profile.')
    // Only these columns are writable (see the RLS grants in the migration).
    const allowed = {}
    if ('username' in changes) allowed.username = changes.username?.trim() || null
    if ('avatar_url' in changes) allowed.avatar_url = changes.avatar_url?.trim() || null

    const { data, error } = await supabase
      .from('profiles')
      .update(allowed)
      .eq('id', userId)
      .select(PROFILE_COLUMNS)
      .single()
    if (error) throw error
    setProfileState((state) => ({ ...state, userId, profile: data }))
    return data
  }, [userId])

  /**
   * Saves the player's chosen avatar (src/avatars/avatarCatalog.js) to their auth user metadata,
   * so it follows them to every device. No table or migration needed. Their photo in
   * profiles.avatar_url is left alone, so "My photo" stays available.
   */
  const updateAvatar = useCallback(async (avatarId, updatedAt = new Date().toISOString()) => {
    if (!userId) throw new Error('Sign in to choose an avatar.')
    const { data, error } = await supabase.auth.updateUser({
      data: { avatar_id: avatarId, avatar_updated_at: updatedAt },
    })
    if (error) throw error
    // onAuthStateChange('USER_UPDATED') follows, but show it everywhere right away
    if (data?.user) setSession((current) => (current ? { ...current, user: data.user } : current))
    return data?.user ?? null
  }, [userId])

  /* ---------- actions ---------- */
  const signInWithPassword = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [])

  /** Resolves { needsConfirmation: true } when the project requires email confirmation. */
  const signUp = useCallback(async (email, password) => {
    rememberReturnPath(currentPath())
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authCallbackUrl() },
    })
    if (error) throw error
    return { ...data, needsConfirmation: !data.session }
  }, [])

  const signInWithGoogle = useCallback(async (returnTo = currentPath()) => {
    rememberReturnPath(returnTo)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authCallbackUrl() },
    })
    if (error) throw error
  }, [])

  const resetPassword = useCallback(async (email) => {
    // ?next=password survives the email round trip, even when the link opens in a new tab or device
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${authCallbackUrl()}?next=password` })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    setPasswordRecovery(false)
  }, [])

  const signOut = useCallback(async () => {
    await flushXp() // don't lose the last few points
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const openAuthModal = useCallback((options = {}) => {
    if (!isSupabaseConfigured) return
    setAuthModal({ open: true, reason: options.reason ?? 'save-xp', mode: options.mode ?? 'signin' })
  }, [])
  const closeAuthModal = useCallback(() => setAuthModal((modal) => ({ ...modal, open: false })), [])

  const value = useMemo(() => ({
    isConfigured: isSupabaseConfigured,
    session,
    user,
    loading,
    authError,
    retryAuth,
    profile,
    profileLoading,
    profileError,
    refreshProfile,
    updateProfile,
    updateAvatar,
    signInWithPassword,
    signUp,
    signInWithGoogle,
    resetPassword,
    signOut,
    passwordRecovery,
    updatePassword,
    authModal,
    openAuthModal,
    closeAuthModal,
  }), [
    session, user, loading, authError, retryAuth, profile, profileLoading, profileError,
    refreshProfile, updateProfile, updateAvatar, signInWithPassword, signUp, signInWithGoogle, resetPassword,
    signOut, passwordRecovery, updatePassword, authModal, openAuthModal, closeAuthModal,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
