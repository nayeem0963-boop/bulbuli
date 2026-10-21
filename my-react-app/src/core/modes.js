// Every rule that differs between game modes lives here, as data.
// The UI and the engine never check `mode === 'endless'`; they read these fields.

/** @typedef {'classic'|'endless'} ModeId */

export const MODES = {
  classic: {
    id: 'classic',
    rounds: 10,                       // fixed number of questions
    seconds: { 1: 25, 2: 20, 3: 15 }, // a fresh clock for every question
    sharedClock: false,
    autoAdvance: null,                // the player presses "Next"
  },
  endless: {
    id: 'endless',
    rounds: Infinity,
    start: 60,                        // one shared clock for the whole run
    cap: 90,
    bonus: 3,                         // seconds gained for a right answer
    penalty: 5,                       // seconds lost for a wrong one
    levelEvery: 6,                    // harder after this many right answers
    sharedClock: true,
    autoAdvance: { right: 650, wrong: 1100 }, // ms to show the answer before moving on
  },
};

export const MODE_IDS = Object.keys(MODES);

/** Level for the next question. Classic stays put; Endless climbs every few right answers. */
export function levelFor(modeId, startLevel, correct) {
  const mode = MODES[modeId];
  return mode.levelEvery ? Math.min(3, startLevel + Math.floor(correct / mode.levelEvery)) : startLevel;
}

/** Points for a right answer. `fraction` is the share of time left (classic only). */
export function pointsFor(modeId, { level, streak, fraction }) {
  if (modeId === 'endless') return 100 + (level - 1) * 25 + Math.min(streak, 8) * 10;
  return 100 + Math.round(fraction * 50) + Math.min(streak, 5) * 10;
}
