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
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else alert('Success! Check your email for confirmation, or try logging in.')
    setLoading(false)
  }

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault()
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
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>Login to Bulbuli Quiz</h2>
      <form style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <button 
          onClick={handleLogin} 
          disabled={loading}
          style={{ padding: '10px', fontSize: '16px', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          Log In
        </button>
        <button 
          onClick={handleSignUp} 
          disabled={loading}
          style={{ padding: '10px', fontSize: '16px', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          Sign Up
        </button>
      </form>
    </div>
  )
}