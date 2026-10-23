import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient.js'
import { getAuthRedirectPath } from './utils/authRedirect.js'
import Dashboard from './routes/Dashboard.jsx'
import ComprehensiveExam from './routes/ComprehensiveExam.jsx'
import Home from './routes/Home.jsx'
import ArcadeHome from './arcade/ArcadeHome.jsx'
import GamePage from './arcade/GamePage.jsx'
import AdCardPage from './promo/AdCardPage.jsx'
import { useLanguage } from './arcade/preferences.js'
import { getGame } from './games/registry.js'
import { homePlace } from './arcade/zone.js'
import Login from './routes/Login.jsx'
import TutorialCatalog from './routes/TutorialCatalog.jsx'
import TutorialOverview from './routes/TutorialOverview.jsx'
import TutorialQuiz from './routes/TutorialQuiz.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import { tutorialCatalog } from './data/tutorialCatalog.js'
import { GUEST_PLAYER_ID, useTutorialProgress } from './hooks/useTutorialProgress.js'
import { EXAM_CONFIGS } from './utils/comprehensiveExam.js'

const SITE_TITLE = 'Bulbuli: Free Learning Games for Kids'
const SITE_DESCRIPTION = 'Bulbuli is a free, colourful learning arcade for children under 12. Play Math Hero, Memory Match, Pattern Quest and Type Runner in English or Bangla, no sign-up needed.'
const isArcadePath = (pathname) => pathname === '/' || ['/games/', '/share/', '/grammar/'].some((start) => pathname.startsWith(start))

const GrammarQuizPage = lazy(() => import('./grammar/GrammarQuizPage.jsx'))


