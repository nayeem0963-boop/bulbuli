import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { displayUrl } from '../achievements/links.js'
import { loadExporters, useAchievement } from '../achievements/useAchievement.js'
import { useModalDialog } from './useModalDialog.js'
import './certificate.css'

const PRINT_CLASS = 'bulbuli-printing-certificate'

function Icon({ name }) {
  const paths = {
    download: <><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>,
    print: <><path d="M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7z" /></>,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>,
    check: <path d="m5 12 5 5 9-10" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[name]}</svg>
}

/**
 * The certificate for one badge: preview, PDF download, print, share.
 *
 * The certificate is painted from real data (src/achievements/render/renderCertificate.js): the
 * player's dashboard avatar, their name, the badge medal, XP, award date, and, once the server
 * has issued it, the certificate ID with a real QR code and link to its public verification page.
 *
 *   Download PDF   a ≈300 dpi A4 landscape PDF made in the browser, with the QR code redrawn
 *                  as vector squares and the verification address as a clickable PDF link.
 *   Print          the browser's print dialog with only the certificate on one A4 landscape page
 *                  ("Save as PDF" there also keeps the link clickable).
 *
 * Rendered into <body> (a portal) so the print rules can hide the rest of the app in one line.
 */
export default function CertificateModal({ badge, unlockedAt, onClose, onShare }) {
  const dialogProps = useModalDialog(onClose)
  const titleId = useId()
  const { sheet, certState, avatar, photoUrl } = useAchievement(badge, unlockedAt)
  const [assets, setAssets] = useState(null)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState(null)
  const printImg = useRef(null)

  // paint (again) whenever what's printed changes; wait while the server is issuing it
  const paintKey = certState === 'issuing' ? '' : JSON.stringify([sheet, avatar?.id, photoUrl])
  const inputs = useRef(null)
  useEffect(() => {
    inputs.current = { sheet, avatar, photoUrl }
  })
  useEffect(() => {
    if (!paintKey) return undefined
    const { sheet, avatar, photoUrl } = inputs.current
    let active = true
    let objectUrl = ''
    ;(async () => {
      try {
        const ex = await loadExporters()
        const avatarArt = await ex.prepareAvatarArt({ avatar, photoUrl, name: sheet.studentName })
        const painted = await ex.certificateAssets({ sheet, avatarArt })
        if (!active) return
        objectUrl = URL.createObjectURL(painted.blob)
        setAssets(painted)
        setUrl(objectUrl)
      } catch (error) {
        console.error('[certificate] could not draw the certificate', error)
        if (active) setNote({ type: 'error', text: 'The certificate could not be drawn. Please try again.' })
      }
    })()
    return () => {
      active = false
      if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    }
  }, [paintKey])

  // tidy up if the modal is closed in the middle of printing
  useEffect(() => () => document.documentElement.classList.remove(PRINT_CLASS), [])

  const downloadPdf = async () => {
    if (!assets) return
    setBusy('pdf')
    setNote(null)
    try {
      const ex = await loadExporters()
      ex.downloadBlob(ex.certificatePdf(assets, sheet), ex.certificateFileName(sheet))
      setNote({ type: 'ok', text: 'Your certificate PDF is downloading.' })
    } catch (error) {
      console.error('[certificate] PDF failed', error)
      setNote({ type: 'error', text: 'The PDF could not be made. Try Print → Save as PDF instead.' })
    } finally {
      setBusy('')
    }
  }

  const print = async () => {
    const img = printImg.current
    if (img && !img.complete) await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve })
    const root = document.documentElement
    root.classList.add(PRINT_CLASS)
    const done = () => {
      root.classList.remove(PRINT_CLASS)
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    const previousTitle = document.title
    // the browser suggests this as the PDF file name
    document.title = `Bulbuli certificate - ${sheet.badgeTitle}`
    window.print()
    document.title = previousTitle
  }

  const status = {
    issued: { icon: 'check', tone: 'ok', text: <>Verified certificate · ID <strong>{sheet.code}</strong></> },
    issuing: { icon: 'info', tone: 'wait', text: 'Registering your certificate for online verification…' },
    unavailable: { icon: 'info', tone: 'warn', text: 'Online verification isn’t available right now, so this copy has no QR code. It’s still yours to keep and print!' },
  }[certState]
  const revoked = sheet.revoked

  return createPortal(
    <div className="cert-root">
      <dialog {...dialogProps} className="cert-dialog" aria-labelledby={titleId}>
        <div className="cert-toolbar">
          <div className="cert-toolbar-text">
            <h2 id={titleId} className="cert-toolbar-title">Your certificate</h2>
            <p className="cert-toolbar-sub">{sheet.badgeTitle}</p>
          </div>
          <div className="cert-toolbar-actions">
            <button type="button" className="cert-btn cert-btn-primary" onClick={downloadPdf} disabled={!assets || busy === 'pdf'} autoFocus>
              <Icon name="download" /> {busy === 'pdf' ? 'Making PDF…' : 'Download PDF'}
            </button>
            <button type="button" className="cert-btn" onClick={print} disabled={!assets}>
              <Icon name="print" /> Print
            </button>
            {onShare && (
              <button type="button" className="cert-btn" onClick={onShare}>
                <Icon name="share" /> Share
              </button>
            )}
            <button type="button" className="cert-btn" onClick={onClose}>Close</button>
          </div>
        </div>

        {(status || revoked) && (
          <p className={`cert-status cert-status-${revoked ? 'bad' : status.tone}`}>
            <Icon name={revoked ? 'info' : status.icon} />
            <span>{revoked ? 'This certificate has been revoked and is no longer valid.' : status.text}</span>
          </p>
        )}

        <div className="cert-stage">
          <div className="cert-sheet" aria-busy={!url}>
            {url ? (
              <img
                className="cert-preview"
                src={url}
                alt={`Certificate of Achievement presented to ${sheet.studentName} for earning ${sheet.badgeTitle}, awarded ${sheet.awardedLabel}${sheet.code ? `, certificate ID ${sheet.code}` : ''}.`}
              />
            ) : (
              <span className="cert-loading" role="status"><span aria-hidden="true" />Preparing your certificate…</span>
            )}
          </div>
          {sheet.verifyUrl && (
            <p className="cert-link">
              Verification link: <a href={sheet.verifyUrl} target="_blank" rel="noopener noreferrer">{displayUrl(sheet.verifyUrl)}</a>
            </p>
          )}
          {note && <p className={`cert-note cert-note-${note.type}`} role={note.type === 'error' ? 'alert' : 'status'}>{note.text}</p>}
        </div>
      </dialog>

      {/* print-only page: the full-resolution certificate, with real links over the QR code and URL */}
      {url && assets && (
        <div className="cert-print" aria-hidden="true">
          <img ref={printImg} src={url} alt="" />
          {assets.links.map((link) => (
            <a
              key={`${link.url}-${link.rect.x}`}
              href={link.url}
              tabIndex={-1}
              style={{
                left: `${(link.rect.x / assets.width) * 100}%`,
                top: `${(link.rect.y / assets.height) * 100}%`,
                width: `${(link.rect.w / assets.width) * 100}%`,
                height: `${(link.rect.h / assets.height) * 100}%`,
              }}
            >
              {link.url}
            </a>
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}
