import { useMemo, useRef } from 'react'
import { sharedUniforms } from '../../systems/vfx'
import { useFrame } from '@react-three/fiber'
import { runtime } from '../../stores/runtime'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Classic synthwave sun: yellow→magenta gradient with scrolling horizontal slits
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSurge;
  uniform float uBands[8];
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    if (length(p) > 0.5) discard;

    vec3 top = vec3(1.0, 0.86, 0.25);
    vec3 bottom = vec3(1.0, 0.12, 0.62);
    vec3 col = mix(bottom, top, smoothstep(0.1, 0.9, vUv.y));
    col = mix(col, vec3(1.0, 0.95, 0.8), uSurge * 0.5 * vUv.y);

    if (vUv.y < 0.55) {
      float stripe = fract((vUv.y - uTime * (0.04 + uSurge * 0.3)) * 16.0);
      float thickness = mix(0.6, 0.0, vUv.y / 0.55);
      if (stripe < thickness) discard;
    }
    gl_FragColor = vec4(col * (1.8 + uBands[0] * 0.6 + uSurge), 1.0); // >1 so it blooms; pulses with the kick
  }
`

/** Giant retro sun pinned to the horizon; follows the player so it never gets closer. */
export function SynthSun() {
  const group = useRef()
  const uniforms = useMemo(() => ({
    uTime: sharedUniforms.uTime,
    uSurge: sharedUniforms.uSurge,
    uBands: sharedUniforms.uBands,
  }), [])

  useFrame(() => {
    if (group.current) group.current.position.z = runtime.playerPosition.z - 420
  })

  return (
    <group ref={group} position={[0, 38, -420]}>
      <mesh scale={150}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
