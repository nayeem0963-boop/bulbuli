import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BADGE_CATEGORIES, BADGES, getBadge } from '../data/badgesConfig.js'
import { formatDate, formatNumber } from '../dashboard/format.js'
import { getGame } from '../games/registry.js'
import { useBadges } from './BadgesContext.jsx'
import { badgeProgress, requirementText, snapshotFromProfile } from './engine.js'
import BadgeDetailModal from './BadgeDetailModal.jsx'
import CertificateModal from './CertificateModal.jsx'
import './badges.css'

const gameName = (id) => getGame(id)?.title.en
const FILTERS = [['all', 'All'], ...Object.entries(BADGE_CATEGORIES).map(([id, c]) => [id, c.short])]
const BADGE_HASH = /^#badge-([a-z0-9-]+)$/

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

function UnlockedCard({ badge, unlockedAt, onOpen }) {
  const date = formatDate(unlockedAt)
  return (
    <button
      type="button"
      className={`bdg-card bdg-unlocked bdg-cat-${badge.category}`}
      onClick={() => onOpen(badge.id)}
      aria-label={`${badge.title}. Unlocked ${date}.${badge.certificateEligible ? ' Has a certificate.' : ''} Open details`}
    >
      <span className="bdg-medal" aria-hidden="true"><span>{badge.icon}</span></span>
      <span className="bdg-title">{badge.title}</span>
      <span className="bdg-desc">{badge.description}</span>
      <span className="bdg-foot">
        <span className="bdg-date">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
          {date}
        </span>
        {badge.certificateEligible && <span className="bdg-cert-tag" title="Comes with a certificate">🎓</span>}
      </span>
    </button>
  )
}

function LockedCard({ badge, progress, howToEarn }) {
  return (
    <div className={`bdg-card bdg-locked bdg-cat-${badge.category}`}>
      <span className="bdg-medal" aria-hidden="true">
        <span>{badge.icon}</span>
        <span className="bdg-lock"><LockIcon /></span>
      </span>
      <span className="bdg-title">{badge.title}</span>
      <span className="bdg-desc">{howToEarn}</span>
      <span className="bdg-progress">
        <span
          className="bdg-track"
          role="progressbar"
          aria-label={`${badge.title}: ${formatNumber(progress.current)} of ${formatNumber(progress.target)} ${progress.unit}`}
          aria-valuemin={0}
          aria-valuemax={progress.target}
          aria-valuenow={progress.current}
        >
          <span className="bdg-fill" style={{ width: `${progress.percent}%` }} />
        </span>
        <span className="bdg-count">
          {formatNumber(progress.current)} / {formatNumber(progress.target)} {progress.unit}
        </span>
      </span>
    </div>
  )
}

/**
 * "Achievements & Badges" on the dashboard: every badge in src/data/badgesConfig.js,
 * unlocked ones in colour (click for details + certificate), locked ones greyed with progress.
 * /dashboard#badge-<id> opens that badge's details (the unlock toast links there).
 */
export default function BadgesSection({ profile, playerName, userId }) {
  const { unlockedById } = useBadges()
  const { hash, pathname } = useLocation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [openId, setOpenId] = useState(null)
  const [certificateId, setCertificateId] = useState(null)

  const items = useMemo(() => {
    const snapshot = snapshotFromProfile(profile)
    return BADGES.map((badge) => ({
      badge,
      entry: unlockedById.get(badge.id) ?? null,
      progress: badgeProgress(badge, snapshot),
    }))
  }, [profile, unlockedById])

  const unlockedCount = items.filter((item) => item.entry).length
  const certificates = items.filter((item) => item.entry && item.badge.certificateEligible).length
  const visible = filter === 'all' ? items : items.filter((item) => item.badge.category === filter)

  // deep link from the toast: /dashboard#badge-sky-explorer opens that badge
  const linkedId = hash.match(BADGE_HASH)?.[1]
  const activeId = openId ?? (linkedId && unlockedById.has(linkedId) ? linkedId : null)

  useEffect(() => {
    if (linkedId) document.getElementById('db-badges')?.scrollIntoView({ block: 'start' })
  }, [linkedId])

  const closeDetails = () => {
    setOpenId(null)
    if (linkedId) navigate(pathname, { replace: true })
  }

  const openBadge = activeId ? getBadge(activeId) : null
  const certBadge = certificateId ? getBadge(certificateId) : null

  return (
    <section className="bdg-section" id="db-badges" aria-labelledby="db-badges-title">
      <div className="bdg-head">
        <div>
          <h2 id="db-badges-title" className="db-section-title">Achievements &amp; Badges</h2>
          <p className="bdg-summary">
            <strong>{unlockedCount}</strong> of {BADGES.length} unlocked
            {certificates > 0 && <> · {certificates} {certificates === 1 ? 'certificate' : 'certificates'}</>}
          </p>
        </div>
        <div className="bdg-filters" role="group" aria-label="Show badges">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="bdg-filter"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bdg-meter" aria-hidden="true">
        <span style={{ width: `${Math.round((unlockedCount / BADGES.length) * 100)}%` }} />
      </div>

      <ul className="bdg-grid">
        {visible.map(({ badge, entry, progress }) => (
          <li key={badge.id}>
            {entry
              ? <UnlockedCard badge={badge} unlockedAt={entry.unlockedAt} onOpen={setOpenId} />
              : <LockedCard badge={badge} progress={progress} howToEarn={requirementText(badge, gameName)} />}
          </li>
        ))}
      </ul>

      {openBadge && unlockedById.has(openBadge.id) && (
        <BadgeDetailModal
          badge={openBadge}
          unlockedAt={unlockedById.get(openBadge.id).unlockedAt}
          howToEarn={requirementText(openBadge, gameName)}
          onClose={closeDetails}
          onOpenCertificate={() => {
            closeDetails()
            setCertificateId(openBadge.id)
          }}
        />
      )}

      {certBadge && unlockedById.has(certBadge.id) && (
        <CertificateModal
          playerName={playerName}
          badge={certBadge}
          unlockedAt={unlockedById.get(certBadge.id).unlockedAt}
          userId={userId}
          onClose={() => setCertificateId(null)}
        />
      )}
    </section>
  )
}
