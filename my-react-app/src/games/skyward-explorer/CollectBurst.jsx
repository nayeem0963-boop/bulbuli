/**
 * A burst of glowing sparks where a crystal was collected. ~28 points flying out, rising,
 * and fading over `life` seconds, then `onDone(id)` so the parent can drop it.
 * One Points draw call per burst.
 *
 * React Compiler rules: the spray is seeded from `id` (pure render, and each crystal keeps its own
 * pattern), and per-frame updates go through the `points` ref, never through render-time values.
 */
import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry } from 'three'
import { mulberry32 } from '../../core/rng.js'

const COUNT = 28

/** Stable 32-bit seed from a burst id (FNV-1a). */
function seedFrom(id) {
  const text = String(id)
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

function CollectBurst({ id, position, color, life = 0.9, onDone }) {
  const points = useRef()
  const age = useRef(0)
  const done = useRef(false)

  const { geometry, velocities } = useMemo(() => {
    const random = mulberry32(seedFrom(id))
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(COUNT * 3), 3))
    const v = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      // even spread over a sphere, biased upwards
      const u = random() * 2 - 1
      const a = random() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      const speed = 2.5 + random() * 2.5
      v[i * 3] = Math.cos(a) * s * speed
      v[i * 3 + 1] = (Math.abs(u) + 0.6) * speed
      v[i * 3 + 2] = Math.sin(a) * s * speed
    }
    return { geometry: g, velocities: v }
  }, [id])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, delta) => {
    if (done.current || !points.current) return
    age.current += Math.min(delta, 0.1)
    const t = age.current
    // mutate the live object owned by three.js (via the ref), not the render-time value
    const attribute = points.current.geometry.attributes.position
    const pos = attribute.array
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = velocities[i * 3] * t
      pos[i * 3 + 1] = velocities[i * 3 + 1] * t - 4.5 * t * t // a little gravity
      pos[i * 3 + 2] = velocities[i * 3 + 2] * t
    }
    attribute.needsUpdate = true
    const k = t / life
    points.current.material.opacity = Math.max(0, 1 - k * k)
    points.current.material.size = 0.22 * (1 - k * 0.6)
    if (t >= life) {
      done.current = true
      onDone?.(id)
    }
  })

  return (
    <points ref={points} position={position} geometry={geometry} frustumCulled={false}>
      <pointsMaterial color={color} size={0.22} transparent opacity={1} blending={AdditiveBlending} depthWrite={false} sizeAttenuation />
    </points>
  )
}

export default memo(CollectBurst)
