import { memo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshStandardMaterial } from 'three'

const materials = {
  body: new MeshStandardMaterial({ color: '#7a5a40', flatShading: true, roughness: 0.8 }),
  wing: new MeshStandardMaterial({ color: '#5c4230', flatShading: true, roughness: 0.8 }),
  black: new MeshStandardMaterial({ color: '#23201f', flatShading: true, roughness: 0.8 }),
  white: new MeshStandardMaterial({ color: '#f4efe6', flatShading: true, roughness: 0.8 }),
  red: new MeshStandardMaterial({ color: '#e5322d', flatShading: true, roughness: 0.8 }),
  beak: new MeshStandardMaterial({ color: '#3b302b', flatShading: true, roughness: 0.8 }),
}

function Part({ geometry = 'icosahedron', material, ...props }) {
  return (
    <mesh material={material} castShadow {...props}>
      {geometry === 'cone'
        ? <coneGeometry args={[1, 1, 5]} />
        : <icosahedronGeometry args={[1, 1]} />}
    </mesh>
  )
}

function PlayerBird3D() {
  const bird = useRef()
  const leftWing = useRef()
  const rightWing = useRef()

  useFrame(({ clock }) => {
    const time = clock.elapsedTime
    if (bird.current) bird.current.position.y = Math.sin(time * 1.8) * 0.12

    const flap = Math.sin(time * 8) * 0.35
    if (leftWing.current) leftWing.current.rotation.z = flap
    if (rightWing.current) rightWing.current.rotation.z = -flap
  })

  return (
    <group name="PlayerBird3D" position={[0, -1, 0]}>
      <group ref={bird}>
        <Part material={materials.body} position={[0, 0, 0]} scale={[0.38, 0.34, 0.52]} />
        <Part material={materials.white} position={[0, -0.12, 0.2]} scale={[0.28, 0.22, 0.3]} />
        <Part material={materials.black} position={[0, 0.34, 0.2]} scale={0.24} />
        <Part
          geometry="cone"
          material={materials.black}
          position={[0, 0.59, 0.18]}
          rotation-x={0.35}
          scale={[0.1, 0.32, 0.1]}
        />
        <Part
          geometry="cone"
          material={materials.beak}
          position={[0, 0.32, 0.49]}
          rotation-x={Math.PI / 2}
          scale={[0.07, 0.17, 0.07]}
        />
        {[-1, 1].map((side) => (
          <group key={side}>
            <Part material={materials.white} position={[side * 0.17, 0.25, 0.27]} scale={[0.07, 0.08, 0.08]} />
            <Part material={materials.red} position={[side * 0.2, 0.36, 0.22]} scale={0.06} />
            <Part material={materials.black} position={[side * 0.13, 0.37, 0.37]} scale={0.035} />
          </group>
        ))}
        <group ref={leftWing} position={[-0.28, 0.1, 0]}>
          <Part material={materials.wing} position={[-0.3, 0, -0.02]} scale={[0.4, 0.07, 0.25]} />
        </group>
        <group ref={rightWing} position={[0.28, 0.1, 0]}>
          <Part material={materials.wing} position={[0.3, 0, -0.02]} scale={[0.4, 0.07, 0.25]} />
        </group>
        <Part material={materials.red} position={[0, -0.06, -0.55]} scale={[0.12, 0.07, 0.2]} />
      </group>
    </group>
  )
}

export default memo(PlayerBird3D)
