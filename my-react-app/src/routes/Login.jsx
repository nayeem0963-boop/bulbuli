import { useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authView, setAuthView] = useState('login')
  const [resetEmail, setResetEmail] = useState('')
  const [resetStatus, setResetStatus] = useState(null)
  const navigate = useNavigate()
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
      const { error } = await supabase.auth.resetPasswordForEmail(emailToReset)
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

  // Handle Sign Up
  const handleSignUp = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      alert('Please enter both email and password.')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      alert(error.message)
    } else if (data.session) {
      navigate('/dashboard', { replace: true })
    } else {
      alert('Success! Check your email for confirmation, then log in to continue.')
    }
    setLoading(false)
  }

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      alert('Please enter both email and password.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert(error.message)
    } else {
      navigate('/dashboard', { replace: true })
    }
    setLoading(false)
  }

  return (
    <main className="page login-page">
      <section className="card login-card">
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
            <p className="eyebrow">Your next skill starts here</p>
            <h1>Welcome to Bulbuli</h1>
            <p>
              {authMode === 'login'
                ? 'Log in to continue learning, or create an account.'
                : 'Create an account to start learning.'}
            </p>
            <form
              onSubmit={authMode === 'login' ? handleLogin : handleSignUp}
              className="login-form"
            >
              <input
                type="email"
                placeholder="Enter your email"
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <div className="password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  aria-label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
              <button type="submit" disabled={loading}>
                {loading ? loadingLabel : submitLabel}
              </button>
            </form>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              disabled={loading}
            >
              {authMode === 'login' ? 'Sign Up' : 'Back to Log In'}
            </button>
          </>
        )}
      </section>
    </main>
  )
}