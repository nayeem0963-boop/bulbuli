/**
 * One place for "who is signed in", shared by the whole app.
 *
 *   const { session, user, profile, openAuthModal, signOut } = useAuth()
 *
 * - The session comes from Supabase's onAuthStateChange, so sign-in, sign-out,
 *   token refresh and other tabs are all reflected everywhere.
 * - The player's profile row (username, avatar, xp, level, stats) is loaded
 *   whenever the signed-in user changes, and kept current as XP is awarded.
 * - Nothing here is required to play: with no session, `user` and `profile` are null.
 */
import { createContext, useContext } from 'react'

/** Value provided by <AuthProvider> (AuthProvider.jsx). */
export const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth() must be used inside <AuthProvider>.')
  return context
}
