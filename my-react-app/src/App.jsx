import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'
import Certificate from './routes/Certificate.jsx'
import Home from './routes/Home.jsx'
import Level from './routes/Level.jsx'
import Login from './routes/Login.jsx'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        {!session ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Home />} />
            <Route path="/level/:levelId" element={<Level />} />
            <Route path="/certificate/:levelId" element={<Certificate />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App