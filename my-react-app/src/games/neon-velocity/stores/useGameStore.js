import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import {
  ACCELERATION, BASE_SPEED, HIT_METER_LOSS, HIT_MULTIPLIER_LOSS, MAX_HEARTS,
  MAX_SPEED_MULTIPLIER, SPEED_TIER_STEP, STEERING_MODES, SURGE_DURATION, SURGE_SPEED,
} from '../config/constants'
import {
  DEFAULT_DIFFICULTY, DIFFICULTY_ORDER, DifficultyId, difficultyConfig, isDifficulty,
} from '../config/difficulty'
import { EV, GameEvents } from '../systems/events'
import { ghostRecorder, runStats } from '../systems/runStats'
import { highlightRecorder } from '../clip/highlightRecorder'
import { CourseMode, courseFor } from '../services/course'
import { resetInput } from './inputStore'
import { resetRuntime, runtime } from './runtime'

export const GameStatus = Object.freeze({
  START: 'START',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
})

export const DeathCause = Object.freeze({ FALL: 'fall', CRASH: 'crash' })

// ── Persistence helpers ──
const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : JSON.parse(v)
  } catch { return fallback }
}
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}

const defaultQuality = () => {
  if (typeof window === 'undefined') return 'high'
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const weakCpu = (navigator.hardwareConcurrency || 8) <= 4
  return coarse || weakCpu ? 'low' : 'high'
}

const freshRun = () => ({
  distance: 0,
  speedMultiplier: 1,
  speedTier: 0,
  crystals: 0,
  crystalPoints: 0,
  score: 0,
  hearts: MAX_HEARTS,
  boostMeter: 0,          // "energy" 0..1 — filled by collectibles, drained during Neon Surge
  boosting: false,        // Neon Surge active
  surgeCount: 0,
  playerMode: 'RUN',
  hitCount: 0,
  isNewBest: false,
  deathCause: null,
})

// ── Difficulty ──
const initialDifficulty = () => {
  const saved = load('neonVelocity.difficulty', DEFAULT_DIFFICULTY)
  return isDifficulty(saved) ? saved : DEFAULT_DIFFICULTY
}

/**
 * Personal bests, one per difficulty. The single pre-difficulty best was set
 * with Overdrive physics, so it seeds the hard slot (at 1×, so it's easy to beat).
 */
const loadBestScores = () => {
  const saved = load('neonVelocity.bestScores', null)
  const bests = Object.fromEntries(DIFFICULTY_ORDER.map((id) => [id, Number(saved?.[id]) || 0]))
  if (!saved) bests[DifficultyId.HARD] = load('neonVelocity.bestScore', 0)
  return bests
}

/** Distance + crystal points, scaled by the mode's multiplier. */
export const scoreFor = (distance, crystalPoints, difficulty) =>
  Math.floor((Math.floor(distance) + crystalPoints) * difficultyConfig(difficulty).scoreMultiplier)

const tierOf = (m) => Math.floor((m - 1) / SPEED_TIER_STEP + 1e-6)

