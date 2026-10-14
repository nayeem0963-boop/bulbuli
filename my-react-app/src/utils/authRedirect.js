export function getAuthRedirectPath(from) {
  const requestedPath = typeof from === 'string'
    ? from
    : typeof from?.pathname === 'string'
      ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
      : ''

  return requestedPath.startsWith('/') && !requestedPath.startsWith('//')
    ? requestedPath
    : '/dashboard'
}