function RouteTitle() {
  const { pathname, search } = useLocation()
  const [language] = useLanguage()

  useEffect(() => {
    const catalogTutorialId = pathname.match(/^\/tutorials\/([^/]+)(?:\/quiz)?$/)?.[1]
    const catalogTutorial = tutorialCatalog.find((item) => item.id === catalogTutorialId)
    const subjectExamId = pathname.match(/^\/exams\/([^/]+)$/)?.[1]
    const subjectExam = Object.values(EXAM_CONFIGS).find((exam) => exam.id === subjectExamId)
    const game = getGame(pathname.match(/^\/games\/([^/]+)$/)?.[1])
    const { track } = homePlace(pathname, search)
    let title = SITE_TITLE
    let description = SITE_DESCRIPTION

    // The grammar pages then set their own, more exact title (src/grammar/meta.js).
    if (track === 'grammar' || pathname.startsWith('/grammar/')) {
      title = 'English Grammar Quizzes | Bulbuli'
      description = 'Free English grammar quizzes: tenses, subject-verb agreement, articles and prepositions, active and passive voice, punctuation, modals, conditionals, reported speech, relative clauses, and comparatives and superlatives. Every topic has a short rule recap and questions with explanations.'
    } else if (track === 'coding') {
      title = 'Learn to Code: Courses and Exams | Bulbuli'
      description = 'Guided HTML, CSS, JavaScript, GitHub, and React courses with quizzes and exams, for teens and grown-ups.'
    } else if (pathname === '/share/math-hero') {
      title = 'Math Hero: Play to Learn on Bulbuli'
      description = 'Hey Explorer! Join Math Hero on Bulbuli to master math, solve fun puzzles and level up, through free learning games for kids.'
    } else if (game) {
      title = `${game.title.en}: Free Learning Game for Kids | Bulbuli`
      description = `${game.tagline.en} A free ${game.skill.en.toLowerCase()} game for ages ${game.ages}, in English or Bangla.`
    } else if (pathname === '/login') {
      title = 'Sign in or Sign up | Bulbuli'
      description = 'Sign in to Bulbuli to save progress in the Developer Hub coding courses and exams.'
    } else if (pathname === '/dashboard') {
      title = 'Your Account | Bulbuli'
      description = 'Your Bulbuli account and Developer Hub course progress.'
    } else if (pathname === '/developer') {
      title = 'Developer Hub: Coding Courses | Bulbuli'
      description = 'Guided HTML, CSS, JavaScript, GitHub, and React courses with quizzes and exams, for teens and adults.'
    } else if (pathname === '/exam') {
      title = `${EXAM_CONFIGS.preparation.title} | Bulbuli Developer Hub`
      description = 'Test your HTML, CSS, JavaScript, GitHub, and React skills in Bulbuli’s timed 50-question preparation exam.'
    } else if (subjectExam) {
      title = `${subjectExam.title} | Bulbuli Developer Hub`
      description = `${subjectExam.description} Take Bulbuli’s timed subject exam and earn a certification.`
    } else if (pathname === '/tutorials') {
      title = 'Coding Courses | Bulbuli Developer Hub'
      description = 'Interactive courses and quizzes covering HTML, CSS, JavaScript, GitHub, and React.'
    } else if (pathname.startsWith('/tutorials/')) {
      title = catalogTutorial
        ? `${catalogTutorial.title}${pathname.endsWith('/quiz') ? ' Quiz' : ' Course'} | Bulbuli Developer Hub`
        : 'Course Not Found | Bulbuli'
      if (catalogTutorial) {
        description = `Learn ${catalogTutorial.title} with a bite-sized course and interactive quiz in the Bulbuli Developer Hub.`
      }
    }

    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    document.documentElement.lang = isArcadePath(pathname) ? language : 'en'
  }, [pathname, search, language])

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

function MemberRoute({ session, authError, onRetryAuth, children }) {
  const location = useLocation()

  if (!session && authError) {
    return (
      <main className="page">
        <p className="notice" role="alert">{authError}</p>
        <button className="button" type="button" onClick={onRetryAuth}>Try again</button>
      </main>
    )
  }

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
  // The arcade has its own day/night button in its header; the dashboard has one in its sidebar.
  if (pathname === '/dashboard' || isArcadePath(pathname)) return null

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
    themeColor?.setAttribute('content', theme === 'dark' ? '#1b2f5c' : '#8fd0f7')
  }, [theme])

  const retryAuth = () => {
    setLoading(true)
    setAuthCheckAttempt((attempt) => attempt + 1)
  }
  // Games are open to everyone. Players who are not signed in keep progress on this device.
  const playerId = session?.user?.id ?? GUEST_PLAYER_ID
  const member = (element) => (
    <MemberRoute session={session} authError={authError} onRetryAuth={retryAuth}>{element}</MemberRoute>
  )

  return (
    <div className="app-shell" data-theme={theme}>
      {loading ? (
        <main className="loading-state" role="status">
          <span className="loading-bird" aria-hidden="true">🐦</span>
        </main>
      ) : (
        <BrowserRouter>
          <AppThemeToggle theme={theme} onToggleTheme={toggleTheme} />
          <RouteTitle />
          {session && <UserActivityTracker userId={session.user.id} />}
          <Routes>
            <Route path="/" element={
              <ArcadeHome key={playerId} session={session} playerId={playerId} theme={theme} onToggleTheme={toggleTheme} />
            } />
            <Route path="/games/:gameId" element={
              <GamePage playerId={playerId} theme={theme} onToggleTheme={toggleTheme} />
            } />
            <Route path="/share/math-hero" element={<AdCardPage theme={theme} onToggleTheme={toggleTheme} />} />
            <Route path="/grammar" element={<Navigate to="/?zone=learn&track=grammar" replace />} />
            <Route path="/grammar/:first/:second?" element={
              <Suspense fallback={null}><GrammarQuizPage theme={theme} onToggleTheme={toggleTheme} /></Suspense>
            } />
            <Route path="/math-hero" element={<Navigate to="/games/math-hero" replace />} />
            <Route path="/login" element={<LoginRoute session={session} />} />
            <Route path="/developer" element={member(<Home session={session} />)} />
            <Route path="/tutorials" element={member(<TutorialCatalog userId={session?.user?.id} />)} />
            <Route path="/tutorials/:tutorialId" element={member(<TutorialOverview userId={session?.user?.id} />)} />
            <Route path="/tutorials/:tutorialId/quiz" element={member(<TutorialQuiz userId={session?.user?.id} />)} />
            <Route path="/dashboard" element={member(
              <Dashboard session={session} theme={theme} onToggleTheme={toggleTheme} />,
            )} />
            <Route path="/exam" element={member(
              <ComprehensiveExam userId={session?.user?.id} examConfig={EXAM_CONFIGS.preparation} />,
            )} />
            {Object.values(EXAM_CONFIGS).filter((examConfig) => examConfig.tutorialId).map((examConfig) => (
              <Route
                key={examConfig.id}
                path={`/exams/${examConfig.id}`}
                element={member(<ComprehensiveExam userId={session?.user?.id} examConfig={examConfig} />)}
              />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      )}
    </div>
  )
}

export default App
