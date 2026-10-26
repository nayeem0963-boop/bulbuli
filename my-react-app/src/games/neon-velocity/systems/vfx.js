import { Color } from 'three'

/**
 * Smoothed, per-frame visual state. Written only by <VfxDirector/>, read by
 * shaders, post-processing, camera and particles.
 *
 *   speedFactor  0..1   how close to max run speed (excludes surge)
 *   surge        0..1   Neon Surge intensity, eased in/out
 *   trauma       0..1   camera shake budget (shake = trauma²), decays
 *   hit          0..1   damage pulse, decays fast
 *   pickup       0..1   pickup glow pulse
 *   fovPunch     deg    one-shot FOV kick (surge start, double jump), decays
 */
export const vfx = {
  speedFactor: 0,
  surge: 0,
  trauma: 0,
  hit: 0,
  pickup: 0,
  fovPunch: 0,
}

export const addTrauma = (amount) => { vfx.trauma = Math.min(1, vfx.trauma + amount) }
export const punchFov = (deg) => { vfx.fovPunch = Math.max(vfx.fovPunch, deg) }

/**
 * Shared uniform objects. Every custom shader references these same objects,
 * so one write per frame updates the grid, billboards, sun and trail together.
 */
export const sharedUniforms = {
  uTime: { value: 0 },
  uSpeed: { value: 0 },
  uSurge: { value: 0 },
  uHit: { value: 0 },
  uBands: { value: new Float32Array(8) }, // audio spectrum (or procedural fallback)
}

export const NEON = {
  magenta: new Color('#ff2bd6'),
  cyan: new Color('#22f3ff'),
  yellow: new Color('#ffd23f'),
  violet: new Color('#7b2bff'),
  red: new Color('#ff3355'),
  gold: new Color('#ffcf5a'),
  white: new Color('#ffffff'),
}
