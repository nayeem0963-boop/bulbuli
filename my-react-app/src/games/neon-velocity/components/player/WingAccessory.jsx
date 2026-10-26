import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { vfx } from '../../systems/vfx'

/*
 * Cosmetic wing accessories from the Vault. Mounted inside each wing's pivot
 * group (so they flap with the wing), except the halo which sits on the head.
 *   blade  — swept light blades
 *   jet    — under-wing thruster pods; flames grow with speed and flare in surge
 *   plume  — fan of holographic feathers
 *   halo   — spinning ring above the head
 */
export function WingAccessory({ style, side = 1, color, altColor }) {
  const glow = (c, i = 3.5, extra = {}) => (
    <meshStandardMaterial color={c} emissive={c} emissiveIntensity={i} toneMapped={false} {...extra} />
  )

  if (style === 'blade') {
    return (
      <group position={[side * 0.42, 0.02, 0.12]}>
        {[0, 1].map((i) => (
          <mesh key={i} position={[side * (0.12 + i * 0.12), 0, 0.1 + i * 0.12]} rotation={[0, side * (0.7 + i * 0.25), 0]}>
            <boxGeometry args={[0.03, 0.02, 0.55 - i * 0.12]} />
            {glow(i ? altColor : color, 4)}
          </mesh>
        ))}
      </group>
    )
  }

  if (style === 'jet') return <JetPod side={side} color={color} altColor={altColor} glow={glow} />

  if (style === 'plume') {
    return (
      <group position={[side * 0.45, 0.02, 0.1]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[side * 0.08 * i, 0, 0.06 * i]} rotation={[0, side * (0.2 + i * 0.28), 0]}>
            <boxGeometry args={[0.07, 0.01, 0.42]} />
            {glow(i % 2 ? altColor : color, 2.5, { transparent: true, opacity: 0.75 })}
          </mesh>
        ))}
      </group>
    )
  }

  if (style === 'halo') return <Halo color={color} glow={glow} />
  return null
}

function JetPod({ side, color, altColor, glow }) {
  const flame = useRef()
  useFrame((state) => {
    if (!flame.current) return
    const t = state.clock.elapsedTime
    const len = 0.25 + vfx.speedFactor * 0.35 + vfx.surge * 0.6 + Math.sin(t * 40) * 0.05
    flame.current.scale.set(1, len, 1)
    flame.current.position.z = 0.22 + len * 0.25
  })
  return (
    <group position={[side * 0.18, -0.08, 0.05]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.3, 8]} />
        <meshStandardMaterial color="#1a1030" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh ref={flame} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.06, 1, 8, 1, true]} />
        {glow(altColor ?? color, 5, { transparent: true, opacity: 0.85, depthWrite: false })}
      </mesh>
    </group>
  )
}

function Halo({ color, glow }) {
  const ring = useRef()
  useFrame((_, dt) => { if (ring.current) ring.current.rotation.z += dt * 2 })
  return (
    <mesh ref={ring} position={[0, 0.48, 0.05]} rotation={[Math.PI / 2 - 0.25, 0, 0]}>
      <torusGeometry args={[0.2, 0.02, 8, 32]} />
      {glow(color, 4)}
    </mesh>
  )
}
