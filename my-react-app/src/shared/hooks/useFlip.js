import { useLayoutEffect, useRef } from 'react';
import { prefersReducedMotion } from './useReducedMotion.js';

/**
 * FLIP animation for a list: when children (marked with data-flip-id) change position
 * between renders, slide each one from where it was to where it is now.
 */
export function useFlip(containerRef, deps) {
  const previous = useRef(new Map());

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const next = new Map();
    for (const child of el.children) {
      const id = child.dataset.flipId;
      if (id) next.set(id, child.getBoundingClientRect());
    }
    if (!prefersReducedMotion()) {
      for (const child of el.children) {
        const id = child.dataset.flipId;
        const before = previous.current.get(id);
        const after = next.get(id);
        if (!before || !after) continue;
        const dx = before.left - after.left;
        const dy = before.top - after.top;
        if (dx || dy) {
          child.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
            { duration: 420, easing: 'cubic-bezier(.3, 1.35, .5, 1)' },
          );
        }
      }
    }
    previous.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
