import { useEffect, useId, useRef, useState } from 'react'
import { fullInvitation, shareMessage, shareTitle } from './shareMessages.js'
import { inviteUrl } from './shareLinks.js'
import { canNativeShare, copyText, nativeShare } from './shareActions.js'
import { BUDDIES_TEXT } from './text.js'
import './buddies.css'

const INVITE_KINDS = ['general', 'play-learn', 'build-create']
const KIND_ICONS = { general: '🐦', 'play-learn': '🎮', 'build-create': '🚀' }

/**
 * The share dialog. Home page: pick a General, Play & Learn or Build & Create invitation.
 * Game: `game = { title, url }` shares that one game. Either way the player can open the
 * device's share sheet (where the browser has one), copy the message with its link, or copy just
 * the link. A native <dialog>: Esc closes it, focus stays inside, and it shows above full screen.
 */
export default function BuddyShareDialog({ open, onClose, language = 'en', game = null, initialKind = 'general' }) {
  const text = BUDDIES_TEXT[language] ?? BUDDIES_TEXT.en
  const dialog = useRef(null)
  const id = useId()
  const [kind, setKind] = useState(game ? 'game' : initialKind)
  const [status, setStatus] = useState({ tone: '', message: '' })
  const [busy, setBusy] = useState(false)

  const shareKind = game ? 'game' : kind
  const url = game ? game.url : inviteUrl(kind)
  const message = shareMessage(shareKind, language)
  const data = { title: shareTitle(shareKind, game?.title), text: message, url }
  const nativeAvailable = canNativeShare(data)

  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (open && !node.open) {
      if (typeof node.showModal === 'function') node.showModal()
      else node.setAttribute('open', '')
    } else if (!open && node.open) {
      node.close()
    }
  }, [open])

  // closing clears the last message, so the next opening starts fresh
  const close = () => {
    setStatus({ tone: '', message: '' })
    onClose()
  }

  const say = (tone, key) => setStatus({ tone, message: text.status[key] })

  async function run(action) {
    if (busy) return
    setBusy(true)
    try { await action() } finally { setBusy(false) }
  }

  const onShare = () => run(async () => {
    const result = await nativeShare(data)
    if (result === 'shared') say('ok', 'ready')
    else if (result === 'cancelled') say('info', 'cancelled')
    else say('error', 'shareFailed')
  })
  const onCopyMessage = () => run(async () => {
    const copied = await copyText(fullInvitation(message, url))
    say(copied ? 'ok' : 'error', copied ? 'ready' : 'messageCopyFailed')
  })
  const onCopyLink = () => run(async () => {
    const copied = await copyText(url)
    say(copied ? 'ok' : 'error', copied ? 'linkCopied' : 'copyFailed')
  })

  const pick = (next) => {
    setKind(next)
    setStatus({ tone: '', message: '' })
  }

  return (
    <dialog
      ref={dialog}
      className="buddy-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-intro`}
      lang={language}
      onClose={close}
      onCancel={(event) => { event.preventDefault(); close() }}
      // a click on the dimmed backdrop (the dialog element itself, outside its panel) closes it
      onClick={(event) => { if (event.target === dialog.current) close() }}
    >
      <div className="buddy-dialog-panel">
        <header className="buddy-dialog-head">
          <h2 id={`${id}-title`}>{game ? text.gameDialogTitle(game.title) : text.dialogTitle}</h2>
          <button type="button" className="buddy-dialog-x" onClick={close} aria-label={text.close} title={text.close}>
            <span aria-hidden="true">✕</span>
          </button>
        </header>
        <p id={`${id}-intro`} className="buddy-dialog-intro">{game ? text.gameDialogIntro : text.dialogIntro}</p>

        {!game && (
          <fieldset className="buddy-options">
            <legend>{text.pickLabel}</legend>
            {INVITE_KINDS.map((option) => (
              <label key={option} className={`buddy-option${kind === option ? ' is-picked' : ''}`}>
                <input
                  type="radio"
                  name={`${id}-kind`}
                  value={option}
                  checked={kind === option}
                  onChange={() => pick(option)}
                />
                <span className="buddy-option-icon" aria-hidden="true">{KIND_ICONS[option]}</span>
                <span className="buddy-option-copy">
                  <span className="buddy-option-label">{text.options[option].label}</span>
                  <span className="buddy-option-hint">{text.options[option].hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <div className="buddy-preview">
          <p className="buddy-preview-label" id={`${id}-message-label`}>{text.messageLabel}</p>
          <p className="buddy-preview-message" aria-labelledby={`${id}-message-label`}>{message}</p>
          <label className="buddy-preview-label" htmlFor={`${id}-link`}>{text.linkLabel}</label>
          <input
            id={`${id}-link`}
            className="buddy-link-field"
            type="text"
            value={url}
            readOnly
            dir="ltr"
            onFocus={(event) => event.target.select()}
          />
        </div>

        <div className="buddy-actions">
          {nativeAvailable && (
            <button type="button" className="buddy-button is-primary" onClick={onShare} disabled={busy}>
              <span aria-hidden="true">📤</span> {text.share}
            </button>
          )}
          <button type="button" className={`buddy-button${nativeAvailable ? '' : ' is-primary'}`} onClick={onCopyMessage} disabled={busy}>
            <span aria-hidden="true">💬</span> {text.copyMessage}
          </button>
          <button type="button" className="buddy-button" onClick={onCopyLink} disabled={busy}>
            <span aria-hidden="true">🔗</span> {text.copyLink}
          </button>
        </div>
        {!nativeAvailable && <p className="buddy-note">{text.noShareSheet}</p>}

        <p className={`buddy-status${status.tone ? ` is-${status.tone}` : ''}`} role="status" aria-live="polite">
          {status.message}
        </p>

        <p className="buddy-safety"><span aria-hidden="true">🛡️</span> {text.safety}</p>

        <div className="buddy-dialog-foot">
          <button type="button" className="buddy-button is-quiet" onClick={close}>{text.close}</button>
        </div>
      </div>
    </dialog>
  )
}
