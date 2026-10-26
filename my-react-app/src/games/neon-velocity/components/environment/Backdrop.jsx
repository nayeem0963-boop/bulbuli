import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import { Object3D } from 'three'
import { COLORS, PLATFORM_WIDTH } from '../../config/constants'
import { runtime } from '../../stores/runtime'

const PYLON_SPACING = 14
const PYLONS_PER_SIDE = 28
const VOID_Y = -14

/**
 * Non-physical scenery: the neon grid far below (the void you fall into) and
 * tall pylons rising out of it on both sides. Both follow the player cheaply —
 * the grid is drei's infinite shader grid, the pylons are one instanced mesh
 * that snaps forward by whole spacings.
 */
export function Backdrop() {
  const pylons = useRef()
  useFrame(() => {
    const z = runtime.playerPosition.z
    if (pylons.current) pylons.current.position.z = Math.floor(z / PYLON_SPACING) * PYLON_SPACING + 42
  })

  return (
    <>
      <Grid
        position={[0, VOID_Y, 0]}
        infiniteGrid
        followCamera
        cellSize={2}
        cellThickness={0.6}
        cellColor={COLORS.violet}
        sectionSize={8}
        sectionThickness={1.4}
        sectionColor={COLORS.magenta}
        fadeDistance={220}
        fadeStrength={1.2}
      />
      <group ref={pylons}>
        <Pylons />
      </group>
    </>
  )
}

function Pylons() {
  const mesh = useRef()
  useLayoutEffect(() => {
    const dummy = new Object3D()
    let i = 0
    for (let n = 0; n < PYLONS_PER_SIDE; n++) {
      for (const side of [-1, 1]) {
        const height = 14 + ((n * 7 + (side > 0 ? 3 : 0)) % 5) * 2 // varied skyline, deterministic
        dummy.position.set(side * (PLATFORM_WIDTH / 2 + 4 + (n % 3)), VOID_Y + height / 2, -n * PYLON_SPACING)
        dummy.scale.set(1, height, 1)
        dummy.updateMatrix()
        mesh.current.setMatrixAt(i++, dummy.matrix)
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, PYLONS_PER_SIDE * 2]} frustumCulled={false}>
      <boxGeometry args={[0.3, 1, 0.3]} />
      <meshStandardMaterial color={COLORS.cyan} emissive={COLORS.cyan} emissiveIntensity={2.5} toneMapped={false} />
    </instancedMesh>
  )
}
