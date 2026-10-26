import { Vector2 } from 'three'

/*
 * Custom full-screen shaders for three's ShaderPass (three/examples/jsm), used by
 * PostFX.jsx. Both read the previous pass from `tDiffuse` (ShaderPass's default input).
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/**
 * Neon Surge: radial zoom blur toward the vanishing point (centre stays sharp so the
 * player is always readable), swirling neon energy at the screen edges, and a shock
 * ring when a surge starts. Costs one texture read when idle (early out).
 */
export function createSurgeShader(samples = 10) {
  return {
    name: 'NeonSurgeShader',
    defines: { SAMPLES: samples },
    uniforms: {
      tDiffuse: { value: null },
      uStrength: { value: 0 },
      uSpeed: { value: 0 },
      uTime: { value: 0 },
      uWarp: { value: 0 },
      uCenter: { value: new Vector2(0.5, 0.47) },
    },
    vertexShader,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uStrength;
      uniform float uSpeed;
      uniform float uTime;
      uniform float uWarp;
      uniform vec2 uCenter;
      varying vec2 vUv;

      void main() {
        vec4 base = texture2D(tDiffuse, vUv);
        float strength = max(uStrength, uSpeed * 0.25);
        if (strength < 0.002 && uWarp < 0.002) { gl_FragColor = base; return; }

        vec2 dir = vUv - uCenter;
        float dist = length(dir);

        // 1. radial blur, masked out near the centre
        float mask = smoothstep(0.12, 0.55, dist);
        vec3 acc = base.rgb;
        float total = 1.0;
        for (int i = 1; i <= SAMPLES; i++) {
          float t = float(i) / float(SAMPLES);
          float w = 1.0 - t * 0.7;
          acc += texture2D(tDiffuse, vUv - dir * t * 0.09 * strength * mask).rgb * w;
          total += w;
        }
        vec3 col = acc / total;

        // 2. edge energy (surge only)
        float angle = atan(dir.y, dir.x);
        float edge = smoothstep(0.38, 0.78, dist);
        float swirl = 0.5 + 0.5 * sin(uTime * 5.0 + angle * 4.0);
        vec3 tint = mix(vec3(1.0, 0.17, 0.84), vec3(0.13, 0.95, 1.0), swirl);
        float flicker = 0.75 + 0.25 * sin(uTime * 31.0);
        col += tint * edge * 0.45 * uStrength * flicker;

        // 3. warp ring expanding from the centre
        float ringRadius = (1.0 - uWarp) * 0.9;
        float ring = smoothstep(0.06, 0.0, abs(dist - ringRadius)) * uWarp;
        col += vec3(1.0, 0.85, 0.4) * ring * 1.5;

        gl_FragColor = vec4(col, base.a);
      }
    `,
  }
}

/**
 * Final grade in one pass: radial chromatic aberration (stronger toward the edges),
 * vignette, and film grain. Runs before OutputPass, i.e. still in linear HDR.
 */
export function createGradeShader() {
  return {
    name: 'NeonGradeShader',
    uniforms: {
      tDiffuse: { value: null },
      uAberration: { value: 0.0005 },
      uVignetteOffset: { value: 0.25 },
      uVignetteDarkness: { value: 0.62 },
      uGrain: { value: 0.08 },
      uTime: { value: 0 },
    },
    vertexShader,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uAberration;
      uniform float uVignetteOffset;
      uniform float uVignetteDarkness;
      uniform float uGrain;
      uniform float uTime;
      varying vec2 vUv;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

      void main() {
        vec2 dir = vUv - 0.5;
        float d = length(dir);
        vec2 shift = dir * uAberration * (0.2 + d * 3.0);
        vec4 c = texture2D(tDiffuse, vUv);
        float r = texture2D(tDiffuse, vUv + shift).r;
        float b = texture2D(tDiffuse, vUv - shift).b;
        vec3 col = vec3(r, c.g, b);

        // vignette (same shape as the postprocessing library's default)
        vec2 uv = (vUv - 0.5) * vec2(uVignetteOffset);
        col = mix(col, vec3(1.0 - uVignetteDarkness), dot(uv, uv));
        float v = smoothstep(0.8, 0.2 + (1.0 - uVignetteDarkness) * 0.3, d);
        col *= mix(1.0, v, uVignetteDarkness);

        // grain, scaled by brightness so blacks stay black
        float n = hash(vUv * 1000.0 + fract(uTime * 13.0) * 100.0) - 0.5;
        float luma = dot(col, vec3(0.299, 0.587, 0.114));
        col += n * uGrain * clamp(luma, 0.0, 1.0);

        gl_FragColor = vec4(max(col, 0.0), c.a);
      }
    `,
  }
}
