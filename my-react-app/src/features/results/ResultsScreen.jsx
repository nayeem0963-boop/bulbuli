import { useEffect, useMemo, useState } from 'react';
import { navigate } from '../../app/router.js';
import { withQuery } from '../../app/route-utils.js';
import { useI18n } from '../../shared/i18n/index.jsx';
import { useStore } from '../../shared/hooks/useStore.js';
import { useCountUp } from '../../shared/hooks/useCountUp.js';
import { play } from '../../shared/audio/sound.js';
import Button from '../../shared/ui/Button.jsx';
import Mascot, { sayKey } from '../../shared/ui/Mascot.jsx';
import { Confetti } from '../../shared/ui/Particles.jsx';
import { addEntry, lastResult } from '../../state/scores.js';
import { settings } from '../../state/settings.js';
import './results.css';

export default function ResultsScreen() {
  const { t, n } = useI18n();
  const result = useStore(lastResult, (s) => s.result);

  // Opened directly (or after the tab was closed): nothing to show, go home.
  useEffect(() => { if (!result) navigate('/', { replace: true, animate: false }); }, [result]);
  if (!result) return null;
  return <Body result={result} t={t} n={n} />;
}

function Body({ result, t, n }) {
  const { score, correct, total, bestStreak, mode, category, level, isBest, prevBest } = result;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const cheer = pct >= 70;
  const shown = useCountUp(score, { duration: 900 });
  const say = useMemo(() => sayKey(cheer ? 'win' : 'try'), [cheer]);

  const [name, setName] = useState(() => localStorage.getItem('bulbuli:name') || '');
  const [saved, setSaved] = useState(null);

  useEffect(() => { play(cheer ? 'win' : 'click'); }, [cheer]);

  const save = (e) => {
    e.preventDefault();
    play('start');
    const trimmed = name.trim().slice(0, 16);
    try { localStorage.setItem('bulbuli:name', trimmed); } catch { /* storage blocked */ }
    setSaved(addEntry({ name: trimmed, score, mode, category, level, correct, total }));
  };

  const again = () => navigate(withQuery(`/play/${mode}`, { cat: category, lvl: level, run: Date.now() }));
  const board = (hl) => navigate(withQuery('/leaderboard', { mode, cat: category, lvl: level, hl }));
  const message = t(pct >= 90 ? 'res.m90' : pct >= 70 ? 'res.m70' : pct >= 40 ? 'res.m40' : 'res.m0');
  const sub = `${t('res.points')}${isBest ? ` · ${t('res.newBest')}` : prevBest ? ` · ${t('res.best', { s: prevBest })}` : ''}`;
  const stats = [
    [`${correct}/${total}`, 'res.correct'],
    [`${pct}%`, 'res.accuracy'],
    [bestStreak, 'res.streak'],
  ];

  return (
    <div className="results">
      {cheer && <Confetti />}
      <div className="results__stage">
        <Mascot shared mood={cheer ? 'cheer' : 'idle'} say={say} className="mascot--hero" />
      </div>

      <div className="results__body">
        <p className="results__mode">
          {t(`cat.${category}`)} · {t(`lvl.${level}`)}{mode === 'endless' ? ` · ${t('mode.endless')}` : ''}
        </p>
        <h1 className="results__headline">{message}</h1>
        <p className="results__score" aria-label={`${n(score)} ${t('res.points')}`}>{n(shown)}</p>
        <p className="results__sub">{sub}</p>

        <div className="results__stats">
          {stats.map(([value, label], i) => (
            <div className="stat" key={label} style={{ '--i': i }}>
              <strong>{n(value)}</strong>
              <span>{t(label)}</span>
            </div>
          ))}
        </div>

        {score > 0 && (saved ? (
          <p className="save" role="status"><strong>{saved.rank ? t('lb.saved', { r: saved.rank }) : t('lb.savedNoRank')}</strong></p>
        ) : (
          <form className="save" onSubmit={save}>
            <label htmlFor="player-name">{t('lb.name')}</label>
            <input id="player-name" value={name} maxLength={16} autoComplete="off" placeholder={t('lb.anon')} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" variant="accent" sound={false}>{t('lb.save')}</Button>
          </form>
        ))}

        <div className="results__actions">
          <Button variant="primary" size="lg" sound="start" onClick={again}>{t('res.again')}</Button>
          <Button onClick={() => navigate('/')}>{t('res.change')}</Button>
          <Button onClick={() => board(saved?.id)}>{t('lb.title')}</Button>
        </div>
      </div>
    </div>
  );
}
