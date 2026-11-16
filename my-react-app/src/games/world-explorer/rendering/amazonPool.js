/**
 * The forest pool's numbers and its water shader (rendering/AmazonPool.jsx draws it). Pure: no THREE.
 * Distances are metres from the pool's middle.
 */

/**
 * The bank's profile, from the pool bed up over the lip and out to the forest floor (r, height). The
 * crest is at 1.8 m: that is where the solid collider ends (biomes/amazon.js); beyond it the skirt
 * slopes low enough to step over.
 */
export const POOL_BANK = Object.freeze([[1.38, 0.03], [1.55, 0.22], [1.72, 0.33], [1.9, 0.33], [2.1, 0.17], [2.35, 0.02]])
export const POOL_WATER_Y = 0.3
export const POOL_WATER_R = 1.6
/** Fish are drawn this fraction of life size: a payara is a metre long, the pool is not. */
export const FISH_SCALE = 0.75

/** Where a fish is at time t (pool coordinates), and the way it faces (the model faces +z). */
export function fishAt(fish, t) {
  const a = fish.dir * (t * fish.speed + fish.phase)
  const wobble = 1 + 0.12 * Math.sin(t * fish.speed * 0.7 + fish.phase)
  return { x: Math.cos(a) * fish.r * wobble, z: Math.sin(a) * fish.r * wobble, heading: Math.atan2(-Math.sin(a) * fish.dir, Math.cos(a) * fish.dir) }
}

/** The water surface is a flat disc; these tilt its normal so it glints as it ripples. */
export const RIPPLE_VERTEX = 'varying vec2 vWaterXZ;\nvoid main() {\n  vWaterXZ = position.xz;'
export const RIPPLE_FRAGMENT_HEAD = `
varying vec2 vWaterXZ;
uniform float uT;
uniform vec2 uF0; uniform vec2 uF1; uniform vec2 uF2;
uniform mat3 normalMatrix;
// the slope (d height / dx, dz) of a ring spreading from c: rings about every 0.4 m, fading with distance
vec2 ring(vec2 p, vec2 c) {
  vec2 d = p - c; float r = max(length(d), 0.001);
  float k = 15.0;
  return (d / r) * cos(r * k - uT * 3.2) * k * 0.012 * exp(-r * 1.6);
}
`
export const RIPPLE_NORMAL = `
vec2 slope = ring(vWaterXZ, vec2(0.0)) * 0.5 + ring(vWaterXZ, uF0) + ring(vWaterXZ, uF1) + ring(vWaterXZ, uF2);
slope += vec2(0.07, 0.04) * cos(dot(vWaterXZ, vec2(0.8, 0.6)) * 7.0 + uT * 1.3);
slope += vec2(-0.05, 0.06) * cos(dot(vWaterXZ, vec2(-0.5, 0.86)) * 11.0 - uT * 1.7);
normal = normalize(normalMatrix * vec3(-slope.x, 1.0, -slope.y));
diffuseColor.rgb += 0.05 * length(slope);
`
