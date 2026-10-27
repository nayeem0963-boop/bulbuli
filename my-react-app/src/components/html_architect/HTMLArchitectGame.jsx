/**
 * Bulbuli's HTML Architect 3D — game shell
 *
 * Layout: header (progress, stars, level nav, Check Code) above a split view:
 * 3D canvas on the left (60%), code workspace on the right (40%). Stacks
 * vertically on narrow screens.
 *
 * Progress (code per level, best stars, completed levels) is saved to
 * localStorage so a refresh doesn't lose work.
 *
 * Stars for a level: start at 3, lose one for using 2+ hints, lose one for
 * 2+ failed checks (minimum 1). The best result is kept.
 *
 * Props (all optional):
 *   onLevelComplete({ levelId, stars })  — e.g. to save XP / stars to the app's progress store
 *   storageKey                            — localStorage key for code-in-progress (use one per player)
 *   savedStars    { [levelId]: stars }    — stars already saved elsewhere; merged with local ones
 *   muted         boolean                 — follow an app-wide sound switch (hides the built-in mute button)
 *   inPage        boolean                 — sized to sit under an app header instead of filling the window
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HTMLArchitectCanvas from './HTMLArchitectCanvas';
import WorkspaceEditor from './WorkspaceEditor';
import { LEVELS } from './levelsData';
import { validateHTML } from './htmlValidator';
import './HTMLArchitect.css';

/* ================================================================== */
/* Sound — tiny WebAudio synth, no audio files needed                   */
/* ================================================================== */

function createSound() {
  let ctx = null;
  const get = () => {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };

  const tone = (freq, start, dur, { type = 'sine', gain = 0.15, slideTo } = {}) => {
    const ac = get();
    if (!ac || ac.state !== 'running') return;
    const t0 = ac.currentTime + start;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  };

  return {
    unlock: get, // call from a click so browsers allow audio
    pop: () => tone(420, 0, 0.16, { type: 'triangle', slideTo: 900, gain: 0.12 }),
    success: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.11, 0.35, { type: 'triangle', gain: 0.14 })),
    fail: () => { tone(330, 0, 0.18, { type: 'sine', gain: 0.1 }); tone(262, 0.15, 0.25, { type: 'sine', gain: 0.1 }); },
  };
}

/* ================================================================== */
/* Confetti — canvas overlay                                            */
/* ================================================================== */

function Confetti({ fireKey }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!fireKey) return undefined;
    const canvas = ref.current;
    if (!canvas) return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const colors = ['#ff3ea5', '#2ef2ff', '#ffd34d', '#7b6cff', '#6bd16b', '#ff8f5a'];
    const parts = Array.from({ length: reduced ? 40 : 160 }, (_, i) => ({
      x: width / 2 + (Math.random() - 0.5) * 80,
      y: height * 0.55,
      vx: (Math.random() - 0.5) * 14,
      vy: -8 - Math.random() * 10,
      size: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: colors[i % colors.length],
      shape: i % 3,
    }));

    let raf = 0;
    const start = performance.now();
    const frame = (now) => {
      const age = (now - start) / 1000;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 2) / 1.2);
      parts.forEach((p) => {
        p.vy += 0.35;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(0, -p.size / 2); ctx.lineTo(p.size / 2, p.size / 2); ctx.lineTo(-p.size / 2, p.size / 2); ctx.fill(); }
        ctx.restore();
      });
      if (age < 3.2) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, width, height);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [fireKey]);
  return <canvas ref={ref} className="ha-confetti" aria-hidden="true" />;
}

/* ================================================================== */
/* Persistence                                                          */
/* ================================================================== */

const DEFAULT_KEY = 'bulbuli-html-architect-v1';

function loadProgress(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const p = JSON.parse(raw);
      return { codes: p.codes || {}, stars: p.stars || {}, levelIndex: p.levelIndex || 0, muted: !!p.muted };
    }
  } catch { /* storage blocked or corrupt — start fresh */ }
  return { codes: {}, stars: {}, levelIndex: 0, muted: false };
}

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

const Stars = ({ count, max = 3, size = 'md' }) => (
  <span className={`ha-stars ha-stars--${size}`} aria-label={`${count} of ${max} stars`}>
    {Array.from({ length: max }, (_, i) => (
      <span key={i} className={i < count ? 'ha-star ha-star--on' : 'ha-star'} aria-hidden="true">★</span>
    ))}
  </span>
);

