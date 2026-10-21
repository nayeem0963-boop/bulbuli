import { useEffect, useRef } from 'react';

/** Window key handler that always calls the latest callback. Ignores typing in form fields. */
export function useKey(handler, enabled = true) {
  const latest = useRef(handler);
  useEffect(() => { latest.current = handler; });

  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return;
      latest.current(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
