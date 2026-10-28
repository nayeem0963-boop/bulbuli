// The two ways an invitation leaves Bulbuli: the device's own share sheet (navigator.share), or
// the clipboard. Nothing here knows whether anyone actually received or opened the invitation,
// so the results only ever say what really happened on this device.

/** Whether this browser can open the device's share sheet for a link and text. */
export function canNativeShare(data, nav = globalThis.navigator) {
  if (!nav || typeof nav.share !== 'function') return false
  if (typeof nav.canShare === 'function') {
    try { return nav.canShare(data) } catch { return false }
  }
  return true
}

/**
 * Opens the share sheet. Resolves to 'shared' (the player picked an app), 'cancelled' (they
 * closed the sheet), or 'failed' (the browser refused).
 */
export async function nativeShare(data, nav = globalThis.navigator) {
  try {
    await nav.share(data)
    return 'shared'
  } catch (error) {
    return error?.name === 'AbortError' ? 'cancelled' : 'failed'
  }
}

/** Copy with the old selection trick, for browsers without the async clipboard (or without permission). */
function legacyCopy(value, doc) {
  if (!doc?.body || typeof doc.execCommand !== 'function') return false
  const field = doc.createElement('textarea')
  field.value = value
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.top = '0'
  field.style.left = '-9999px'
  field.style.opacity = '0'
  const active = doc.activeElement
  doc.body.appendChild(field)
  field.select()
  let copied = false
  try { copied = doc.execCommand('copy') } catch { copied = false }
  field.remove()
  active?.focus?.({ preventScroll: true })
  return copied
}

/** Puts text on the clipboard. Resolves true only when it was really copied. */
export async function copyText(value, { nav = globalThis.navigator, doc = globalThis.document } = {}) {
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(value)
      return true
    } catch {
      // permission refused or not a secure page: try the fallback below
    }
  }
  return legacyCopy(value, doc)
}
