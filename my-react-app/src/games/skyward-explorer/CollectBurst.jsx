/**
 * A burst of glowing sparks where a crystal was collected. ~28 points flying out, rising,
 * and fading over `life` seconds, then `onDone(id)` so the parent can drop it.
 * One Points draw call per burst.
 */
import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry } from 'three'

const COUNT = 28

function CollectBurst({ id, position, color, life = 0.9, onDone }) {
  const points = useRef()
  const age = useRef(0)
  const done = useRef(false)

  const { geometry, velocities } = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(COUNT * 3), 3))
    const v = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      // even spread over a sphere, biased upwards
      const u = Math.random() * 2 - 1
      const a = Math.random() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      const speed = 2.5 + Math.random() * 2.5
      v[i * 3] = Math.cos(a) * s * speed
      v[i * 3 + 1] = (Math.abs(u) + 0.6) * speed
      v[i * 3 + 2] = Math.sin(a) * s * speed
    }
    return { geometry: g, velocities: v }
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, delta) => {
    if (done.current || !points.current) return
    age.current += Math.min(delta, 0.1)
    const t = age.current
    const pos = geometry.attributes.position.array
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = velocities[i * 3] * t
      pos[i * 3 + 1] = velocities[i * 3 + 1] * t - 4.5 * t * t // a little gravity
      pos[i * 3 + 2] = velocities[i * 3 + 2] * t
    }
    geometry.attributes.position.needsUpdate = true
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
