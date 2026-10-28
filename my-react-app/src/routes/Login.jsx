import { useState } from 'react'
import { authCallbackUrl, supabase } from '../supabaseClient.js'
import { rememberReturnPath } from '../auth/returnPath.js'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getAuthRedirectPath } from '../utils/authRedirect.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authView, setAuthView] = useState('login')
  const [resetEmail, setResetEmail] = useState('')
  const [resetStatus, setResetStatus] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const redirectPath = getAuthRedirectPath(location.state?.from)
  const submitLabel = authMode === 'login' ? 'Log In' : 'Create Account'
  const loadingLabel = authMode === 'login' ? 'Logging in...' : 'Creating account...'

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    const emailToReset = resetEmail.trim()

    if (!emailToReset) {
      setResetStatus({ type: 'error', message: 'Enter your email address to continue.' })
      return
    }

    setLoading(true)
    setResetStatus(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
        redirectTo: `${authCallbackUrl()}?next=password`,
      })
      if (error) {
        setResetStatus({ type: 'error', message: error.message })
      } else {
        setResetStatus({
          type: 'success',
          message: 'If an account exists for that email, password reset instructions will be sent shortly.',
        })
      }
    } catch (error) {
      console.error('Unable to request a password reset.', error)
      setResetStatus({
        type: 'error',
        message: 'We could not send the reset link. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()

    if (password.length < 6) {
      setAuthStatus({ type: 'error', message: 'Password must be at least 6 characters long.' })
      return
    }

    if (password !== confirmPassword) {
      setAuthStatus({ type: 'error', message: 'Passwords do not match' })
      return
    }

    setLoading(true)
    setAuthStatus(null)
    try {
      rememberReturnPath(redirectPath)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: authCallbackUrl() },
      })
      if (error) throw error

      if (data.session) {
        navigate(redirectPath, { replace: true })
      } else {
        setAuthStatus({
          type: 'success',
          message: 'Please check your email to verify your account.',
        })
      }
    } catch (error) {
      console.error('Unable to create a Pro Coder account.', error)
      setAuthStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'We could not create your account. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    setLoading(true)
    setAuthStatus(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate(redirectPath, { replace: true })
    } catch (error) {
      console.error('Unable to log in to Pro Coder.', error)
      setAuthStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'We could not log you in. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setLoading(true)
    setAuthStatus(null)

    try {
      // Works on localhost and production alike; /auth/callback sends the player back here.
      rememberReturnPath(redirectPath)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: authCallbackUrl(),
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Error logging in with Google:', error instanceof Error ? error.message : error)
      setAuthStatus({
        type: 'error',
        message: error instanceof Error
          ? error.message
          : 'We could not sign in with Google. Please try again.',
      })
      setLoading(false)
    }
  }

  return (
    <main className="page login-page auth-page">
      <div className="auth-layout">
        <aside className="auth-welcome-panel">
          <Link className="dashboard-brand auth-brand" to="/" aria-label="Bulbuli home">
            Bulbuli<span>.</span>
          </Link>
          <div className="auth-welcome-copy">
            <p className="eyebrow">Every game is free to play</p>
            <h1>Keep your stars safe.</h1>
            <p>
              Sign in to save XP and levels to your account, so they follow you
              to any device. You never need an account to play.
            </p>
          </div>
          <div className="auth-topic-list" aria-label="What an account saves">
            {[
              ['⭐', 'XP from every game'],
              ['🏅', 'Your level'],
              ['🎮', 'Progress in each game'],
            ].map(([symbol, title]) => (
              <span className="auth-topic-pill" key={title}>
                <strong aria-hidden="true">{symbol}</strong>
                {title}
              </span>
            ))}
          </div>
          <p className="auth-welcome-footnote">Grown-ups: sign in for your young player.</p>
        </aside>

        <section className="card login-card auth-card">
          {authView === 'reset' ? (
            <>
              <p className="eyebrow">Account recovery</p>
              <h1>Reset your password</h1>
              <p>Enter the email address associated with your account and we’ll send reset instructions.</p>
              <form onSubmit={handlePasswordReset} className="login-form">
                <label className="auth-field-label" htmlFor="reset-email">Email address</label>
                <input
                  id="reset-email"
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => {
                    setResetEmail(e.target.value)
                    setResetStatus(null)
                  }}
                  required
                  autoComplete="email"
                />
                {resetStatus && (
                  <p
                    className={`reset-message ${resetStatus.type}`}
                    role={resetStatus.type === 'error' ? 'alert' : 'status'}
                  >
                    {resetStatus.message}
                  </p>
                )}
                <button type="submit" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => {
                  setAuthView('login')
                  setResetStatus(null)
                }}
                disabled={loading}
              >
                Back to Log In
              </button>
            </>
          ) : (
            <>
              <p className="eyebrow">{authMode === 'login' ? 'Welcome back' : 'Save your progress'}</p>
              <h2 className="auth-card-title">
                {authMode === 'login' ? 'Good to see you again.' : 'Let’s get you started.'}
              </h2>
              <p className="auth-card-description">
                {authMode === 'login'
                  ? 'Log in to pick up your XP and level where you left off.'
                  : 'Create a free account to keep XP and levels on every device.'}
              </p>
              <form
                onSubmit={authMode === 'login' ? handleLogin : handleSignUp}
                className="login-form"
              >
              <label className="auth-field-label" htmlFor="account-email">Email</label>
              <input
                id="account-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setAuthStatus(null)
                }}
                required
                autoComplete="email"
              />
              <label className="auth-field-label" htmlFor="account-password">Password</label>
              <div className="password-input-wrap">
                <input
                  id="account-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setAuthStatus(null)
                  }}
                  required
                  minLength={authMode === 'signup' ? 6 : undefined}
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                    {!showPassword && <path d="m3 3 18 18" />}
                  </svg>
                </button>
              </div>
              {authMode === 'signup' && (
                <>
                  <label className="auth-field-label" htmlFor="confirm-password">Confirm Password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setAuthStatus(null)
                    }}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    aria-describedby={authStatus?.message === 'Passwords do not match' ? 'password-match-error' : undefined}
                    aria-invalid={authStatus?.message === 'Passwords do not match'}
                  />
                  {authStatus?.message === 'Passwords do not match' && (
                    <p id="password-match-error" className="auth-message error" role="alert">
                      Passwords do not match
                    </p>
                  )}
                </>
              )}
              {authMode === 'login' && (
                <button
                  className="forgot-password-link"
                  type="button"
                  onClick={() => {
                    setResetEmail(email)
                    setResetStatus(null)
                    setAuthView('reset')
                  }}
                >
                  Forgot Password?
                </button>
              )}
              {authStatus && authStatus.message !== 'Passwords do not match' && (
                <p className={`auth-message ${authStatus.type}`} role={authStatus.type === 'error' ? 'alert' : 'status'}>
                  {authStatus.message}
                </p>
              )}
              <button type="submit" disabled={loading}>
                {loading ? loadingLabel : submitLabel}
              </button>
              </form>
              <div className="oauth-divider" aria-hidden="true"><span>OR</span></div>
              <button
                className="google-sign-in button-secondary"
                type="button"
                onClick={handleGoogleSignUp}
                disabled={loading}
              >
                Sign in with Google
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'signup' : 'login')
                  setConfirmPassword('')
                  setAuthStatus(null)
                }}
                disabled={loading}
              >
                {authMode === 'login' ? 'Sign Up' : 'Back to Log In'}
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  )
}