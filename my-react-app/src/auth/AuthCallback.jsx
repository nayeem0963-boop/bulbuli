import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { takeReturnPath } from './returnPath.js'

/**
 * Landing page for Google sign-in, email confirmation and password-reset links
 * (redirect URL: <origin>/auth/callback). Supabase reads the tokens from the URL by
 * itself (detectSessionInUrl); by the time this renders, AuthProvider has the session,
 * so this just sends the player back to where they started.
 */
export default function AuthCallback() {
  const { session, passwordRecovery } = useAuth()
  const navigate = useNavigate()
  const [error] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    return params.get('error_description') || hash.get('error_description') || ''
  })
  const [isRecovery] = useState(() => new URLSearchParams(window.location.search).get('next') === 'password')
  const [waitedTooLong, setWaitedTooLong] = useState(false)

  useEffect(() => {
    if (error) return undefined
    if (session) {
      // from a password-reset email: go straight to the "choose a new password" form
      navigate(passwordRecovery || isRecovery ? '/dashboard#password' : takeReturnPath('/dashboard'), { replace: true })
      return undefined
    }
    const timer = setTimeout(() => setWaitedTooLong(true), 6000)
    return () => clearTimeout(timer)
  }, [session, passwordRecovery, isRecovery, error, navigate])

  if (error || waitedTooLong) {
    return (
      <main className="page auth-callback">
        <h1>Sign-in didn’t finish</h1>
        <p className="notice" role="alert">{error || 'The sign-in link may have expired. Please try again.'}</p>
        <p>Games still work without an account.</p>
        <Link className="button" to="/">Back to the games</Link>
      </main>
    )
  }

  return (
    <main className="loading-state" role="status" aria-label="Finishing sign-in">
      <span className="loading-bird" aria-hidden="true">🐦</span>
    </main>
  )
}
