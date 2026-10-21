// A tiny external store with optional persistence (zustand-style, no dependency).
// React subscribes through `useStore` (shared/hooks/useStore.js), which uses useSyncExternalStore.

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};

function pickStorage(kind) {
  try {
    const s = kind === 'session' ? globalThis.sessionStorage : globalThis.localStorage;
    if (!s) return memoryStorage();
    s.setItem('__probe', '1');
    s.removeItem('__probe');
    return s;
  } catch {
    return memoryStorage(); // private mode, blocked storage, or running in Node
  }
}

/**
 * @template T
 * @param {T} initial
 * @param {{ key?: string, storage?: 'local'|'session'|Storage, version?: number, migrate?: (storage: Storage) => T | undefined }} [opts]
 */
export function createStore(initial, { key, storage = 'local', version = 1, migrate } = {}) {
  const backend = typeof storage === 'string' ? pickStorage(storage) : storage;
  const listeners = new Set();

  const load = () => {
    if (!key) return initial;
    try {
      const raw = backend.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.v === version) return { ...initial, ...parsed.data };
      }
    } catch { /* corrupt value: fall through to defaults */ }
    const migrated = migrate?.(backend);
    return migrated ? { ...initial, ...migrated } : initial;
  };

  let state = load();

  const persist = () => {
    if (!key) return;
    try { backend.setItem(key, JSON.stringify({ v: version, data: state })); } catch { /* storage full or blocked */ }
  };

  const store = {
    get: () => state,
    /** Merge a patch, or pass a function that returns one. */
    set(patch) {
      const next = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...next };
      persist();
      listeners.forEach((fn) => fn());
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** For tests. */
    reset() {
      state = initial;
      persist();
      listeners.forEach((fn) => fn());
    },
  };

  // Keep other tabs in sync.
  if (key && typeof window !== 'undefined' && storage === 'local') {
    window.addEventListener('storage', (e) => {
      if (e.key === key) {
        state = load();
        listeners.forEach((fn) => fn());
      }
    });
  }
  return store;
}
