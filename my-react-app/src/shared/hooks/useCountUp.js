import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './useReducedMotion.js';

const easeOutCubic = (p) => 1 - (1 - p) ** 3;

/** Animates a number toward `target` whenever it changes (score ticking up, results count-up). */
export function useCountUp(target, { duration = 700, from = 0 } = {}) {
  const [shown, setShown] = useState(prefersReducedMotion() ? target : from);
  const current = useRef(shown);

  useEffect(() => {
    if (prefersReducedMotion()) { current.current = target; setShown(target); return undefined; }
    const start = performance.now();
    const origin = current.current;
    let raf;
    const step = (now) => {
      // rAF's timestamp is the start of the frame, which can be a hair BEFORE our own performance.now()
      // call above. Without the lower clamp the first frame has p < 0 and the number briefly goes negative.
      const p = Math.max(0, Math.min((now - start) / duration, 1));
      current.current = Math.round(origin + (target - origin) * easeOutCubic(p));
      setShown(current.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return shown;
}
