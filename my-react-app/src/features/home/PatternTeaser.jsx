import { useState } from 'react';
import { makeQuestion } from '../../core/questions/index.js';
import { useI18n } from '../../shared/i18n/index.jsx';
import { play } from '../../shared/audio/sound.js';
import Shape from '../../shared/ui/Shape.jsx';
import { cx } from '../../shared/lib/cx.js';

const nextPattern = () => {
  let q;
  do { q = makeQuestion('pattern', Math.random() < 0.5 ? 1 : 2); } while (q.kind !== 'shape');
  return q;
};

/** Try-me puzzle on the home screen: tap the ? to see the answer, tap again for a new one. */
export default function PatternTeaser() {
  const { t } = useI18n();
  const [q, setQ] = useState(nextPattern);
  const [open, setOpen] = useState(false);
  const answer = q.options[q.answerIndex];

  const press = () => {
    if (open) { play('click'); setQ(nextPattern()); setOpen(false); }
    else { play('correct'); setOpen(true); }
  };

  return (
    <button type="button" className="teaser" onClick={press}>
      <span className="teaser__row" key={q.stem.seq.map((s) => s.shape + s.color).join()}>
        {q.stem.seq.map((s, i) => <span className="teaser__item" key={i} style={{ '--i': i }}><Shape {...s} /></span>)}
        <span className={cx('tile', 'tile--blank', open && 'is-open')} style={{ '--i': q.stem.seq.length }}>
          {open ? <Shape {...answer} /> : '?'}
        </span>
      </span>
      <span className="teaser__hint">{t(open ? 'home.heroNew' : 'home.heroHint')}</span>
    </button>
  );
}
