import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth } from './auth/AuthContext.jsx'
import { FavoritesProvider } from './favorites/FavoritesContext.jsx'
import AuthModal from './auth/AuthModal.jsx'
import AuthCallback from './auth/AuthCallback.jsx'
import { getAuthRedirectPath } from './utils/authRedirect.js'
import Dashboard from './routes/Dashboard.jsx'
import ArcadeHome from './arcade/ArcadeHome.jsx'
import GamePage from './arcade/GamePage.jsx'
import AdCardPage from './promo/AdCardPage.jsx'
import { useLanguage } from './arcade/preferences.js'
import { getGame, getGameByPath } from './games/registry.js'
import Login from './routes/Login.jsx'
import QuizRedirect from './routes/QuizRedirect.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import { GUEST_PLAYER_ID } from './hooks/useGameProgress.js'

// The 3D driving game pulls in three.js, so it loads only when /drive is visited.
const VehicleGame = lazy(() => import('./components/3d_procedural_driving_game.jsx'))

const SITE_TITLE = 'Bulbuli - Fun & Free Educational Games for Kids'
const SITE_DESCRIPTION = 'Play free mini-games with Bulbuli the bird: counting, matching, typing, patterns and logic puzzles. Earn XP and level up, in English or Bangla.'
const isArcadePath = (pathname) => pathname === '/' || ['/games/', '/play/', '/share/'].some((start) => pathname.startsWith(start))



function RouteTitle() {
  const { pathname } = useLocation()
  const [language] = useLanguage()

  useEffect(() => {
    const game = getGame(pathname.match(/^\/games\/([^/]+)$/)?.[1]) ?? getGameByPath(pathname)
    let title = SITE_TITLE
    let description = SITE_DESCRIPTION

    if (pathname === '/share/math-hero') {
      title = 'Math Hero: Play to Learn on Bulbuli'
      description = 'Hey Explorer! Join Math Hero on Bulbuli to master math, solve fun puzzles and level up, through free learning games for kids.'
    } else if (game) {
      title = `${game.title.en}: Free Educational Game for Kids | Bulbuli Games`
      description = `${game.tagline.en} A free ${game.skill.en.toLowerCase()} game for ages ${game.ages}, in English or Bangla.`
    } else if (pathname === '/login') {
      title = 'Sign in or Sign up | Bulbuli Games'
      description = 'Sign in to Bulbuli to save game XP and levels on every device. All games are free without an account.'
    } else if (pathname === '/dashboard') {
      title = 'My Progress | Bulbuli Games'
      description = 'Your Bulbuli level, XP and game activity.'
    }

    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    document.documentElement.lang = isArcadePath(pathname) ? language : 'en'
  }, [pathname, language])

  return null
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
  // Session state lives in AuthProvider (src/auth/AuthContext.jsx), driven by onAuthStateChange.
  const { session, loading, authError, retryAuth } = useAuth()
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
    const themeColor = document.querySelector('meta[name="theme-color"]')
    themeColor?.setAttribute('content', theme === 'dark' ? '#1b2f5c' : '#8fd0f7')
  }, [theme])

  // Games are open to everyone. Players who are not signed in keep progress on this device.
  const playerId = session?.user?.id ?? GUEST_PLAYER_ID
  const member = (element) => (
    <MemberRoute session={session} authError={authError} onRetryAuth={retryAuth}>{element}</MemberRoute>
  )

  return (
    // Favourite games (hearts on the tiles): device-only for guests, on the account when signed in.
    <FavoritesProvider>
      <div className="app-shell" data-theme={theme}>
        {loading ? (
          <main className="loading-state" role="status">
            <span className="loading-bird" aria-hidden="true">🐦</span>
          </main>
        ) : (
          <BrowserRouter>
            <AppThemeToggle theme={theme} onToggleTheme={toggleTheme} />
            <RouteTitle />
            {/* Optional sign-in, opened from the Play banner or the header. Never required to play. */}
            <AuthModal />
            <Routes>
              <Route path="/" element={
                <ArcadeHome key={playerId} playerId={playerId} theme={theme} onToggleTheme={toggleTheme} />
              } />
              <Route path="/games/:gameId" element={
                <GamePage playerId={playerId} theme={theme} onToggleTheme={toggleTheme} />
              } />
              <Route path="/play/html-architect" element={
                <GamePage gameId="html-architect" playerId={playerId} theme={theme} onToggleTheme={toggleTheme} />
              } />
              <Route path="/games/html-architect" element={<Navigate to="/play/html-architect" replace />} />
              <Route path="/share/math-hero" element={<AdCardPage theme={theme} onToggleTheme={toggleTheme} />} />
              <Route path="/math-hero" element={<Navigate to="/games/math-hero" replace />} />
              <Route path="/login" element={<LoginRoute session={session} />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/dashboard" element={member(
                <Dashboard session={session} theme={theme} onToggleTheme={toggleTheme} />,
              )} />
              <Route path="/drive" element={<Suspense fallback={null}><VehicleGame /></Suspense>} />
              {/* The HTML quiz is its own page (quiz/index.html); this only catches the app loading at /quiz. */}
              <Route path="/quiz" element={<QuizRedirect />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        )}
      </div>
    </FavoritesProvider>
  )
}

export default App
