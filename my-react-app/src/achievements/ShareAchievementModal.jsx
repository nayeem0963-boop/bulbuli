import { useEffect, useId, useRef, useState } from 'react'
import { canNativeShare, copyText, nativeShare } from '../buddies/shareActions.js'
import { useModalDialog } from '../badges/useModalDialog.js'
import { displayUrl } from './links.js'
import { defaultShareMessage, motivationFor } from './messages.js'
import { mayShareAvatar, NAME_DISPLAY_OPTIONS, publicName } from './privacy.js'
import { loadExporters, useAchievement } from './useAchievement.js'
import './achievements.css'

function Icon({ name }) {
  const paths = {
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></>,
    pdf: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M12 18v-6m0 6-2.5-2.5M12 18l2.5-2.5" /></>,
    link: <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></>,
    copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></>,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
    x: <path d="M6 6l12 12M18 6 6 18" />,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[name]}</svg>
}

/**
 * "Share My Achievement": a panel with every way to share one earned badge. Nothing is ever
 * posted automatically; each button does one thing the player chose.
 *
 *   1. Share…            the device's share sheet (Web Share API), with the picture when the
 *                        browser can share files; hidden when the browser has no share sheet
 *   2. Download PDF      the certificate (badges that have one)
 *   3. Download image    the 1200 × 1200 achievement picture (PNG)
 *   4. Copy link         the public verification link (or the site, when there's no public link)
 *   5. Copy message      the friendly message, which the player can edit first
 *
 * The picture follows the player's privacy setting (src/achievements/privacy.js): only the
 * public form of their name, and their avatar only when it's a cartoon (or their full name is
 * shown anyway). No email, account id or other personal data goes anywhere.
 */
