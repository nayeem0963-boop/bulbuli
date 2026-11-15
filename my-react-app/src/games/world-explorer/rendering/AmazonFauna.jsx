/**
 * Draws the Amazon's animals (biomes/amazon.js `fauna`, rendering/amazonFauna.js): one
 * vertex-coloured mesh per kind, shared by every animal of that kind. No model files, no image
 * files. They stand still.
 */
import { useEffect, useMemo, useRef } from 'react'
import { DoubleSide } from 'three'
import { useFrame } from '@react-three/fiber'
import { AMAZON_FAUNA, AMAZON_FAUNA_BUILDERS, createAnimalParts } from './amazonFauna.js'
import { contactShadowTexture, createFurMaterial } from './amazonFurMaterial.js'
import { poseAt } from './amazonFaunaMotion.js'
import { gait, walkState } from './amazonFaunaWalk.js'

/** People who ask their device for less motion get still animals. */
const calm = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// one fur material and one shadow texture for every animal, made the first time they are needed
let furMaterial = null
let skinMaterial = null
let shadowTexture = null
const fur = () => (furMaterial ??= createFurMaterial('fur'))
const scaly = () => (skinMaterial ??= createFurMaterial('skin'))
/** Bare, scaly skin rather than fur or feathers. */
const SKIN_KINDS = new Set(['caiman', 'anaconda', 'tortoise', 'frog', 'armadillo'])
const shadow = () => (shadowTexture ??= contactShadowTexture())

/** Opaque, vertex-coloured, with the fur look of amazonFurMaterial.js; lit from both sides (wings, tails and leaves are single sheets). */
function Statue({ geometry, type }) {
  return <mesh geometry={geometry} material={SKIN_KINDS.has(type) ? scaly() : fur()} castShadow receiveShadow />
}

/** A soft shadow on the ground under an animal, as long as the animal is (its model faces +z). */
function GroundShadow({ type }) {
  if (type === 'morpho') return null // it is in the air: its place on the ground is not where it is
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

/** One animal that stays where it is: rests at its place, moved each frame by amazonFaunaMotion.js. */
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
      <GroundShadow type={animal.type} />
      <group ref={body}><Statue geometry={geometry} type={animal.type} /></group>
    </group>
  )
}

/**
 * One animal that walks (amazonFaunaWalk.js): carried round its walk, its legs swinging from the
 * hips as it goes; when it stops it stands, sniffs and looks about. With reduced motion it stands
 * where it was placed.
 */
function Walker({ animal, index, parts, still }) {
  const root = useRef()
  const body = useRef()
  const legs = useRef([])
  const phase = animal.seed * 1.7 + index * 0.9
  useFrame(({ clock }) => {
    if (still || !root.current) return
    const t = clock.elapsedTime
    const state = walkState(animal, t)
    root.current.position.set(state.x, animal.y ?? 0, state.z)
    root.current.rotation.y = state.yaw
    // standing: the idle body language, fading out as it sets off
    const idle = poseAt(animal.type, t, phase)
    const rest = 1 - state.amp
    let bounce = 0
    let sway = 0
    parts.legs.forEach((leg, i) => {
      const step = gait(animal, leg, state)
      if (legs.current[i]) legs.current[i].rotation.x = step.swing
      bounce = step.bounce
      sway = step.sway
    })
    body.current.position.set(0, bounce, 0)
    body.current.rotation.set(idle.pitch * rest, idle.yaw * rest, sway)
    body.current.scale.set(idle.sx, idle.sy, idle.sz)
  })
  const start = still ? null : walkState(animal, 0)
  return (
    <group ref={root} position={start ? [start.x, animal.y ?? 0, start.z] : [animal.x, animal.y ?? 0, animal.z]} rotation-y={start ? start.yaw : animal.rot ?? 0}>
      <GroundShadow type={animal.type} />
      <group ref={body}>
        <Statue geometry={parts.body} type={animal.type} />
        {parts.legs.map((leg, i) => (
          <group key={i} position={leg.pivot} ref={(node) => { legs.current[i] = node }}>
            <Statue geometry={leg.geometry} type={animal.type} />
          </group>
        ))}
      </group>
    </group>
  )
}

export default function AmazonFauna({ fauna }) {
  const still = useMemo(() => calm(), [])
  // the models, built once per kind (a kind's look comes from its first animal's seed): whole for
  // the animals that stay put, in parts (body and legs) for the ones that walk
  const models = useMemo(() => {
    const whole = {}
    const parted = {}
    for (const animal of fauna) {
      if (animal.roam && !still) { if (!parted[animal.type]) parted[animal.type] = createAnimalParts(animal.type, animal.seed) }
      if (!animal.roam || still) { if (!whole[animal.type]) whole[animal.type] = AMAZON_FAUNA_BUILDERS[animal.type](animal.seed) }
    }
    return { whole, parted }
  }, [fauna, still])
  useEffect(() => () => {
    Object.values(models.whole).forEach((geometry) => geometry.dispose())
    Object.values(models.parted).forEach((parts) => { parts.body.dispose(); parts.legs.forEach((leg) => leg.geometry.dispose()) })
  }, [models])
  return fauna.map((animal, index) => (
    animal.roam && !still && models.parted[animal.type]
      ? <Walker key={index} animal={animal} index={index} parts={models.parted[animal.type]} still={still} />
      : <Animal key={index} animal={animal} index={index} geometry={models.whole[animal.type] ?? models.parted[animal.type]?.body} still={still} />
  ))
}
