import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BADGE_CATEGORIES, BADGES, getBadge } from '../data/badgesConfig.js'
import { formatDate, formatNumber } from '../dashboard/format.js'
import { getGame } from '../games/registry.js'
import { useBadges } from './BadgesContext.jsx'
import { badgeProgress, requirementText, snapshotFromProfile } from './engine.js'
import BadgeDetailModal from './BadgeDetailModal.jsx'
import CertificateModal from './CertificateModal.jsx'
import CertificatesPanel from '../achievements/CertificatesPanel.jsx'
import ShareAchievementModal from '../achievements/ShareAchievementModal.jsx'
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

function UnlockedCard({ badge, unlockedAt, onOpen, onCertificate, onShare }) {
  const date = formatDate(unlockedAt)
  return (
    <div className={`bdg-card bdg-unlocked bdg-cat-${badge.category}`}>
      {/* the whole card opens the details; the small buttons sit above it */}
      <button
        type="button"
        className="bdg-card-open"
        onClick={() => onOpen(badge.id)}
        aria-label={`${badge.title}. Unlocked ${date}.${badge.certificateEligible ? ' Has a certificate.' : ''} Open details`}
      />
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
      <span className="bdg-card-actions">
        {badge.certificateEligible && (
          <button type="button" className="bdg-mini" onClick={() => onCertificate(badge.id)} aria-label={`View certificate: ${badge.title}`}>
            <span aria-hidden="true">🎓</span> Certificate
          </button>
        )}
        <button type="button" className="bdg-mini" onClick={() => onShare(badge.id)} aria-label={`Share achievement: ${badge.title}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>
          Share
        </button>
      </span>
    </div>
  )
}

/** The three most recently earned badges, each one tap from sharing. */
function RecentAchievements({ items, onOpen, onShare }) {
  const recent = items
    .filter((item) => item.entry)
    .sort((a, b) => Date.parse(b.entry.unlockedAt) - Date.parse(a.entry.unlockedAt))
    .slice(0, 3)
  if (recent.length === 0) return null
  return (
    <div className="bdg-recent">
      <h3 className="bdg-recent-title">Recently earned</h3>
      <ul className="bdg-recent-list">
        {recent.map(({ badge, entry }) => (
          <li key={badge.id} className={`bdg-recent-item bdg-cat-${badge.category}`}>
            <button type="button" className="bdg-recent-open" onClick={() => onOpen(badge.id)}>
              <span className="bdg-recent-icon" aria-hidden="true">{badge.icon}</span>
              <span className="bdg-recent-text">
                <span className="bdg-recent-name">{badge.title}</span>
                <span className="bdg-recent-date">{formatDate(entry.unlockedAt)}</span>
              </span>
            </button>
            <button type="button" className="bdg-mini" onClick={() => onShare(badge.id)} aria-label={`Share achievement: ${badge.title}`}>Share</button>
          </li>
        ))}
      </ul>
    </div>
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
 * unlocked ones in colour (details, certificate, share), locked ones greyed with progress and
 * no sharing controls. Then the recently earned strip and "My certificates" (history + privacy).
 * /dashboard#badge-<id> opens that badge's details (the unlock toast links there).
 */
export default function BadgesSection({ profile }) {
  const { unlockedById } = useBadges()
  const { hash, pathname } = useLocation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [openId, setOpenId] = useState(null)
  const [certificateId, setCertificateId] = useState(null)
  const [shareId, setShareId] = useState(null)

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
  const shareBadge = shareId ? getBadge(shareId) : null
  const openShare = (id) => {
    setCertificateId(null)
    setShareId(id)
  }

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

      <RecentAchievements items={items} onOpen={setOpenId} onShare={openShare} />

      <ul className="bdg-grid">
        {visible.map(({ badge, entry, progress }) => (
          <li key={badge.id}>
            {entry
              ? <UnlockedCard badge={badge} unlockedAt={entry.unlockedAt} onOpen={setOpenId} onCertificate={setCertificateId} onShare={openShare} />
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
          onShare={() => {
            closeDetails()
            openShare(openBadge.id)
          }}
        />
      )}

      {certBadge && unlockedById.has(certBadge.id) && (
        <CertificateModal
          badge={certBadge}
          unlockedAt={unlockedById.get(certBadge.id).unlockedAt}
          onClose={() => setCertificateId(null)}
          onShare={() => openShare(certBadge.id)}
        />
      )}

      {shareBadge && unlockedById.has(shareBadge.id) && (
        <ShareAchievementModal
          badge={shareBadge}
          unlockedAt={unlockedById.get(shareBadge.id).unlockedAt}
          onClose={() => setShareId(null)}
        />
      )}

      <CertificatesPanel onView={setCertificateId} onShare={openShare} />
    </section>
  )
}