export default function ShareAchievementModal({ badge, unlockedAt, onClose }) {
  const dialogProps = useModalDialog(onClose)
  const titleId = useId()
  const messageId = useId()
  const linkId = useId()
  const { sheet, certState, certificate, avatar, photoUrl, nameDisplay, shareLink } = useAchievement(badge, unlockedAt)
  const shownName = publicName(sheet.studentName, nameDisplay)
  const withAvatar = mayShareAvatar(avatar, nameDisplay)
  const motivation = motivationFor(badge)

  // the pre-written message follows the link (the certificate may be issued while the panel is
  // open) until the player edits it
  const [draft, setDraft] = useState(null)
  const message = draft ?? defaultShareMessage({ badge, link: shareLink })
  const [image, setImage] = useState(null) // { blob, url }
  const [busy, setBusy] = useState('')
  const [status, setStatus] = useState(null)

  const imageKey = certState === 'issuing' ? '' : JSON.stringify([sheet, shownName, withAvatar && avatar?.id, shareLink])
  const inputs = useRef(null)
  useEffect(() => {
    inputs.current = { sheet, avatar, photoUrl, withAvatar, shownName, motivation, shareLink }
  })
  useEffect(() => {
    if (!imageKey) return undefined
    const { sheet, avatar, photoUrl, withAvatar, shownName, motivation, shareLink } = inputs.current
    let active = true
    let url = ''
    ;(async () => {
      try {
        const ex = await loadExporters()
        const avatarArt = withAvatar ? await ex.prepareAvatarArt({ avatar, photoUrl, name: sheet.studentName }) : null
        const blob = await ex.shareImageBlob({ sheet, avatarArt, publicName: shownName, message: motivation, link: shareLink })
        if (!active) return
        url = URL.createObjectURL(blob)
        setImage({ blob, url })
      } catch (error) {
        console.error('[share] could not draw the achievement picture', error)
        if (active) setStatus({ type: 'error', text: 'The picture could not be made. You can still copy the link.' })
      }
    })()
    return () => {
      active = false
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }, [imageKey]) // imageKey covers sheet, name, avatar and link

  const say = (type, text) => setStatus({ type, text })
  const fileBase = `Bulbuli-Achievement-${sheet.badgeTitle.replace(/[^\w]+/g, '-')}`
  const nativeAvailable = canNativeShare({ title: 'Bulbuli', text: message })

  const shareNative = async () => {
    setBusy('share')
    try {
      const title = `${sheet.badgeTitle} on Bulbuli`
      const file = image ? new File([image.blob], `${fileBase}.png`, { type: 'image/png' }) : null
      const withFile = file ? { files: [file], title, text: message } : null
      const data = withFile && canNativeShare(withFile) ? withFile : { title, text: message }
      const result = await nativeShare(data)
      if (result === 'shared') say('ok', 'Shared! Thanks for spreading the joy of learning.')
      else if (result === 'failed') say('error', 'Sharing didn’t work here. Try copying the link or downloading the picture.')
    } finally {
      setBusy('')
    }
  }

  const downloadImage = async () => {
    if (!image) return
    const ex = await loadExporters()
    ex.downloadBlob(image.blob, `${fileBase}.png`)
    say('ok', 'Your achievement picture is downloading.')
  }

  const downloadPdf = async () => {
    setBusy('pdf')
    try {
      const ex = await loadExporters()
      const avatarArt = await ex.prepareAvatarArt({ avatar, photoUrl, name: sheet.studentName })
      ex.downloadBlob(await ex.certificatePdfBlob({ sheet, avatarArt }), ex.certificateFileName(sheet))
      say('ok', 'Your certificate PDF is downloading.')
    } catch (error) {
      console.error('[share] PDF failed', error)
      say('error', 'The PDF could not be made. Please try again.')
    } finally {
      setBusy('')
    }
  }

  const copy = async (value, what) => {
    const ok = await copyText(value)
    say(ok ? 'ok' : 'error', ok ? `${what} copied!` : `Couldn’t copy. Select the ${what.toLowerCase()} and copy it yourself.`)
  }

  const nameLabel = NAME_DISPLAY_OPTIONS.find((option) => option.id === nameDisplay)?.label ?? 'First name only'
  const linkIsCertificate = Boolean(certificate?.isPublic && !certificate?.revokedAt && shareLink.includes('/certificate/'))

  return (
    <dialog {...dialogProps} className={`shr-dialog bdg-cat-${badge.category}`} aria-labelledby={titleId}>
      <div className="shr-body">
        <button type="button" className="shr-x" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        <h2 id={titleId} className="shr-title">Share my achievement</h2>
        <p className="shr-sub">{sheet.badgeTitle} · sharing is always your choice</p>

        <div className="shr-grid">
          <figure className="shr-preview">
            {image
              ? <img src={image.url} alt={`Achievement picture: ${shownName || 'I'} earned ${sheet.badgeTitle}, ${sheet.xpEarned.toLocaleString('en')} ${sheet.xpLabel}.`} />
              : <span className="shr-preview-wait" role="status"><span aria-hidden="true" />Making your picture…</span>}
            <figcaption className="shr-privacy">
              <Icon name="lock" />
              <span>
                Picture shows: <strong>{shownName || 'no name'}</strong>{withAvatar ? ' and your avatar' : ''}.
                {' '}Name setting: {nameLabel}. A grown-up can change this under <em>Sharing &amp; privacy</em> on your dashboard.
              </span>
            </figcaption>
          </figure>

          <div className="shr-side">
            <div className="shr-actions">
              {nativeAvailable && (
                <button type="button" className="shr-btn shr-btn-primary" onClick={shareNative} disabled={busy === 'share'}>
                  <Icon name="share" /> {busy === 'share' ? 'Opening…' : 'Share…'}
                </button>
              )}
              {badge.certificateEligible && (
                <button type="button" className="shr-btn" onClick={downloadPdf} disabled={busy === 'pdf' || certState === 'issuing'}>
                  <Icon name="pdf" /> {busy === 'pdf' ? 'Making PDF…' : 'Download PDF'}
                </button>
              )}
              <button type="button" className="shr-btn" onClick={downloadImage} disabled={!image}>
                <Icon name="image" /> Download image
              </button>
            </div>
            {!nativeAvailable && <p className="shr-hint">This browser can’t open a share menu, so copy the link or download the picture instead.</p>}

            <label className="shr-label" htmlFor={linkId}>{linkIsCertificate ? 'Certificate verification link' : 'Link'}</label>
            <div className="shr-copyrow">
              <input id={linkId} className="shr-input" value={displayUrl(shareLink)} readOnly onFocus={(e) => e.target.select()} />
              <button type="button" className="shr-btn shr-btn-sm" onClick={() => copy(shareLink, 'Link')}><Icon name="link" /> Copy link</button>
            </div>
            {certificate && !certificate.isPublic && (
              <p className="shr-hint">This certificate’s public link is turned off, so the Bulbuli website link is shared instead.</p>
            )}

            <label className="shr-label" htmlFor={messageId}>Message (you can change it)</label>
            <textarea
              id={messageId}
              className="shr-input shr-message"
              value={message}
              rows={4}
              maxLength={500}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="button" className="shr-btn shr-btn-sm shr-btn-wide" onClick={() => copy(message, 'Message')}><Icon name="copy" /> Copy message</button>

            <p className={`shr-status${status ? ` shr-status-${status.type}` : ''}`} role="status" aria-live="polite">{status?.text ?? ''}</p>
          </div>
        </div>
      </div>
    </dialog>
  )
}
