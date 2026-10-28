import { useId } from 'react'
import { BADGE_CATEGORIES } from '../data/badgesConfig.js'
import { formatDate } from '../dashboard/format.js'
import { useModalDialog } from './useModalDialog.js'

/** Details for one unlocked badge, with the certificate button when the badge has one. */
export default function BadgeDetailModal({ badge, unlockedAt, howToEarn, onClose, onOpenCertificate }) {
  const dialogProps = useModalDialog(onClose)
  const titleId = useId()
  const descId = useId()

  return (
    <dialog {...dialogProps} className={`bdg-dialog bdg-cat-${badge.category}`} aria-labelledby={titleId} aria-describedby={descId}>
      <div className="bdg-dialog-body">
        <button type="button" className="bdg-dialog-x" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>

        <div className="bdg-dialog-hero">
          <span className="bdg-medal bdg-medal-lg" aria-hidden="true"><span>{badge.icon}</span></span>
          <span className="bdg-chip">{BADGE_CATEGORIES[badge.category]?.short}</span>
        </div>

        <h2 id={titleId} className="bdg-dialog-title">{badge.title}</h2>
        <p id={descId} className="bdg-dialog-desc">{badge.description}</p>

        <dl className="bdg-facts">
          <div>
            <dt>Unlocked</dt>
            <dd><time dateTime={unlockedAt}>{formatDate(unlockedAt)}</time></dd>
          </div>
          <div>
            <dt>Challenge</dt>
            <dd>{howToEarn}</dd>
          </div>
        </dl>

        <div className="bdg-dialog-actions">
          {badge.certificateEligible && (
            <button type="button" className="db-btn db-btn-primary" onClick={onOpenCertificate} autoFocus>
              <span aria-hidden="true">🎓</span> View &amp; Print Certificate
            </button>
          )}
          <button type="button" className="db-btn db-btn-ghost" onClick={onClose} autoFocus={!badge.certificateEligible}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  )
}
