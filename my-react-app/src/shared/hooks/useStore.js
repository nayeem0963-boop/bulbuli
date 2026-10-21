import { useSyncExternalStore } from 'react';

/**
 * Subscribe to a store (core/store.js). The selector must return a stable value:
 * a primitive, or a reference that only changes when the data does.
 */
export function useStore(store, selector = (s) => s) {
  const read = () => selector(store.get());
  return useSyncExternalStore(store.subscribe, read, read);
}
