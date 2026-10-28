// The addresses a Bulbuli invitation points to. Always the public site (SHARE_URL), never the
// address the page happens to be running on (localhost, a preview deploy), and never anything
// about the player: no name, id, score or referral code goes into a shared link.
import { SHARE_URL } from '../promo/shareData.js'

/** Where each kind of invitation lands (paths on the public site). */
export const SHARE_PATHS = {
  general: '/',
  'play-learn': '/?mode=play-learn',
  'build-create': '/?mode=build-create',
  // Pro Coder is the standalone HTML course page; the 3D Game Studio is the /game route
  proCoder: '/quiz/?course=html',
  studio: '/game',
}

/**
 * The full public link for a site path such as '/games/ball-dash'. Only same-site paths are
 * accepted (they must start with one '/'), so a shared link can never point somewhere else.
 */
export function shareUrl(path = '/') {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    throw new Error(`Not a site path: ${path}`)
  }
  const url = new URL(path, SHARE_URL)
  // "https://bulbuli.org/" reads better without the trailing slash
  return path === '/' ? SHARE_URL : url.href
}

/** The link for a home-page invitation kind ('general', 'play-learn' or 'build-create'). */
export function inviteUrl(kind) {
  return shareUrl(SHARE_PATHS[kind] ?? SHARE_PATHS.general)
}
