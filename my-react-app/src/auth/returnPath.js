// Where to send a player after Google sign-in or an email link (read by AuthCallback.jsx).

const RETURN_TO_KEY = 'bulbuli.auth-return-to'

/** Remembers where to come back to after Google sign-in or an email link (see AuthCallback). */
export function rememberReturnPath(path) {
  try {
    if (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')) {
      window.sessionStorage.setItem(RETURN_TO_KEY, path)
    }
  } catch { /* ignore */ }
}

export function takeReturnPath(fallback = '/') {
  try {
    const path = window.sessionStorage.getItem(RETURN_TO_KEY)
    window.sessionStorage.removeItem(RETURN_TO_KEY)
    if (path && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/auth/')) return path
  } catch { /* ignore */ }
  return fallback
}
