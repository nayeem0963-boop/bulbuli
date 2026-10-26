import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, DynamicDrawUsage,
  ShaderMaterial, Vector3,
} from 'three'
import { sharedUniforms } from '../../systems/vfx'

/*
 * NeonRibbon — camera-facing, tapering light ribbon that follows an anchor.
 *
 * - History of `segments` world-space points sampled at a fixed 60 Hz, so its
 *   length in metres grows naturally with speed (faster = longer streak).
 * - Rebuilt on the CPU each frame as a triangle strip; each vertex is pushed
 *   sideways perpendicular to both the ribbon direction and the camera ray,
 *   so it always shows its full width.
 * - Shader: colour gradient along the length (swaps to surge colours), soft
 *   edges, tail fade, HDR brightness that rises with speed and surge.
 *
 * Props:
 *   getAnchor(target: Vector3) → boolean   write the head position; return false to hide
 *   getOpacity() → 0..1                    per-frame visibility (e.g. only while gliding)
 */

const vertexShader = /* glsl */ `
  attribute float aT;
  attribute float aSide;
  varying float vT;
  varying float vSide;
  void main() {
    vT = aT;
    vSide = aSide;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uSurgeA;
  uniform vec3 uSurgeB;
  uniform float uIntensity;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uSurge;
  varying float vT;
  varying float vSide;
  void main() {
    float edge = 1.0 - pow(abs(vSide), 2.2);
    float fade = pow(1.0 - vT, 1.6);
    vec3 col = mix(mix(uColorA, uColorB, vT), mix(uSurgeA, uSurgeB, vT), uSurge);
    float flicker = 0.88 + 0.12 * sin(uTime * 45.0 - vT * 32.0);
    float energy = uIntensity * (1.1 + uSpeed * 2.4 + uSurge * 3.2) * flicker;
    float a = fade * edge * uOpacity;
    if (a <= 0.002) discard;
    gl_FragColor = vec4(col * energy, a);
  }
`

const SAMPLE_DT = 1 / 60
const TELEPORT = 8

export function NeonRibbon({
  getAnchor,
  getOpacity = () => 1,
  segments = 26,
  width = 0.4,
  colorA = '#ff2bd6',
  colorB = '#7b2bff',
  surgeA = '#ffffff',
  surgeB = '#ffcf5a',
  intensity = 1,
}) {
  const head = useRef(new Vector3())
  const points = useRef(Array.from({ length: segments }, () => new Vector3()))
  const acc = useRef(0)
  const primed = useRef(false)
  const scratch = useMemo(() => ({ tan: new Vector3(), toCam: new Vector3(), side: new Vector3() }), [])

  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    const verts = segments * 2
    const pos = new BufferAttribute(new Float32Array(verts * 3), 3)
    pos.setUsage(DynamicDrawUsage)
    const t = new Float32Array(verts)
    const side = new Float32Array(verts)
    for (let i = 0; i < segments; i++) {
      t[i * 2] = t[i * 2 + 1] = i / (segments - 1)
      side[i * 2] = -1
      side[i * 2 + 1] = 1
    }
    const index = []
    for (let i = 0; i < segments - 1; i++) {
      const a = i * 2
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    g.setAttribute('position', pos)
    g.setAttribute('aT', new BufferAttribute(t, 1))
    g.setAttribute('aSide', new BufferAttribute(side, 1))
    g.setIndex(index)
    return g
  }, [segments])

  const material = useMemo(() => new ShaderMaterial({
    uniforms: {
      uColorA: { value: new Color(colorA) },
      uColorB: { value: new Color(colorB) },
      uSurgeA: { value: new Color(surgeA) },
      uSurgeB: { value: new Color(surgeB) },
      uIntensity: { value: intensity },
      uOpacity: { value: 0 },
      uTime: sharedUniforms.uTime,
      uSpeed: sharedUniforms.uSpeed,
      uSurge: sharedUniforms.uSurge,
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
  }), [colorA, colorB, surgeA, surgeB, intensity])

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame(({ camera }, delta) => {
    const pts = points.current
    const visible = getAnchor(head.current)
    const opacity = visible ? getOpacity() : 0
    material.uniforms.uOpacity.value = opacity

    // (Re)prime the history after a teleport (restart) or while hidden
    if (!visible || !primed.current || head.current.distanceTo(pts[0]) > TELEPORT) {
      pts.forEach((p) => p.copy(head.current))
      primed.current = visible
      if (!visible) return
    }

    acc.current += Math.min(delta, 0.1)
    while (acc.current >= SAMPLE_DT) {
      acc.current -= SAMPLE_DT
      for (let i = pts.length - 1; i > 0; i--) pts[i].copy(pts[i - 1])
    }
    pts[0].copy(head.current)
    if (opacity <= 0.001) return

    const arr = geometry.attributes.position.array
    const { tan, toCam, side } = scratch
    for (let i = 0; i < pts.length; i++) {
      const prev = pts[Math.max(0, i - 1)]
      const next = pts[Math.min(pts.length - 1, i + 1)]
      tan.subVectors(prev, next)
      if (tan.lengthSq() < 1e-6) tan.set(0, 0, -1)
      toCam.subVectors(camera.position, pts[i])
      side.crossVectors(tan, toCam).normalize()
      const taper = Math.pow(1 - i / (pts.length - 1), 0.7)
      side.multiplyScalar(width * taper)
      const o = i * 6
      arr[o] = pts[i].x - side.x; arr[o + 1] = pts[i].y - side.y; arr[o + 2] = pts[i].z - side.z
      arr[o + 3] = pts[i].x + side.x; arr[o + 4] = pts[i].y + side.y; arr[o + 5] = pts[i].z + side.z
    }
    geometry.attributes.position.needsUpdate = true
  })

  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}
