import { useMemo, useSyncExternalStore } from 'react';
import { parseHash } from './route-utils.js';
import { withViewTransition } from './transitions.js';

// A deliberately tiny hash router. Hash URLs need no server config (works from any static host,
// from file://, and inside Vite's dev server), and the browser Back button just works.

const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

const getHash = () => window.location.hash || '#/';
const subscribe = (fn) => {
  listeners.add(fn);
  window.addEventListener('popstate', fn);
  window.addEventListener('hashchange', fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('popstate', fn);
    window.removeEventListener('hashchange', fn);
  };
};

/**
 * @param {string} to           e.g. '/play/classic?cat=mixed&lvl=1'
 * @param {{ replace?: boolean, animate?: boolean, direction?: 'forward'|'back' }} [opts]
 */
export function navigate(to, { replace = false, animate = true, direction } = {}) {
  const url = `#${to}`;
  const apply = () => {
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    notify();
  };
  if (!animate) return apply();
  const dir = direction ?? (to === '/' || to.startsWith('/?') ? 'back' : 'forward');
  return withViewTransition(apply, dir);
}

/** Current route as { path, query } (query is a URLSearchParams). Re-renders on navigation. */
export function useLocation() {
  const hash = useSyncExternalStore(subscribe, getHash, () => '#/');
  return useMemo(() => parseHash(hash), [hash]);
}
