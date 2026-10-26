/**
 * Tiny synchronous event bus for moment-to-moment gameplay events.
 *
 * Gameplay code (PlayerPhysics, Collectible, Obstacle, the store) *emits*;
 * presentation layers (VFX director, particles, camera shake, audio) *listen*.
 * Neither side imports the other, so audio and VFX can be swapped or disabled
 * without touching game logic.
 */
export const EV = Object.freeze({
  JUMP: 'jump',
  DOUBLE_JUMP: 'doubleJump',
  WALL_JUMP: 'wallJump',
  LAND: 'land',               // { impact, position }
  SLIDE: 'slide',
  SLAM: 'slam',
  SLAM_LAND: 'slamLand',      // { position }
  GRIND_START: 'grindStart',  // { position }
  GRIND_END: 'grindEnd',
  WALLRUN_START: 'wallrunStart',
  PICKUP: 'pickup',           // { variant, position }
  HIT: 'hit',                 // { position, hearts }
  SMASH: 'smash',             // hazard destroyed during Neon Surge { position }
  SURGE_START: 'surgeStart',
  SURGE_END: 'surgeEnd',
  SPEED_UP: 'speedUp',        // { tier, multiplier }
  FALL: 'fall',
})

const listeners = new Map()

export const GameEvents = {
  on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set())
    listeners.get(type).add(fn)
    return () => listeners.get(type)?.delete(fn)
  },
  emit(type, payload) {
    const set = listeners.get(type)
    if (!set) return
    for (const fn of set) {
      try { fn(payload) } catch (err) { console.error(`[events] ${type} listener failed`, err) }
    }
  },
}
