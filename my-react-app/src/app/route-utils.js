// Pure routing helpers (no React), so they can be unit-tested.

/** "#/play/endless?cat=mixed&lvl=2" -> { path: '/play/endless', query: URLSearchParams } */
export function parseHash(hash) {
  const clean = (hash || '').replace(/^#/, '') || '/';
  const [path, search = ''] = clean.split('?');
  return { path: path.startsWith('/') ? path : `/${path}`, query: new URLSearchParams(search) };
}

/** Match "/play/:mode" style patterns. Returns params or null. */
export function matchPath(pattern, path) {
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

export function resolve(routes, path) {
  for (const route of routes) {
    const params = matchPath(route.path, path);
    if (params) return { route, params };
  }
  return null;
}

export const withQuery = (path, params = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 0)).toString();
  return qs ? `${path}?${qs}` : path;
};
