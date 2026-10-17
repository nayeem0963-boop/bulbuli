import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient.js'
import TutorialCard from '../components/TutorialCard.jsx'
import { tutorialCatalog } from '../data/tutorialCatalog.js'
import { useTutorialProgress } from '../hooks/useTutorialProgress.js'

function formatJoinedDate(createdAt) {
  if (!createdAt) return 'Not available'

  const date = new Date(createdAt)
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

function getCurrentStreak(gamification) {
  const formatDate = (date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  return [formatDate(today), formatDate(yesterday)].includes(gamification.lastActivityDate)
    ? gamification.currentStreak
    : 0
}

function Dashboard({ session }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(session.user)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [logoutError, setLogoutError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const {
    completedTutorials,
    gamification,
    quizProgress,
    startedTutorialIds,
    storageError: tutorialProgressError,
    userActivity,
  } = useTutorialProgress(session.user.id)

  useEffect(() => {
    let isMounted = true

    async function loadUser() {
      setLoading(true)
      setProfileError('')

      try {
        const { data, error } = await supabase.auth.getUser()
        if (error) throw error
        if (!data.user) throw new Error('No authenticated user was returned.')
        if (isMounted) setUser(data.user)
      } catch (error) {
        console.error('Unable to fetch the current Bulbuli user.', error)
        if (isMounted) {
          setProfileError('Your latest profile details could not be loaded. Showing the information from your current session.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadUser()
    return () => {
      isMounted = false
    }
  }, [refreshCount])

  const handleLogout = async () => {
    setSigningOut(true)
    setLogoutError('')

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Unable to log out of Bulbuli.', error)
      setLogoutError('You could not be logged out. Please try again.')
      setSigningOut(false)
    }
  }

  const metadata = user?.user_metadata ?? {}
  const metadataName = metadata.full_name || metadata.name
  const fullName = typeof metadataName === 'string' && metadataName.trim()
    ? metadataName.trim()
    : user?.email?.split('@')[0] || 'Bulbuli learner'
  const email = user?.email || 'Email not available'
  const metadataAvatarUrl = metadata.avatar_url || metadata.picture
  const avatarUrl = typeof metadataAvatarUrl === 'string' ? metadataAvatarUrl : ''
  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  const accountIsConfirmed = Boolean(user?.email_confirmed_at || user?.confirmed_at)
  const completedCount = Object.keys(completedTutorials).length
  const currentStreak = getCurrentStreak(gamification)
  const nextTutorial = tutorialCatalog.find((tutorial) => !completedTutorials[tutorial.id])

  return (
    <div className="dashboard-page">
      <header className="dashboard-topbar">
        <Link className="dashboard-brand" to="/" aria-label="Bulbuli home">bulbuli<span>.</span></Link>
        <button type="button" className="button-secondary dashboard-logout" onClick={handleLogout} disabled={signingOut}>
          {signingOut ? 'Logging out…' : 'Logout'}
        </button>
      </header>

      <div className="dashboard-layout">
        <aside className="card dashboard-sidebar" aria-label="Dashboard navigation">
          <div className="dashboard-sidebar-user">
            <div className="dashboard-avatar dashboard-avatar-small" aria-hidden="true">
              {avatarUrl && !avatarFailed
                ? <img src={avatarUrl} alt="" onError={() => setAvatarFailed(true)} />
                : initials}
            </div>
            <div>
              <strong>{fullName}</strong>
              <span>{email}</span>
            </div>
          </div>
          <nav className="dashboard-nav">
            <a className="dashboard-nav-link is-current" href="#overview" aria-current="page">Overview</a>
            <Link className="dashboard-nav-link" to="/">Learning</Link>
            <a className="dashboard-nav-link" href="#profile">Profile</a>
          </nav>
        </aside>

        <main className="dashboard-main">
          <header className="dashboard-heading" id="overview">
            {!userActivity && <p className="eyebrow">Your learning space</p>}
            <h1>{userActivity ? 'Your learning overview' : `Welcome back, ${fullName}`}</h1>
            <p>Five small steps can take you a long way. Pick up where you left off.</p>
          </header>

          {(profileError || logoutError || tutorialProgressError) && (
            <div className="notice" role="alert">
              {profileError || logoutError || tutorialProgressError}
              {profileError && (
                <button
                  className="text-button dashboard-retry"
                  type="button"
                  onClick={() => setRefreshCount((count) => count + 1)}
                  disabled={loading}
                >
                  {loading ? 'Refreshing…' : 'Retry'}
                </button>
              )}
            </div>
          )}

          <section className="dashboard-metrics" aria-label="Learning overview">
            <article className="card dashboard-metric">
              <div className="dashboard-metric-top">
                <span className="dashboard-metric-label">Total XP</span>
                <span className="dashboard-metric-icon" aria-hidden="true">✦</span>
              </div>
              <strong>{gamification.totalXp}<small> XP</small></strong>
              <span>Every correct answer adds up</span>
            </article>
            <article className="card dashboard-metric">
              <div className="dashboard-metric-top">
                <span className="dashboard-metric-label">Day streak</span>
                <span className="dashboard-metric-icon is-streak" aria-hidden="true">🔥</span>
              </div>
              <strong>{currentStreak}<small> days</small></strong>
              <span>Complete a quiz today to keep it alive</span>
            </article>
            <article className="card dashboard-metric">
              <div className="dashboard-metric-top">
                <span className="dashboard-metric-label">Courses completed</span>
                <span className="dashboard-metric-icon is-complete" aria-hidden="true">✓</span>
              </div>
              <strong>{completedCount}<small> / {tutorialCatalog.length}</small></strong>
              <span>{gamification.completedQuizCount} quizzes completed</span>
            </article>
          </section>

          <section className="card dashboard-profile" id="profile" aria-labelledby="profile-heading">
            <div className="dashboard-profile-heading">
              <div className="dashboard-avatar" aria-hidden="true">
                {avatarUrl && !avatarFailed
                  ? <img src={avatarUrl} alt="" onError={() => setAvatarFailed(true)} />
                  : initials}
              </div>
              <div>
                <p className="eyebrow">Your account</p>
                <h2 id="profile-heading">{fullName}</h2>
                <span className={`account-status ${accountIsConfirmed ? 'is-active' : 'is-pending'}`}>
                  <span aria-hidden="true" />
                  {accountIsConfirmed ? 'Active' : 'Pending verification'}
                </span>
              </div>
            </div>
            <dl className="dashboard-profile-details">
              <div>
                <dt>Email address</dt>
                <dd>{email}</dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd>{formatJoinedDate(user?.created_at)}</dd>
              </div>
              <div>
                <dt>Account status</dt>
                <dd>{accountIsConfirmed ? 'Active' : 'Pending verification'}</dd>
              </div>
            </dl>
            {loading && <p className="dashboard-loading" role="status">Refreshing your profile…</p>}
          </section>

          <section className="card dashboard-next-step" aria-labelledby="next-step-heading">
            <div>
              <p className="eyebrow">A good next step</p>
              <h2 id="next-step-heading">{nextTutorial ? nextTutorial.title : 'You explored every topic!'}</h2>
              <p>{nextTutorial ? nextTutorial.description : 'All five tutorials are complete. Take another quiz to improve a score.'}</p>
            </div>
            <Link className="button" to={nextTutorial ? `/tutorials/${nextTutorial.id}` : '/tutorials'}>
              {nextTutorial ? 'Continue learning' : 'Review tutorials'}
            </Link>
          </section>

          <section className="dashboard-tutorials" aria-labelledby="tutorials-heading">
            <div className="tutorial-section-heading">
              <div>
                <p className="eyebrow">Five guided paths</p>
                <h2 id="tutorials-heading">Your tutorials</h2>
              </div>
              <Link className="tutorial-text-link" to="/tutorials">
                View collection <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="tutorial-card-grid dashboard-tutorial-grid">
              {tutorialCatalog.map((tutorial) => {
                const result = completedTutorials[tutorial.id]
                const attempt = quizProgress[tutorial.id]
                const started = startedTutorialIds.includes(tutorial.id)
                const answered = attempt?.answers.filter((answer) => answer !== null).length ?? 0
                const progress = result
                  ? 100
                  : attempt ? Math.round((answered / attempt.answers.length) * 100) : 0
                const status = result
                  ? 'Completed'
                  : started ? answered ? `${answered} of ${attempt.answers.length} answered` : 'In progress'
                    : 'Ready to start'

                return (
                  <TutorialCard
                    key={tutorial.id}
                    tutorial={tutorial}
                    result={result}
                    progress={progress}
                    status={status}
                    action={result ? 'Review' : started ? 'Continue' : 'Start learning'}
                    to={`/tutorials/${tutorial.id}`}
                  />
                )
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
