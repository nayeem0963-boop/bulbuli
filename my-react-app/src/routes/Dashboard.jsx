import { useEffect, useId, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BrandMark from '../arcade/BrandMark.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import BadgesSection from '../badges/BadgesSection.jsx'
import AvatarPicker from '../avatars/AvatarPicker.jsx'
import PlayerAvatar from '../avatars/PlayerAvatar.jsx'
import { usePlayerAvatar } from '../avatars/usePlayerAvatar.js'
import '../avatars/avatars.css'
import { activityRows, describeSource, formatDate, formatNumber, timeAgo } from '../dashboard/format.js'
import { getGame } from '../games/registry.js'
import { levelProgress } from '../lib/levels.js'
import './Dashboard.css'

/*
 * /dashboard: a signed-in player's game progress (App.jsx sends guests to sign in first).
 * Data comes from their public.profiles row: avatar, username, xp, level, activities, stats.
 * Badges (src/badges/) sit between the summary cards and the game history.
 *
 * Styling: plain CSS in Dashboard.css (this project has no Tailwind). Class names are
 * prefixed `db-`, and every rule is scoped under `.db`, so global styles can't break it.
 * Each block notes the Tailwind utilities it mirrors.
 */

/* ---------- icons (inline SVG: crisp, no icon library needed) ---------- */
function Icon({ name }) {
  const paths = {
    star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
    trophy: (
      <>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
        <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
      </>
    ),
    gamepad: (
      <>
        <rect x="2" y="7" width="20" height="11" rx="5" />
        <path d="M7 11v3M5.5 12.5h3" />
        <circle cx="15.5" cy="11.5" r="1" fill="currentColor" />
        <circle cx="18" cy="13.5" r="1" fill="currentColor" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    moon: <path d="M20.2 15.6A8.5 8.5 0 0 1 8.4 3.8a8.5 8.5 0 1 0 11.8 11.8Z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    smile: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
      </>
    ),
    pencil: (
      <>
        <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
        <path d="m13.5 6.5 4 4" />
      </>
    ),
  }
  return (
    <svg className="db-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  )
}

/* ---------- header bar: logo left; All games, Dark mode, Log out right ---------- */
function DashboardHeader({ theme, onToggleTheme, onLogout, signingOut }) {
  const dark = theme === 'dark'
  return (
    <header className="db-header">
      <Link className="db-logo" to="/" aria-label="Bulbuli: back to the games">
        <BrandMark size={36} />
        <span>Bulbuli</span>
      </Link>
      <nav className="db-header-actions" aria-label="Dashboard">
        <Link className="db-btn db-btn-ghost" to="/">
          <span aria-hidden="true">‹</span> All games
        </Link>
        <button type="button" className="db-btn db-btn-ghost" onClick={onToggleTheme} aria-pressed={dark}>
          <Icon name={dark ? 'sun' : 'moon'} />
          {dark ? 'Light mode' : 'Dark mode'}
        </button>
        <button type="button" className="db-btn db-btn-dark" onClick={onLogout} disabled={signingOut}>
          {signingOut ? 'Logging out…' : 'Log out'}
        </button>
      </nav>
    </header>
  )
}

/* ---------- profile: avatar (pick a character) + level badge, name + Edit, level progress ---------- */
function ProfileSection({ displayName, username, progress, onSaveName }) {
  const { avatar, selectedId, photoUrl, context, chooseAvatar } = usePlayerAvatar()
  const [picking, setPicking] = useState(false)
  const [avatarNote, setAvatarNote] = useState(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [barWidth, setBarWidth] = useState(0)
  const inputId = useId()

  // fill the bar from 0 after mount, so it animates in
  useEffect(() => {
    const frame = requestAnimationFrame(() => setBarWidth(progress.percent))
    return () => cancelAnimationFrame(frame)
  }, [progress.percent])

  const save = async (event) => {
    event.preventDefault()
    const name = draft.trim()
    if (name.length < 2 || name.length > 32) {
      setError('Use 2 to 32 characters.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSaveName(name)
      setEditing(false)
    } catch (err) {
      setError(err?.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const openPicker = () => {
    setAvatarNote(null)
    setPicking(true)
  }

  const saveAvatar = async (id) => {
    const { synced } = await chooseAvatar(id)
    setPicking(false)
    setAvatarNote(synced ? null : { type: 'error', text: 'Saved on this device. It could not be saved to your account yet.' })
  }

  return (
    <section className="db-profile" aria-labelledby="db-name">
      <div className="db-profile-top">
        <div className="db-avatar-wrap">
          <button type="button" className="db-avatar" onClick={openPicker} aria-label={`Your avatar: ${avatar.name}. Change avatar`} title="Change avatar">
            <PlayerAvatar avatar={avatar} name={displayName} photoUrl={photoUrl} />
            <span className="db-avatar-edit" aria-hidden="true"><Icon name="pencil" /></span>
          </button>
          <span className="db-avatar-level" aria-label={`Level ${progress.level}`}>{progress.level}</span>
        </div>

        <div className="db-identity">
          {editing ? (
            <form className="db-name-form" onSubmit={save}>
              <label className="db-sr-only" htmlFor={inputId}>Your name</label>
              <input
                id={inputId}
                className="db-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={32}
                autoComplete="nickname"
                autoFocus
              />
              <button type="submit" className="db-btn db-btn-primary db-btn-sm" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="db-btn db-btn-ghost db-btn-sm" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
              {error && <p className="db-message db-message-error" role="alert">{error}</p>}
            </form>
          ) : (
            <div className="db-name-row">
              <h1 id="db-name" className="db-name">{displayName}</h1>
              <button
                type="button"
                className="db-btn db-btn-ghost db-btn-sm"
                onClick={() => {
                  setDraft(username ?? '')
                  setError('')
                  setEditing(true)
                }}
              >
                <Icon name="pencil" /> Edit
              </button>
              <button type="button" className="db-btn db-btn-ghost db-btn-sm" onClick={openPicker}>
                <Icon name="smile" /> Change avatar
              </button>
            </div>
          )}
          <p className="db-subtitle">Player profile</p>
          {avatarNote && <p className={`db-message db-message-${avatarNote.type}`} role="status">{avatarNote.text}</p>}
        </div>
      </div>

      <div className="db-progress">
        <div className="db-progress-labels">
          <span className="db-progress-level">Level {progress.level}</span>
          <span className="db-progress-xp">
            {formatNumber(progress.xp)} XP · {formatNumber(progress.xpToNextLevel)} to next level
          </span>
        </div>
        <div
          className="db-bar"
          role="progressbar"
          aria-label={`Progress to level ${progress.level + 1}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
        >
          <div className="db-bar-fill" style={{ width: `${barWidth}%` }} />
        </div>
      </div>

      {picking && (
        <AvatarPicker
          currentId={selectedId}
          name={displayName}
          photoUrl={photoUrl}
          context={context}
          onSave={saveAvatar}
          onClose={() => setPicking(false)}
        />
      )}
    </section>
  )
}

/* ---------- 4 summary cards ---------- */
function StatsGrid({ progress, activitiesCompleted, gamesPlayed, lastPlayedAt }) {
  const ago = timeAgo(lastPlayedAt)
  const stats = [
    { key: 'xp', icon: 'star', tone: 'amber', label: 'Total XP', value: formatNumber(progress.xp), note: `${formatNumber(progress.xpToNextLevel)} to level ${progress.level + 1}` },
    { key: 'level', icon: 'trophy', tone: 'purple', label: 'Current level', value: progress.level, note: `${progress.percent}% to next level` },
    { key: 'activities', icon: 'gamepad', tone: 'sky', label: 'Activities completed', value: formatNumber(activitiesCompleted), note: gamesPlayed === 1 ? 'in 1 game' : `across ${gamesPlayed} games` },
    { key: 'last', icon: 'clock', tone: 'emerald', label: 'Last played', value: ago ? ago[0].toUpperCase() + ago.slice(1) : 'Not yet', note: ago ? formatDate(lastPlayedAt) : 'Go play a game!' },
  ]
  return (
    <section className="db-stats" aria-label="Summary">
      {stats.map((stat) => (
        <article key={stat.key} className="db-stat">
          <span className={`db-stat-icon db-tone-${stat.tone}`}><Icon name={stat.icon} /></span>
          <h2 className="db-stat-label">{stat.label}</h2>
          <p className="db-stat-value">{stat.value}</p>
          <p className="db-stat-note">{stat.note}</p>
        </article>
      ))}
    </section>
  )
}

/* ---------- game history table ---------- */
function GameHistory({ stats }) {
  const rows = activityRows(stats)
  return (
    <section className="db-history" aria-labelledby="db-history-title">
      <h2 id="db-history-title" className="db-section-title">Game history</h2>

      {rows.length === 0 ? (
        <div className="db-empty">
          <span aria-hidden="true">🥚</span>
          <p>No games yet. Finish a game while signed in and it shows up here.</p>
          <Link className="db-btn db-btn-primary" to="/">Find a game</Link>
        </div>
      ) : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead>
              <tr>
                <th scope="col" className="db-col-game">Game</th>
                <th scope="col" className="db-col-center">XP</th>
                <th scope="col" className="db-col-center">Times played</th>
                <th scope="col" className="db-col-right">Last played</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                // registry game → its name, icon and link; 'guest-play' → "Guest stars";
                // anything else → a readable name from its id
                const source = describeSource(row.id, getGame(row.id))
                const ago = timeAgo(row.lastPlayedAt)
                return (
                  <tr key={row.id}>
                    <th scope="row" className="db-col-game">
                      <span className="db-game">
                        <span className={`db-game-icon db-tile-${source.color}`} aria-hidden="true">{source.icon}</span>
                        <span className="db-game-text">
                          {source.href
                            ? <Link className="db-game-name" to={source.href}>{source.title}</Link>
                            : <span className="db-game-name">{source.title}</span>}
                          {source.subtitle && <span className="db-game-sub">{source.subtitle}</span>}
                        </span>
                      </span>
                    </th>
                    <td className="db-col-center db-strong">{formatNumber(row.xp)}</td>
                    <td className="db-col-center">{formatNumber(row.plays)}</td>
                    <td className="db-col-right db-muted">
                      {ago ? <time dateTime={row.lastPlayedAt} title={formatDate(row.lastPlayedAt)}>{ago}</time> : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/* ---------- shown after a password-reset email link ---------- */
function PasswordPanel({ onSave }) {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState(null)
  const submit = async (event) => {
    event.preventDefault()
    if (password.length < 6) return setStatus({ type: 'error', text: 'Use at least 6 characters.' })
    try {
      await onSave(password)
      setPassword('')
      setStatus({ type: 'success', text: 'Password updated.' })
    } catch (error) {
      setStatus({ type: 'error', text: error?.message || 'Could not update the password.' })
    }
  }
  return (
    <form className="db-password" id="password" onSubmit={submit}>
      <h2 className="db-section-title">Choose a new password</h2>
      <div className="db-password-row">
        <label className="db-sr-only" htmlFor="db-new-password">New password</label>
        <input
          id="db-new-password"
          className="db-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="New password (6+ characters)"
          minLength={6}
          required
        />
        <button type="submit" className="db-btn db-btn-primary">Save password</button>
      </div>
      {status && (
        <p className={`db-message db-message-${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}>{status.text}</p>
      )}
    </form>
  )
}

/* ---------- the page ---------- */
export default function Dashboard({ session, theme, onToggleTheme }) {
  const navigate = useNavigate()
  const { hash } = useLocation()
  const {
    user, profile, profileLoading, profileError, refreshProfile, updateProfile,
    passwordRecovery, updatePassword, signOut,
  } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const handleLogout = async () => {
    setSigningOut(true)
    setLogoutError('')
    try {
      await signOut() // saves any XP still on its way first
      navigate('/', { replace: true })
    } catch (error) {
      console.error('Unable to log out of Pro Coder.', error)
      setLogoutError('You could not be logged out. Please try again.')
      setSigningOut(false)
    }
  }

  const meta = user?.user_metadata ?? {}
  const displayName = profile?.username || meta.full_name || meta.name || user?.email?.split('@')[0] || 'Player'

  let body
  if (profileLoading && !profile) {
    body = <p className="db-status" role="status">Loading your progress…</p>
  } else if (profileError && !profile) {
    body = (
      <div className="db-status" role="alert">
        <p>{profileError} Your games still work, and your XP is safe.</p>
        <button type="button" className="db-btn db-btn-ghost" onClick={refreshProfile}>Try again</button>
      </div>
    )
  } else if (profile) {
    const progress = levelProgress(profile.xp)
    const stats = profile.stats ?? {}
    body = (
      <>
        <ProfileSection
          displayName={displayName}
          username={profile.username}
          progress={progress}
          onSaveName={(username) => updateProfile({ username })}
        />
        <StatsGrid
          progress={progress}
          activitiesCompleted={profile.activities_completed ?? 0}
          gamesPlayed={Object.keys(stats).length}
          lastPlayedAt={profile.last_played_at}
        />
        <BadgesSection profile={profile} />
        <GameHistory stats={stats} />
      </>
    )
  }

  return (
    <div className="db-page">
      <div className="db">
        <DashboardHeader theme={theme} onToggleTheme={onToggleTheme} onLogout={handleLogout} signingOut={signingOut} />

        <main id="main">
          {logoutError && <p className="db-message db-message-error" role="alert">{logoutError}</p>}
          {(passwordRecovery || hash === '#password') && <PasswordPanel onSave={updatePassword} />}
          {body}

          <div className="db-footer">
            <p>
              Ready for more stars?
              {session?.user?.email && <span className="db-muted"> Signed in as {session.user.email}</span>}
            </p>
            <Link className="db-btn db-btn-primary" to="/">🎮 Play now</Link>
          </div>
        </main>
      </div>
    </div>
  )
}
