/**
 * The finish of the Sundarbans mud, beyond its colour: where it is dry it is matte and grainy,
 * where it is damp it is smoother with a restrained sheen. Pure numbers and the shader snippets
 * built from them (SundarbansScenery.jsx applies both), so the limits can be tested.
 *
 * The rule that must hold: on the walkable land nothing here may take the roughness below
 * SAFE_ROUGHNESS. At 0.24 the low sun was mirrored off the flat mud as a long white streak
 * (station 3); the mud texture's own damp pockets stop at 0.56, and damp ground here is rougher
 * than that.
 */
import { smoothstep } from './wetland.js'

export const SAFE_ROUGHNESS = 0.56

export const MUD_FINISH = Object.freeze({
  dryRoughness: 1, // fully matte
  dryBlend: 0.75, // how far dry ground moves towards it
  dampRoughness: 0.64, // a soft sheen, never a mirror
  dampBlend: 0.6,
  dryGrain: 0.8, // extra relief on dry ground (1 + this, as a factor on the normal map)
  dampSmooth: 0.5, // relief removed from damp ground
})

/**
 * Finish of one point of ground: +1 = fully dry, -1 = fully damp, 0 = plain mud.
 * @param dry, damp  the same two noise values that colour the ground (so finish and colour agree)
 * @param shade      0..1 canopy shade: ground under the crowns does not dry out
 */
export function mudFinish(dry, damp, shade = 0) {
  const dryness = smoothstep(0.4, 0.78, dry) * (1 - 0.6 * shade)
  const dampness = smoothstep(0.48, 0.8, damp) * (1 - 0.45 * dryness)
  return Math.max(-1, Math.min(1, dryness - dampness))
}

/** What the shader does to a roughness value, in JavaScript (kept in step with MUD_GLSL.roughness). */
export function finishedRoughness(roughness, finish) {
  const mix = (a, b, t) => a + (b - a) * t
  const dry = mix(roughness, MUD_FINISH.dryRoughness, Math.max(finish, 0) * MUD_FINISH.dryBlend)
  return mix(dry, MUD_FINISH.dampRoughness, Math.max(-finish, 0) * MUD_FINISH.dampBlend)
}

const f = (n) => n.toFixed(3)

export const MUD_GLSL = Object.freeze({
  roughness: `
    roughnessFactor = mix( roughnessFactor, ${f(MUD_FINISH.dryRoughness)}, max( vMudFinish, 0.0 ) * ${f(MUD_FINISH.dryBlend)} );
    roughnessFactor = mix( roughnessFactor, ${f(MUD_FINISH.dampRoughness)}, max( -vMudFinish, 0.0 ) * ${f(MUD_FINISH.dampBlend)} );`,
  // dry ground: more of the normal map's relief; damp ground: less
  normal: `
    normal = normalize( nonPerturbedNormal + ( normal - nonPerturbedNormal ) * ( 1.0 + ${f(MUD_FINISH.dryGrain)} * max( vMudFinish, 0.0 ) - ${f(MUD_FINISH.dampSmooth)} * max( -vMudFinish, 0.0 ) ) );`,
  // dry ground: a fine grain in the colour, close to the camera only
  grain: `
    float wxGrain = texture2D( map, vMapUv * 4.3 + vec2( 0.13, 0.57 ) ).r;
    sampledDiffuseColor.rgb *= mix( 1.0, 0.74 + 0.3 * wxGrain, max( vMudFinish, 0.0 ) * ( 1.0 - wxDetailFade ) );`,
})
