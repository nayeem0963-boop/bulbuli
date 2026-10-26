import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { runtime } from '../../stores/runtime'

/** Drei stars, re-centred on the player each frame so the sky never runs out. */
export function Starfield() {
  const group = useRef()
  useFrame(() => {
    if (group.current) group.current.position.z = runtime.playerPosition.z
  })
  return (
    <group ref={group}>
      <Stars radius={260} depth={60} count={2500} factor={6} saturation={0.6} fade speed={0.6} />
    </group>
  )
}
