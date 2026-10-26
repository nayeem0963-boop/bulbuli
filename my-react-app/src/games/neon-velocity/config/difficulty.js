import { DIFFICULTY_RAMP } from './constants.js'

/*
 * Difficulty modes. Every value is a multiplier (or override) applied on top of
 * the base tuning in constants.js, so Velocity Overdrive (hard) is exactly the
 * current game: all of its multipliers are 1 and its overrides equal the base
 * constants. Changing those base constants re-tunes all three modes together.
 *
 * Why gaps shrink in the slower modes: horizontal jump reach is
 * forward speed × air time. Easy runs at 0.6× speed, and its lower gravity buys
 * back ~37 % more air time, so its reach is ~0.82× the hard reach. gapScale
 * (0.72) keeps every gap comfortably inside that, with room to spare for late jumps.
 * Medium: 0.8× speed × ~1.1× air time ≈ 0.88× reach vs 0.86 gapScale, plus a
 * longer jump window for slack.
 *
 * Physics
 *   speedScale       forward speed vs BASE_SPEED
 *   gravityScale     multiplies GRAVITY (all phases: rise, fall, glide)
 *   jumpScale        multiplies jump, double-jump and wall-jump launch velocity
 *   riseHoldGravity  gravity scale while rising with jump held (base RISE_HOLD_GRAVITY = 0.85)
 *   fallGravity      gravity scale while falling (base FALL_GRAVITY = 1.5)
 *   jumpWindow       multiplies COYOTE_TIME and JUMP_BUFFER (wider timing windows)
 *   wallRunTime      multiplies WALLRUN_DURATION (slower runs need longer wall contact)
 * Course
 *   hazardDensity    1 = current rows; <1 spreads rows out, fewer double-lane blocks
 *   laserSpeed       multiplies laser sweep/gate oscillation speed
 *   gapScale         multiplies every gap length
 *   longGapWeight    weight of ramp / rail / wall-run segments (the long gaps)
 *   islandWidth      multiplies floating island platform width (base 3.6 m)
 *   rampDistance     metres until the course reaches its peak difficulty
 *   maxRamp          cap on the course difficulty ramp (0..1)
 * Scoring
 *   scoreMultiplier  applied to distance + crystal points
 */
export const DifficultyId = Object.freeze({ EASY: 'easy', MEDIUM: 'medium', HARD: 'hard' })

export const DIFFICULTIES = Object.freeze({
  [DifficultyId.EASY]: Object.freeze({
    id: DifficultyId.EASY,
    name: 'Chill Skyward',
    short: 'Chill',
    tagline: 'Floaty jumps, slow lasers, wide islands',
    speedScale: 0.6,
    gravityScale: 0.6,
    jumpScale: 0.82,
    riseHoldGravity: 0.75,
    fallGravity: 1.15,
    jumpWindow: 2,
    wallRunTime: 1.6,
    hazardDensity: 0.6,
    laserSpeed: 0.5,
    gapScale: 0.72,
    longGapWeight: 0.5,
    islandWidth: 1.4,
    rampDistance: 2400,
    maxRamp: 0.65,
    scoreMultiplier: 1,
  }),
  [DifficultyId.MEDIUM]: Object.freeze({
    id: DifficultyId.MEDIUM,
    name: 'Neon Surge',
    short: 'Surge',
    tagline: 'Balanced jumps, standard patterns',
    speedScale: 0.8,
    gravityScale: 0.82,
    jumpScale: 0.9,
    riseHoldGravity: 0.85,
    fallGravity: 1.35,
    jumpWindow: 1.25,
    wallRunTime: 1.25,
    hazardDensity: 1,
    laserSpeed: 1,
    gapScale: 0.86,
    longGapWeight: 1,
    islandWidth: 1.15,
    rampDistance: 1800,
    maxRamp: 1,
    scoreMultiplier: 1.5,
  }),
  [DifficultyId.HARD]: Object.freeze({
    id: DifficultyId.HARD,
    name: 'Velocity Overdrive',
    short: 'Overdrive',
    tagline: 'Full speed, sharp gravity, max hazards',
    speedScale: 1,
    gravityScale: 1,
    jumpScale: 1,
    riseHoldGravity: 0.85,
    fallGravity: 1.5,
    jumpWindow: 1,
    wallRunTime: 1,
    hazardDensity: 1,
    laserSpeed: 1,
    gapScale: 1,
    longGapWeight: 1,
    islandWidth: 1,
    rampDistance: DIFFICULTY_RAMP,
    maxRamp: 1,
    scoreMultiplier: 2,
  }),
})

/** Alias: the same table under the name used in the store/menu docs. */
export const DIFFICULTY_CONFIG = DIFFICULTIES

export const DIFFICULTY_ORDER = [DifficultyId.EASY, DifficultyId.MEDIUM, DifficultyId.HARD]
export const DEFAULT_DIFFICULTY = DifficultyId.MEDIUM

export const isDifficulty = (id) => Object.prototype.hasOwnProperty.call(DIFFICULTIES, id)

/** Tuning for a mode; unknown ids (e.g. stale localStorage) fall back to the default. */
export const difficultyConfig = (id) => DIFFICULTIES[isDifficulty(id) ? id : DEFAULT_DIFFICULTY]

export const formatMultiplier = (m) => `${m.toFixed(1)}×`
