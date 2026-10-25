// Pure checks for the install banner. Each takes what it needs as arguments, so they can be
// tested with node --test; installPrompt.js and InstallPwaBanner.jsx pass in the real browser values.

/**
 * iPhone, iPod or iPad. iPadOS 13+ reports itself as a Mac ("MacIntel"), so a "Mac" with a
 * touch screen is an iPad.
 */
export function isIosDevice({ userAgent = '', platform = '', maxTouchPoints = 0 } = {}) {
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
}

/**
 * Browsers built into other apps (Facebook, Instagram, Messenger, TikTok, LINE, WhatsApp…).
 * On iOS they can't add a site to the Home Screen, so we ask the player to open Safari first.
 */
export function isInAppBrowser(userAgent = '') {
  return /FBAN|FBAV|FB_IAB|Instagram|Messenger|musical_ly|TikTok|BytedanceWebview|Line\/|WhatsApp|GSA\//.test(userAgent)
}

/** A phone or tablet, by its user agent (or Client Hints when the browser offers them). */
export function isMobileDevice({ userAgent = '', userAgentDataMobile, platform = '', maxTouchPoints = 0 } = {}) {
  if (userAgentDataMobile === true) return true
  return /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(userAgent)
    || isIosDevice({ userAgent, platform, maxTouchPoints })
}

/** Already opened from the Home Screen / as an installed app. */
export function isStandalone({ displayModeStandalone = false, navigatorStandalone = false } = {}) {
  return Boolean(displayModeStandalone || navigatorStandalone)
}

export const DISMISS_DAYS = 30

/** True while a dismissal (a timestamp in ms) is still fresh. */
export function isDismissed(dismissedAt, now = Date.now(), days = DISMISS_DAYS) {
  const at = Number(dismissedAt)
  return Number.isFinite(at) && at > 0 && now - at < days * 24 * 60 * 60 * 1000
}

/**
 * Which banner to show: 'prompt' (Android/Chrome/Edge with a captured install prompt),
 * 'ios' (Safari-style "Add to Home Screen" steps), or null (show nothing).
 */
export function bannerMode({ standalone, installed, dismissed, mobileOrSmall, canPrompt, ios }) {
  if (standalone || installed || dismissed || !mobileOrSmall) return null
  if (canPrompt) return 'prompt'
  if (ios) return 'ios'
  return null
}
