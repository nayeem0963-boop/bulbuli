/**
 * The jaguar's coat (rendering/AmazonFauna.jsx): the satin statue finish, plus a pattern worked
 * out per pixel from where on the body the pixel is (so it needs no image file and no vertex
 * paint): dense, irregular ROSETTES (rings of dark with a tawny middle, some with a dot in it)
 * over the body, smaller solid spots on the legs and head, black rings on the tail, and a fine
 * grain of fur. And the look of a living coat: fine strokes of fur that catch the light, a soft warm
 * halo along the edge of the body where light shows through the hairs, a darker underside and feet
 * (as if lit from the sky), and large patches of lighter and darker tone.
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
// strokes of fur: stretched along the body, a fine layer over a finer one
float coatGrain(vec3 p) { return 0.6 * cNoise(p * vec3(340.0, 340.0, 200.0)) + 0.4 * cNoise(p * vec3(760.0, 760.0, 420.0)); }
// 0 = tawny, 1 = black; and (through 'inner') how deep inside a rosette we are
vec2 jaguarCoat(vec3 p) {
  float legs = 1.0 - smoothstep(0.30, 0.46, p.y);
  float head = smoothstep(0.74, 0.86, p.z);
  float small = max(legs, head);
  float scale = mix(16.5, 27.0, small);
  vec3 q = p * scale;
  q += 0.4 * vec3(cNoise(q * 1.4), cNoise(q * 1.4 + 9.0), cNoise(q * 1.4 + 19.0));
  vec2 c = jaguarCells(q);
  float d = c.x; float id = c.y;
  float rosette = smoothstep(0.17, 0.23, d) * (1.0 - smoothstep(0.37, 0.46, d));
  float dot_ = 1.0 - smoothstep(0.06, 0.12, d);
  float solid = 1.0 - smoothstep(0.2, 0.34, d);
  float isRosette = step(0.12, id) * (1.0 - small);
  float mask = mix(solid, max(rosette, dot_ * step(0.65, id)), isRosette);
  float inner = isRosette * (1.0 - smoothstep(0.12, 0.22, d)) * (1.0 - dot_);
  // a second layer of small spots fills the gaps between the rosettes
  vec2 c2 = jaguarCells(p * scale * 2.3 + vec3(5.0, 11.0, 3.0));
  float fill = (1.0 - smoothstep(0.14, 0.22, c2.x)) * step(0.3, c2.y) * (1.0 - mask) * (1.0 - 0.6 * small);
  // the ears are plain fur: no spots on them
  float ear = smoothstep(0.075, 0.09, abs(p.x)) * smoothstep(0.66, 0.69, p.y) * (1.0 - smoothstep(0.76, 0.8, p.z));
  return vec2(max(mask, fill) * (1.0 - ear), inner * (1.0 - ear));
}
`

export function createCoatMaterial() {
  const material = new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, clearcoat: 0.06, clearcoatRoughness: 0.7, side: DoubleSide, emissive: '#3a3226', emissiveIntensity: 0.16 })
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec3 vCoat;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vCoat = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${GLSL}\nvoid main() {`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // a bump from the strokes of fur: the surface tilts a little towards where the hairs are higher
          float h0 = coatGrain(vCoat);
          float hx = coatGrain(vCoat + dFdx(vCoat));
          float hy = coatGrain(vCoat + dFdy(vCoat));
          vec3 sx = dFdx(-vViewPosition);
          vec3 sy = dFdy(-vViewPosition);
          vec3 r1 = cross(sy, normal);
          vec3 r2 = cross(normal, sx);
          float det = dot(sx, r1);
          vec3 grad = sign(det) * ((hx - h0) * r1 + (hy - h0) * r2);
          normal = normalize(abs(det) * normal - 0.0022 * grad);
        }`)
      .replace('#include <opaque_fragment>', `
        // a soft warm halo along the silhouette, where light comes through the hairs
        float rim = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 3.0);
        outgoingLight += rim * 0.22 * vec3(1.0, 0.78, 0.45) * diffuseColor.rgb;
        #include <opaque_fragment>`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec2 coat = jaguarCoat(vCoat);
          // the tail carries its own painted rings: no rosettes there
          float tail = smoothstep(-0.6, -0.65, vCoat.z);
          float dark = coat.x * (1.0 - tail);
          float grain = 0.93 + 0.14 * coatGrain(vCoat);
          // large patches of lighter and darker tone, and shade towards the ground and under the belly
          float tone = 0.9 + 0.2 * cNoise(vCoat * 5.0);
          float shade = mix(0.68, 1.0, smoothstep(0.06, 0.45, vCoat.y));
          vec3 black = vec3(0.03, 0.02, 0.014);
          diffuseColor.rgb *= grain * tone * shade * (1.0 - 0.16 * coat.y * (1.0 - tail));
          diffuseColor.rgb = mix(diffuseColor.rgb, black, 0.98 * dark);
        }`)
  }
  material.customProgramCacheKey = () => 'wx-amazon-jaguar-coat-v14'
  return material
}
