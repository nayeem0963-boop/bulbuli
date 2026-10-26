import React, { lazy, Suspense, useEffect, useRef } from 'react';
import { CATEGORIES, LEVELS } from '../core/questions/index.js';
import { MODES } from '../core/modes.js';
import { useI18n } from '../shared/i18n/index.jsx';
import { useStore } from '../shared/hooks/useStore.js';
import Backdrop from '../shared/ui/Backdrop.jsx';
import Button from '../shared/ui/Button.jsx';
import FullscreenButton from '../shared/ui/FullscreenButton.jsx';
import { settings, setMuted } from '../state/settings.js';
import HomeScreen from '../features/home/HomeScreen.jsx';
import GameScreen from '../features/game/GameScreen.jsx';
import ResultsScreen from '../features/results/ResultsScreen.jsx';
import { navigate, useLocation } from './router.js';
import { resolve } from './route-utils.js';
import './shell.css';

import VehicleGame from '../components/3d_procedural_driving_game';

// The leaderboard is only needed on demand, so it ships as its own chunk.
const loadLeaderboard = () => import('../features/leaderboard/LeaderboardScreen.jsx');
const LeaderboardScreen = lazy(loadLeaderboard);
const ROUTES = [
  { path: '/', titleKey: null, render: () => <VehicleGame /> },
  { path: '/drive', titleKey: null, render: () => <VehicleGame /> },
  {
    path: '/play/:mode',
    titleKey: null,
    render: ({ params, query }) => {
      const mode = params.mode in MODES ? params.mode : null;
      const category = CATEGORIES.includes(query.get('cat')) ? query.get('cat') : 'mixed';
      const level = LEVELS.includes(Number(query.get('lvl'))) ? Number(query.get('lvl')) : 1;
      if (!mode) return <Redirect to="/" />;
      return <GameScreen key={query.get('run') || '0'} mode={mode} category={category} level={level} />;
    },
  },
  { path: '/results', titleKey: null, render: () => <ResultsScreen /> },
  { path: '/leaderboard', titleKey: 'lb.title', render: () => <LeaderboardScreen /> },
];
function Redirect({ to }) {
  useEffect(() => { navigate(to, { replace: true, animate: false }); }, [to]);
  return null;
}

export default function App() {
  const { t, lang, setLang } = useI18n();
  const muted = useStore(settings, (s) => s.muted);
  const { path, query } = useLocation();
  const match = resolve(ROUTES, path);
  const screen = useRef(null);
  const first = useRef(true);

  // Warm the leaderboard chunk when the browser is idle, so opening it never shows a spinner.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1500));
    idle(loadLeaderboard);
  }, []);

  // Tab title follows the screen; focus moves to the new screen for keyboard and screen-reader users.
  useEffect(() => {
    const sub = match?.route.titleKey ? `${t(match.route.titleKey)} · ` : '';
    document.title = `${sub}${t('title')}`;
  }, [match, t, lang]);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    screen.current?.focus({ preventScroll: true });
  }, [path]);

  return (
    <div className="shell">
      <Backdrop />
      <a className="skip" href="#main">{t('nav.skip')}</a>

      <header className="topbar">
        <FullscreenButton />
        <Button variant="pill" lang={lang === 'en' ? 'bn' : 'en'} onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}>
          {t('lang.other')}
        </Button>
        <Button variant="pill" aria-pressed={!muted} onClick={() => setMuted(!muted)}>
          {t(muted ? 'sound.off' : 'sound.on')}
        </Button>
      </header>

      <main id="main" className="screen" ref={screen} tabIndex={-1}>
        <Suspense fallback={null}>
          {match ? match.route.render({ params: match.params, query }) : <Redirect to="/" />}
        </Suspense>
      </main>
    </div>
  );
}