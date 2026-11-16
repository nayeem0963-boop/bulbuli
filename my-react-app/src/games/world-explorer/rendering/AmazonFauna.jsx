/**
 * Draws the Amazon's animals (biomes/amazon.js `fauna`): smooth, finely modelled statues with a
 * satin finish (rendering/amazonFauna.js: one vertex-coloured mesh per kind, shared by every animal
 * of that kind, built in code), and the jaguar, ocelot, armadillo and capuchin, which are model files (AmazonModel.jsx). They stand
 * still.
 */
import { Suspense, useEffect, useMemo } from 'react'
import { DoubleSide, MeshPhysicalMaterial } from 'three'
import { AMAZON_FAUNA, AMAZON_FAUNA_BUILDERS, AMAZON_FAUNA_MODELS } from './amazonFauna.js'
import { contactShadowTexture } from './amazonGroundShadow.js'
import AmazonModel from './AmazonModel.jsx'

// one material and one shadow texture for every animal, made the first time they are needed
let material = null
let shadowTexture = null
// a satin finish, like a painted and varnished sculpture; a good deal of self-light, so the animals
// keep their colour in the dim forest instead of sinking into it
const statueMaterial = () => (material ??= new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.5, side: DoubleSide, emissive: '#4a4030', emissiveIntensity: 0.5 }))
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
    for (const animal of fauna) if (!byKind[animal.type] && AMAZON_FAUNA_BUILDERS[animal.type]) byKind[animal.type] = AMAZON_FAUNA_BUILDERS[animal.type](animal.seed)
    return byKind
  }, [fauna])
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries])
  return fauna.map((animal, index) => (
    <group key={index} position={[animal.x, animal.y ?? 0, animal.z]} rotation-y={animal.rot ?? 0}>
      <GroundShadow type={animal.type} />
      {AMAZON_FAUNA_MODELS.includes(animal.type)
        ? <Suspense fallback={null}><AmazonModel kind={animal.type} /></Suspense>
        : <mesh geometry={geometries[animal.type]} material={statueMaterial()} castShadow receiveShadow />}
    </group>
  ))
}
