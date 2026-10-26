import { GHOST_HZ, MAX_FRAMES } from '../services/ghostCodec'
import { EV, GameEvents } from './events'

/*
 * Per-run bookkeeping that feeds the post-game screen, leaderboards and ghosts.
 * Counts come from the event bus; continuous values (top speed, air/grind time)
 * and ghost frames are sampled each frame by <CaptureBridge/>.
 */

const fresh = () => ({
  jumps: 0, doubleJumps: 0, wallJumps: 0, wallRuns: 0, grinds: 0, slides: 0, slams: 0,
  hits: 0, smashes: 0, prisms: 0, maxSpeedKmh: 0, airTime: 0, grindTime: 0, wallTime: 0,
})

export const runStats = {
  data: fresh(),
  reset() { this.data = fresh() },
  sample(dt, speed, mode) {
    const d = this.data
    d.maxSpeedKmh = Math.max(d.maxSpeedKmh, speed * 3.6)
    if (mode === 'AIR' || mode === 'GLIDE') d.airTime += dt
    else if (mode === 'GRIND') d.grindTime += dt
    else if (mode === 'WALLRUN') d.wallTime += dt
  },
  snapshot() { return { ...this.data } },
}

const count = (event, field, when = () => true) =>
  GameEvents.on(event, (p) => { if (when(p)) runStats.data[field]++ })
count(EV.JUMP, 'jumps')
count(EV.DOUBLE_JUMP, 'doubleJumps')
count(EV.WALL_JUMP, 'wallJumps')
count(EV.WALLRUN_START, 'wallRuns')
count(EV.GRIND_START, 'grinds')
count(EV.SLIDE, 'slides')
count(EV.SLAM, 'slams')
count(EV.HIT, 'hits')
count(EV.SMASH, 'smashes')
count(EV.PICKUP, 'prisms', (p) => p?.variant === 'prism')

/** Records the player's path for ghost replays at GHOST_HZ. */
export const ghostRecorder = {
  frames: [],
  acc: 0,
  reset() { this.frames = []; this.acc = 1 / GHOST_HZ }, // first sample immediately
  sample(dt, time, p, mode) {
    this.acc += dt
    if (this.acc < 1 / GHOST_HZ || this.frames.length >= MAX_FRAMES) return
    this.acc -= 1 / GHOST_HZ
    this.frames.push([time, p.x, p.y, p.z, mode])
  },
  finish(time, p, mode) {
    if (p) this.frames.push([time, p.x, p.y, p.z, mode])
    return this.frames
  },
}
