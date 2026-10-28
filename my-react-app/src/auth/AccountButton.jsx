import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import PlayerAvatar from '../avatars/PlayerAvatar.jsx'
import { usePlayerAvatar } from '../avatars/usePlayerAvatar.js'
import '../avatars/avatars.css'
import { AUTH_TEXT } from './text.js'

/** Small account control for the arcade header: "Sign in" for guests, their avatar once signed in. */
export default function AccountButton({ language }) {
  const { isConfigured, user, profile, openAuthModal } = useAuth()
  const { avatar, photoUrl } = usePlayerAvatar() // the avatar they picked on their dashboard
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
  return (
    <Link className="arcade-account is-signed-in" to="/dashboard" aria-label={text.accountOpen} title={text.accountOpen}>
      <PlayerAvatar avatar={avatar} name={name} photoUrl={photoUrl} />
    </Link>
  )
}
