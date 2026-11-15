/**
 * Draws the Amazon's animals (biomes/amazon.js `fauna`, rendering/amazonFauna.js): one
 * vertex-coloured mesh per kind, shared by every animal of that kind. No model files, no image
 * files. They stand still.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AMAZON_FAUNA_BUILDERS } from './amazonFauna.js'
import { poseAt } from './amazonFaunaMotion.js'

/** People who ask their device for less motion get still animals. */
const calm = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Opaque, matte, vertex-coloured, lit from both sides (wings, tails and leaves are single sheets). */
function Statue({ geometry }) {
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {/* a little self-light, so the animals do not sink into the dim forest */}
      <meshStandardMaterial vertexColors roughness={0.82} metalness={0} side={2} emissive="#3a3226" emissiveIntensity={0.4} />
    </mesh>
  )
}

/** One animal: rests at its place, moved each frame by amazonFaunaMotion.js. */
function Animal({ animal, index, geometry, still }) {
  const body = useRef()
  const phase = animal.seed * 1.7 + index * 0.9
  useFrame(({ clock }) => {
    const node = body.current
    if (!node || still) return
    const pose = poseAt(animal.type, clock.elapsedTime, phase)
    node.position.set(pose.x, pose.y, pose.z)
    node.rotation.set(pose.pitch, pose.yaw, pose.roll)
    node.scale.set(pose.sx, pose.sy, pose.sz)
  })
  return (
    <group position={[animal.x, animal.y ?? 0, animal.z]} rotation-y={animal.rot ?? 0}>
      <group ref={body}><Statue geometry={geometry} /></group>
    </group>
  )
}

export default function AmazonFauna({ fauna }) {
  const still = useMemo(() => calm(), [])
  // a mesh per kind, built once (a kind's look comes from its own seed, the first animal's)
  const geometries = useMemo(() => {
    const byKind = {}
    for (const animal of fauna) if (!byKind[animal.type]) byKind[animal.type] = AMAZON_FAUNA_BUILDERS[animal.type](animal.seed)
    return byKind
  }, [fauna])
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries])
  return fauna.map((animal, index) => <Animal key={index} animal={animal} index={index} geometry={geometries[animal.type]} still={still} />)
}
