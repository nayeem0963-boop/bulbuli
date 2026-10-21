import { MODES, levelFor, pointsFor } from './modes.js';
import { makeQuestion, makeRound } from './questions/index.js';

/**
 * @typedef {{
 *   mode: 'classic'|'endless', category: string, startLevel: number, level: number,
 *   status: 'playing'|'answered'|'over',
 *   round: import('./questions/constants.js').Question[] | null,
 *   qIndex: number, question: import('./questions/constants.js').Question,
 *   picked: number | null,            // option index, -1 = ran out of time
 *   score: number, correct: number, total: number, streak: number, bestStreak: number, gain: number,
 * }} GameState
 */

/** Build the first state. Random generation happens here, once, so the reducer stays pure. */
export function initGame({ mode, category, level, rng }) {
  const round = mode === 'classic' ? makeRound(category, level, MODES.classic.rounds, rng) : null;
  return {
    mode, category, startLevel: level, level,
    status: 'playing',
    round,
    qIndex: 0,
    question: round ? round[0] : makeQuestion(category, level, rng),
    picked: null,
    score: 0, correct: 0, total: 0, streak: 0, bestStreak: 0, gain: 0,
  };
}

/** The question that should follow `state` (call it, then dispatch NEXT with the result). */
export function nextQuestion(state, rng) {
  return state.round ? state.round[state.qIndex + 1] : makeQuestion(state.category, state.level, rng);
}

export const isLastQuestion = (state) => state.qIndex + 1 >= MODES[state.mode].rounds;

export const summarize = (s) => ({ score: s.score, correct: s.correct, total: s.total, bestStreak: s.bestStreak });

/**
 * Actions:
 *  ANSWER { idx, fraction }   idx -1 means the clock ran out
 *  NEXT   { question }
 *  FINISH                     the run is over (Endless clock hit zero)
 * @param {GameState} state
 */
export function gameReducer(state, action) {
  switch (action.type) {
    case 'ANSWER': {
      if (state.status !== 'playing') return state;
      const right = action.idx === state.question.answerIndex;
      const gain = right ? pointsFor(state.mode, { level: state.level, streak: state.streak, fraction: action.fraction }) : 0;
      const streak = right ? state.streak + 1 : 0;
      const correct = state.correct + (right ? 1 : 0);
      return {
        ...state,
        status: 'answered',
        picked: action.idx,
        gain, streak, correct,
        score: state.score + gain,
        total: state.total + 1,
        bestStreak: Math.max(state.bestStreak, streak),
        level: levelFor(state.mode, state.startLevel, correct),
      };
    }
    case 'NEXT':
      if (state.status === 'over') return state;
      return { ...state, status: 'playing', picked: null, gain: 0, qIndex: state.qIndex + 1, question: action.question };
    case 'FINISH':
      return { ...state, status: 'over' };
    default:
      return state;
  }
}
