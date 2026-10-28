import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import BrandMark from '../arcade/BrandMark.jsx'
import { formatDate } from '../dashboard/format.js'
import { certificateCode } from './engine.js'
import { useModalDialog } from './useModalDialog.js'
import './certificate.css'

const PRINT_CLASS = 'bulbuli-printing-certificate'

/**
 * A printable certificate for one badge.
 *
 * "Print / Save as PDF" opens the browser's print dialog; choosing "Save as PDF" there gives a
 * crisp, vector PDF (no html2canvas / jsPDF needed). certificate.css has the @media print rules:
 * while this dialog is printing, everything else on the page is hidden and the sheet fills one
 * A4 landscape page.
 *
 * Rendered into <body> (a portal) so the print rules can hide the rest of the app in one line.
 */
export default function CertificateModal({ playerName, badge, unlockedAt, userId, onClose }) {
  const dialogProps = useModalDialog(onClose)
  const titleId = useId()
  const patternId = useId().replace(/:/g, '')
  const code = certificateCode(userId, badge.id, unlockedAt)
  const issued = formatDate(unlockedAt, 'en-GB') // 28 Oct 2026: reads the same everywhere

  // tidy up if the modal is closed in the middle of printing
  useEffect(() => () => document.documentElement.classList.remove(PRINT_CLASS), [])

  const print = () => {
    const root = document.documentElement
    root.classList.add(PRINT_CLASS)
    const done = () => {
      root.classList.remove(PRINT_CLASS)
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    const previousTitle = document.title
    // the browser suggests this as the PDF file name
    document.title = `Bulbuli certificate - ${badge.title} - ${playerName}`
    window.print()
    document.title = previousTitle
  }

  return createPortal(
    <div className="cert-root">
      <dialog {...dialogProps} className="cert-dialog" aria-labelledby={titleId}>
        <div className="cert-toolbar">
          <p className="cert-toolbar-title">Your certificate</p>
          <div className="cert-toolbar-actions">
            <button type="button" className="cert-btn cert-btn-primary" onClick={print} autoFocus>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7z" /></svg>
              Print / Save as PDF
            </button>
            <button type="button" className="cert-btn" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="cert-stage">
          <article className="cert-sheet" aria-labelledby={titleId}>
            {/* official border: navy frame, guilloche band, gold inner rule, corner rosettes */}
            <svg className="cert-border" viewBox="0 0 297 210" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <pattern id={`${patternId}-g`} width="6" height="6" patternUnits="userSpaceOnUse">
                  <path d="M0 3 Q1.5 0 3 3 T6 3" fill="none" stroke="#1e3a8a" strokeWidth="0.28" />
                  <path d="M0 3 Q1.5 6 3 3 T6 3" fill="none" stroke="#b8860b" strokeWidth="0.28" />
                  <path d="M3 0 Q6 1.5 3 3 T3 6" fill="none" stroke="#1e3a8a" strokeOpacity="0.45" strokeWidth="0.2" />
                </pattern>
              </defs>
              <rect x="3" y="3" width="291" height="204" fill="none" stroke="#1b2a49" strokeWidth="1.6" />
              <path d="M5.5 5.5H291.5V204.5H5.5Z M14 14V196H283V14Z" fill={`url(#${patternId}-g)`} fillRule="evenodd" />
              <rect x="5.5" y="5.5" width="286" height="199" fill="none" stroke="#1b2a49" strokeWidth="0.5" />
              <rect x="14" y="14" width="269" height="182" fill="none" stroke="#c9a227" strokeWidth="0.9" />
              <rect x="16.5" y="16.5" width="264" height="177" fill="none" stroke="#c9a227" strokeWidth="0.3" />
              {[[14, 14], [283, 14], [14, 196], [283, 196]].map(([cx, cy]) => (
                <g key={`${cx}-${cy}`} transform={`translate(${cx} ${cy})`}>
                  <circle r="5.2" fill="#fffdf6" stroke="#c9a227" strokeWidth="0.6" />
                  <circle r="3.4" fill="none" stroke="#1b2a49" strokeWidth="0.35" />
                  <path d="M0-2.6 0.8-0.8 2.6 0 0.8 0.8 0 2.6-0.8 0.8-2.6 0-0.8-0.8Z" fill="#c9a227" />
                </g>
              ))}
            </svg>

            <div className="cert-content">
              <header className="cert-brand">
                <BrandMark size={64} />
                <div>
                  <p className="cert-brand-name">Bulbuli</p>
                  <p className="cert-brand-tag">Learning Games for Kids</p>
                </div>
              </header>

              <h2 id={titleId} className="cert-heading">Certificate of Achievement</h2>
              <p className="cert-line">This certificate is proudly presented to</p>
              <p className="cert-name">{playerName}</p>
              <p className="cert-line">for earning the badge</p>
              <p className="cert-badge"><span aria-hidden="true">{badge.icon}</span> {badge.title}</p>
              <p className="cert-desc">{badge.description}</p>

              <footer className="cert-foot">
                <div className="cert-sign">
                  <p className="cert-sign-value">{issued}</p>
                  <p className="cert-sign-label">Date awarded</p>
                </div>

                <div className="cert-seal" aria-hidden="true">
                  <svg viewBox="0 0 100 120">
                    <path d="M30 70 18 116l14-8 8 12 10-44Z" fill="#b91c1c" />
                    <path d="M70 70l12 46-14-8-8 12-10-44Z" fill="#991b1b" />
                    <path
                      d={Array.from({ length: 48 }, (_, i) => {
                        const a = (i / 48) * Math.PI * 2
                        const r = i % 2 ? 40 : 46
                        return `${i ? 'L' : 'M'}${(50 + r * Math.sin(a)).toFixed(2)} ${(50 - r * Math.cos(a)).toFixed(2)}`
                      }).join(' ') + 'Z'}
                      fill="#d4a017"
                    />
                    <circle cx="50" cy="50" r="36" fill="#f5d061" stroke="#a87b05" strokeWidth="1.5" />
                    <circle cx="50" cy="50" r="31" fill="none" stroke="#a87b05" strokeWidth="0.8" strokeDasharray="2 2" />
                  </svg>
                  <span className="cert-seal-icon">{badge.icon}</span>
                </div>

                <div className="cert-sign">
                  <p className="cert-sign-value cert-signature">Bulbuli Team</p>
                  <p className="cert-sign-label">Bulbuli Learning Team</p>
                </div>
              </footer>

              <p className="cert-verify">
                Certificate ID <strong>{code}</strong> · Issued by Bulbuli · bulbuli.org
              </p>
            </div>
          </article>
        </div>
      </dialog>
    </div>,
    document.body,
  )
}
