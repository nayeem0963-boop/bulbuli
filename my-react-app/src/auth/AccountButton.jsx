import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { AUTH_TEXT } from './text.js'

/** Small account control for the arcade header: "Sign in" for guests, their avatar once signed in. */
export default function AccountButton({ language }) {
  const { isConfigured, user, profile, openAuthModal } = useAuth()
  const text = AUTH_TEXT[language] ?? AUTH_TEXT.en
  if (!isConfigured) return null

  if (!user) {
    return (
      <button type="button" className="arcade-account" onClick={() => openAuthModal({ reason: 'header' })}>
        {text.accountSignIn}
      </button>
    )
  }

  const name = profile?.username || user.email || ''
  const avatar = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture
  return (
    <Link className="arcade-account is-signed-in" to="/dashboard" aria-label={text.accountOpen} title={text.accountOpen}>
      {avatar
        ? <img src={avatar} alt="" referrerPolicy="no-referrer" />
        : <span aria-hidden="true">{name.slice(0, 1).toUpperCase() || '★'}</span>}
    </Link>
  )
}
