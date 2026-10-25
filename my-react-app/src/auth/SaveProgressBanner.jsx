import { useState } from 'react'
import { Link } from 'react-router-dom'
import { levelProgress } from '../lib/levels.js'
import { formatDigits } from '../utils/mathHeroText.js'
import { useAuth } from './AuthContext.jsx'
import { AUTH_TEXT } from './text.js'
import './auth.css'

const DISMISS_KEY = 'bulbuli.save-banner-dismissed'

function readDismissed() {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * The Play page's gentle nudge.
 * Guests: "Keep your stars!" with a sign-in button (dismissible for this visit).
 * Signed in: their level, saved XP and a link to the dashboard.
 * Never shown when Supabase isn't configured.
 */
export default function SaveProgressBanner({ language, localXp = 0 }) {
  const { isConfigured, user, profile, openAuthModal } = useAuth()
  const [dismissed, setDismissed] = useState(readDismissed)
  const text = AUTH_TEXT[language] ?? AUTH_TEXT.en

  if (!isConfigured) return null

  if (user) {
    if (!profile) return null
    const progress = levelProgress(profile.xp)
    return (
      <section className="save-banner is-saved" aria-label={text.savedText(formatDigits(progress.xp, language))}>
        <span className="save-banner-level" aria-hidden="true">{formatDigits(progress.level, language)}</span>
        <div className="save-banner-copy">
          <strong>{text.savedTitle(formatDigits(progress.level, language))}</strong>
          <span>{text.savedText(formatDigits(progress.xp, language))}</span>
          <span
            className="save-banner-bar"
            role="progressbar"
            aria-label={text.toNextLevel(formatDigits(progress.xpToNextLevel, language), formatDigits(progress.level + 1, language))}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
          >
            <span style={{ width: `${progress.percent}%` }} />
          </span>
        </div>
        <Link className="save-banner-button" to="/dashboard">{text.dashboardLink}</Link>
      </section>
    )
  }

  if (dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1')
    } catch { /* ignore */ }
  }

  return (
    <section className="save-banner" aria-labelledby="save-banner-title">
      <span className="save-banner-star" aria-hidden="true">⭐</span>
      <div className="save-banner-copy">
        <strong id="save-banner-title">{text.bannerTitle}</strong>
        <span>{text.bannerText(formatDigits(localXp, language), localXp > 0)}</span>
      </div>
      <button type="button" className="save-banner-button" onClick={() => openAuthModal({ reason: 'save-xp' })}>
        {text.bannerButton}
      </button>
      <button type="button" className="save-banner-dismiss" onClick={dismiss} aria-label={text.bannerDismiss}>
        <span aria-hidden="true">×</span>
      </button>
    </section>
  )
}
