import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import BirdArt from '../../avatars/BirdArt.jsx'
import { getAvatar } from '../../avatars/avatarCatalog.js'
import { avatarImageUrl } from '../../avatars/avatarImages.js'
import { loadImage } from './canvasKit.js'

/** BirdArt as an SVG string (rendered off-screen with the React DOM the app already loads). */
function birdMarkup(item) {
  const host = document.createElement('div')
  const root = createRoot(host)
  flushSync(() => root.render(<BirdArt palette={item.palette} accessory={item.accessory} />))
  const markup = host.innerHTML
  root.unmount()
  return markup
}

/**
 * Prepares a player's avatar for painting on a canvas: the same choice as the dashboard
 * (usePlayerAvatar → avatar), turned into { bg, image, cover, letter }.
 *
 *   'image'   the bundled animal picture (same origin, so the canvas stays downloadable)
 *   'bird'    the Bulbuli bird SVG (BirdArt) with the player's colours and accessory
 *   'photo'   their account photo; if it can't be loaded for a canvas (cross-origin), the
 *             initial letter is used instead, exactly like PlayerAvatar does on screen
 *   'initial' / anything missing → the initial letter
 */
export async function prepareAvatarArt({ avatar, photoUrl = '', name = '' }) {
  const letter = ([...String(name).trim()][0] || '★').toUpperCase()
  const initial = { bg: getAvatar('initial')?.bg ?? '#a855f7', image: null, letter }
  const item = avatar ?? getAvatar('bulbuli')
  if (!item) return initial

  if (item.kind === 'image') {
    const image = await loadImage(avatarImageUrl(item))
    return image ? { bg: item.bg, image, cover: false, inset: 1, letter } : initial
  }
  if (item.kind === 'bird') {
    const markup = birdMarkup(item).replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" width="288" height="288"')
    const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`)
    return image ? { bg: item.bg, image, cover: false, inset: 0.86, letter } : initial
  }
  if (item.kind === 'photo' && photoUrl) {
    const image = await loadImage(photoUrl, { crossOrigin: true })
    return image ? { bg: item.bg, image, cover: true, letter } : initial
  }
  return initial
}
