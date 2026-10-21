import { useI18n } from '../../shared/i18n/index.jsx';
import { useCountUp } from '../../shared/hooks/useCountUp.js';
import Button from '../../shared/ui/Button.jsx';
import { cx } from '../../shared/lib/cx.js';

/** Top row of the game: quit, progress or clock, score, streak, level. */
export default function HudBar({ state, cfg, seconds, urgent, bonus, onQuit }) {
  const { t } = useI18n();
  const score = useCountUp(state.score, { duration: 550 });
  const endless = cfg.sharedClock;

  return (
    <div className="hud">
      <Button variant="pill" className="hud__quit" onClick={onQuit}>{t('quiz.quit')}</Button>

      {endless ? (
        <span className="hud__clockwrap">
          <span className={cx('pill pill--clock', urgent && 'is-urgent')}>{t('endless.time', { s: seconds })}</span>
          {bonus && (
            <span key={bonus.id} className={cx('hud__delta', bonus.delta > 0 ? 'is-good' : 'is-bad')}>
              {t('endless.sec', { s: `${bonus.delta > 0 ? '+' : '−'}${Math.abs(bonus.delta)}` })}
            </span>
          )}
        </span>
      ) : (
        <span className="pill">{t('quiz.qOf', { i: state.qIndex + 1, n: cfg.rounds })}</span>
      )}

      <span key={`s${state.score}`} className={cx('pill', state.score > 0 && 'is-bump')}>{t('quiz.score', { s: score })}</span>
      <span key={`k${state.streak}`} className={cx('pill', state.streak >= 3 ? 'is-hot' : state.streak > 0 && 'is-bump')}>
        {t('quiz.streak', { s: state.streak })}
      </span>
      {endless && (
        <span key={`l${state.level}`} className={cx('pill', state.level > state.startLevel && 'is-hot')}>
          {t('endless.level', { l: t(`lvl.${state.level}`) })}
        </span>
      )}
    </div>
  );
}
