import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { fullscreenElement, onFullscreenChange } from '../shared/lib/fullscreen.js'
import { useBadges } from './BadgesContext.jsx'
import './badges.css'

const SHOW_MS = 6500
const MAX_VISIBLE = 3

/** The element toasts render into: the full-screen game frame while a game is full screen, else <body>. */
function useToastHost() {
  const [host, setHost] = useState(() => (typeof document === 'undefined' ? null : fullscreenElement() ?? document.body))
  useEffect(() => onFullscreenChange(() => setHost(fullscreenElement() ?? document.body)), [])
  return host
}

function AchievementToast({ toast, onDismiss }) {
  const { badge } = toast
  const [paused, setPaused] = useState(false)
  const timer = useRef(null)

  // auto-hide; hovering or focusing the toast holds it open
  useEffect(() => {
    if (paused) return undefined
    timer.current = setTimeout(() => onDismiss(toast.key), SHOW_MS)
    return () => clearTimeout(timer.current)
  }, [paused, toast.key, onDismiss])

  return (
    <div
      className={`ach-toast bdg-cat-${badge.category}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="ach-medal" aria-hidden="true">
        <span>{badge.icon}</span>
        <i /><i /><i /><i /><i /><i />
      </span>
      <div className="ach-text">
        <p className="ach-eyebrow">Badge unlocked!</p>
        <p className="ach-title">{badge.title}</p>
        <p className="ach-desc">{badge.description}</p>
      </div>
      <div className="ach-actions">
        <Link className="ach-link" to={`/dashboard#badge-${badge.id}`} onClick={() => onDismiss(toast.key)}>
          {badge.certificateEligible ? 'Get certificate' : 'See badge'}
        </Link>
        <button type="button" className="ach-close" onClick={() => onDismiss(toast.key)} aria-label={`Dismiss ${badge.title}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
    </div>
  )
}

/**
 * Pops up "Badge unlocked!" when a player earns a badge, wherever they are (including inside a
 * full-screen game). Mount once inside the router; BadgesProvider decides when to show one.
 */
export default function AchievementToasts({ theme }) {
  const { toasts, dismissToast } = useBadges()
  const host = useToastHost()
  if (!host) return null

  return createPortal(
    // the live region is always there, so screen readers announce toasts as they arrive
    <div className="ach-stack" data-theme={theme} role="status" aria-live="polite">
      {toasts.slice(0, MAX_VISIBLE).map((toast) => (
        <AchievementToast key={toast.key} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>,
    host,
  )
}
