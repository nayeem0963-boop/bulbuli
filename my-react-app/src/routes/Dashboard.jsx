import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress.js'
import { useQuiz } from '../hooks/useQuiz.js'
import { supabase } from '../supabaseClient.js'
import { htmlLevels } from '../data/htmlLevels.js'
import { tutorials } from '../data/tutorials.js'

function formatJoinedDate(createdAt) {
  if (!createdAt) return 'Not available'

  const date = new Date(createdAt)
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
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
  const { completedLevels, startedLevels, storageError: progressError } = useProgress()
  const { highScores, storageError: scoresError } = useQuiz()

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
  const completedCount = completedLevels.length
  const inProgressCount = startedLevels.filter((id) => !completedLevels.includes(id)).length
  const savedScoreCount = Object.keys(highScores).length
  const nextLevelId = startedLevels.slice().reverse().find((id) => !completedLevels.includes(id))
    || htmlLevels.find((level) => !completedLevels.includes(level.id))?.id
    || htmlLevels[htmlLevels.length - 1]?.id
  const nextLevel = htmlLevels.find((level) => level.id === nextLevelId)

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
            <p className="eyebrow">Your learning space</p>
            <h1>Welcome back, {fullName}</h1>
            <p>Here’s an overview of your Bulbuli account and learning progress.</p>
          </header>

          {(profileError || logoutError || progressError || scoresError) && (
            <div className="notice" role="alert">
              {profileError || logoutError || progressError || scoresError}
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
              <span className="dashboard-metric-label">Completed levels</span>
              <strong>{completedCount}</strong>
              <span>Keep building your skills</span>
            </article>
            <article className="card dashboard-metric">
              <span className="dashboard-metric-label">In progress</span>
              <strong>{inProgressCount}</strong>
              <span>Pick up where you left off</span>
            </article>
            <article className="card dashboard-metric">
              <span className="dashboard-metric-label">Personal bests</span>
              <strong>{savedScoreCount}</strong>
              <span>Saved quiz records</span>
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
              <p className="eyebrow">Keep learning</p>
              <h2 id="next-step-heading">{nextLevel ? nextLevel.title : 'All levels complete!'}</h2>
              <p>{nextLevel ? nextLevel.description : 'You have completed every available level. Nice work!'}</p>
            </div>
            <Link className="button" to={nextLevel ? `/level/${nextLevel.id}` : '/'}>
              {nextLevel ? 'Continue learning' : 'Review levels'}
            </Link>
          </section>

          <section aria-labelledby="tutorials-heading">
            <div className="section-heading">
              <h2 id="tutorials-heading">Tutorials</h2>
            </div>
            <div className="level-list">
              {tutorials.map((tutorial) => (
                <article className="card level-card" key={tutorial.id}>
                  <div>
                    <h3>{tutorial.title}</h3>
                    <p>{tutorial.description}</p>
                  </div>
                  <div className="level-card-actions">
                    <Link className="button" to={`/tutorial/${tutorial.id}`}>Open tutorial</Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
