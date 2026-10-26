import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, DynamicDrawUsage, ShaderMaterial,
} from 'three'
import { useVfxQuality } from '../../hooks/useVisualFx'
import { GameStatus, useGameStore } from '../../stores/useGameStore'
import { _tmpColor, _tmpColorB, _tmpVec, bindParticleEmitter } from '../../systems/particles'

/*
 * ParticleSystem — one pooled GPU point cloud for every spark, burst and trail
 * particle in the game (a single draw call).
 *
 * - Fixed-size pool, ring-buffer allocation: emitting never allocates, the
 *   oldest particles are recycled when the pool is full.
 * - Simulation on the CPU in typed arrays (velocity, drag, gravity, life);
 *   only position/alpha/size are re-uploaded each frame.
 * - Soft round sprites with additive blending and HDR colour → they bloom.
 * - World space: once emitted, particles stay where they are, so sparks
 *   naturally stream behind the player at speed.
 */

const POOL = { high: 2400, low: 800 }

const vertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aAlpha;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (420.0 / max(0.1, -mv.z));
    vColor = aColor;
    vAlpha = aAlpha;
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5 || vAlpha <= 0.0) discard;
    float core = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor * (0.6 + core), core * core * vAlpha);
  }
`

const rand = (min, max) => min + Math.random() * (max - min)
const pair = (v, fallback) => (Array.isArray(v) ? v : v == null ? fallback : [v, v])

function createPool(count) {
  const geometry = new BufferGeometry()
  const attr = (name, size) => {
    const a = new BufferAttribute(new Float32Array(count * size), size)
    a.setUsage(DynamicDrawUsage)
    geometry.setAttribute(name, a)
    return a
  }
  const sim = {
    count,
    cursor: 0,
    position: attr('position', 3),
    color: attr('aColor', 3),
    size: attr('aSize', 1),
    alpha: attr('aAlpha', 1),
    velocity: new Float32Array(count * 3),
    life: new Float32Array(count),
    maxLife: new Float32Array(count),
    baseSize: new Float32Array(count),
    gravity: new Float32Array(count),
    drag: new Float32Array(count),
    alive: 0,
  }
  return { geometry, sim }
}

function emitInto(sim, opts) {
  const {
    position, count = 10, color = '#ffffff', colorB, intensity = 2.5, shape = 'sphere',
    direction, spread = 0.5, velocity, gravity = 0, drag = 2,
  } = opts
  const speed = pair(opts.speed, [1, 4])
  const life = pair(opts.life, [0.4, 0.9])
  const size = pair(opts.size, [0.12, 0.3])
  const [px, py, pz] = position
  _tmpColor.set(color)
  if (colorB) _tmpColorB.set(colorB)

  const pos = sim.position.array
  const col = sim.color.array
  for (let n = 0; n < count; n++) {
    const i = sim.cursor
    sim.cursor = (sim.cursor + 1) % sim.count
    const i3 = i * 3

    // direction
    if (shape === 'ring') {
      const a = Math.random() * Math.PI * 2
      _tmpVec.set(Math.cos(a), Math.sin(a), rand(-0.15, 0.15))
    } else if (shape === 'cone' && direction) {
      _tmpVec.set(
        direction[0] + rand(-spread, spread),
        direction[1] + rand(-spread, spread),
        direction[2] + rand(-spread, spread),
      )
    } else {
      _tmpVec.set(rand(-1, 1), rand(-1, 1), rand(-1, 1))
    }
    _tmpVec.normalize().multiplyScalar(rand(speed[0], speed[1]))
    if (velocity) _tmpVec.add({ x: velocity[0], y: velocity[1], z: velocity[2] })

    pos[i3] = px; pos[i3 + 1] = py; pos[i3 + 2] = pz
    sim.velocity[i3] = _tmpVec.x
    sim.velocity[i3 + 1] = _tmpVec.y
    sim.velocity[i3 + 2] = _tmpVec.z

    const t = colorB ? Math.random() : 0
    col[i3] = (_tmpColor.r + ((colorB ? _tmpColorB.r : _tmpColor.r) - _tmpColor.r) * t) * intensity
    col[i3 + 1] = (_tmpColor.g + ((colorB ? _tmpColorB.g : _tmpColor.g) - _tmpColor.g) * t) * intensity
    col[i3 + 2] = (_tmpColor.b + ((colorB ? _tmpColorB.b : _tmpColor.b) - _tmpColor.b) * t) * intensity

    const l = rand(life[0], life[1])
    sim.life[i] = l
    sim.maxLife[i] = l
    sim.baseSize[i] = rand(size[0], size[1])
    sim.gravity[i] = gravity
    sim.drag[i] = drag
  }
  sim.color.needsUpdate = true
  sim.alive = sim.count // a burst may land anywhere in the ring; next step re-scans
}

export function ParticleSystem() {
  const quality = useVfxQuality()
  const count = POOL[quality] ?? POOL.high
  const { geometry, sim } = useMemo(() => createPool(count), [count])
  const material = useMemo(() => new ShaderMaterial({
    uniforms: { uPixelRatio: { value: 1 } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  }), [])

  useEffect(() => bindParticleEmitter((opts) => emitInto(sim, opts)), [sim])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((state, delta) => {
    material.uniforms.uPixelRatio.value = state.gl.getPixelRatio()
    if (useGameStore.getState().status === GameStatus.PAUSED || sim.alive === 0) return
    const dt = Math.min(delta, 0.05)
    const pos = sim.position.array
    const alpha = sim.alpha.array
    const size = sim.size.array
    let alive = 0

    for (let i = 0; i < sim.count; i++) {
      if (sim.life[i] <= 0) {
        if (alpha[i] !== 0) { alpha[i] = 0; size[i] = 0 }
        continue
      }
      alive++
      const i3 = i * 3
      sim.life[i] -= dt
      const k = Math.exp(-sim.drag[i] * dt)
      sim.velocity[i3] *= k
      sim.velocity[i3 + 1] = sim.velocity[i3 + 1] * k + sim.gravity[i] * dt
      sim.velocity[i3 + 2] *= k
      pos[i3] += sim.velocity[i3] * dt
      pos[i3 + 1] += sim.velocity[i3 + 1] * dt
      pos[i3 + 2] += sim.velocity[i3 + 2] * dt
      const f = Math.max(0, sim.life[i] / sim.maxLife[i])
      alpha[i] = f * f
      size[i] = sim.baseSize[i] * (0.35 + 0.65 * f)
    }
    sim.alive = alive
    sim.position.needsUpdate = true
    sim.alpha.needsUpdate = true
    sim.size.needsUpdate = true
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
