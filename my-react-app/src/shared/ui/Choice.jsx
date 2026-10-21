import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { play } from '../audio/sound.js';
import { cx } from '../lib/cx.js';

/**
 * Single-choice group (a radio group) with a highlight tile that slides to the selected option.
 * Keyboard: arrow keys move and select, Tab leaves the group.
 *
 * options:  [{ value, label, hint? }]
 * columns:  number of grid columns, or 'auto' for wrapping chips
 */
export default function Choice({ label, value, onChange, options, columns = 2, size = 'md', className }) {
  const group = useRef(null);
  const [box, setBox] = useState(null);
  const [armed, setArmed] = useState(false); // enable the slide only after the first measurement

  const measure = useCallback(() => {
    const el = group.current?.querySelector('[aria-checked="true"]');
    if (el) setBox({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
  }, []);

  useLayoutEffect(measure, [value, options, measure]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setArmed(true));
    const ro = new ResizeObserver(measure);
    if (group.current) ro.observe(group.current);
    return () => { cancelAnimationFrame(id); ro.disconnect(); };
  }, [measure]);

  const move = (dir) => {
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + dir + options.length) % options.length];
    play('click');
    onChange(next.value);
    requestAnimationFrame(() => group.current?.querySelector('[aria-checked="true"]')?.focus());
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
  };

  return (
    <div
      ref={group}
      className={cx('choice', `choice--${size}`, columns === 'auto' && 'choice--chips', className)}
      style={columns === 'auto' ? undefined : { '--cols': columns }}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {box && (
        <span
          className={cx('choice__tile', armed && 'is-armed')}
          style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h }}
          aria-hidden="true"
        />
      )}
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={cx('choice__opt', checked && 'is-on')}
            onClick={() => { if (!checked) { play('click'); onChange(o.value); } }}
          >
            <strong>{o.label}</strong>
            {o.hint && <span>{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
