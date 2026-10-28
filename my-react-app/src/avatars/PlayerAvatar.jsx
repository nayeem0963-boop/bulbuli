import { useState } from 'react'
import BirdArt from './BirdArt.jsx'
import { getAvatar } from './avatarCatalog.js'

// every picture in src/assets/avatars/, bundled by Vite: { '../assets/avatars/animals/leo.webp': url }
const IMAGES = import.meta.glob('../assets/avatars/**/*.{webp,png,jpg,svg}', { eager: true, import: 'default' })
const imageUrl = (avatar) => (avatar.image ? IMAGES[`../assets/avatars/${avatar.image}`] : undefined)

/**
 * Draws one avatar, filling its (round) parent. Any image that fails to load falls back to
 * the player's initial, so there is always something to show.
 *
 *   <PlayerAvatar avatar={resolveAvatar(id, …)} name="Nayeem" photoUrl={…} />
 */
export default function PlayerAvatar({ avatar, name = '', photoUrl = '', className = '' }) {
  const [failedSrc, setFailedSrc] = useState('')
  const item = avatar ?? getAvatar('initial')
  const src = item.kind === 'photo' ? photoUrl : imageUrl(item)
  const letter = (name.trim()[0] || '★').toUpperCase()
  const showLetter = item.kind === 'initial' || ((item.kind === 'photo' || item.kind === 'image') && (!src || failedSrc === src))

  return (
    <span className={`pa ${className}`} style={{ background: showLetter ? getAvatar('initial').bg : item.bg }} data-avatar={item.id}>
      {showLetter && <span className="pa-letter">{letter}</span>}
      {!showLetter && item.kind === 'bird' && <BirdArt className="pa-bird" palette={item.palette} accessory={item.accessory} />}
      {!showLetter && item.kind !== 'bird' && (
        <img
          className={item.kind === 'photo' ? 'pa-photo' : 'pa-img'}
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          draggable="false"
          onError={() => setFailedSrc(src)}
        />
      )}
    </span>
  )
}
