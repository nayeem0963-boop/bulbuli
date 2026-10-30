/** Pages where a game is being played: celebrations wait until the player leaves them. */
export function isPlayingGame(pathname, search = '') {
  return pathname.startsWith('/games/')
    || pathname.startsWith('/play/')
    || pathname === '/game'
    || pathname === '/drive'
    || new URLSearchParams(search).has('play')
}

/** The verification page's path pattern; the token is checked by the server, not trusted here. */
export const CERTIFICATE_ROUTE = '/certificate/:token'
