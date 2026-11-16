/**
 * The Amazon's forest pool: a raised bank of mud round still, dark water, at the foot of the giant
 * tree, with crimson fangbacks (payara, a fish with fangs) circling in it. The fish is a model file
 * like the other animals (AmazonModel.jsx; its tail beats in the shader, amazonMotion.js) and stays
 * below the water, which is see-through enough to show it. Data: biomes/amazon.js `pool`.
 */
import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { LatheGeometry, Vector2 } from 'three'
import { makeMotion } from './amazonMotion.js'
import AmazonModel from './AmazonModel.jsx'

/** The bank's profile, from the pool bed up over the lip and down to the forest floor. */
const BANK = [[1.1, 0.03], [1.25, 0.2], [1.42, 0.32], [1.6, 0.34], [1.8, 0.03]]
export const POOL_WATER_Y = 0.3
export const POOL_WATER_R = 1.22
/** Fish are drawn this fraction of life size: a payara is a metre long, the pool is not. */
const FISH_SCALE = 0.55

function Fish({ fish }) {
  const group = useRef(null)
  const body = useRef(null)
  const motion = useRef(makeMotion())
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const t = clock.elapsedTime * fish.speed + fish.phase
    const a = fish.dir * t
    const wobble = 1 + 0.12 * Math.sin(t * 0.7 + fish.phase)
    const x = Math.cos(a) * fish.r * wobble
    const z = Math.sin(a) * fish.r * wobble
    g.position.set(x, 0.03 + 0.02 * Math.sin(clock.elapsedTime * 1.3 + fish.phase), z)
    // facing the way it swims (the model faces +z)
    g.rotation.set(0, Math.atan2(-Math.sin(a) * fish.dir, Math.cos(a) * fish.dir), 0)
    motion.current.uT.value = clock.elapsedTime * fish.speed * 1.6 + fish.phase
    motion.current.uIdle.value = 1
    if (body.current) body.current.rotation.z = 0.05 * Math.sin(clock.elapsedTime * 2 + fish.phase)
  })
  return (
    <group ref={group}>
      <group ref={body} scale={FISH_SCALE}>
        <Suspense fallback={null}><AmazonModel kind="fish" motionRef={motion} /></Suspense>
      </group>
    </group>
  )
}

export default function AmazonPool({ pool }) {
  const bank = useMemo(() => new LatheGeometry(BANK.map(([r, y]) => new Vector2(r, y)), 28), [])
  return (
    <group position={[pool.x, 0, pool.z]}>
      <mesh geometry={bank} receiveShadow>
        <meshStandardMaterial color="#4a3b27" roughness={0.95} side={2} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1.2, 28]} />
        <meshStandardMaterial color="#1c261f" roughness={1} />
      </mesh>
      <mesh position={[0, POOL_WATER_Y, 0]} rotation-x={-Math.PI / 2} renderOrder={2}>
        <circleGeometry args={[POOL_WATER_R, 28]} />
        <meshStandardMaterial color="#2f6f66" transparent opacity={0.5} roughness={0.12} metalness={0} depthWrite={false} />
      </mesh>
      {pool.fish.map((fish, index) => <Fish key={index} fish={fish} />)}
    </group>
  )
}
