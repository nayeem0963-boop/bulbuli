/**
 * The jaguar's coat (rendering/AmazonFauna.jsx): the satin statue finish, plus a pattern worked
 * out per pixel from where on the body the pixel is (so it needs no image file and no vertex
 * paint): dense, irregular ROSETTES (rings of dark with a tawny middle, some with a dot in it)
 * over the body, smaller solid spots on the legs and head, black rings on the tail, and a fine
 * grain of fur.
 */
import { DoubleSide, MeshPhysicalMaterial } from 'three'

const GLSL = /* glsl */ `
varying vec3 vCoat;
float cHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float cNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cHash(i), cHash(i + vec3(1, 0, 0)), f.x), mix(cHash(i + vec3(0, 1, 0)), cHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(cHash(i + vec3(0, 0, 1)), cHash(i + vec3(1, 0, 1)), f.x), mix(cHash(i + vec3(0, 1, 1)), cHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// one layer of cells: its distance to the nearest cell centre (0..~0.7) and a random id for that cell
vec2 jaguarCells(vec3 q) {
  vec3 i = floor(q); vec3 f = fract(q);
  float d1 = 8.0; float id = 0.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = vec3(cHash(i + g), cHash(i + g + 17.3), cHash(i + g + 41.7));
    vec3 r = g + o - f; float d = dot(r, r);
    if (d < d1) { d1 = d; id = cHash(i + g + 7.7); }
  }
  return vec2(sqrt(d1), id);
}
// 0 = tawny, 1 = black; and (through 'inner') how deep inside a rosette we are
vec2 jaguarCoat(vec3 p) {
  float legs = 1.0 - smoothstep(0.30, 0.46, p.y);
  float head = smoothstep(0.74, 0.86, p.z);
  float small = max(legs, head);
  float scale = mix(20.0, 30.0, small);
  vec3 q = p * scale;
  q += 0.4 * vec3(cNoise(q * 1.4), cNoise(q * 1.4 + 9.0), cNoise(q * 1.4 + 19.0));
  vec2 c = jaguarCells(q);
  float d = c.x; float id = c.y;
  float rosette = smoothstep(0.22, 0.28, d) * (1.0 - smoothstep(0.36, 0.45, d));
  float dot_ = 1.0 - smoothstep(0.05, 0.11, d);
  float solid = 1.0 - smoothstep(0.17, 0.3, d);
  float isRosette = step(0.22, id) * (1.0 - small);
  float mask = mix(solid, max(rosette, dot_ * step(0.65, id)), isRosette);
  float inner = isRosette * (1.0 - smoothstep(0.12, 0.22, d)) * (1.0 - dot_);
  // a second layer of small spots fills the gaps between the rosettes
  vec2 c2 = jaguarCells(p * scale * 2.3 + vec3(5.0, 11.0, 3.0));
  float fill = (1.0 - smoothstep(0.12, 0.2, c2.x)) * step(0.32, c2.y) * (1.0 - mask) * (1.0 - 0.6 * small);
  return vec2(max(mask, fill), inner);
}
`

export function createCoatMaterial() {
  const material = new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.5, side: DoubleSide, emissive: '#3a3226', emissiveIntensity: 0.16 })
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec3 vCoat;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vCoat = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${GLSL}\nvoid main() {`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec2 coat = jaguarCoat(vCoat);
          // the tail carries its own painted rings: no rosettes there
          float tail = smoothstep(-0.6, -0.65, vCoat.z);
          float dark = coat.x * (1.0 - tail);
          float grain = 0.93 + 0.14 * cNoise(vCoat * 260.0);
          vec3 black = vec3(0.03, 0.02, 0.014);
          diffuseColor.rgb *= grain * (1.0 - 0.16 * coat.y * (1.0 - tail));
          diffuseColor.rgb = mix(diffuseColor.rgb, black, 0.98 * dark);
        }`)
  }
  material.customProgramCacheKey = () => 'wx-amazon-jaguar-coat-v8'
  return material
}
