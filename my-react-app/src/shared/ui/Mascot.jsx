import { useEffect, useRef } from 'react';
import img from '../../assets/mascot.webp';
import { useI18n } from '../i18n/index.jsx';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import { cx } from '../lib/cx.js';

/**
 * Bulbuli. `mood`: idle | hop | cheer | oops. Bump `pulse` to replay the same mood.
 * `shared` gives it a view-transition-name, so it glides between screens. Only mount ONE shared mascot at a time.
 * `tilt` makes it lean toward the pointer. Pass `onPoke` to make it a button.
 */
export default function Mascot({ mood = 'idle', pulse = 0, say, shared = false, tilt = false, onPoke, className }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!tilt || reduced) return undefined;
    const el = ref.current;
    let raf = 0;
    const onMove = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--tx', ((e.clientX - (r.left + r.width / 2)) / window.innerWidth).toFixed(3));
        el.style.setProperty('--ty', ((e.clientY - (r.top + r.height / 2)) / window.innerHeight).toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, [tilt, reduced]);

  const Tag = onPoke ? 'button' : 'div';
  return (
    <Tag
      ref={ref}
      className={cx('mascot', className)}
      data-mood={mood}
      style={shared ? { viewTransitionName: 'mascot' } : undefined}
      onClick={onPoke}
      {...(onPoke ? { type: 'button', 'aria-label': t('a11y.mascot') } : {})}
    >
      {say && <span key={say} className="mascot__bubble" aria-hidden="true">{t(say)}</span>}
      <span className="mascot__tilt">
        <span key={`${mood}-${pulse}`} className="mascot__act">
          <img className="mascot__img" src={img} alt="" draggable="false" />
        </span>
      </span>
      <span className="mascot__shadow" aria-hidden="true" />
    </Tag>
  );
}

const COUNT = { hi: 3, good: 3, oops: 2, hurry: 1, win: 1, try: 1 };
/** Random speech-bubble key for a situation, e.g. sayKey('good') -> 'say.good2' */
export const sayKey = (group) => `say.${group}${1 + Math.floor(Math.random() * COUNT[group])}`;
