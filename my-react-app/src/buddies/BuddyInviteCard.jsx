import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import buddyMascot from '../assets/math-hero-mascot-cutout.webp'
import { BUDDIES_TEXT } from './text.js'
import './buddies.css'

// the dialog's code loads the first time someone opens it
const BuddyShareDialog = lazy(() => import('./BuddyShareDialog.jsx'))

/**
 * "Play better together!": the home page's invite card (it replaces the old Math Hero share
 * strip, whose card page stays one link away). Sharing is always optional: nothing on Bulbuli
 * needs it, and nothing is promised for it.
 */
export default function BuddyInviteCard({ language = 'en' }) {
  const text = BUDDIES_TEXT[language] ?? BUDDIES_TEXT.en
  const [open, setOpen] = useState(false)
  const [opened, setOpened] = useState(false)

  return (
    <section className="buddy-card" aria-labelledby="buddy-card-title">
      <img className="buddy-card-mascot" src={buddyMascot} alt="" width="72" height="88" loading="lazy" />
      <div className="buddy-card-copy">
        <h2 id="buddy-card-title">{text.cardTitle}</h2>
        <p>{text.cardText}</p>
        <Link className="buddy-card-secondary" to="/share/math-hero">{text.mathHeroLink}</Link>
      </div>
      <button
        type="button"
        className="buddy-card-button"
        aria-haspopup="dialog"
        onClick={() => { setOpened(true); setOpen(true) }}
      >
        {text.cardButton}
      </button>
      {opened && (
        <Suspense fallback={null}>
          <BuddyShareDialog
            open={open}
            onClose={() => setOpen(false)}
            language={language}
            initialKind="general"
          />
        </Suspense>
      )}
    </section>
  )
}
