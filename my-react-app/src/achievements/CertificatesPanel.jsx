import { useId, useState } from 'react'
import { getBadge } from '../data/badgesConfig.js'
import { formatDate } from '../dashboard/format.js'
import { useBadges } from '../badges/BadgesContext.jsx'
import { useCertificates } from './CertificatesContext.jsx'
import { NAME_DISPLAY_OPTIONS } from './privacy.js'
import { loadExporters, useAchievement } from './useAchievement.js'
import './achievements.css'

function CertificateRow({ badge, unlockedAt, onView, onShare }) {
  const { sheet, certificate, certState, avatar, photoUrl } = useAchievement(badge, unlockedAt)
  const { setPublic } = useCertificates()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const downloadPdf = async () => {
    setBusy('pdf')
    setError('')
    try {
      const ex = await loadExporters()
      const avatarArt = await ex.prepareAvatarArt({ avatar, photoUrl, name: sheet.studentName })
      ex.downloadBlob(await ex.certificatePdfBlob({ sheet, avatarArt }), ex.certificateFileName(sheet))
    } catch (err) {
      console.error('[certificates] PDF failed', err)
      setError('The PDF could not be made. Open the certificate and use Print instead.')
    } finally {
      setBusy('')
    }
  }

  const togglePublic = async () => {
    setBusy('public')
    setError('')
    try {
      await setPublic(certificate.id, !certificate.isPublic)
    } catch {
      setError('Could not change the public link. Please try again.')
    } finally {
      setBusy('')
    }
  }

  return (
    <li className={`crt-row bdg-cat-${badge.category}`}>
      <span className="crt-icon" aria-hidden="true">{badge.icon}</span>
      <div className="crt-main">
        <p className="crt-title">{sheet.badgeTitle}</p>
        <p className="crt-meta">
          <span>Awarded <time dateTime={sheet.awardedAt}>{formatDate(sheet.awardedAt)}</time></span>
          <span className="crt-code">
            {certState === 'issued' && <>ID {sheet.code}</>}
            {certState === 'issuing' && 'Registering…'}
            {certState === 'unavailable' && 'Not yet verifiable'}
          </span>
          {certificate?.revokedAt && <span className="crt-revoked">Revoked</span>}
        </p>
        {certificate && !certificate.revokedAt && (
          <label className="crt-public">
            <input type="checkbox" checked={certificate.isPublic} onChange={togglePublic} disabled={busy === 'public'} />
            <span>Public verification link {certificate.isPublic ? 'on' : 'off'}</span>
          </label>
        )}
        {error && <p className="db-message db-message-error" role="alert">{error}</p>}
      </div>
      <div className="crt-actions">
        <button type="button" className="db-btn db-btn-ghost db-btn-sm" onClick={() => onView(badge.id)}>View</button>
        <button type="button" className="db-btn db-btn-ghost db-btn-sm" onClick={downloadPdf} disabled={busy === 'pdf' || certState === 'issuing'}>
          {busy === 'pdf' ? 'Making…' : 'PDF'}
        </button>
        <button type="button" className="db-btn db-btn-primary db-btn-sm" onClick={() => onShare(badge.id)}>Share</button>
      </div>
    </li>
  )
}

function PrivacySettings() {
  const { status, nameDisplay, setNameDisplay } = useCertificates()
  const [saving, setSaving] = useState('')
  const [note, setNote] = useState(null)
  const groupId = useId()

  const choose = async (mode) => {
    if (mode === nameDisplay) return
    setSaving(mode)
    setNote(null)
    try {
      await setNameDisplay(mode)
      setNote({ type: 'success', text: 'Saved.' })
    } catch {
      setNote({ type: 'error', text: 'Could not save. Please try again.' })
    } finally {
      setSaving('')
    }
  }

  return (
    <div className="crt-privacy" role="group" aria-labelledby={groupId}>
      <h3 id={groupId} className="crt-subtitle">Sharing &amp; privacy</h3>
      <p className="crt-help">
        For parents and guardians: choose how this learner’s name appears on public certificate pages and share pictures.
        The printed certificate always shows the full name. Nothing is ever posted automatically.
      </p>
      <div className="crt-options">
        {NAME_DISPLAY_OPTIONS.map((option) => (
          <label key={option.id} className="crt-option">
            <input
              type="radio"
              name={`${groupId}-name`}
              value={option.id}
              checked={nameDisplay === option.id}
              onChange={() => choose(option.id)}
              disabled={status !== 'ready' || Boolean(saving)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {status === 'missing' && (
        <p className="crt-help">Certificate verification isn’t switched on for this site yet, so these settings can’t be saved.</p>
      )}
      {note && <p className={`db-message db-message-${note.type}`} role="status">{note.text}</p>}
    </div>
  )
}

/**
 * "My certificates" on the dashboard: one row per earned certificate (view, PDF, share, public
 * link on/off), newest first, plus the privacy setting. Reads the same unlocked badges and issued
 * certificates as everything else, so it never creates a duplicate.
 */
export default function CertificatesPanel({ onView, onShare }) {
  const { unlocked } = useBadges()
  const rows = unlocked
    .map((entry) => ({ entry, badge: getBadge(entry.badgeId) }))
    .filter(({ badge }) => badge?.certificateEligible)
    .sort((a, b) => Date.parse(b.entry.unlockedAt) - Date.parse(a.entry.unlockedAt))

  return (
    <section className="crt-section" aria-labelledby="db-certs-title">
      <h2 id="db-certs-title" className="db-section-title">My certificates</h2>
      {rows.length === 0 ? (
        <p className="crt-empty">
          <span aria-hidden="true">🎓</span> Earn a badge marked 🎓 and its certificate will be kept here, ready to print or share.
        </p>
      ) : (
        <ul className="crt-list">
          {rows.map(({ entry, badge }) => (
            <CertificateRow key={badge.id} badge={badge} unlockedAt={entry.unlockedAt} onView={onView} onShare={onShare} />
          ))}
        </ul>
      )}
      <PrivacySettings />
    </section>
  )
}
