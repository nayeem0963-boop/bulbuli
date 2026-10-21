import { useState } from 'react';
import { navigate } from '../../app/router.js';
import { withQuery } from '../../app/route-utils.js';
import { CATEGORIES, LEVELS } from '../../core/questions/index.js';
import { MODE_IDS, MODES } from '../../core/modes.js';
import { useI18n } from '../../shared/i18n/index.jsx';
import { useStore } from '../../shared/hooks/useStore.js';
import Button from '../../shared/ui/Button.jsx';
import Choice from '../../shared/ui/Choice.jsx';
import Mascot, { sayKey } from '../../shared/ui/Mascot.jsx';
import { play } from '../../shared/audio/sound.js';
import { settings, setPick } from '../../state/settings.js';
import { bests, getBest } from '../../state/scores.js';
import PatternTeaser from './PatternTeaser.jsx';
import './home.css';

export default function HomeScreen() {
  const { t } = useI18n();
  const pick = useStore(settings, (s) => s.pick);
  useStore(bests); // re-render when a personal best changes
  const [pokes, setPokes] = useState(0);
  const [say, setSay] = useState(() => sayKey('hi'));

  const best = getBest(pick.mode, pick.category, pick.level);
  const start = () => navigate(withQuery(`/play/${pick.mode}`, { cat: pick.category, lvl: pick.level, run: Date.now() }));

  const poke = () => { play('chirp'); setPokes((p) => p + 1); setSay(sayKey('hi')); };

  return (
    <div className="home">
      <div className="home__stage">
        <Mascot shared tilt className="mascot--hero" mood={pokes ? 'hop' : 'idle'} pulse={pokes} say={say} onPoke={poke} />
      </div>

      <div className="home__panel">
        <header>
          <h1 className="home__title">
            {t('title').split(' ').map((word, i) => <span key={i} style={{ '--i': i }}>{word}</span>)}
          </h1>
          <p className="home__tag">{t('tag')}</p>
        </header>

        <PatternTeaser />

        <section className="home__section">
          <h2 className="section-title" id="mode-h">{t('mode.title')}</h2>
          <Choice
            label={t('mode.title')}
            value={pick.mode}
            onChange={(mode) => setPick({ mode })}
            options={MODE_IDS.map((m) => ({ value: m, label: t(`mode.${m}`), hint: t(`mode.${m}.hint`) }))}
          />
        </section>

        <section className="home__section">
          <h2 className="section-title">{t('home.topic')}</h2>
          <Choice
            label={t('home.topic')}
            value={pick.category}
            onChange={(category) => setPick({ category })}
            options={CATEGORIES.map((c) => ({ value: c, label: t(`cat.${c}`), hint: t(`cat.${c}.hint`) }))}
          />
        </section>

        <section className="home__section">
          <h2 className="section-title">{t('home.level')}</h2>
          <Choice
            size="sm"
            columns={3}
            label={t('home.level')}
            value={pick.level}
            onChange={(level) => setPick({ level })}
            options={LEVELS.map((l) => ({ value: l, label: t(`lvl.${l}`) }))}
          />
        </section>

        <div className="home__cta">
          <span className="home__glow">
            <Button variant="primary" size="lg" className="home__start" sound="start" onClick={start}>
              {pick.mode === 'endless' ? t('home.startEndless') : t('home.start', { n: MODES.classic.rounds })}
            </Button>
          </span>
          <div className="home__meta">
            <p className="home__best">{best ? t('home.best', { s: best }) : t('home.noBest')}</p>
            <Button className="home__lb" onClick={() => navigate(withQuery('/leaderboard', { mode: pick.mode, cat: pick.category, lvl: pick.level }))}>
              {t('lb.title')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
