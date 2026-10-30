import { useEffect, useId, useState } from 'react'
import { useLocation } from 'react-router-dom'
import PlayerAvatar from '../avatars/PlayerAvatar.jsx'
import { useBadges } from '../badges/BadgesContext.jsx'
import CertificateModal from '../badges/CertificateModal.jsx'
import { useModalDialog } from '../badges/useModalDialog.js'
import { getBadge } from '../data/badgesConfig.js'
import { useReducedMotion } from '../shared/hooks/useReducedMotion.js'
import AchievementMedal from './AchievementMedal.jsx'
import { congratsFor, motivationFor } from './messages.js'
import ShareAchievementModal from './ShareAchievementModal.jsx'
import { useAchievement } from './useAchievement.js'
import { isPlayingGame } from './routes.js'
import './achievements.css'

// a fixed set of confetti pieces: [left %, delay s, duration s, colour, drift px, rotation deg]
const CONFETTI = Array.from({ length: 36 }, (_, i) => {
  const colors = ['#f59e0b', '#ec4899', '#22c55e', '#3b82f6', '#a855f7', '#facc15', '#f97316']
  return [(i * 37) % 100, ((i * 13) % 10) / 12, 2.2 + ((i * 7) % 9) / 6, colors[i % colors.length], ((i * 29) % 120) - 60, (i * 47) % 360]
})

function CelebrationDialog({ badge, unlockedAt, onClose, onCertificate, onShare }) {
  const dialogProps = useModalDialog(onClose)
  const titleId = useId()
  const descId = useId()
  const reduced = useReducedMotion()
  const { sheet, avatar, photoUrl, playerName } = useAchievement(badge, unlockedAt)

  return (
    <dialog {...dialogProps} className={`cel-dialog bdg-cat-${badge.category}`} aria-labelledby={titleId} aria-describedby={descId}>
      {!reduced && (
        <div className="cel-confetti" aria-hidden="true">
          {CONFETTI.map(([left, delay, duration, color, drift, rotate], i) => (
            <i
              key={i}
              style={{ left: `${left}%`, background: color, animationDelay: `${delay}s`, animationDuration: `${duration}s`, '--drift': `${drift}px`, '--rot': `${rotate}deg` }}
            />
          ))}
        </div>
      )}
      <div className="cel-body">
        <p className="cel-eyebrow">Achievement unlocked!</p>
        <div className="cel-hero">
          <span className="cel-rays" aria-hidden="true" />
          <AchievementMedal icon={badge.icon} category={badge.category} className="cel-medal" />
          <span className="cel-avatar" aria-hidden="true">
            <PlayerAvatar avatar={avatar} name={playerName} photoUrl={photoUrl} />
          </span>
        </div>
        <h2 id={titleId} className="cel-title">
          <span className="cel-congrats">{congratsFor(playerName)}</span>
          <span className="cel-badge">{badge.title}</span>
        </h2>
        <p className="cel-desc">{badge.description}</p>
        <p className="cel-xp">
          <span aria-hidden="true">★</span> {sheet.xpEarned.toLocaleString('en')} {sheet.xpLabel}
        </p>
        <p id={descId} className="cel-motivation">{motivationFor(badge)}</p>
        <div className="cel-actions">
          {badge.certificateEligible && (
            <button type="button" className="ach-btn ach-btn-gold" onClick={onCertificate} autoFocus>
              <span aria-hidden="true">🎓</span> View Certificate
            </button>
          )}
          <button type="button" className="ach-btn ach-btn-primary" onClick={onShare} autoFocus={!badge.certificateEligible}>
            <span aria-hidden="true">💌</span> Share My Achievement
          </button>
          <button type="button" className="ach-btn ach-btn-ghost" onClick={onClose}>
            Continue Learning
          </button>
        </div>
      </div>
    </dialog>
  )
}

/**
 * The big "Achievement unlocked!" moment, once per newly earned badge (queued by
 * BadgesProvider). While a game is being played only the small toast shows; the celebration
 * opens as soon as the player is on a page that isn't a game, so it never interrupts play.
 * Mount once inside the router.
 */
export default function AchievementCelebrations() {
  const { celebrations, dismissCelebration } = useBadges()
  const { pathname, search } = useLocation()
  const [followUp, setFollowUp] = useState(null) // { type: 'certificate' | 'share', badge, unlockedAt }

  const queue = celebrations.map((entry) => ({ ...entry, badge: getBadge(entry.badgeId) }))
  // a badge removed from badgesConfig.js: nothing to celebrate
  const stale = queue.find((entry) => !entry.badge)
  useEffect(() => {
    if (stale) dismissCelebration(stale.badgeId)
  }, [stale, dismissCelebration])

  const current = queue.find((entry) => entry.badge)
  const open = (type) => {
    setFollowUp({ type, badge: current.badge, unlockedAt: current.unlockedAt })
    dismissCelebration(current.badgeId) // seen: it won't come back
  }

  if (followUp?.type === 'certificate') {
    return (
      <CertificateModal
        badge={followUp.badge}
        unlockedAt={followUp.unlockedAt}
        onClose={() => setFollowUp(null)}
        onShare={() => setFollowUp({ ...followUp, type: 'share' })}
      />
    )
  }
  if (followUp?.type === 'share') {
    return <ShareAchievementModal badge={followUp.badge} unlockedAt={followUp.unlockedAt} onClose={() => setFollowUp(null)} />
  }
  if (!current || isPlayingGame(pathname, search)) return null

  return (
    <CelebrationDialog
      key={current.badgeId}
      badge={current.badge}
      unlockedAt={current.unlockedAt}
      onClose={() => dismissCelebration(current.badgeId)}
      onCertificate={() => open('certificate')}
      onShare={() => open('share')}
    />
  )
}
