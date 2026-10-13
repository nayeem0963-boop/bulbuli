import { useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Handle Sign Up
  const handleSignUp = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      alert('Please enter both email and password.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else alert('Success! Check your email for confirmation, or try logging in.')
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
      navigate('/') // Redirect to home page after login
    }
    setLoading(false)
  }

  return (
    <main className="page login-page">
      <section className="card login-card">
        <p className="eyebrow">Your next skill starts here</p>
        <h1>Welcome to Bulbuli</h1>
        <p>Log in or create an account to continue learning.</p>
        <form onSubmit={handleLogin} className="login-form">
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
            autoComplete="current-password"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={handleSignUp}
            disabled={loading}
          >
            Sign Up
          </button>
        </form>
      </section>
    </main>
  )
}