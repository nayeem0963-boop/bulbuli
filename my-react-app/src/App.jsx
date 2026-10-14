import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'
import { htmlLevels } from './data/htmlLevels.js'
import { getAuthRedirectPath } from './utils/authRedirect.js'
import Certificate from './routes/Certificate.jsx'
import Dashboard from './routes/Dashboard.jsx'
import Home from './routes/Home.jsx'
import Level from './routes/Level.jsx'
import Login from './routes/Login.jsx'
import PublicLevelPreview from './routes/PublicLevelPreview.jsx'
import { QuizProvider } from './context/QuizContext.jsx'

function RouteTitle() {
  const { pathname } = useLocation()

  useEffect(() => {
    const levelId = pathname.match(/^\/(?:level|certificate)\/([^/]+)$/)?.[1]
    const level = htmlLevels.find((item) => item.id === levelId)
    let title = 'Bulbuli | Learn HTML by Doing'

    if (pathname === '/login') {
      title = 'Sign in or Sign up | Bulbuli'
    } else if (pathname === '/dashboard') {
      title = 'Your Learning Dashboard | Bulbuli'
    } else if (pathname === '/') {
      title = 'Learn HTML by Doing | Bulbuli'
    } else if (pathname.startsWith('/level/')) {
      title = level ? `${level.title} | Bulbuli` : 'Level Not Found | Bulbuli'
    } else if (pathname.startsWith('/certificate/')) {
      title = level ? `${level.title} Certificate | Bulbuli` : 'Certificate Not Found | Bulbuli'
    }

    document.title = title
  }, [pathname])

  return null
}

function MemberRoute({ session, children }) {
  const location = useLocation()

  return session
    ? children
    : <Navigate to="/login" replace state={{ from: location }} />
}

function LoginRoute({ session }) {
  const location = useLocation()

  return session
    ? <Navigate to={getAuthRedirectPath(location.state?.from)} replace />
    : <Login />
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [authCheckAttempt, setAuthCheckAttempt] = useState(0)
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
    let isActive = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isActive) {
        setSession(session)
        setAuthError('')
        setLoading(false)
      }
    })

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) throw error
        if (!isActive) return
        setSession(session)
        setAuthError('')
        setLoading(false)
      })
      .catch((error) => {
        console.error('Unable to check the Bulbuli authentication session.', error)
        if (!isActive) return
        setAuthError('We could not verify your sign-in status. Please try again.')
        setLoading(false)
      })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [authCheckAttempt])

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
      ) : authError ? (
        <main className="page">
          <p className="notice" role="alert">{authError}</p>
          <button
            className="button"
            type="button"
            onClick={() => {
              setLoading(true)
              setAuthCheckAttempt((attempt) => attempt + 1)
            }}
          >
            Try again
          </button>
        </main>
      ) : (
        <QuizProvider>
          <BrowserRouter>
            <RouteTitle />
            <Routes>
              <Route path="/" element={<Home session={session} />} />
              <Route path="/login" element={<LoginRoute session={session} />} />
              <Route path="/level/:levelId" element={session
                ? <Level />
                : <PublicLevelPreview />} />
              <Route path="/dashboard" element={
                <MemberRoute session={session}>
                  <Dashboard session={session} />
                </MemberRoute>
              } />
              <Route path="/certificate/:levelId" element={
                <MemberRoute session={session}>
                  <Certificate />
                </MemberRoute>
              } />
              <Route path="*" element={<Navigate to={session ? '/dashboard' : '/'} replace />} />
            </Routes>
          </BrowserRouter>
        </QuizProvider>
      )}
    </div>
  )
}

export default App