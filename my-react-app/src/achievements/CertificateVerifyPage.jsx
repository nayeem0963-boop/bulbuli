import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BrandMark from '../arcade/BrandMark.jsx'
import { getBadge } from '../data/badgesConfig.js'
import { formatDate } from '../dashboard/format.js'
import AchievementMedal from './AchievementMedal.jsx'
import { verifyCertificate } from './certificateStore.js'
import { SITE_LABEL } from './links.js'
import './achievements.css'

/**
 * /certificate/:token: the public "is this certificate real?" page (the QR code and the link on
 * every certificate open it). Anyone can view it, no sign-in.
 *
 * Everything shown comes from verify_certificate() on the server, which looks the token up and
 * returns only the certificate's public facts: never the email, account id, other badges or
 * profile. The name follows the learner's privacy setting. Nothing in the address can change
 * what's displayed: the token is only a lookup key, and a wrong one is simply "not recognised".
 */
export default function CertificateVerifyPage({ theme }) {
  const { token = '' } = useParams()
  const [answer, setAnswer] = useState({ token: null, data: null })

  useEffect(() => {
    let active = true
    verifyCertificate(token.toLowerCase()).then((data) => {
      if (active) setAnswer({ token, data })
    })
    return () => {
      active = false
    }
  }, [token])

  // keep these pages out of search engines (they're about children)
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  const result = answer.token === token && answer.data ? answer.data : { status: 'loading' }
  const { status } = result

  return (
    <div className="vfy-page" data-theme={theme}>
      <header className="vfy-header">
        <Link className="vfy-logo" to="/" aria-label="Bulbuli home">
          <BrandMark size={40} />
          <span>Bulbuli</span>
        </Link>
        <span className="vfy-header-tag">Certificate verification</span>
      </header>

      <main className="vfy-main" id="main">
        <h1 className="vfy-heading">Official Certificate Verification</h1>

        {status === 'loading' && (
          <section className="vfy-card vfy-card-wait" aria-busy="true">
            <p className="vfy-state" role="status"><span className="vfy-spinner" aria-hidden="true" /> Checking this certificate…</p>
          </section>
        )}

        {status === 'valid' && (
          <section className="vfy-card vfy-card-valid" aria-labelledby="vfy-status">
            <p id="vfy-status" className="vfy-banner vfy-banner-valid">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
              Valid certificate, issued by Bulbuli
            </p>
            <div className="vfy-grid">
              <AchievementMedal icon={result.badge_icon} category={getBadge(result.badge_id)?.category ?? 'mastery'} className="vfy-medal" label={`${result.badge_title} badge`} />
              <div className="vfy-facts">
                <p className="vfy-eyebrow">Certificate of Achievement</p>
                <h2 className="vfy-title">{result.badge_title}</h2>
                {result.badge_description && <p className="vfy-desc">{result.badge_description}</p>}
                <dl className="vfy-list">
                  <div>
                    <dt>Awarded to</dt>
                    <dd>{result.student_name || <span className="vfy-muted">Name hidden by the learner’s privacy setting</span>}</dd>
                  </div>
                  <div>
                    <dt>Award date</dt>
                    <dd><time dateTime={result.awarded_at}>{formatDate(result.awarded_at, 'en-GB')}</time></dd>
                  </div>
                  <div>
                    <dt>XP earned</dt>
                    <dd>{Number(result.xp_earned || 0).toLocaleString('en')} {result.xp_label}</dd>
                  </div>
                  <div>
                    <dt>Certificate ID</dt>
                    <dd className="vfy-code">{result.certificate_code}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>
        )}

        {status === 'revoked' && (
          <section className="vfy-card vfy-card-bad" aria-labelledby="vfy-status">
            <p id="vfy-status" className="vfy-banner vfy-banner-bad">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8 8l8 8M16 8l-8 8" /></svg>
              This certificate has been revoked
            </p>
            <p className="vfy-text">
              Certificate <strong className="vfy-code">{result.certificate_code}</strong>
              {result.badge_title ? <> ({result.badge_title})</> : null} was issued by Bulbuli but is no longer valid
              {result.revoked_at ? <> since {formatDate(result.revoked_at, 'en-GB')}</> : null}.
            </p>
          </section>
        )}

        {status === 'private' && (
          <section className="vfy-card vfy-card-neutral" aria-labelledby="vfy-status">
            <p id="vfy-status" className="vfy-banner vfy-banner-neutral">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
              This certificate is private
            </p>
            <p className="vfy-text">Its owner (or their parent or guardian) has turned off public verification for this certificate, so its details aren’t shown.</p>
          </section>
        )}

        {status === 'not_found' && (
          <section className="vfy-card vfy-card-bad" aria-labelledby="vfy-status">
            <p id="vfy-status" className="vfy-banner vfy-banner-bad">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5h.01" /></svg>
              Certificate not recognised
            </p>
            <p className="vfy-text">
              We couldn’t find a Bulbuli certificate for this link. Check that the whole address was copied, or scan the QR code on the
              certificate again. Certificates made outside Bulbuli can’t be verified here.
            </p>
          </section>
        )}

        {status === 'unavailable' && (
          <section className="vfy-card vfy-card-neutral" aria-labelledby="vfy-status">
            <p id="vfy-status" className="vfy-banner vfy-banner-neutral">Verification is unavailable right now</p>
            <p className="vfy-text">We couldn’t reach the Bulbuli certificate service. Please check your connection and try again in a little while.</p>
            <button type="button" className="ach-btn ach-btn-primary" onClick={() => window.location.reload()}>Try again</button>
          </section>
        )}

        <p className="vfy-footnote">
          Bulbuli certificates are issued to learners who earn achievements in Bulbuli’s learning games. To protect children’s
          privacy, this page never shows email addresses, account details or other activity.
        </p>
        <Link className="ach-btn ach-btn-ghost vfy-home" to="/">Explore learning games at {SITE_LABEL}</Link>
      </main>
    </div>
  )
}
