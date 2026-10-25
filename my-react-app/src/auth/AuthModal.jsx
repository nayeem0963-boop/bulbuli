import { useEffect, useId, useRef, useState } from 'react'
import { useLanguage } from '../arcade/preferences.js'
import { useAuth } from './AuthContext.jsx'
import { AUTH_TEXT } from './text.js'
import './auth.css'

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

/**
 * The optional sign-in dialog. Open it from anywhere with useAuth().openAuthModal().
 * It is a native <dialog>, so focus, Escape and the backdrop come for free.
 * Signing in leaves the player exactly where they were (AuthContext closes this on SIGNED_IN).
 */
export default function AuthModal() {
  const { authModal, closeAuthModal, signInWithPassword, signUp, signInWithGoogle, resetPassword } = useAuth()
  const [language] = useLanguage()
  const text = AUTH_TEXT[language] ?? AUTH_TEXT.en
  const dialogRef = useRef(null)
  const titleId = useId()

  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'error' | 'success', text }

  // open/close the native dialog from context state
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (authModal.open && !dialog.open) {
      setMode(authModal.mode === 'signup' ? 'signup' : 'signin')
      setMessage(null)
      setPassword('')
      dialog.showModal()
    } else if (!authModal.open && dialog.open) {
      dialog.close()
    }
  }, [authModal.open, authModal.mode])

  const switchMode = (next) => {
    setMode(next)
    setMessage(null)
  }

  const run = async (action) => {
    setBusy(true)
    setMessage(null)
    try {
      await action()
    } catch (error) {
      console.error('Sign-in step failed.', error)
      setMessage({ type: 'error', text: error?.message || text.genericError })
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmedEmail = email.trim()

    if (mode === 'reset') {
      run(async () => {
        await resetPassword(trimmedEmail)
        setMessage({ type: 'success', text: text.resetSent })
      })
      return
    }
    if (mode === 'signup' && password.length < 6) {
      setMessage({ type: 'error', text: text.shortPassword })
      return
    }
    run(async () => {
      if (mode === 'signin') {
        await signInWithPassword(trimmedEmail, password)
        // AuthContext closes the dialog when SIGNED_IN arrives
      } else {
        const result = await signUp(trimmedEmail, password)
        if (result.needsConfirmation) setMessage({ type: 'success', text: text.confirmEmail })
      }
    })
  }

  const title = mode === 'signup' ? text.modalTitleSignUp : mode === 'reset' ? text.modalTitleReset : text.modalTitle
  const submitLabel = mode === 'reset'
    ? (busy ? text.sending : text.sendReset)
    : mode === 'signup'
      ? (busy ? text.signingUp : text.signUp)
      : (busy ? text.signingIn : text.signIn)

  return (
    <dialog
      ref={dialogRef}
      className="auth-modal"
      aria-labelledby={titleId}
      lang={language}
      onClose={closeAuthModal}
      onClick={(event) => {
        // a click on the backdrop (the dialog element itself) closes it
        if (event.target === event.currentTarget) closeAuthModal()
      }}
    >
      <div className="auth-modal-body">
        <button type="button" className="auth-modal-close" onClick={closeAuthModal} aria-label={text.close}>
          <span aria-hidden="true">×</span>
        </button>

        <p className="auth-modal-star" aria-hidden="true">⭐</p>
        <h2 id={titleId}>{title}</h2>
        {mode !== 'reset' && <p className="auth-modal-intro">{text.modalIntro}</p>}

        {mode !== 'reset' && (
          <>
            <button
              type="button"
              className="auth-modal-google"
              disabled={busy}
              onClick={() => run(() => signInWithGoogle())}
            >
              <GoogleMark /> {text.google}
            </button>
            <p className="auth-modal-or"><span>{text.or}</span></p>
          </>
        )}

        <form className="auth-modal-form" onSubmit={handleSubmit} noValidate={false}>
          <label>
            <span>{text.email}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          {mode !== 'reset' && (
            <label>
              <span>{text.password}</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={mode === 'signup' ? 6 : undefined}
                aria-describedby={mode === 'signup' ? `${titleId}-hint` : undefined}
                required
              />
              {mode === 'signup' && <small id={`${titleId}-hint`}>{text.passwordHint}</small>}
            </label>
          )}

          {message && (
            <p className={`auth-modal-message is-${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
              {message.text}
            </p>
          )}

          <button type="submit" className="auth-modal-submit" disabled={busy}>{submitLabel}</button>
        </form>

        <div className="auth-modal-links">
          {mode === 'signin' && (
            <>
              <button type="button" onClick={() => switchMode('signup')}>{text.switchToSignUp}</button>
              <button type="button" onClick={() => switchMode('reset')}>{text.forgot}</button>
            </>
          )}
          {mode === 'signup' && <button type="button" onClick={() => switchMode('signin')}>{text.switchToSignIn}</button>}
          {mode === 'reset' && <button type="button" onClick={() => switchMode('signin')}>{text.backToSignIn}</button>}
          <button type="button" className="is-quiet" onClick={closeAuthModal}>{text.keepPlaying}</button>
        </div>
      </div>
    </dialog>
  )
}
