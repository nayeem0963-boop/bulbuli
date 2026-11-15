/**
 * Draws the Amazon's animals (biomes/amazon.js `fauna`, rendering/amazonFauna.js): one
 * vertex-coloured mesh per kind, shared by every animal of that kind. No model files, no image
 * files. They stand still.
 */
import { useEffect, useMemo } from 'react'
import { AMAZON_FAUNA_BUILDERS } from './amazonFauna.js'

/** Opaque, matte, vertex-coloured, lit from both sides (wings, tails and leaves are single sheets). */
function Statue({ geometry }) {
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {/* a little self-light, so the animals do not sink into the dim forest */}
      <meshStandardMaterial vertexColors roughness={0.82} metalness={0} side={2} emissive="#3a3226" emissiveIntensity={0.4} />
    </mesh>
  )
}

export default function AmazonFauna({ fauna }) {
  // a mesh per kind, built once (a kind's look comes from its own seed, the first animal's)
  const geometries = useMemo(() => {
    const byKind = {}
    for (const animal of fauna) if (!byKind[animal.type]) byKind[animal.type] = AMAZON_FAUNA_BUILDERS[animal.type](animal.seed)
    return byKind
  }, [fauna])
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries])
  return fauna.map((animal, index) => (
    <group key={index} position={[animal.x, animal.y ?? 0, animal.z]} rotation-y={animal.rot ?? 0}>
      <Statue geometry={geometries[animal.type]} />
    </group>
  ))
}
