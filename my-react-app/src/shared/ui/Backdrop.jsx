import { useEffect, useMemo, useRef } from 'react';
import { createRand, mulberry32 } from '../../core/rng.js';
import { useReducedMotion } from '../hooks/useReducedMotion.js';

const KINDS = ['star', 'pencil', 'cap', '+', '×', 'π', '÷', '?', 'star', '=', '−', 'cap', 'pencil', '7', '3', 'star', '%'];
const ICONS = {
  star: <polygon points="20,3 24.5,14.5 37,15 27,22.5 30.5,35 20,28 9.5,35 13,22.5 3,15 15.5,14.5" />,
  pencil: <path d="M8 32 L10 24 L28 6 L34 12 L16 30 Z M10 24 L16 30 M24 10 L30 16" />,
  cap: <path d="M20 10 L38 17 L20 24 L2 17 Z M10 21 V28 C14 32 26 32 30 28 V21 M36 18 V28" />,
};

/**
 * Animated sky: a drifting grid, and school doodles floating upward on three depth layers.
 * Deeper layers move less when the pointer moves (parallax). Decorative only.
 */
export default function Backdrop() {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  // Seeded so the layout is stable between renders and Hot Reload.
  const items = useMemo(() => {
    const R = createRand(mulberry32(2024));
    const f = (a, b) => a + R.rng() * (b - a);
    return KINDS.map((kind, i) => {
      const depth = 1 + (i % 3); // 1 far, 3 near
      const duration = f(26, 50) / (0.7 + depth * 0.25);
      return {
        kind, depth,
        style: {
          '--x': `${(i / KINDS.length) * 100 + f(-3, 3)}%`,
          '--size': `${f(24, 44) + depth * 10}px`,
          '--dur': `${duration}s`,
          '--delay': `${-f(0, duration)}s`,
          '--sway': `${f(-90, 90)}px`,
          '--spin': `${f(-200, 200)}deg`,
          '--depth': depth,
        },
      };
    });
  }, []);

  useEffect(() => {
    if (reduced) return undefined;
    const el = ref.current;
    let raf = 0;
    const onMove = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--px', ((e.clientX / window.innerWidth) - 0.5).toFixed(3));
        el.style.setProperty('--py', ((e.clientY / window.innerHeight) - 0.5).toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, [reduced]);

  return (
    <div className="backdrop" ref={ref} aria-hidden="true">
      {items.map(({ kind, style }, i) => (
        <span className="backdrop__item" key={i} style={style}>
          <span className="backdrop__float">
            {ICONS[kind] ? (
              <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">{ICONS[kind]}</svg>
            ) : <b>{kind}</b>}
          </span>
        </span>
      ))}
    </div>
  );
}