/* ================================================================== */
/* Game                                                                 */
/* ================================================================== */

export default function HTMLArchitectGame({
  onLevelComplete, storageKey = DEFAULT_KEY, savedStars, muted: mutedProp, inPage = false,
}) {
  const initial = useMemo(() => loadProgress(storageKey), [storageKey]);
  const [levelIndex, setLevelIndex] = useState(Math.min(initial.levelIndex, LEVELS.length - 1));
  const [codes, setCodes] = useState(initial.codes);
  const [localStars, setStars] = useState(initial.stars);
  const [localMuted, setMuted] = useState(initial.muted);
  const soundControlled = typeof mutedProp === 'boolean';
  const muted = soundControlled ? mutedProp : localMuted;
  // Best of what this component saved and what the app's progress store has
  const stars = useMemo(() => {
    const merged = { ...localStars };
    Object.entries(savedStars || {}).forEach(([id, n]) => { merged[id] = Math.max(merged[id] || 0, n || 0); });
    return merged;
  }, [localStars, savedStars]);
  const [checkState, setCheckState] = useState(null);
  const [celebration, setCelebration] = useState(null); // { stars, key }
  const [shake, setShake] = useState(0);
  const attempt = useRef({ hints: 0, fails: 0 });

  const sound = useMemo(createSound, []);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const play = useCallback((name) => { if (!mutedRef.current) sound[name](); }, [sound]);

  const level = LEVELS[levelIndex];
  const code = codes[level.id] ?? level.starterCode;

  // Highest level you can open: one past the last completed level
  const unlockedUpTo = useMemo(() => {
    let i = 0;
    while (i < LEVELS.length - 1 && stars[LEVELS[i].id]) i += 1;
    return i;
  }, [stars]);
  const totalStars = Object.values(stars).reduce((a, b) => a + b, 0);

  /* ---------- live validation (debounced so errors don't flash mid-word) ---------- */
  // Debounce a string (not an object) so the value is stable between renders
  const debouncedKey = useDebounced(`${level.id}\u0000${code}`, 300);
  const sep = debouncedKey.indexOf('\u0000');
  const debouncedLevelId = Number(debouncedKey.slice(0, sep));
  const validation = useMemo(() => {
    const lvl = LEVELS.find((l) => l.id === debouncedLevelId);
    if (!lvl) return null;
    try {
      return validateHTML(debouncedKey.slice(sep + 1), lvl);
    } catch (err) {
      console.error('[HTML Architect] validation failed', err);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKey]);
  // Only feed the editor/canvas results that belong to the current level
  const currentValidation = debouncedLevelId === level.id ? validation : null;

  /* ---------- persistence ---------- */
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ codes, stars: localStars, levelIndex, muted: localMuted }));
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(id);
  }, [codes, localStars, levelIndex, localMuted, storageKey]);

  /* ---------- level switching ---------- */
  const goTo = (index) => {
    if (index < 0 || index > unlockedUpTo || index >= LEVELS.length) return;
    setLevelIndex(index);
    setCheckState(null);
    setCelebration(null);
    attempt.current = { hints: 0, fails: 0 };
  };

  const setCode = (next) => setCodes((c) => ({ ...c, [level.id]: next }));
  const resetCode = () => {
    setCodes((c) => {
      const { [level.id]: _, ...rest } = c;
      return rest;
    });
    setCheckState(null);
  };

  /* ---------- Run / Check ---------- */
  const check = () => {
    sound.unlock();
    const result = validateHTML(code, level);
    if (result.isValid) {
      const { hints, fails } = attempt.current;
      const earned = Math.max(1, 3 - (hints >= 2 ? 1 : 0) - (fails >= 2 ? 1 : 0));
      const previousBest = stars[level.id] || 0;
      setStars((s) => ({ ...s, [level.id]: Math.max(s[level.id] || 0, earned) }));
      setCheckState({ status: 'pass', code, result });
      setCelebration({ stars: earned, key: Date.now() });
      play('success');
      onLevelComplete?.({ levelId: level.id, stars: earned, previousBest });
    } else {
      attempt.current.fails += 1;
      setCheckState({ status: 'fail', code, result });
      setShake((n) => n + 1);
      play('fail');
    }
  };

  // Ctrl/Cmd + Enter runs the check
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('ha-check-btn')?.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isLast = levelIndex === LEVELS.length - 1;

  return (
    <div className={`ha-game${inPage ? ' ha-game--in-page' : ''}`}>
      {/* ---------------- Header ---------------- */}
      <header className="ha-header">
        <div className="ha-brand">
          <span className="ha-brand-mark" aria-hidden="true">🏗️</span>
          <div>
            <h1>Bulbuli&apos;s HTML Architect</h1>
            <p className="ha-level-title">Level {level.id}: {level.title}</p>
          </div>
        </div>

        <nav className="ha-progress" aria-label="Levels">
          <button type="button" className="ha-icon-btn" onClick={() => goTo(levelIndex - 1)} disabled={levelIndex === 0} aria-label="Previous level">‹</button>
          <ol className="ha-dots">
            {LEVELS.map((l, i) => {
              const locked = i > unlockedUpTo;
              const done = !!stars[l.id];
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    className={`ha-dot${i === levelIndex ? ' ha-dot--active' : ''}${done ? ' ha-dot--done' : ''}`}
                    onClick={() => goTo(i)}
                    disabled={locked}
                    aria-current={i === levelIndex ? 'step' : undefined}
                    aria-label={`Level ${l.id}: ${l.title}${locked ? ' (locked)' : done ? `, ${stars[l.id]} stars` : ''}`}
                    title={l.title}
                  >
                    {locked ? '🔒' : l.id}
                  </button>
                  <Stars count={stars[l.id] || 0} size="xs" />
                </li>
              );
            })}
          </ol>
          <button type="button" className="ha-icon-btn" onClick={() => goTo(levelIndex + 1)} disabled={levelIndex >= unlockedUpTo} aria-label="Next level">›</button>
        </nav>

        <div className="ha-header-actions">
          <div className="ha-total-stars" title="Total stars">
            <span className="ha-star ha-star--on" aria-hidden="true">★</span>
            <span>{totalStars}<small>/{LEVELS.length * 3}</small></span>
          </div>
          {!soundControlled && (
            <button
              type="button"
              className="ha-icon-btn"
              onClick={() => { sound.unlock(); setMuted((m) => !m); }}
              aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
              aria-pressed={!muted}
            >
              {muted ? '🔇' : '🔊'}
            </button>
          )}
          <button
            id="ha-check-btn"
            type="button"
            key={shake}
            className={`ha-btn ha-btn--primary${shake && checkState?.status === 'fail' ? ' ha-shake' : ''}`}
            onClick={check}
            title="Check Code (Ctrl+Enter)"
          >
            ▶ Check Code
          </button>
        </div>
      </header>

      {/* ---------------- Split view ---------------- */}
      <main className="ha-split">
        <div className="ha-stage">
          <HTMLArchitectCanvas
            validation={currentValidation}
            height="100%"
            style={{ borderRadius: 0 }}
            onObjectSpawn={() => play('pop')}
          />
          <Confetti fireKey={celebration?.key} />

          {celebration && (
            <div className="ha-win" role="dialog" aria-labelledby="ha-win-title">
              <h2 id="ha-win-title">{isLast ? 'You built it all!' : 'Level complete!'}</h2>
              <Stars count={celebration.stars} size="lg" />
              <p>
                {celebration.stars === 3
                  ? 'Perfect build! Bulbuli is doing a happy dance.'
                  : 'Great job! Replay with fewer hints and checks for 3 stars.'}
              </p>
              <div className="ha-win-actions">
                <button type="button" className="ha-btn" onClick={() => setCelebration(null)}>Keep building</button>
                {!isLast && (
                  <button type="button" className="ha-btn ha-btn--primary" onClick={() => goTo(levelIndex + 1)}>
                    Next level ›
                  </button>
                )}
              </div>
            </div>
          )}

          <p className="ha-stage-hint" aria-hidden="true">Drag to look around · Scroll to zoom</p>
        </div>

        <div className="ha-workspace">
          <WorkspaceEditor
            level={level}
            code={code}
            onChange={(next) => { setCode(next); if (celebration) setCelebration(null); }}
            validation={currentValidation}
            checkState={checkState}
            onHintUsed={() => { attempt.current.hints += 1; }}
            onReset={resetCode}
          />
        </div>
      </main>
    </div>
  );
}
