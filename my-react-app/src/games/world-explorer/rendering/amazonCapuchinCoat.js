/**
 * The capuchin's coat. The model is a realistic seated rhesus macaque ("Realsitic Monkey" by TdoubleU8,
 * CC BY 4.0: see assets/capuchin.LICENSE.md), an Old World monkey of Asia, and there are no macaques
 * in the Amazon. Its material is re-skinned here as a capuchin, a New World monkey of the rainforest
 * with a similar seated build and size, in the shader (no new image):
 *   - the tan fur becomes dark brown, keeping the model's own fur shading;
 *   - the chest, throat and shoulders and a frame round the face become cream;
 *   - the crown of the head is a dark cap;
 *   - the hands, feet and ears are dark (the macaque's pink skin is gone);
 *   - the face, eyes and nose keep the model's own painting.
 * The model's coordinates: seated, facing +z, feet on y = 0, metres; the head is at y 0.33 to 0.51,
 * and turned a little towards -x.
 */
import { MeshStandardMaterial } from 'three'

/** The middle of the face's bare skin (the shader keeps the model's own painting there). */
export const CAPUCHIN_FACE = Object.freeze([-0.087, 0.417, 0.22])

const GLSL = /* glsl */ `
varying vec3 vCoat;
uniform vec3 uFace;
float kHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float kNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(kHash(i), kHash(i + vec3(1, 0, 0)), f.x), mix(kHash(i + vec3(0, 1, 0)), kHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(kHash(i + vec3(0, 0, 1)), kHash(i + vec3(1, 0, 1)), f.x), mix(kHash(i + vec3(0, 1, 1)), kHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
`

const FRAGMENT = /* glsl */ `
#include <color_fragment>
{
  vec3 p = vCoat;
  vec3 orig = diffuseColor.rgb;
  float lum = dot(orig, vec3(0.3, 0.59, 0.11));
  // keep the model's own fur shading, a little stronger, with a fine grain on top
  float shade = pow(clamp(lum / 0.3, 0.35, 2.0), 1.7) * (0.85 + 0.3 * kNoise(p * 220.0));
  float pink = smoothstep(0.12, 0.3, orig.r - orig.g);
  vec3 brown = vec3(0.05, 0.027, 0.014);
  vec3 cream = vec3(0.62, 0.47, 0.27);
  vec3 cap = vec3(0.02, 0.012, 0.008);
  float head = smoothstep(0.32, 0.36, p.y);
  // the bare face keeps the model's painting; the fur round it is cream
  float faceDist = distance(p, uFace);
  float keep = 1.0 - smoothstep(0.045, 0.062, faceDist);
  float frame = (1.0 - smoothstep(0.055, 0.1, faceDist)) * smoothstep(0.0, 0.1, p.z);
  // the throat and the upper chest, in front, fading into the brown; the back and the limbs stay brown
  float front = smoothstep(-0.01, 0.06, p.z);
  float chest = smoothstep(0.24, 0.3, p.y) * (1.0 - smoothstep(0.33, 0.37, p.y)) * front * (1.0 - smoothstep(0.02, 0.06, abs(p.x + 0.02)));
  float throat = (1.0 - smoothstep(0.34, 0.4, p.y)) * smoothstep(0.26, 0.31, p.y) * front * (1.0 - smoothstep(0.045, 0.09, abs(p.x + 0.02)));
  float creamness = clamp(max(max(chest * 0.75, frame), throat * 0.8), 0.0, 1.0);
  // the crown: a dark cap
  float crown = smoothstep(0.425, 0.455, p.y) * (1.0 - smoothstep(0.14, 0.2, p.z));
  vec3 coat = mix(brown * shade, cream * (0.55 + 0.6 * shade), creamness);
  coat = mix(coat, cap * (0.7 + 0.6 * shade), crown);
  // dark skin where the macaque had pink: hands, feet, ears
  coat = mix(coat, vec3(0.03, 0.02, 0.016), pink * (1.0 - keep));
  diffuseColor.rgb = mix(coat, orig, keep);
}
`

/** Gives the model's material the capuchin coat (done once; the material is shared by every capuchin). */
export function applyCapuchinCoat(material) {
  if (!(material instanceof MeshStandardMaterial)) return
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFace = { value: CAPUCHIN_FACE }
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec3 vCoat;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vCoat = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${GLSL}\nvoid main() {`)
      .replace('#include <color_fragment>', FRAGMENT)
  }
  material.customProgramCacheKey = () => 'wx-amazon-capuchin-coat-v4'
  material.needsUpdate = true
}
