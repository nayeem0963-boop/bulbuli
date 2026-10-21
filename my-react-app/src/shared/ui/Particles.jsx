import { useMemo } from 'react';

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];
const color = (i) => `var(--shape-${COLORS[i % COLORS.length]})`;

/** Small radial pop. Mount it inside a `position: relative` element to burst from that element. */
export function Burst({ count = 14 }) {
  const bits = useMemo(() => Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 50 + Math.random() * 40;
    return { '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`, '--c': color(i) };
  }), [count]);
  return <span className="burst" aria-hidden="true">{bits.map((s, i) => <i key={i} style={s} />)}</span>;
}

/** Full-screen falling confetti for the results screen. */
export function Confetti({ count = 40 }) {
  const bits = useMemo(() => Array.from({ length: count }, (_, i) => ({
    '--x': `${Math.random() * 100}%`,
    '--c': color(i),
    '--delay': `${Math.random() * 0.8}s`,
    '--fall': `${2.2 + Math.random() * 1.6}s`,
    '--spin': `${(Math.random() - 0.5) * 900}deg`,
    '--drift': `${(Math.random() - 0.5) * 160}px`,
  })), [count]);
  return <div className="confetti" aria-hidden="true">{bits.map((s, i) => <i key={i} style={s} />)}</div>;
}
