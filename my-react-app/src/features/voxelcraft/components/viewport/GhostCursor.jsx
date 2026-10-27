import { useFrame } from '@react-three/fiber'
import { useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { cellCenter } from './sceneConfig.js'

const COLORS = { erase: '#f43f5e', invalid: '#f43f5e' }
const noRaycast = () => null

/**
 * Translucent preview cube showing where a click will place (or which block it will erase).
 * Driven imperatively through `ref` (show / hide) straight from pointer events: moving the
 * mouse mutates one mesh and never triggers a React render.
 */
export default function GhostCursor({ ref }) {
  const group = useRef(null)
  const fill = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false }),
    [],
  )
  const line = useMemo(() => new THREE.LineBasicMaterial({ toneMapped: false }), [])
  const box = useMemo(() => new THREE.BoxGeometry(1.02, 1.02, 1.02), [])
  const edges = useMemo(() => new THREE.EdgesGeometry(box), [box])
  useEffect(() => () => [fill, line, box, edges].forEach((o) => o.dispose()), [fill, line, box, edges])

  useImperativeHandle(ref, () => ({
    /** @param {{x,y,z}} cell  @param {'place'|'erase'|'invalid'} kind  @param {string} color */
    show(cell, kind, color) {
      const g = group.current
      if (!g) return
      g.visible = true
      g.position.set(cellCenter(cell.x), cell.y + 0.5, cellCenter(cell.z))
      g.scale.setScalar(kind === 'erase' ? 1.04 : 1)
      const c = COLORS[kind] ?? color
      fill.color.set(c)
      line.color.set(c)
      g.userData.kind = kind
    },
    hide() {
      if (group.current) group.current.visible = false
    },
  }), [fill, line])

  // Gentle pulse so the cursor reads as "live" against static blocks.
  useFrame(({ clock }) => {
    const g = group.current
    if (!g?.visible) return
    const base = g.userData.kind === 'place' ? 0.28 : 0.2
    fill.opacity = base + Math.sin(clock.elapsedTime * 6) * 0.08
  })

  return (
    // noSnapshot: never appears in published thumbnails
    <group ref={group} visible={false} userData={{ noSnapshot: true }}>
      <mesh geometry={box} material={fill} raycast={noRaycast} renderOrder={2} />
      <lineSegments geometry={edges} material={line} raycast={noRaycast} renderOrder={3} />
    </group>
  )
}
