import { useEffect, useRef } from 'react';
import { useI18n } from '../../shared/i18n/index.jsx';
import Shape from '../../shared/ui/Shape.jsx';
import Button from '../../shared/ui/Button.jsx';
import { Burst } from '../../shared/ui/Particles.jsx';
import { cx } from '../../shared/lib/cx.js';

function Stem({ stem }) {
  const { n } = useI18n();
  if (!stem) return null;
  if (stem.type === 'expr') return <p className="stem__expr">{n(stem.text)}</p>;
  if (stem.type === 'numbers') {
    return (
      <div className="stem__row">
        {stem.nums.map((v, k) => <span className="tile" key={k} style={{ '--i': k }}>{n(v)}</span>)}
        <span className="tile tile--blank" style={{ '--i': stem.nums.length }}>?</span>
      </div>
    );
  }
  return (
    <div className="stem__row">
      {stem.seq.map((s, k) => <span className="stem__shape" key={k} style={{ '--i': k }}><Shape {...s} /></span>)}
      <span className="tile tile--blank" style={{ '--i': stem.seq.length }}>?</span>
    </div>
  );
}

/** One question: prompt, stem, four answers, and (in Classic) the explanation panel. */
export default function QuestionBlock({ question, picked, gain, showFeedback, isLast, onAnswer, onNext }) {
  const { t, n } = useI18n();
  const answered = picked !== null;
  const won = picked === question.answerIndex;
  const nextRef = useRef(null);

  // After answering, put focus on "Next" so Enter keeps the game moving.
  useEffect(() => { if (answered && showFeedback) nextRef.current?.focus({ preventScroll: true }); }, [answered, showFeedback]);

  const optionLabel = (o) => (question.optionType === 'shape' ? `${t(`color.${o.color}`)} ${t(`shape.${o.shape}`)}` : n(o));
  const verdict = picked === -1 ? t('quiz.time') : won ? t('quiz.right', { p: gain }) : t('quiz.wrong');

  return (
    <>
      <section className="qcard">
        <h2 className="qcard__prompt">{t(`q.${question.prompt}`)}</h2>
        <Stem stem={question.stem} />
      </section>

      <div className={cx('answers', question.optionType === 'shape' && 'answers--shapes')} role="group" aria-label={t('quiz.answers')}>
        {question.options.map((o, idx) => {
          const state = !answered ? '' : idx === question.answerIndex ? 'is-right' : idx === picked ? 'is-wrong' : 'is-dim';
          return (
            <button
              key={idx}
              type="button"
              className={cx('answer', state)}
              style={{ '--i': idx }}
              disabled={answered}
              aria-label={optionLabel(o)}
              onClick={() => onAnswer(idx)}
            >
              <span className="answer__key">{n(idx + 1)}</span>
              {question.optionType === 'shape' ? <Shape {...o} /> : <span className="answer__value">{n(o)}</span>}
              {state === 'is-right' && <span className="answer__mark">✓</span>}
              {state === 'is-wrong' && <span className="answer__mark">✗</span>}
              {answered && idx === picked && won && <Burst />}
            </button>
          );
        })}
      </div>

      {answered && showFeedback && (
        <div className={cx('feedback', won ? 'is-good' : 'is-bad')} aria-live="polite">
          <strong>{verdict}</strong>
          <p>{t(`ex.${question.explain.key}`, question.explain.params)}</p>
          <Button ref={nextRef} variant="accent" onClick={onNext}>{t(isLast ? 'quiz.results' : 'quiz.next')}</Button>
        </div>
      )}
    </>
  );
}