export const useGameStore = create(
  subscribeWithSelector((set, get) => ({
    status: GameStatus.START,
    runId: 0,
    // ── Difficulty (chosen on the start screen; locked for the duration of a run) ──
    difficulty: initialDifficulty(),                           // 'easy' | 'medium' | 'hard'
    bestScores: loadBestScores(),                              // { easy, medium, hard }
    bestScore: 0,                                              // best for the current difficulty (kept in sync)
    steeringMode: STEERING_MODES.LANES,

    // ── Course / competition ──
    courseMode: load('neonVelocity.courseMode', CourseMode.DAILY),  // 'daily' | 'endless'
    raceGhost: load('neonVelocity.raceGhost', 'pb'),                 // 'off' | 'pb' | 'top' (daily only)
    course: null,                                              // { mode, seed, boardId, label } of the current run
    lastRun: null,                                             // summary built at game over

    // ── Settings (persisted) ──
    muted: load('neonVelocity.muted', false),
    musicVolume: load('neonVelocity.musicVolume', 0.7),
    sfxVolume: load('neonVelocity.sfxVolume', 0.85),
    vfxQuality: load('neonVelocity.vfxQuality', null) ?? defaultQuality(), // 'high' | 'low'

    ...freshRun(),

    // ── Transitions ──
    start: () => {
      resetInput()
      resetRuntime()
      runStats.reset()
      ghostRecorder.reset()
      highlightRecorder.reset()
      const course = courseFor(get().courseMode, get().difficulty)
      set((s) => ({ ...freshRun(), course, lastRun: null, status: GameStatus.PLAYING, runId: s.runId + 1 }))
    },
    pause: () => {
      if (get().status === GameStatus.PLAYING) set({ status: GameStatus.PAUSED })
    },
    resume: () => {
      if (get().status === GameStatus.PAUSED) {
        resetInput()
        set({ status: GameStatus.PLAYING })
      }
    },
    togglePause: () => {
      const { status, pause, resume } = get()
      if (status === GameStatus.PLAYING) pause()
      else if (status === GameStatus.PAUSED) resume()
    },
    endGame: (cause = DeathCause.CRASH) => {
      const s = get()
      if (s.status !== GameStatus.PLAYING) return
      const difficulty = s.course?.difficulty ?? s.difficulty
      const previousBest = s.bestScores[difficulty] ?? 0
      const isNewBest = s.score > previousBest
      const bestScores = isNewBest ? { ...s.bestScores, [difficulty]: s.score } : s.bestScores
      if (isNewBest) save('neonVelocity.bestScores', bestScores)
      if (s.boosting) GameEvents.emit(EV.SURGE_END)
      highlightRecorder.finalize()
      const lastRun = {
        ...runStats.snapshot(),
        score: s.score,
        distance: s.distance,
        crystals: s.crystals,
        surges: s.surgeCount,
        timeMs: runtime.gameTime * 1000,
        cause,
        mode: s.course?.mode,
        difficulty,
        scoreMultiplier: difficultyConfig(difficulty).scoreMultiplier,
        seed: s.course?.seed,
        boardId: s.course?.boardId ?? `endless-${difficulty}`,
        courseLabel: s.course?.label,
        endedAt: Date.now(),
      }
      set({
        status: GameStatus.GAME_OVER,
        deathCause: cause,
        isNewBest,
        bestScores,
        bestScore: bestScores[s.difficulty] ?? 0,
        boosting: false,
        lastRun,
      })
    },
    goToMenu: () => {
      resetInput()
      resetRuntime()
      set((s) => ({ ...freshRun(), status: GameStatus.START, runId: s.runId + 1 }))
    },

    // ── Per-frame (called by PlayerPhysics) ──
    advance: (dt, distance) => {
      const s = get()

      // Eased speed curve: fast early gains that taper toward the cap
      const headroom = (MAX_SPEED_MULTIPLIER - s.speedMultiplier) / (MAX_SPEED_MULTIPLIER - 1)
      const speedMultiplier = Math.min(
        MAX_SPEED_MULTIPLIER,
        s.speedMultiplier + ACCELERATION * dt * (0.35 + headroom),
      )
      const speedTier = tierOf(speedMultiplier)
      if (speedTier > s.speedTier) GameEvents.emit(EV.SPEED_UP, { tier: speedTier, multiplier: speedMultiplier })

      // Neon Surge drains the meter
      let { boostMeter, boosting } = s
      if (boosting) {
        boostMeter -= dt / SURGE_DURATION
        if (boostMeter <= 0) {
          boostMeter = 0
          boosting = false
          GameEvents.emit(EV.SURGE_END)
        }
      }

      set({
        speedMultiplier,
        speedTier: Math.max(s.speedTier, speedTier),
        distance,
        score: scoreFor(distance, s.crystalPoints, s.difficulty),
        boostMeter,
        boosting,
      })
    },
    setPlayerMode: (playerMode) => {
      if (get().playerMode !== playerMode) set({ playerMode })
    },

    // ── Gameplay events ──
    /** Pickups add score and energy. A full meter auto-triggers Neon Surge. */
    collect: (points, meterFill) => {
      const s = get()
      const boostMeter = s.boosting ? s.boostMeter : Math.min(1, s.boostMeter + meterFill)
      const triggerSurge = !s.boosting && boostMeter >= 1
      set({
        crystals: s.crystals + 1,
        crystalPoints: s.crystalPoints + points * (s.boosting ? 2 : 1), // surge doubles pickup score
        boostMeter,
        boosting: s.boosting || triggerSurge,
        surgeCount: s.surgeCount + (triggerSurge ? 1 : 0),
      })
      if (triggerSurge) GameEvents.emit(EV.SURGE_START)
    },
    /** A hit that got through i-frames. Returns true if it was fatal. */
    takeHit: () => {
      const s = get()
      const hearts = s.hearts - 1
      set({
        hearts,
        hitCount: s.hitCount + 1,
        speedMultiplier: Math.max(1, s.speedMultiplier * HIT_MULTIPLIER_LOSS),
        speedTier: tierOf(Math.max(1, s.speedMultiplier * HIT_MULTIPLIER_LOSS)),
        boostMeter: Math.max(0, s.boostMeter - HIT_METER_LOSS),
      })
      if (hearts <= 0) {
        get().endGame(DeathCause.CRASH)
        return true
      }
      return false
    },

    // ── Settings ──
    setSteeringMode: (steeringMode) => set({ steeringMode }),
    /** Only from the menu: a run's physics, course and board are fixed when it starts. */
    setDifficulty: (difficulty) => {
      if (!isDifficulty(difficulty)) return
      const { status, bestScores } = get()
      if (status !== GameStatus.START && status !== GameStatus.GAME_OVER) return
      save('neonVelocity.difficulty', difficulty)
      set({ difficulty, bestScore: bestScores[difficulty] ?? 0 })
    },
    setCourseMode: (courseMode) => { save('neonVelocity.courseMode', courseMode); set({ courseMode }) },
    setRaceGhost: (raceGhost) => { save('neonVelocity.raceGhost', raceGhost); set({ raceGhost }) },
    toggleMute: () => set((s) => { save('neonVelocity.muted', !s.muted); return { muted: !s.muted } }),
    setMusicVolume: (v) => { save('neonVelocity.musicVolume', v); set({ musicVolume: v }) },
    setSfxVolume: (v) => { save('neonVelocity.sfxVolume', v); set({ sfxVolume: v }) },
    setVfxQuality: (q) => { save('neonVelocity.vfxQuality', q); set({ vfxQuality: q }) },
  })),
)

// keep `bestScore` consistent with the restored difficulty
useGameStore.setState((s) => ({ bestScore: s.bestScores[s.difficulty] ?? 0 }))

export const selectDifficultyConfig = (s) => difficultyConfig(s.difficulty)
export const selectSpeedKmh = (s) =>
  Math.round(BASE_SPEED * difficultyConfig(s.difficulty).speedScale
    * s.speedMultiplier * (s.boosting ? SURGE_SPEED : 1) * 3.6)
export const selectDistance = (s) => Math.floor(s.distance)
