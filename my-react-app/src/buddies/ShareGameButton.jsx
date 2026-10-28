import { lazy, Suspense, useState } from 'react'
import { BUDDIES_TEXT } from './text.js'
import './buddies.css'

const BuddyShareDialog = lazy(() => import('./BuddyShareDialog.jsx'))

/**
 * "Share this game": a small secondary button (game bar, results screens). `url` is the game's
 * public link (shareUrl(gamePath(game)) in shareLinks.js). `variant`: 'icon' (just 📤, for
 * icon rows), 'pill' (the toy pill look) or 'label' (icon and words, styled by `className`).
 */
export default function ShareGameButton({ title, url, language = 'en', className = '', variant = 'icon' }) {
  const text = BUDDIES_TEXT[language] ?? BUDDIES_TEXT.en
  const [open, setOpen] = useState(false)
  const [opened, setOpened] = useState(false)
  const label = text.shareGame(title)

  return (
    <>
      <button
        type="button"
        className={`${className} share-game-button is-${variant}`.trim()}
        aria-label={variant === 'icon' ? label : undefined}
        title={label}
        aria-haspopup="dialog"
        onClick={() => { setOpened(true); setOpen(true) }}
      >
        <span aria-hidden="true">📤</span>
        {variant !== 'icon' && <span>{text.shareGameLabel}</span>}
      </button>
      {opened && (
        <Suspense fallback={null}>
          <BuddyShareDialog open={open} onClose={() => setOpen(false)} language={language} game={{ title, url }} />
        </Suspense>
      )}
    </>
  )
}
