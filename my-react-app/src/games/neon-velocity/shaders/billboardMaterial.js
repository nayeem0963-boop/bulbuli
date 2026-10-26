import { Color, ShaderMaterial } from 'three'
import { sharedUniforms } from '../systems/vfx'

/*
 * Animated holographic billboards for the skyline. Three procedural variants
 * (no textures): an audio-reactive equalizer, a rotating hologram triangle, and
 * scrolling chevrons. All include scanlines, flicker and a glowing frame, and
 * react to Neon Surge.
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSurge;
  uniform float uBands[8];
  uniform vec3 uColA;
  uniform vec3 uColB;
  varying vec2 vUv;

  float hash(float n) { return fract(sin(n) * 43758.5453); }

  float sdTriangle(vec2 p, float r) {
    const float k = 1.7320508;
    p.x = abs(p.x) - r;
    p.y = p.y + r / k;
    if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
    p.x -= clamp(p.x, -2.0 * r, 0.0);
    return -length(p) * sign(p.y);
  }

  void main() {
    vec2 uv = vUv;
    vec3 col = vec3(0.015, 0.0, 0.04);

  #if VARIANT == 0
    // Equalizer — bar heights come from the music analyser
    float bars = 12.0;
    float id = floor(uv.x * bars);
    float fx = fract(uv.x * bars);
    int band = int(mod(id, 8.0));
    float h = 0.06 + uBands[band] * 0.86;
    float inBar = step(0.14, fx) * step(fx, 0.86) * step(uv.y, h) * step(0.06, uv.y);
    float segment = step(0.28, fract(uv.y * 22.0));
    col += mix(uColA, uColB, uv.y) * inBar * segment * 2.6;
    // peak caps
    col += uColB * step(0.14, fx) * step(fx, 0.86) * smoothstep(0.012, 0.0, abs(uv.y - h - 0.03)) * 3.0;
  #elif VARIANT == 1
    // Rotating hologram triangle with a pulsing ring
    vec2 p = uv * 2.0 - 1.0;
    p.x *= 16.0 / 9.0;
    float a = uTime * (0.6 + uSurge * 2.0);
    p = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
    float d = sdTriangle(p, 0.42);
    col += uColA * (smoothstep(0.03, 0.0, abs(d)) * 3.0 + exp(-abs(d) * 9.0) * 0.6);
    float ring = abs(length(p) - (0.72 + uBands[1] * 0.12));
    col += uColB * smoothstep(0.02, 0.0, ring) * 2.5;
  #else
    // Scrolling chevrons — speed up during surge
    float x = uv.x * 6.0 - uTime * (1.4 + uSurge * 5.0);
    float chev = abs(fract(x + abs(uv.y - 0.5) * 1.3) - 0.5);
    col += mix(uColA, uColB, uv.y) * smoothstep(0.13, 0.06, chev) * 2.4;
  #endif

    // Frame
    float fw = 0.012;
    float frame = max(max(step(uv.x, fw), step(1.0 - fw, uv.x)), max(step(uv.y, fw * 1.8), step(1.0 - fw * 1.8, uv.y)));
    col += uColB * frame * 3.5;

    // CRT treatment
    float scan = 0.82 + 0.18 * sin(uv.y * 260.0 + uTime * 10.0);
    float flicker = 0.93 + 0.07 * step(0.96, hash(floor(uTime * 14.0)));
    float glitch = step(0.985, hash(floor(uTime * 6.0) + floor(uv.y * 12.0)));
    col *= scan * flicker * (1.0 - glitch * 0.6);

    gl_FragColor = vec4(col * (1.0 + uSurge * 0.6), 1.0);
  }
`

function createBillboardMaterial(variant, colA, colB) {
  return new ShaderMaterial({
    defines: { VARIANT: variant },
    uniforms: {
      uTime: sharedUniforms.uTime,
      uSurge: sharedUniforms.uSurge,
      uBands: sharedUniforms.uBands,
      uColA: { value: new Color(colA) },
      uColB: { value: new Color(colB) },
    },
    vertexShader,
    fragmentShader,
    toneMapped: false,
    fog: false, // skyline glows through the haze
  })
}

export const billboardMaterials = [
  createBillboardMaterial(0, '#ff2bd6', '#ffd23f'),
  createBillboardMaterial(1, '#22f3ff', '#ff2bd6'),
  createBillboardMaterial(2, '#7b2bff', '#22f3ff'),
]
