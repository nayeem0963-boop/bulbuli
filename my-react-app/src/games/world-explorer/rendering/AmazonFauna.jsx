/**
 * Draws the Amazon's animals (biomes/amazon.js `fauna`, rendering/amazonFauna.js): low-poly,
 * flat-shaded statues, one vertex-coloured mesh per kind shared by every animal of that kind. No
 * model files, no image files. They stand still.
 */
import { useEffect, useMemo } from 'react'
import { DoubleSide, MeshStandardMaterial } from 'three'
import { AMAZON_FAUNA, AMAZON_FAUNA_BUILDERS } from './amazonFauna.js'
import { contactShadowTexture } from './amazonGroundShadow.js'

// one material and one shadow texture for every animal, made the first time they are needed
let material = null
let shadowTexture = null
// matte and faceted; a little self-light so the animals do not sink into the dim forest
const statueMaterial = () => (material ??= new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0, side: DoubleSide, emissive: '#3a3226', emissiveIntensity: 0.35 }))
const shadow = () => (shadowTexture ??= contactShadowTexture())

/** A soft shadow on the ground under an animal, as long as the animal is (its model faces +z). */
function GroundShadow({ type }) {
  const { length } = AMAZON_FAUNA[type]
  const long = Math.max(0.18, length) * 1.25
  const wide = Math.max(0.14, Math.min(length * 0.62, 0.9))
  return (
    <mesh position={[0, 0.018, 0]} rotation-x={-Math.PI / 2} scale={[wide * 1.15, long, 1]} renderOrder={1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={shadow()} transparent depthWrite={false} side={DoubleSide} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
    </mesh>
  )
}

export default function AmazonFauna({ fauna }) {
  // a mesh per kind, built once (a kind's look comes from its first animal's seed)
  const geometries = useMemo(() => {
    const byKind = {}
    for (const animal of fauna) if (!byKind[animal.type]) byKind[animal.type] = AMAZON_FAUNA_BUILDERS[animal.type](animal.seed)
    return byKind
  }, [fauna])
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries])
  return fauna.map((animal, index) => (
    <group key={index} position={[animal.x, animal.y ?? 0, animal.z]} rotation-y={animal.rot ?? 0}>
      <GroundShadow type={animal.type} />
      <mesh geometry={geometries[animal.type]} material={statueMaterial()} castShadow receiveShadow />
    </group>
  ))
}
