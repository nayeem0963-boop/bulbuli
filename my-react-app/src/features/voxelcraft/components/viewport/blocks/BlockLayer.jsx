import { useFrame } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { BLOCK } from '../../../level/blockTypes.js'
import VoxelInstances from '../VoxelInstances.jsx'
import { FinishRing, SpawnPedestal } from './SpecialBlocks.jsx'

const CUBE = 0.98 // tiny gap so neighbouring blocks read as separate voxels

/**
 * Splits blocks by type, reusing the previous array for any type whose blocks didn't change.
 * Adding a platform therefore re-uploads only the platform instance buffer; bounce and lava
 * meshes see identical props and skip rendering entirely (they're memo'd).
 */
function groupBlocks(blocks, previous) {
  const next = { [BLOCK.PLATFORM]: [], [BLOCK.BOUNCE]: [], [BLOCK.LAVA]: [], [BLOCK.SPAWN]: [], [BLOCK.FINISH]: [] }
  for (const b of blocks) next[b.type].push(b)
  for (const type of Object.keys(next)) {
    const old = previous[type]
    const cur = next[type]
    if (old && old.length === cur.length && old.every((b, i) => b === cur[i])) next[type] = old
  }
  return next
}

function useStableGroups(blocks) {
  // The previous grouping lives in state ("storing information from previous renders"): when
  // `blocks` changes, regroup during render, reusing every unchanged per-type array.
  const [state, setState] = useState(() => ({ blocks, groups: groupBlocks(blocks, {}) }))
  if (state.blocks !== blocks) {
    const groups = groupBlocks(blocks, state.groups)
    setState({ blocks, groups })
    return groups
  }
  return state.groups
}

/** Geometries + materials are created once and shared by every block of a type. */
function useBlockAssets() {
  const assets = useMemo(() => {
    const cube = new THREE.BoxGeometry(CUBE, CUBE, CUBE)
    const rounded = new RoundedBoxGeometry(CUBE, CUBE, CUBE, 2, 0.12) // 300 tris: smooth enough, cheap at scale
    return {
      cube,
      rounded,
      // Instance colours tint white base colours, so the hex picker shows true colours.
      platform: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0.1 }),
      bounce: new THREE.MeshStandardMaterial({
        color: '#ffffff', emissive: '#22c55e', emissiveIntensity: 0.6, roughness: 0.3, metalness: 0,
      }),
      // Red base + red-orange self-glow: unmistakably "hot", and it stays red, not orange.
      lava: new THREE.MeshStandardMaterial({
        color: '#ffffff', emissive: '#ff1e00', emissiveIntensity: 0.8, roughness: 0.8, toneMapped: false,
      }),
      lavaHalo: new THREE.MeshBasicMaterial({
        color: '#ff3b1f', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.BackSide, toneMapped: false,
      }),
    }
  }, [])
  useEffect(() => () => Object.values(assets).forEach((a) => a.dispose()), [assets])
  return assets
}

/**
 * Renders a level's blocks: 3 instanced meshes (platform / bounce / lava = 3 draw calls total,
 * however many blocks) plus the unique spawn and finish meshes.
 * `handlers` = { onPointerMove, onPointerOut, onClick, onContextMenu }, each (event, block).
 */
function BlockLayer({ blocks, handlers }) {
  const groups = useStableGroups(blocks)
  const a = useBlockAssets()
  const lavaHalo = useMemo(() => ({ material: a.lavaHalo, scale: 1.1 }), [a])
  // the instanced meshes, so the shared materials are animated through the live objects
  const lavaMesh = useRef(null)
  const lavaHaloMesh = useRef(null)
  const bounceMesh = useRef(null)

  // Living materials: one uniform update per frame, regardless of block count.
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const lava = lavaMesh.current?.material
    const halo = lavaHaloMesh.current?.material
    const bounce = bounceMesh.current?.material
    if (lava) lava.emissiveIntensity = 0.75 + Math.sin(t * 2.2) * 0.18 + Math.sin(t * 7.3) * 0.06
    if (halo) halo.opacity = 0.18 + Math.sin(t * 2.2) * 0.06
    if (bounce) bounce.emissiveIntensity = 0.55 + Math.sin(t * 3.5) * 0.2
  })

  return (
    <group>
      <VoxelInstances blocks={groups[BLOCK.PLATFORM]} geometry={a.cube} material={a.platform} {...handlers} />
      <VoxelInstances blocks={groups[BLOCK.BOUNCE]} geometry={a.rounded} material={a.bounce} meshRef={bounceMesh} {...handlers} />
      <VoxelInstances blocks={groups[BLOCK.LAVA]} geometry={a.cube} material={a.lava} halo={lavaHalo} meshRef={lavaMesh} haloRef={lavaHaloMesh} {...handlers} />
      {groups[BLOCK.SPAWN].map((b) => <SpawnPedestal key={b.id} block={b} handlers={handlers} />)}
      {groups[BLOCK.FINISH].map((b) => <FinishRing key={b.id} block={b} handlers={handlers} />)}
    </group>
  )
}

export default memo(BlockLayer)
