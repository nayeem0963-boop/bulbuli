import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient.js'
import { getAuthRedirectPath } from './utils/authRedirect.js'
import Dashboard from './routes/Dashboard.jsx'
import ComprehensiveExam from './routes/ComprehensiveExam.jsx'
import Home from './routes/Home.jsx'
import Login from './routes/Login.jsx'
import TutorialCatalog from './routes/TutorialCatalog.jsx'
import TutorialOverview from './routes/TutorialOverview.jsx'
import TutorialQuiz from './routes/TutorialQuiz.jsx'
import { tutorialCatalog } from './data/tutorialCatalog.js'
import { useTutorialProgress } from './hooks/useTutorialProgress.js'

function RouteTitle() {
  const { pathname } = useLocation()

  useEffect(() => {
    const catalogTutorialId = pathname.match(/^\/tutorials\/([^/]+)(?:\/quiz)?$/)?.[1]
    const catalogTutorial = tutorialCatalog.find((item) => item.id === catalogTutorialId)
    let title = 'Free Interactive Coding Quizzes | Bulbuli'
    let description = 'Bulbuli is a free interactive quiz platform for learning HTML, CSS, JavaScript, GitHub, and React. Explore bite-sized tutorials, test your skills, and track your progress.'

    if (pathname === '/login') {
      title = 'Sign in or Sign up | Bulbuli'
      description = 'Sign in or create a free Bulbuli account to learn HTML, CSS, JavaScript, GitHub, and React with interactive quizzes.'
    } else if (pathname === '/dashboard') {
      title = 'Your Learning Dashboard | Bulbuli'
      description = 'Track your learning progress and continue your interactive HTML, CSS, JavaScript, GitHub, and React tutorials with Bulbuli.'
    } else if (pathname === '/exam') {
      title = 'Final Comprehensive Exam | Bulbuli'
      description = 'Test your HTML, CSS, JavaScript, Git, and React skills in Bulbuli’s timed 50-question final exam.'
    } else if (pathname === '/') {
      title = 'Free Interactive Coding Quizzes | Bulbuli'
    } else if (pathname === '/tutorials') {
      title = 'Free Coding Tutorials & Quizzes | Bulbuli'
      description = 'Explore free interactive tutorials and quizzes covering HTML, CSS, JavaScript, GitHub, and React. Choose a topic and learn at your pace.'
    } else if (pathname.startsWith('/tutorials/')) {
      title = catalogTutorial
        ? `${catalogTutorial.title}${pathname.endsWith('/quiz') ? ' Interactive Quiz' : ' Tutorial'} | Bulbuli`
        : 'Tutorial Not Found | Bulbuli'
      if (catalogTutorial) {
        description = `Learn ${catalogTutorial.title} with a bite-sized tutorial and free interactive quiz. Practice key concepts and track your progress with Bulbuli.`
      }
    }

    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [pathname])

  return null
}

function UserActivityTracker({ userId }) {
  const { markUserActivity, storageError } = useTutorialProgress(userId)
  const { pathname } = useLocation()
  const initialPathname = useRef(pathname)
  const [activityAttempted, setActivityAttempted] = useState(false)

  useEffect(() => {
    const handleActivity = () => {
      setActivityAttempted(true)
      markUserActivity()
    }

    window.addEventListener('click', handleActivity, true)
    window.addEventListener('keydown', handleActivity, true)
    return () => {
      window.removeEventListener('click', handleActivity, true)
      window.removeEventListener('keydown', handleActivity, true)
    }
  }, [markUserActivity])

  useEffect(() => {
    if (initialPathname.current === pathname) return
    initialPathname.current = pathname
    setActivityAttempted(true)
    markUserActivity()
  }, [markUserActivity, pathname])

  return activityAttempted && storageError
    ? <p className="notice" role="alert">{storageError}</p>
    : null
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
        <BrowserRouter>
          <RouteTitle />
          {session && <UserActivityTracker userId={session.user.id} />}
          <Routes>
            <Route path="/" element={session
              ? <Home session={session} />
              : <Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginRoute session={session} />} />
            <Route path="/tutorials" element={
              <MemberRoute session={session}>
                <TutorialCatalog userId={session?.user?.id} />
              </MemberRoute>
            } />
            <Route path="/tutorials/:tutorialId" element={
              <MemberRoute session={session}>
                <TutorialOverview userId={session?.user?.id} />
              </MemberRoute>
            } />
            <Route path="/tutorials/:tutorialId/quiz" element={
              <MemberRoute session={session}>
                <TutorialQuiz userId={session?.user?.id} />
              </MemberRoute>
            } />
            <Route path="/dashboard" element={
              <MemberRoute session={session}>
                <Dashboard session={session} />
              </MemberRoute>
            } />
            <Route path="/exam" element={
              <MemberRoute session={session}>
                <ComprehensiveExam userId={session?.user?.id} />
              </MemberRoute>
            } />
            <Route path="*" element={<Navigate to={session ? '/dashboard' : '/'} replace />} />
          </Routes>
        </BrowserRouter>
      )}
    </div>
  )
}

export default App