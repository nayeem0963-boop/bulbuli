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
import MathHero from './routes/MathHero.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import { tutorialCatalog } from './data/tutorialCatalog.js'
import { useTutorialProgress } from './hooks/useTutorialProgress.js'
import { EXAM_CONFIGS } from './utils/comprehensiveExam.js'

function RouteTitle() {
  const { pathname } = useLocation()

  useEffect(() => {
    const catalogTutorialId = pathname.match(/^\/tutorials\/([^/]+)(?:\/quiz)?$/)?.[1]
    const catalogTutorial = tutorialCatalog.find((item) => item.id === catalogTutorialId)
    const subjectExamId = pathname.match(/^\/exams\/([^/]+)$/)?.[1]
    const subjectExam = Object.values(EXAM_CONFIGS).find((exam) => exam.id === subjectExamId)
    let title = 'Free Interactive Coding Quizzes | Bulbuli'
    let description = 'Bulbuli is a free interactive quiz platform for learning HTML, CSS, JavaScript, GitHub, and React. Explore bite-sized tutorials, test your skills, and track your progress.'

    if (pathname === '/login') {
      title = 'Sign in or Sign up | Bulbuli'
      description = 'Sign in or create a free Bulbuli account to learn HTML, CSS, JavaScript, GitHub, and React with interactive quizzes.'
    } else if (pathname === '/dashboard') {
      title = 'Your Learning Dashboard | Bulbuli'
      description = 'Track your learning progress and continue your interactive HTML, CSS, JavaScript, GitHub, and React tutorials with Bulbuli.'
    } else if (pathname === '/math-hero') {
      title = 'Math Hero | Bulbuli'
      description = 'Play Math Hero, a friendly addition and subtraction game with timed multiple-choice questions, saved levels, and XP rewards.'
    } else if (pathname === '/exam') {
      title = `${EXAM_CONFIGS.preparation.title} | Bulbuli`
      description = 'Test your HTML, CSS, JavaScript, GitHub, and React skills in Bulbuli’s timed 50-question preparation exam.'
    } else if (subjectExam) {
      title = `${subjectExam.title} | Bulbuli`
      description = `${subjectExam.description} Take Bulbuli’s timed subject exam and earn a certification.`
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

function AppThemeToggle({ theme, onToggleTheme }) {
  const { pathname } = useLocation()
  if (pathname === '/dashboard') return null

  return <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} className="theme-toggle app-theme-toggle" />
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
          <AppThemeToggle theme={theme} onToggleTheme={toggleTheme} />
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
            <Route path="/math-hero" element={
              <MemberRoute session={session}>
                <MathHero userId={session?.user?.id} />
              </MemberRoute>
            } />
            <Route path="/dashboard" element={
              <MemberRoute session={session}>
                <Dashboard session={session} theme={theme} onToggleTheme={toggleTheme} />
              </MemberRoute>
            } />
            <Route path="/exam" element={
              <MemberRoute session={session}>
                <ComprehensiveExam userId={session?.user?.id} examConfig={EXAM_CONFIGS.preparation} />
              </MemberRoute>
            } />
            {Object.values(EXAM_CONFIGS).filter((examConfig) => examConfig.tutorialId).map((examConfig) => (
              <Route
                key={examConfig.id}
                path={`/exams/${examConfig.id}`}
                element={
                  <MemberRoute session={session}>
                    <ComprehensiveExam userId={session?.user?.id} examConfig={examConfig} />
                  </MemberRoute>
                }
              />
            ))}
            <Route path="*" element={<Navigate to={session ? '/dashboard' : '/'} replace />} />
          </Routes>
        </BrowserRouter>
      )}
    </div>
  )
}

export default App