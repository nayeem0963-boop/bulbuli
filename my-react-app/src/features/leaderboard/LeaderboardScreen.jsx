import { useMemo, useRef } from 'react';
import { navigate, useLocation } from '../../app/router.js';
import { withQuery } from '../../app/route-utils.js';
import { CATEGORIES, LEVELS } from '../../core/questions/index.js';
import { MODE_IDS } from '../../core/modes.js';
import { useI18n } from '../../shared/i18n/index.jsx';
import { useStore } from '../../shared/hooks/useStore.js';
import { useFlip } from '../../shared/hooks/useFlip.js';
import Button from '../../shared/ui/Button.jsx';
import Choice from '../../shared/ui/Choice.jsx';
import Mascot from '../../shared/ui/Mascot.jsx';
import { leaderboard, topEntries } from '../../state/scores.js';
import { cx } from '../../shared/lib/cx.js';
import './leaderboard.css';

export default function LeaderboardScreen() {
  const { t, n, lang } = useI18n();
  const { query } = useLocation();
  const entries = useStore(leaderboard, (s) => s.entries);

  // Filters live in the URL: refresh-safe, shareable, and Back steps through them.
  const mode = MODE_IDS.includes(query.get('mode')) ? query.get('mode') : 'classic';
  const category = CATEGORIES.includes(query.get('cat')) ? query.get('cat') : 'all';
  const level = LEVELS.includes(Number(query.get('lvl'))) ? Number(query.get('lvl')) : 0;
  const highlight = query.get('hl');

  const setFilter = (patch) => {
    const next = { mode, cat: category === 'all' ? '' : category, lvl: level, ...patch };
    navigate(withQuery('/leaderboard', next), { replace: true, animate: false });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => topEntries({ mode, category, level }), [entries, mode, category, level]);
  const list = useRef(null);
  useFlip(list, [rows]);

  const date = (d) => new Date(d).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short' });

  return (
    <div className="board">
      <header className="board__head">
        <div>
          <Button variant="pill" onClick={() => navigate('/')}>{t('lb.back')}</Button>
          <h1 className="board__title">{t('lb.title')}</h1>
        </div>
        <Mascot shared className="mascot--mini" mood={highlight ? 'cheer' : 'idle'} />
      </header>

      <div className="board__filters">
        <Choice size="sm" columns="auto" label={t('mode.title')} value={mode} onChange={(v) => setFilter({ mode: v })}
          options={MODE_IDS.map((m) => ({ value: m, label: t(`mode.${m}`) }))} />
        <Choice size="sm" columns="auto" label={t('home.topic')} value={category} onChange={(v) => setFilter({ cat: v === 'all' ? '' : v })}
          options={[{ value: 'all', label: t('lb.all') }, ...CATEGORIES.map((c) => ({ value: c, label: t(`cat.${c}`) }))]} />
        <Choice size="sm" columns="auto" label={t('home.level')} value={level} onChange={(v) => setFilter({ lvl: v })}
          options={[{ value: 0, label: t('lb.all') }, ...LEVELS.map((l) => ({ value: l, label: t(`lvl.${l}`) }))]} />
      </div>

      {rows.length === 0 ? (
        <p className="board__empty">{t('lb.empty')}</p>
      ) : (
        <ol className="board__list" ref={list}>
          {rows.map((e, i) => (
            <li key={e.id} data-flip-id={e.id} className={cx('row', e.id === highlight && 'is-me')} style={{ '--i': i }}>
              <span className={cx('row__rank', i < 3 && `is-top${i + 1}`)}>{n(i + 1)}</span>
              <span className="row__who">
                <strong>{e.name || t('lb.anon')}</strong>
                <small>{t(`cat.${e.category}`)} · {t(`lvl.${e.level}`)} · {date(e.date)}</small>
              </span>
              <span className="row__pts">{n(e.score)}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="board__note">{t('lb.local')}</p>
    </div>
  );
}
