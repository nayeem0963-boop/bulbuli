import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, EdgesGeometry, LineBasicMaterial, MeshStandardMaterial, PlaneGeometry } from 'three'
import { billboardMaterials } from '../../shaders/billboardMaterial'
import { runtime } from '../../stores/runtime'

/*
 * Billboards — giant animated holo-screens on poles along the skyline.
 * They recycle around the player (forward and backward), so a handful of
 * meshes cover an endless run. Content is procedural (billboardMaterial.js),
 * the equalizer variant dances to the soundtrack.
 */

const COUNT = 8
const SPACING = 55
const TOTAL = COUNT * SPACING
const AHEAD_LIMIT = 40           // recycle once this far behind the player

const plane = new PlaneGeometry(16, 9)
const frameEdges = new EdgesGeometry(new BoxGeometry(16.6, 9.6, 0.4))
const frameMat = new LineBasicMaterial({ color: '#ff2bd6', toneMapped: false, fog: false })
frameMat.color.multiplyScalar(2.5)
const poleGeo = new BoxGeometry(0.6, 1, 0.6)
const poleMat = new MeshStandardMaterial({ color: '#160a2e', metalness: 0.7, roughness: 0.4 })

export function Billboards() {
  const refs = useRef([])
  const layout = useMemo(() => Array.from({ length: COUNT }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1
    const scale = 0.8 + (i % 3) * 0.2
    return {
      side,
      variant: i % billboardMaterials.length,
      x: side * (30 + ((i * 7) % 12)),
      y: 12 + ((i * 5) % 7),
      z: -60 - i * SPACING,
      scale,
      rotY: -side * 0.55,
    }
  }), [])

  useFrame(() => {
    const pz = runtime.playerPosition.z
    refs.current.forEach((g) => {
      if (!g) return
      // wrap in both directions (handles restarts that jump back to z = 0)
      while (g.position.z - pz > AHEAD_LIMIT) g.position.z -= TOTAL
      while (g.position.z - pz < AHEAD_LIMIT - TOTAL) g.position.z += TOTAL
    })
  })

  return layout.map((b, i) => {
    // Pole runs from just under the screen down into the void (y = −14), in the group's scaled space
    const top = -4.8
    const bottom = (-14 - b.y) / b.scale
    return (
    <group
      key={i}
      ref={(el) => { refs.current[i] = el }}
      position={[b.x, b.y, b.z]}
      rotation-y={b.rotY}
      scale={b.scale}
    >
      <mesh geometry={plane} material={billboardMaterials[b.variant]} />
      <lineSegments geometry={frameEdges} material={frameMat} />
      <mesh geometry={poleGeo} material={poleMat} position={[0, (top + bottom) / 2, -0.4]} scale={[1, top - bottom, 1]} />
    </group>
    )
  })
}
