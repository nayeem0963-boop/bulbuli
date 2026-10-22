import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient.js'
import TutorialCard from '../components/TutorialCard.jsx'
import { tutorialCatalog } from '../data/tutorialCatalog.js'
import { useTutorialProgress } from '../hooks/useTutorialProgress.js'
import { useComprehensiveExam } from '../hooks/useComprehensiveExam.js'
import { EXAM_CONFIGS } from '../utils/comprehensiveExam.js'
import { getCurrentStreak } from '../utils/gamification.js'
import { getTutorialCardAction } from '../utils/tutorialCardAction.js'
import ThemeToggle from '../components/ThemeToggle.jsx'

function formatJoinedDate(createdAt) {
  if (!createdAt) return 'Not available'

  const date = new Date(createdAt)
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

function SubjectExamCard({ examConfig, progress }) {
  const scorePercent = Math.round((progress.highScore / examConfig.questionCount) * 100)

  return (
    <article className={`card subject-exam-card subject-exam-${examConfig.id}`}>
      <div className="subject-exam-card-top">
        <span className="subject-exam-icon" aria-hidden="true">{examConfig.symbol}</span>
        {progress.completed && <span className="subject-exam-complete" aria-label="Certification earned">✓</span>}
      </div>
      <p className="eyebrow">{examConfig.eyebrow}</p>
      <h3>{examConfig.title}</h3>
      <p className="subject-exam-meta">{examConfig.questionCount} questions · {Math.round(examConfig.durationSeconds / 60)} minutes · {examConfig.passPercent}% to pass</p>
      <div
        className="subject-exam-progress"
        role="progressbar"
        aria-label={`${examConfig.title} best score`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={scorePercent}
      >
        <span style={{ width: `${scorePercent}%` }} />
      </div>
      <div className="subject-exam-card-footer">
        <span>{progress.completed ? `Certified · ${scorePercent}% best` : progress.attempts.length ? `${scorePercent}% best score` : 'Not attempted'}</span>
        <Link className="button-secondary" to={`/exams/${examConfig.id}`}>
          {progress.activeAttempt ? 'Resume exam' : progress.completed ? 'View result' : 'Take Exam'}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
      {progress.storageError && <p className="notice" role="alert">{progress.storageError}</p>}
    </article>
  )
}

function Dashboard({ session, theme, onToggleTheme }) {
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
  const examProgress = useComprehensiveExam(session.user.id)
  const subjectExamProgress = {
    html: useComprehensiveExam(session.user.id, EXAM_CONFIGS.html),
    css: useComprehensiveExam(session.user.id, EXAM_CONFIGS.css),
    javascript: useComprehensiveExam(session.user.id, EXAM_CONFIGS.javascript),
    github: useComprehensiveExam(session.user.id, EXAM_CONFIGS.github),
    react: useComprehensiveExam(session.user.id, EXAM_CONFIGS.react),
  }
  const totalExamXp = Object.values({ preparation: examProgress, ...subjectExamProgress })
    .reduce((total, progress) => total + (Number(progress.totalXp) || 0), 0)

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
      <div className="dashboard-layout">
        <aside className="card dashboard-sidebar" aria-label="Dashboard navigation">
          <Link className="dashboard-brand" to="/" aria-label="Bulbuli home">bulbuli<span>.</span></Link>
          <nav className="dashboard-nav" aria-label="Primary navigation">
            <a className="dashboard-nav-link is-current" href="#overview" aria-current="page">
              <span className="dashboard-nav-icon" aria-hidden="true">⌂</span>Overview
            </a>
            <Link className="dashboard-nav-link" to="/developer">
              <span className="dashboard-nav-icon" aria-hidden="true">▤</span>Developer Hub
            </Link>
            <Link className="dashboard-nav-link" to="/">
              <span className="dashboard-nav-icon" aria-hidden="true">★</span>Games
            </Link>
            <a className="dashboard-nav-link" href="#profile">
              <span className="dashboard-nav-icon" aria-hidden="true">◉</span>Profile
            </a>
          </nav>
          <div className="dashboard-sidebar-footer">
            <a className="dashboard-sidebar-user" href="#profile">
              <div className="dashboard-avatar dashboard-avatar-small" aria-hidden="true">
                {avatarUrl && !avatarFailed
                  ? <img src={avatarUrl} alt="" onError={() => setAvatarFailed(true)} />
                  : initials}
              </div>
              <div>
                <strong>{fullName}</strong>
                <span>{email}</span>
              </div>
            </a>
            <span className="dashboard-sidebar-caption">Your learning account</span>
          </div>
        </aside>

        <div className="dashboard-workspace">
          <header className="dashboard-workspace-header" id="overview">
            <div className="dashboard-heading">
              {!userActivity && <p className="eyebrow">Your learning space</p>}
              <h1>{userActivity ? 'Your learning overview' : `Welcome back, ${fullName}`}</h1>
              <p>Five small steps can take you a long way. Pick up where you left off.</p>
            </div>
            <div className="dashboard-header-actions" aria-label="Account controls">
              <ThemeToggle
                theme={theme}
                onToggleTheme={onToggleTheme}
                className="theme-toggle dashboard-theme-toggle"
              />
              <button
                type="button"
                className="button-secondary dashboard-logout"
                onClick={handleLogout}
                disabled={signingOut}
              >
                <span aria-hidden="true">↪</span>{signingOut ? 'Logging out…' : 'Logout'}
              </button>
            </div>
          </header>

          <main className="dashboard-main">

          {(profileError || logoutError || tutorialProgressError || examProgress.storageError) && (
            <div className="notice" role="alert">
              {profileError || logoutError || tutorialProgressError || examProgress.storageError}
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
              <strong>{(Number(gamification.totalXp) || 0) + totalExamXp}<small> XP</small></strong>
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

          <section className="card dashboard-exam-overview" aria-labelledby="dashboard-exam-heading">
            <div className="dashboard-exam-copy">
              <p className="eyebrow">Featured capstone · 15 minutes · 80% to pass</p>
              <h2 id="dashboard-exam-heading">Frontend Developer Preparation</h2>
              <p>
                {examProgress.completed
                  ? `Passed · personal best ${examProgress.highScore}/${EXAM_CONFIGS.preparation.questionCount}. Keep your achievement shining.`
                  : examProgress.attempts.length
                    ? `${examProgress.attempts.length} ${examProgress.attempts.length === 1 ? 'attempt' : 'attempts'} · high score ${examProgress.highScore}/${EXAM_CONFIGS.preparation.questionCount} · ${Math.ceil(EXAM_CONFIGS.preparation.questionCount * EXAM_CONFIGS.preparation.passPercent / 100)} correct to pass.`
                    : '50 questions across HTML, CSS, JavaScript, GitHub, and React. Can you reach 80%?'}
              </p>
            </div>
            {examProgress.completed && <span className="dashboard-exam-badge" aria-label="Exam completed">🏆</span>}
            <Link className="button" to="/exam">
              {examProgress.completed ? 'View achievement' : examProgress.activeAttempt ? 'Resume exam' : 'Start preparation'}
              <span aria-hidden="true">→</span>
            </Link>
          </section>

          <section className="dashboard-subject-exams" aria-labelledby="subject-exams-heading">
            <div className="tutorial-section-heading">
              <div>
                <p className="eyebrow">Focused practice · individual credentials</p>
                <h2 id="subject-exams-heading">🎯 Subject Exams &amp; Certifications</h2>
              </div>
            </div>
            <div className="subject-exam-grid">
              {Object.values(EXAM_CONFIGS).filter((examConfig) => examConfig.tutorialId).map((examConfig) => (
                <SubjectExamCard
                  key={examConfig.id}
                  examConfig={examConfig}
                  progress={subjectExamProgress[examConfig.id]}
                />
              ))}
            </div>
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
                    action={getTutorialCardAction(tutorial, result, started, attempt?.currentIndex)}
                    to={`/tutorials/${tutorial.id}`}
                  />
                )
              })}
            </div>
          </section>
          </main>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
