import { useEffect, useRef } from 'react';
import { cx } from '../../shared/lib/cx.js';

/**
 * Smooth countdown bar. It reads the clock in a requestAnimationFrame loop and writes
 * transform directly, so the bar animates at 60fps without re-rendering React.
 * `scale()` returns how many seconds fill the whole bar.
 */
export default function TimerBar({ clock, scale, urgent, label }) {
  const fill = useRef(null);
  const scaleRef = useRef(scale);
  useEffect(() => { scaleRef.current = scale; });

  useEffect(() => {
    let raf;
    let last = -1;
    const loop = () => {
      const f = Math.max(0, Math.min(1, clock.remaining() / scaleRef.current()));
      if (f !== last) {
        fill.current.style.transform = `scaleX(${f})`;
        last = f;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [clock]);

  return (
    <div className={cx('timer', urgent && 'is-urgent')} role="timer" aria-label={label}>
      <i ref={fill} className="timer__fill" />
    </div>
  );
}
