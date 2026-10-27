/**
 * The Math Master lab: a floating hexagonal platform with a polar grid, a glowing ring that flashes
 * green or amber on feedback, a few slow wireframe solids in the background and a light dust of
 * particles. Everything is low-poly, uses basic materials where possible and adds ~12 draw calls.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color } from 'three'

const CORRECT = new Color('#4fe39a')
const WRONG = new Color('#ffb04f')

const BACKDROP_SOLIDS = [
  { kind: 'icosahedron', position: [-6.4, 2.6, -4.5], size: 0.9, speed: 0.12 },
  { kind: 'octahedron', position: [6.2, 2.9, -4.2], size: 0.85, speed: -0.15 },
  { kind: 'dodecahedron', position: [-4.2, 4.3, -7.5], size: 0.8, speed: 0.1 },
  { kind: 'tetrahedron', position: [4.6, 4.6, -7.2], size: 0.9, speed: 0.18 },
  { kind: 'torus', position: [0.4, 5.4, -9], size: 0.8, speed: -0.08 },
  { kind: 'box', position: [-7.6, -0.4, -6.5], size: 0.7, speed: 0.14 },
]

function SolidGeometry({ kind, size }) {
  switch (kind) {
    case 'icosahedron': return <icosahedronGeometry args={[size, 0]} />
    case 'octahedron': return <octahedronGeometry args={[size, 0]} />
    case 'dodecahedron': return <dodecahedronGeometry args={[size, 0]} />
    case 'tetrahedron': return <tetrahedronGeometry args={[size, 0]} />
    case 'torus': return <torusGeometry args={[size, size * 0.3, 8, 20]} />
    default: return <boxGeometry args={[size * 1.3, size * 1.3, size * 1.3]} />
  }
}

function BackdropSolid({ kind, position, size, speed, color, reducedMotion }) {
  const ref = useRef()
  useFrame((_, delta) => {
    if (reducedMotion || !ref.current) return
    ref.current.rotation.x += delta * speed
    ref.current.rotation.y += delta * speed * 1.4
  })
  return (
    <mesh ref={ref} position={position} rotation={[0.4, 0.6, 0]}>
      <SolidGeometry kind={kind} size={size} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.28} />
    </mesh>
  )
}

function Dust({ reducedMotion }) {
  const ref = useRef()
  const positions = useMemo(() => {
    // fixed pseudo-random spread, so the sky looks the same every time
    let seed = 7
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const array = new Float32Array(160 * 3)
    for (let i = 0; i < 160; i += 1) {
      array[i * 3] = (random() - 0.5) * 22
      array[i * 3 + 1] = random() * 9 - 2
      array[i * 3 + 2] = -random() * 9 - 1.5
    }
    return array
  }, [])
  useFrame((_, delta) => {
    if (!reducedMotion && ref.current) ref.current.rotation.y += delta * 0.01
  })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#cfe0ff" size={0.05} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
    </points>
  )
}

/** The glowing rim: level colour at rest, a short green/amber flash after each answer. */
function FeedbackRing({ color, feedback, reducedMotion }) {
  const material = useRef()
  const flash = useRef({ amount: 0, color: CORRECT })
  const base = useMemo(() => new Color(color), [color])
  const invalidate = useThree((state) => state.invalidate)

  // a new answer flashes; a new question (feedback cleared) returns to the level colour
  useEffect(() => {
    flash.current = feedback
      ? { amount: 1, color: feedback.kind === 'correct' ? CORRECT : WRONG }
      : { amount: 0, color: CORRECT }
    invalidate() // draw the change even when the scene renders on demand (reduced motion)
  }, [feedback, invalidate])

  useFrame((_, delta) => {
    const m = material.current
    if (!m) return
    const f = flash.current
    // with reduced motion the flash holds steady until the next question instead of pulsing
    if (!reducedMotion) f.amount = Math.max(0, f.amount - delta * 0.8)
    m.color.copy(base).lerp(f.color, Math.min(1, f.amount * 1.2))
  })

  return (
    <mesh position={[0, -1.585, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[3.42, 0.04, 8, 96]} />
      <meshBasicMaterial ref={material} color={color} toneMapped={false} />
    </mesh>
  )
}

export default function Arena({ color, feedback, reducedMotion }) {
  return (
    <group>
      {/* platform: dark hexagon with a lighter inset and a polar grid */}
      <mesh position={[0, -1.76, 0]} receiveShadow>
        <cylinderGeometry args={[3.7, 3.95, 0.34, 6]} />
        <meshStandardMaterial color="#141c42" roughness={0.55} metalness={0.35} />
      </mesh>
      <mesh position={[0, -1.6, 0]}>
        <cylinderGeometry args={[3.45, 3.45, 0.02, 6]} />
        <meshStandardMaterial color="#1c2756" roughness={0.7} metalness={0.2} />
      </mesh>
      <polarGridHelper args={[3.25, 6, 4, 72, '#3a4c8f', '#2a3972']} position={[0, -1.585, 0]} />
      <FeedbackRing color={color} feedback={feedback} reducedMotion={reducedMotion} />

      {BACKDROP_SOLIDS.map((solid) => (
        <BackdropSolid key={solid.kind} {...solid} color={color} reducedMotion={reducedMotion} />
      ))}
      <Dust reducedMotion={reducedMotion} />
    </group>
  )
}
