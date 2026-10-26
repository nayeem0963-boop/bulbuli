import { Color, Vector3 } from 'three'

/**
 * Imperative particle API. <ParticleSystem/> binds the real emitter on mount;
 * until then emit() is a no-op, so gameplay code can call it unconditionally.
 *
 * particles.emit({
 *   position: [x, y, z],
 *   count: 12,
 *   color: '#22f3ff', colorB?: '#ff2bd6',   // per-particle random mix between the two
 *   intensity: 2.5,                         // HDR multiplier (>1 blooms)
 *   shape: 'sphere' | 'ring' | 'cone',      // ring = XY plane (perpendicular to travel)
 *   direction?: [x, y, z], spread: 0.5,     // cone only
 *   speed: [min, max], life: [min, max], size: [min, max],
 *   velocity?: [x, y, z],                   // added to every particle (e.g. inherit player speed)
 *   gravity: 0, drag: 2,
 * })
 */
const noop = () => {}
export const particles = { emit: noop }

export function bindParticleEmitter(fn) {
  particles.emit = fn
  return () => { if (particles.emit === fn) particles.emit = noop }
}

// Scratch objects reused by emitters
export const _tmpColor = new Color()
export const _tmpColorB = new Color()
export const _tmpVec = new Vector3()
