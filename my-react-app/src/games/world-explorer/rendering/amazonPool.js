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
/**
 * The water's surface, a little under the bank's crest (0.33 m), so the lip stands clear of it all the way round.
 * The disc is wider than the swimming area (the fish and dolphins stay within 1.6 m): the bank's slope
 * crosses the water level at about 1.68 m, and the disc runs on under the bank, so the water meets the mud
 * with no gap and laps up the slope all the way round.
 */
export const POOL_WATER_Y = 0.3
export const POOL_WATER_R = 1.8
/**
 * Where a swimmer (a fish or a dolphin) is at time t (pool coordinates): its place on its circle, the way it
 * faces (the model faces +z), and, if it leaps (`leap`, the height in metres), how far above the water and
 * how its nose tips (up on the way up, down on the way down).
 */
export function swimAt(swimmer, t) {
  const a = swimmer.dir * (t * swimmer.speed + swimmer.phase)
  const wobble = 1 + (swimmer.wobble ?? 0.12) * Math.sin(t * swimmer.speed * 0.7 + swimmer.phase)
  const rise = (time) => (swimmer.leap ? swimmer.leap * Math.max(0, Math.sin(time * swimmer.speed * 0.8 + (swimmer.leapPhase ?? 0))) ** 14 : 0)
  const y = rise(t)
  const climb = (rise(t + 0.03) - rise(t - 0.03)) / 0.06
  return {
    x: Math.cos(a) * swimmer.r * wobble,
    z: Math.sin(a) * swimmer.r * wobble,
    heading: Math.atan2(-Math.sin(a) * swimmer.dir, Math.cos(a) * swimmer.dir),
    y,
    pitch: -Math.atan(climb * 0.9),
  }
}

/** The bank's colours: wet, dark mud where the water laps it, dry mud beyond (blended over r, m from the middle). */
export const BANK_WET = '#1f170d'
export const BANK_DRY = '#4a3b27'
export const BANK_WET_FROM = 1.5
export const BANK_DRY_FROM = 1.95

/** The water surface is a flat disc; these tilt its normal so it glints as it ripples, tint it deeper in the middle and add a lapping foam edge. */
export const RIPPLE_VERTEX = 'varying vec2 vWaterXZ;\nvoid main() {\n  vWaterXZ = position.xz;'
export const RIPPLE_FRAGMENT_HEAD = `
varying vec2 vWaterXZ;
uniform float uT;
uniform vec2 uF0; uniform vec2 uF1; uniform vec2 uF2;
uniform mat3 normalMatrix;
// the slope (d height / dx, dz) of a ring spreading from c: rings about every 0.35 m, fading with distance
vec2 ring(vec2 p, vec2 c) {
  vec2 d = p - c; float r = max(length(d), 0.001);
  float k = 18.0;
  return (d / r) * cos(r * k - uT * 3.6) * k * 0.03 * exp(-r * 1.1);
}
`
export const RIPPLE_NORMAL = `
float wr = length(vWaterXZ);
vec2 slope = ring(vWaterXZ, vec2(0.0)) * 0.6 + ring(vWaterXZ, uF0) + ring(vWaterXZ, uF1) + ring(vWaterXZ, uF2);
// small waves crossing the surface, and rings that run in from the bank and break on the shore
slope += vec2(0.11, 0.07) * cos(dot(vWaterXZ, vec2(0.8, 0.6)) * 8.0 + uT * 1.5);
slope += vec2(-0.09, 0.1) * cos(dot(vWaterXZ, vec2(-0.5, 0.86)) * 13.0 - uT * 2.0);
slope += vec2(0.05, -0.06) * cos(dot(vWaterXZ, vec2(0.3, -0.95)) * 21.0 + uT * 2.6);
float lap = smoothstep(1.2, 1.7, wr);
slope += (vWaterXZ / max(wr, 0.001)) * lap * 0.07 * cos(wr * 24.0 + uT * 2.2);
normal = normalize(normalMatrix * vec3(-slope.x, 1.0, -slope.y));
// deeper and darker in the middle, shallower and clearer towards the bank
diffuseColor.rgb = mix(vec3(0.07, 0.25, 0.23), vec3(0.2, 0.42, 0.32), smoothstep(0.4, 1.75, wr));
diffuseColor.a = mix(0.7, 0.42, smoothstep(0.6, 1.75, wr));
// foam where the water laps the mud: a pale line that breathes in and out
float foam = smoothstep(1.55, 1.66, wr + 0.04 * sin(uT * 1.1 + atan(vWaterXZ.y, vWaterXZ.x) * 5.0)) * (0.55 + 0.45 * sin(wr * 40.0 - uT * 1.6));
diffuseColor.rgb += vec3(0.22, 0.26, 0.2) * foam;
diffuseColor.a = min(1.0, diffuseColor.a + 0.35 * foam);
diffuseColor.rgb += 0.06 * length(slope);
`
