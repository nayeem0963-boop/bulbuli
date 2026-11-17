/**
 * The Bengal tiger's coat (the Sundarbans' tiger). The model is the jaguar ("jaguar" by Ear.Rodriguez, CC BY 4.0: see
 * assets/jaguar.LICENSE.md), re-skinned as a tiger in the shader, with no new image, the way the ocelot and the
 * capuchin are:
 *   - an orange coat with a fine grain, paler along the back and white underneath: the belly, the chest, the
 *     inside of the legs, the cheeks and the muzzle;
 *   - black stripes that go down the flanks from the back and thin out towards the belly, irregular in width and
 *     length like a tiger's, bars on the legs, stripes on the forehead and cheeks, and black rings on the tail
 *     ending in a black tip;
 *   - the eyes are a separate part of the model and keep their own painting (the coat is only given to the body).
 * The jaguar's body is turned about 30 degrees from +z in the file (amazonMotion.js MODEL_FIX), so the coat works in the
 * body's own axes: `u` along the body (head at +), `v` across it, and the model's height `y`; metres.
 */
import { MeshStandardMaterial } from 'three'

/** The body's axis in the file: how far it is turned from +z, and the middle of the body on the ground. */
export const TIGER_AXIS = Object.freeze({ yaw: -0.52, cx: -0.03, cz: 0.06 })

const GLSL = /* glsl */ `
varying vec3 vCoat;
float tHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float tNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(tHash(i), tHash(i + vec3(1, 0, 0)), f.x), mix(tHash(i + vec3(0, 1, 0)), tHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(tHash(i + vec3(0, 0, 1)), tHash(i + vec3(1, 0, 1)), f.x), mix(tHash(i + vec3(0, 1, 1)), tHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
`

