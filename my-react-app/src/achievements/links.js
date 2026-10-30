// Public addresses for certificates. Always the real site (SHARE_URL: https://bulbuli.org),
// never localhost or a preview deploy, and never anything about the player: the only thing in
// the link is the certificate's random verification token.
import { SHARE_URL } from '../promo/shareData.js'

export const SITE_URL = SHARE_URL
export const SITE_LABEL = new URL(SHARE_URL).host // 'bulbuli.org'

export const TOKEN_RE = /^[0-9a-f]{32}$/

export const isVerificationToken = (token) => typeof token === 'string' && TOKEN_RE.test(token)

/** https://bulbuli.org/certificate/<token>, or '' for a missing / malformed token. */
export function certificateUrl(token) {
  return isVerificationToken(token) ? `${SITE_URL}/certificate/${token}` : ''
}

/** The same link without "https://", for printing. */
export const displayUrl = (url) => String(url ?? '').replace(/^https?:\/\//, '')
