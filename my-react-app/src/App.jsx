import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'
import Certificate from './routes/Certificate.jsx'
import Dashboard from './routes/Dashboard.jsx'
import Home from './routes/Home.jsx'
import Level from './routes/Level.jsx'
import Login from './routes/Login.jsx'
import { QuizProvider } from './context/QuizContext.jsx'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = window.localStorage.getItem('bulbuli.theme')
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
    } catch (error) {
      console.error('Unable to load Bulbuli theme preference.', error)
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)

    try {
      window.localStorage.setItem('bulbuli.theme', nextTheme)
    } catch (error) {
      console.error('Unable to save Bulbuli theme preference.', error)
    }
  }

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

  useEffect(() => {
    const themeColor = document.querySelector('meta[name="theme-color"]')
    themeColor?.setAttribute('content', theme === 'dark' ? '#10131d' : '#f5f7fc')
  }, [theme])

  return (
    <div className="app-shell" data-theme={theme}>
      <button
        className="theme-toggle"
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M20.2 15.6A8.5 8.5 0 0 1 8.4 3.8 8.5 8.5 0 1 0 20.2 15.6Z" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
          </svg>
        )}
        <span>{theme === 'light' ? 'Dark' : 'Light'} mode</span>
      </button>
      {loading ? (
        <main className="loading-state" role="status">Loading your learning space…</main>
      ) : (
        <QuizProvider>
          <BrowserRouter>
            <Routes>
              {!session ? (
                <>
                  <Route path="/login" element={<Login />} />
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </>
              ) : (
                <>
                  <Route path="/dashboard" element={<Dashboard session={session} />} />
                  <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/" element={<Home />} />
                  <Route path="/level/:levelId" element={<Level />} />
                  <Route path="/certificate/:levelId" element={<Certificate />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </>
              )}
            </Routes>
          </BrowserRouter>
        </QuizProvider>
      )}
    </div>
  )
}

export default App