const FRAGMENT = /* glsl */ `
#include <color_fragment>
{
  vec3 p = vCoat;
  vec2 d = p.xz - vec2(${TIGER_AXIS.cx.toFixed(3)}, ${TIGER_AXIS.cz.toFixed(3)});
  float u = dot(d, vec2(${Math.sin(TIGER_AXIS.yaw).toFixed(4)}, ${Math.cos(TIGER_AXIS.yaw).toFixed(4)}));
  float v = dot(d, vec2(${Math.cos(TIGER_AXIS.yaw).toFixed(4)}, ${(-Math.sin(TIGER_AXIS.yaw)).toFixed(4)}));
  float y = p.y;
  vec3 orange = vec3(0.80, 0.36, 0.06);
  vec3 deep = vec3(0.62, 0.24, 0.04);
  vec3 cream = vec3(0.92, 0.87, 0.76);
  vec3 black = vec3(0.012, 0.008, 0.006);
  float fur = 0.9 + 0.2 * tNoise(p * 150.0);
  float blotch = tNoise(p * 7.0);
  // the back is deeper orange, the flanks lighter
  vec3 coat = mix(orange, deep, smoothstep(0.62, 0.8, y) * 0.8 + 0.2 * blotch) * fur;

  // white underneath: the belly, the chest and the inside of the legs, the muzzle and the cheeks
  float belly = (1.0 - smoothstep(0.47, 0.57, y + 0.05 * tNoise(p * 12.0))) * smoothstep(0.3, 0.4, y);
  float torso = smoothstep(-0.66, -0.58, u) * (1.0 - smoothstep(0.5, 0.62, u));
  float legsIn = (1.0 - smoothstep(0.0, 0.05, abs(v) - 0.03)) * (1.0 - smoothstep(0.3, 0.45, y)) * 0.55;
  float muzzle = smoothstep(0.7, 0.78, u) * (1.0 - smoothstep(0.58, 0.66, y));
  float cheek = smoothstep(0.52, 0.6, u) * (1.0 - smoothstep(0.5, 0.62, y)) * smoothstep(0.04, 0.1, abs(v));
  float paws = 1.0 - smoothstep(0.06, 0.12, y + 0.03 * tNoise(p * 40.0));
  float white = max(max(max(belly * torso, legsIn), max(muzzle, cheek * 0.75)), paws);
  coat = mix(coat, cream * (0.9 + 0.12 * tNoise(p * 90.0)), clamp(white, 0.0, 1.0));

  // the stripes: bands across the body, bent and uneven, from the back down the flanks, thinning out towards the belly
  float warp = 0.55 * tNoise(vec3(u * 5.0, y * 6.0, v * 6.0)) + 0.25 * tNoise(vec3(u * 14.0, y * 12.0, v * 12.0));
  float band = fract(u * 10.5 + y * 1.6 + warp * 1.4);
  float width = 0.3 + 0.2 * tNoise(vec3(u * 6.0 + 4.0, y * 3.0, v * 4.0));
  float core = smoothstep(0.0, 0.05, band) * (1.0 - smoothstep(width, width + 0.07, band));
  // a stripe breaks up: it ends part-way down the flank, and some are short and some are forked
  float reach = 0.45 + 0.28 * tNoise(vec3(u * 9.0, 1.5, 2.5)) + 0.12 * warp;
  float down = smoothstep(reach - 0.2, reach - 0.02, y);
  float fork = step(0.5, tNoise(vec3(u * 18.0 + 7.0, y * 10.0, v * 10.0)));
  float body = torso * smoothstep(0.37, 0.45, y);
  float stripes = core * down * body * (0.55 + 0.45 * fork) * (1.0 - 0.8 * white);
  // the legs: bars, thinner, on the outer side
  float legZone = (1.0 - smoothstep(0.34, 0.46, y)) * (1.0 - legsIn);
  float bars = smoothstep(0.45, 0.6, fract(y * 17.0 + 0.7 * tNoise(p * 18.0))) * (1.0 - smoothstep(0.7, 0.85, fract(y * 17.0 + 0.7 * tNoise(p * 18.0))));
  float legBars = bars * legZone * smoothstep(0.1, 0.3, y) * step(0.45, tNoise(p * 22.0 + 2.0));
  // the head: a dark brow, short stripes across the forehead and the cheeks, and a dark line from the eye down the cheek
  float head = smoothstep(0.52, 0.6, u) * smoothstep(0.52, 0.6, y);
  float brow = head * smoothstep(0.45, 0.62, fract(y * 24.0 + u * 5.0 + 0.5 * tNoise(p * 30.0))) * (1.0 - smoothstep(0.78, 0.92, fract(y * 24.0 + u * 5.0 + 0.5 * tNoise(p * 30.0)))) * step(0.3, tNoise(p * 16.0));
  float cheekStripe = cheek * smoothstep(0.5, 0.7, fract(u * 14.0 + y * 4.0 + 0.6 * tNoise(p * 24.0))) * (1.0 - smoothstep(0.82, 0.95, fract(u * 14.0 + y * 4.0 + 0.6 * tNoise(p * 24.0)))) * 0.85;
  float ear = smoothstep(0.75, 0.8, y) * smoothstep(0.55, 0.66, u) * 0.9;
  // the tail: black rings along it, ending in a black tip
  float tail = 1.0 - smoothstep(-0.68, -0.62, u);
  float ring = step(0.5, fract(-u * 6.5)) ;
  float tip = smoothstep(-0.8, -0.86, u);
  float tailDark = tail * max(ring, tip);
  float dark = max(max(stripes, legBars), max(max(brow, cheekStripe), max(ear, tailDark)));
  coat = mix(coat, black, clamp(dark, 0.0, 1.0) * 0.96);
  diffuseColor.rgb = coat;
}
`

/** Gives a body material the tiger coat (the material is shared by every tiger: do this once). */
export function applyTigerCoat(material) {
  if (!(material instanceof MeshStandardMaterial)) return
  material.map = null
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec3 vCoat;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vCoat = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${GLSL}\nvoid main() {`)
      .replace('#include <color_fragment>', FRAGMENT)
  }
  material.customProgramCacheKey = () => 'wx-sundarbans-tiger-coat-v1'
  material.needsUpdate = true
}
