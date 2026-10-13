import { useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const navigate = useNavigate()
  const submitLabel = authMode === 'login' ? 'Log In' : 'Create Account'
  const loadingLabel = authMode === 'login' ? 'Logging in...' : 'Creating account...'

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
          <input
            type="password"
            placeholder="Enter your password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
          />
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
      </section>
    </main>
  )
}