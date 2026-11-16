/**
 * Draws the Amazon's animals (biomes/amazon.js `fauna`): every one is a model file
 * (AmazonModel.jsx). Some stand where they are put, still. The flyers circle slowly over the
 * clearing, and the roamers walk loops across the forest floor, pausing to look about (a position,
 * heading and a little gait bob only; the model itself does not move).
 */
import { Suspense, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide } from 'three'
import { AMAZON_FAUNA, flightAt, roamAt } from './amazonFauna.js'
import { contactShadowTexture } from './amazonGroundShadow.js'
import AmazonModel from './AmazonModel.jsx'

let shadowTexture = null
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

function Flyer({ animal }) {
  const group = useRef(null)
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const p = flightAt(animal.fly, clock.elapsedTime)
    g.position.set(p.x, p.y, p.z)
    g.rotation.set(0, p.heading, -0.12 * (animal.fly.dir ?? 1))
  })
  return (
    <group ref={group} position={[animal.x, animal.y, animal.z]} rotation-y={animal.rot ?? 0}>
      <Suspense fallback={null}><AmazonModel kind={animal.type} /></Suspense>
    </group>
  )
}

/** A ground animal walking its loop: its shadow stays on the floor while the body bobs and sways with each step. */
function Roamer({ animal }) {
  const group = useRef(null)
  const body = useRef(null)
  useFrame(({ clock }) => {
    const g = group.current
    const b = body.current
    if (!g || !b) return
    const p = roamAt(animal.roam, clock.elapsedTime)
    g.position.set(p.x, 0, p.z)
    g.rotation.set(0, p.heading, 0)
    const step = Math.sin(p.gait)
    b.position.y = Math.abs(step) * 0.035 * p.walk
    b.rotation.set(Math.cos(p.gait * 0.5) * 0.025 * p.walk, 0, step * 0.04 * p.walk)
  })
  return (
    <group ref={group} position={[animal.x, 0, animal.z]}>
      <GroundShadow type={animal.type} />
      <group ref={body}>
        <Suspense fallback={null}><AmazonModel kind={animal.type} /></Suspense>
      </group>
    </group>
  )
}

export default function AmazonFauna({ fauna }) {
  return fauna.map((animal, index) => (animal.fly
    ? <Flyer key={index} animal={animal} />
    : animal.roam
      ? <Roamer key={index} animal={animal} />
      : (
      <group key={index} position={[animal.x, animal.y ?? 0, animal.z]} rotation-y={animal.rot ?? 0}>
        <GroundShadow type={animal.type} />
        <Suspense fallback={null}><AmazonModel kind={animal.type} /></Suspense>
      </group>
    )))
}
