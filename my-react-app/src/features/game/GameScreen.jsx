import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { navigate } from '../../app/router.js';
import { useI18n } from '../../shared/i18n/index.jsx';
import { useKey } from '../../shared/hooks/useKey.js';
import { play } from '../../shared/audio/sound.js';
import Mascot, { sayKey } from '../../shared/ui/Mascot.jsx';
import SwapPresence from '../../shared/ui/SwapPresence.jsx';
import { recordBest, lastResult } from '../../state/scores.js';
import { useGame } from './useGame.js';
import HudBar from './HudBar.jsx';
import TimerBar from './TimerBar.jsx';
import QuestionBlock from './QuestionBlock.jsx';
import './game.css';

export default function GameScreen({ mode, category, level }) {
  const { t } = useI18n();

  const onFinish = (summary) => {
    const { prev, isBest } = recordBest(mode, category, level, summary.score);
    lastResult.set({ result: { ...summary, mode, category, level, isBest, prevBest: prev } });
    navigate('/results');
  };

  const { state, clock, cfg, answer, next, bonus } = useGame({ mode, category, level, onFinish });

  // whole seconds left: re-renders once per second, not per frame
  const seconds = useSyncExternalStore(clock.subscribe, clock.getSecond, clock.getSecond);
  const answered = state.status === 'answered';
  const over = state.status === 'over';
  const urgent = state.status === 'playing' && seconds > 0 && seconds <= (cfg.sharedClock ? 10 : 5);
  const hurry = state.status === 'playing' && seconds > 0 && seconds <= 5;
  const won = answered && state.picked === state.question.answerIndex;

  useEffect(() => { if (hurry) play('tick'); }, [hurry, seconds]);

  // 1-4 pick an answer
  useKey((e) => {
    if (e.key >= '1' && e.key <= '4' && state.status === 'playing') answer(Number(e.key) - 1);
  });

  const say = useMemo(
    () => (answered ? sayKey(won ? 'good' : 'oops') : hurry ? sayKey('hurry') : null),
    // pick a new line when the situation changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [answered, won, hurry, state.qIndex],
  );

  return (
    <div className="game" data-mode={mode}>
      <div className="game__main">
        <HudBar state={state} cfg={cfg} seconds={seconds} urgent={urgent} bonus={bonus} onQuit={() => navigate('/')} />
        <TimerBar
          clock={clock}
          scale={cfg.sharedClock ? () => cfg.cap : () => clock.total}
          urgent={urgent}
          label={t('quiz.secs', { s: seconds })}
        />
        {cfg.sharedClock && <p className="game__rules">{t('endless.rules', { b: cfg.bonus, p: cfg.penalty })}</p>}

        <SwapPresence id={state.qIndex} className="game__swap">
          <QuestionBlock
            question={state.question}
            picked={state.picked}
            gain={state.gain}
            showFeedback={!cfg.autoAdvance}
            isLast={state.qIndex + 1 >= cfg.rounds}
            onAnswer={answer}
            onNext={next}
          />
        </SwapPresence>
      </div>

      <aside className="game__coach" aria-hidden="true">
        <Mascot shared mood={answered ? (won ? 'cheer' : 'oops') : 'idle'} pulse={state.qIndex} say={say} />
      </aside>

      {over && <div className="game__over" role="alert">{t('game.over')}</div>}
    </div>
  );
}
