import { Color, ShaderMaterial, UniformsLib, UniformsUtils } from 'three'
import { sharedUniforms } from '../systems/vfx'

/*
 * Neon grid surface for platform and ramp tops.
 *
 * - Grid is computed in *world space*, so every platform lines up seamlessly and
 *   no UVs or textures are needed (zero texture memory, infinitely sharp).
 * - Anti-aliased lines via fwidth(): crisp up close, no shimmer far away.
 * - Major lines fall exactly on lane boundaries (x = ±1.5).
 * - Energy pulses travel down the track; they speed up with run speed and turn
 *   gold during Neon Surge. A red wash flashes on hits.
 * - Line colours exceed 1.0, so only the lines bloom (selective by luminance).
 * - Fog-aware so platforms fade into the haze like everything else.
 */

const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorld = worldPosition.xyz;
    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uSurge;
  uniform float uHit;
  uniform vec3 uBase;
  uniform vec3 uLine;
  uniform vec3 uAccent;
  uniform vec3 uSurgeColor;
  varying vec3 vWorld;
  #include <fog_pars_fragment>

  // 1.0 on a grid line, 0.0 between; width in pixels
  float gridLine(vec2 p, float width) {
    vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
    return 1.0 - min(min(g.x, g.y) / width, 1.0);
  }

  void main() {
    vec2 p = vWorld.xz;
    float fine = gridLine(p, 1.0);
    float major = gridLine(vec2(p.x / 3.0 + 0.5, p.y / 6.0), 1.8);

    // Travelling pulses (toward the camera)
    float pulseSpeed = 8.0 + uSpeed * 18.0 + uSurge * 20.0;
    float pulse = pow(0.5 + 0.5 * sin(vWorld.z * 0.3 + uTime * pulseSpeed), 10.0);

    vec3 lineColor = mix(uLine, uSurgeColor, uSurge);
    vec3 accent = mix(uAccent, uSurgeColor, uSurge * 0.7);

    vec3 col = uBase;
    col += lineColor * fine * (0.35 + uSpeed * 0.6 + pulse * 1.8);
    col += accent * major * (1.6 + pulse * 2.5 + uSurge * 2.0);
    // soft glow between lines so the surface isn't flat black
    col += accent * 0.04 * (1.0 + uSurge);
    col = mix(col, vec3(2.4, 0.3, 0.45), uHit * 0.35 * max(fine, major));

    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }
`

export function createNeonGridMaterial({
  base = '#0c0420', line = '#7b2bff', accent = '#ff2bd6', surge = '#ffcf5a',
} = {}) {
  return new ShaderMaterial({
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      uTime: sharedUniforms.uTime,       // shared objects — updated once per frame by VfxDirector
      uSpeed: sharedUniforms.uSpeed,
      uSurge: sharedUniforms.uSurge,
      uHit: sharedUniforms.uHit,
      uBase: { value: new Color(base) },
      uLine: { value: new Color(line) },
      uAccent: { value: new Color(accent) },
      uSurgeColor: { value: new Color(surge) },
    },
    vertexShader,
    fragmentShader,
    fog: true,
    toneMapped: false,
  })
}

// One shared instance for all platforms, one for ramps (yellow accents)
export const platformGridMaterial = createNeonGridMaterial()
export const rampGridMaterial = createNeonGridMaterial({ accent: '#ffd23f', line: '#ff2bd6' })
