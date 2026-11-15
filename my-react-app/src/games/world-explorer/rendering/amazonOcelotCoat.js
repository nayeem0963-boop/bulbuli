/**
 * The ocelot's coat. The model is a domestic cat ("Cat" by photon (that one larry), CC BY 4.0: see
 * assets/ocelot.LICENSE.md), and a calico house cat does not belong in the Amazon. Its materials are
 * re-skinned here as an ocelot, a small wild cat of the rainforest, in the shader (no new image):
 *   - the cat's own whites (chest, belly, legs, paws, muzzle) stay, as cream: an ocelot is white
 *     underneath;
 *   - the calico patches become a tawny coat with black-ringed, chain-like blotches that run along the
 *     body (the cells are stretched along it), solid black spots on the legs and head, a few spots on
 *     the white as well, stripes on the neck and the cheeks, and black rings and a black tip on the tail;
 *   - the eyes, the nose and the insides of the ears keep the model's own painting.
 * The model's coordinates: the body lies along z, head towards +z, feet on y = 0; metres.
 */
import { MeshStandardMaterial } from 'three'

/** Where the eyes and the nose are (the shader keeps the model's own painting there). */
export const OCELOT_EYES = Object.freeze([[-0.0428, 0.4319, 0.4225], [0.0336, 0.4322, 0.4185]])
export const OCELOT_NOSE = Object.freeze([0.0, 0.395, 0.462])

const GLSL = /* glsl */ `
varying vec3 vCoat;
uniform vec3 uEyeA; uniform vec3 uEyeB; uniform vec3 uNose;
float oHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float oNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(oHash(i), oHash(i + vec3(1, 0, 0)), f.x), mix(oHash(i + vec3(0, 1, 0)), oHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(oHash(i + vec3(0, 0, 1)), oHash(i + vec3(1, 0, 1)), f.x), mix(oHash(i + vec3(0, 1, 1)), oHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
vec2 oCells(vec3 q) {
  vec3 i = floor(q); vec3 f = fract(q); float d1 = 8.0; float id = 0.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = vec3(oHash(i + g), oHash(i + g + 17.3), oHash(i + g + 41.7));
    vec3 r = g + o - f; float d = dot(r, r);
    if (d < d1) { d1 = d; id = oHash(i + g + 7.7); }
  }
  return vec2(sqrt(d1), id);
}
// x: how black (0..1); y: how deep inside a blotch (its darker tawny middle)
vec2 ocelotMarks(vec3 p) {
  float legs = 1.0 - smoothstep(0.16, 0.26, p.y);
  float head = smoothstep(0.34, 0.38, p.z);
  float small = max(legs, head);
  vec3 q = p * mix(vec3(21.0, 21.0, 11.0), vec3(36.0, 36.0, 36.0), small);
  q += 0.4 * vec3(oNoise(q * 1.4), oNoise(q * 1.4 + 9.0), oNoise(q * 1.4 + 19.0));
  vec2 c = oCells(q);
  float d = c.x; float id = c.y;
  float ring = smoothstep(0.17, 0.25, d) * (1.0 - smoothstep(0.34, 0.45, d));
  float solid = 1.0 - smoothstep(0.2, 0.33, d);
  float blot = mix(solid, ring, step(0.18, id) * (1.0 - small));
  float inner = step(0.18, id) * (1.0 - small) * (1.0 - smoothstep(0.1, 0.22, d));
  vec2 c2 = oCells(p * mix(vec3(60.0, 60.0, 38.0), vec3(80.0, 80.0, 80.0), small) + vec3(5.0, 11.0, 3.0));
  float fill = (1.0 - smoothstep(0.12, 0.2, c2.x)) * step(0.5, c2.y) * (1.0 - blot);
  return vec2(max(blot, fill), inner);
}
`

const FRAGMENT = /* glsl */ `
#include <color_fragment>
{
  vec3 p = vCoat;
  vec3 orig = diffuseColor.rgb;
  float lum = dot(orig, vec3(0.3, 0.59, 0.11));
  float mx = max(orig.r, max(orig.g, orig.b)); float mn = min(orig.r, min(orig.g, orig.b));
  float sat = mx > 0.0 ? (mx - mn) / mx : 0.0;
  float white = smoothstep(0.3, 0.5, lum) * (1.0 - smoothstep(0.3, 0.55, sat));
  // what to keep as painted: the eyes, the nose and the insides of the ears
  float keep = 1.0 - smoothstep(0.016, 0.026, min(distance(p, uEyeA), distance(p, uEyeB)));
  keep = max(keep, 1.0 - smoothstep(0.022, 0.034, distance(p, uNose)));
  float ear = smoothstep(0.455, 0.47, p.y) * smoothstep(0.03, 0.045, abs(p.x)) * smoothstep(0.34, 0.37, p.z);
  keep = max(keep, ear * 0.9);
  vec3 tawny = vec3(0.55, 0.30, 0.07);
  vec3 cream = vec3(0.84, 0.73, 0.51);
  vec3 black = vec3(0.012, 0.008, 0.005);
  vec2 marks = ocelotMarks(p);
  float fur = 0.88 + 0.24 * oNoise(p * 90.0);
  // the back is darker, the flanks lighter
  float topTone = 0.82 + 0.18 * (1.0 - smoothstep(0.3, 0.44, p.y));
  vec3 coat = mix(tawny * topTone, cream, white * 0.92) * fur;
  coat = mix(coat, tawny * 0.55, marks.y * (1.0 - white));
  // stripes: across the neck and shoulders, and on the cheeks
  float neck = smoothstep(0.17, 0.2, p.z) * (1.0 - smoothstep(0.36, 0.4, p.z)) * smoothstep(0.3, 0.34, p.y);
  float stripe = step(0.6, fract(p.z * 21.0 + p.y * 9.0 + 0.5 * oNoise(p * 40.0))) * neck * smoothstep(0.35, 0.65, oNoise(p * 24.0 + 3.0));
  float cheek = smoothstep(0.37, 0.4, p.z) * smoothstep(0.035, 0.05, abs(p.x)) * (1.0 - smoothstep(0.045, 0.06, abs(p.x))) * (1.0 - smoothstep(0.395, 0.425, p.y)) * smoothstep(0.37, 0.39, p.y);
  float dark = max(marks.x * (1.0 - 0.45 * white), max(stripe * 0.75, cheek * 0.9));
  // the tail: black rings and a black tip; it hangs down and back, so the rings follow the distance from its base
  float tailAt = length(p.yz - vec2(0.36, -0.34));
  float tail = smoothstep(-0.34, -0.37, p.z) * smoothstep(0.02, 0.05, tailAt);
  float ring = max(step(0.0, sin(tailAt * 48.0)), smoothstep(0.24, 0.27, tailAt));
  dark = mix(dark, ring, tail);
  coat = mix(coat, black, 0.97 * dark);
  diffuseColor.rgb = mix(coat, orig, keep);
}
`

/** Gives the model's materials the ocelot coat (done once; the materials are shared by every ocelot). */
export function applyOcelotCoat(material) {
  if (!(material instanceof MeshStandardMaterial)) return
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uEyeA = { value: OCELOT_EYES[0] }
    shader.uniforms.uEyeB = { value: OCELOT_EYES[1] }
    shader.uniforms.uNose = { value: OCELOT_NOSE }
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec3 vCoat;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vCoat = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${GLSL}\nvoid main() {`)
      .replace('#include <color_fragment>', FRAGMENT)
  }
  material.customProgramCacheKey = () => 'wx-amazon-ocelot-coat-v1'
  material.needsUpdate = true
}
