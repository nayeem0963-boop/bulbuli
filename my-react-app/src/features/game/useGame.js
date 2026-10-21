import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Clock } from '../../core/clock.js';
import { gameReducer, initGame, isLastQuestion, nextQuestion, summarize } from '../../core/engine.js';
import { MODES } from '../../core/modes.js';
import { play, vibrate } from '../../shared/audio/sound.js';

const RUN_END_DELAY = 1300; // ms the "Time's up" card stays before the results screen

/**
 * One hook runs both game modes. Everything that differs lives in MODES (core/modes.js).
 *
 *   const { state, clock, answer, next, bonus } = useGame({ mode, category, level, onFinish })
 *
 * - `state` is the pure reducer state from core/engine.js
 * - `clock` is a core/Clock; read it with useSyncExternalStore or a rAF loop
 * - `answer(i)` is safe to call twice (keyboard + click); only the first counts
 * - `bonus` is the last +/- seconds change in Endless, for the floating label
 */
export function useGame({ mode, category, level, onFinish }) {
  const cfg = MODES[mode];
  const [state, dispatch] = useReducer(gameReducer, { mode, category, level }, initGame);
  const [bonus, setBonus] = useState(null);

  // Handlers fired by timers or key presses read the newest state through this ref.
  const latest = useRef({ state, onFinish });
  useEffect(() => { latest.current = { state, onFinish }; });

  const locked = useRef(false);   // true between an answer and the next question
  const ended = useRef(false);
  const timers = useRef(new Set());
  const later = useCallback((fn, ms) => {
    const id = setTimeout(() => { timers.current.delete(id); fn(); }, ms);
    timers.current.add(id);
  }, []);
  const clearTimers = useCallback(() => { timers.current.forEach(clearTimeout); timers.current.clear(); }, []);

  const expire = useRef(() => {});
  const [clock] = useState(() => new Clock({ cap: cfg.cap, onExpire: () => expire.current() }));

  const finish = useCallback(() => {
    const { state: s, onFinish: done } = latest.current;
    done(summarize(s));
  }, []);

  const advance = useCallback(() => {
    const s = latest.current.state;
    if (ended.current) return;
    if (isLastQuestion(s)) { ended.current = true; finish(); return; }
    locked.current = false;
    dispatch({ type: 'NEXT', question: nextQuestion(s) });
    if (cfg.sharedClock) clock.resume();
    else clock.start(cfg.seconds[s.level]);
  }, [clock, cfg, finish]);

  const answer = useCallback((idx) => {
    if (locked.current || ended.current) return;
    locked.current = true;
    const s = latest.current.state;
    const right = idx === s.question.answerIndex;
    const fraction = clock.fraction();

    clock.pause();
    dispatch({ type: 'ANSWER', idx, fraction });
    play(right ? 'correct' : 'wrong', right ? s.streak : undefined);
    if (!right) vibrate(60);

    if (cfg.sharedClock) {
      const delta = right ? cfg.bonus : -cfg.penalty;
      setBonus({ delta, id: performance.now() });
      clock.add(delta); // may expire the run, see `expire`
    }
    if (cfg.autoAdvance && !ended.current) later(advance, right ? cfg.autoAdvance.right : cfg.autoAdvance.wrong);
  }, [clock, cfg, later, advance]);

  // The clock hit zero: classic counts it as a missed answer, endless ends the run.
  useEffect(() => {
    expire.current = () => {
      if (ended.current) return;
      if (!cfg.sharedClock) { answer(-1); return; }
      ended.current = true;
      locked.current = true;
      clearTimers();
      dispatch({ type: 'FINISH' });
      play('over');
      later(finish, RUN_END_DELAY);
    };
  });

  useEffect(() => {
    clock.start(cfg.sharedClock ? cfg.start : cfg.seconds[level]);
    return () => { clock.dispose(); clearTimers(); };
    // The clock object is created once per run; level and cfg are fixed for the lifetime of this hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock]);

  return { state, clock, cfg, answer, next: advance, bonus };
}
