import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';
const mq = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY) : null);

export const prefersReducedMotion = () => !!mq()?.matches;

export function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const m = mq();
      m?.addEventListener('change', cb);
      return () => m?.removeEventListener('change', cb);
    },
    prefersReducedMotion,
    () => false,
  );
}
