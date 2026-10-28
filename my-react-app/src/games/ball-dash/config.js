// Bulbuli Ball Dash — every tuning number in one place.
// Distances are metres along the track, times are seconds, speeds are metres per second.
//
// The first minute is tuned for a child playing for the first time:
//   0–20 s   explore   slow, wide gaps, only single crates/cones to steer round
//   20–40 s  learn     one hurdle (jump) and one gate (shrink), each shown first with a hint
//   40–60 s  build     the three moves mixed, still one thing at a time, speed creeps up a little
//   60 s +   grow      gaps shorten and speed rises slowly, up to a cap
// engine.test.js plays thousands of runs with a slow, error-prone "beginner" bot to keep it that way.

export const BALL_DASH_CONFIG = Object.freeze({
  lanes: Object.freeze([-1.9, 0, 1.9]), // x of the left, centre and right lane
  laneChangeSpeed: 11, // sideways speed while changing lane (one lane ≈ 0.17 s)

  ball: Object.freeze({ radius: 0.5 }),

  speed: Object.freeze({
    initial: 6.5, // 0–40 s
    at60: 8, // eased up to this between 40 and 60 s
    rampPerSecond: 0.045, // after 60 s
    max: 14,
  }),

  jump: Object.freeze({
    duration: 0.8, // seconds in the air
    height: 1.5, // peak height of the ball's bottom
    bufferSec: 0.18, // a jump pressed this close to landing still happens on landing
  }),

  shrink: Object.freeze({
    duration: 1.15, // how long the ball stays small
    scale: 0.45, // size while small
    easeSec: 0.12, // shrinking / growing back
  }),

  // Collision forgiveness: hit boxes are this much smaller than what you see.
  forgiveness: Object.freeze({ side: 0.2, vertical: 0.14 }),

  hearts: 3,
  invulnerableSec: 2, // after a bump: blink, can't be bumped again
  heartBackAfterSec: 20, // a lost heart comes back after this long without a bump (up to `hearts`)

  // obstacle sizes (half width, height, depth); hurdles and gates span the whole track
  obstacles: Object.freeze({
    crate: Object.freeze({ halfWidth: 0.6, height: 1.2, depth: 1.1 }),
    cone: Object.freeze({ halfWidth: 0.45, height: 1.0, depth: 0.9 }),
    bumper: Object.freeze({ halfWidth: 0.55, height: 1.1, depth: 1.0 }),
    hurdle: Object.freeze({ height: 0.55, depth: 0.5 }),
    gate: Object.freeze({ clearance: 0.62, depth: 0.6 }), // the beam's underside is this high
  }),

  firstObstacleSec: 4, // nothing to dodge for the first few seconds
  spawnAhead: 75, // rows are made this far ahead of the ball (beyond the fog)
  minRowGap: 14, // never closer than this, whatever the time gap says

  // Seconds between rows at the speed the ball will have. `mix` = chance of each row type.
  phases: Object.freeze([
    Object.freeze({ name: 'explore', until: 20, gapSec: 2.9, mix: { single: 1 }, laneTypes: ['crate', 'cone'] }),
    Object.freeze({ name: 'learn', until: 40, gapSec: 2.7, mix: { single: 0.6, hurdle: 0.2, gate: 0.2 }, laneTypes: ['crate', 'cone', 'bumper'] }),
    Object.freeze({ name: 'build', until: 60, gapSec: 2.3, mix: { single: 0.45, double: 0.15, hurdle: 0.2, gate: 0.2 }, laneTypes: ['crate', 'cone', 'bumper'] }),
    Object.freeze({ name: 'grow', until: Infinity, gapSec: 2.1, mix: { single: 0.33, double: 0.27, hurdle: 0.2, gate: 0.2 }, laneTypes: ['crate', 'cone', 'bumper'] }),
  ]),
  minGapSec: 1.35, // after 60 s the gap shrinks towards this
  gapShrinkPerSecond: 0.005,

  // first hurdle and first gate are scripted, each with a hint, never back to back
  introduce: Object.freeze({ hurdleAt: 22, gateAt: 31 }),
  hintLeadSec: 3, // a hint shows this long before its row arrives

  // fairness: time needed beyond lane changes / landing, on top of what the move itself takes
  fairness: Object.freeze({ reactionSec: 0.75, landingSec: 0.6, maxActionRowsInARow: 2 }),

  stars: Object.freeze({
    lineChance: 0.8, // chance of a line of stars between two rows
    perLine: 5,
    spacing: 1.6,
    keepClear: 3, // metres kept clear of stars in front of / behind an obstacle row
    bigChance: 0.12, // a big bonus star (worth 5) instead of a line
    bigValue: 5,
    hit: Object.freeze({ x: 0.85, z: 0.8 }),
  }),

  milestones: Object.freeze({ starsAt: 10, timesAt: Object.freeze([30, 60]) }),

  maxDt: 0.05, // a slow frame slows the game instead of teleporting the ball
})
