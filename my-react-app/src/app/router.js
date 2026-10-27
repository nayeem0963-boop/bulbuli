import { useSyncExternalStore } from 'react';
import { parseHash } from './route-utils.js';

let currentSnapshot = parseHash(window.location.hash);
const listeners = new Set();

function emit() {
  currentSnapshot = parseHash(window.location.hash);
  listeners.forEach((listener) => listener());
}

window.addEventListener('hashchange', emit);

export function navigate(to, { replace = false } = {}) {
  const targetHash = `#${to}`;
  if (replace) {
    window.history.replaceState(null, '', targetHash);
    emit();
  } else {
    window.location.hash = to;
  }
}

export function useLocation() {
  const loc = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentSnapshot
  );

  return { path: loc.path, query: loc.query };
}