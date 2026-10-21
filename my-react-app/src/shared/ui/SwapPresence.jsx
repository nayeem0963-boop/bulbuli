import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../hooks/useReducedMotion.js';
import { cx } from '../lib/cx.js';

const HOLD_MS = 700; // safety net: remove a leaving item even if its animationend never fires

/**
 * Cross-slides content when `id` changes: the old content animates out (and is removed afterwards)
 * while the new content animates in. A 40-line stand-in for AnimatePresence.
 */
export default function SwapPresence({ id, children, className }) {
  const [leaving, setLeaving] = useState([]);
  const previous = useRef({ id, children });
  // The first item must NOT animate in: the screen's own view transition already does that, and a
  // sideways slide in progress while the browser captures the new screen overflows narrow
  // viewports and makes Chromium abort the transition.
  const firstId = useRef(id);

  useLayoutEffect(() => {
    const before = previous.current;
    if (before.id !== id && !prefersReducedMotion()) setLeaving((list) => [...list, before]);
    previous.current = { id, children };
  }, [id, children]);

  useEffect(() => {
    if (!leaving.length) return undefined;
    const t = setTimeout(() => setLeaving([]), HOLD_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  const drop = (leaveId) => setLeaving((list) => list.filter((l) => l.id !== leaveId));

  return (
    <div className={cx('swap', className)}>
      {leaving.map((l) => (
        <div
          key={`out-${l.id}`}
          className="swap__item swap__out"
          aria-hidden="true"
          ref={(el) => el?.setAttribute('inert', '')}
          onAnimationEnd={(e) => { if (e.target === e.currentTarget) drop(l.id); }}
        >
          {l.children}
        </div>
      ))}
      <div key={id} className={cx('swap__item', 'swap__in', id !== firstId.current && 'is-swapped')}>{children}</div>
    </div>
  );
}
