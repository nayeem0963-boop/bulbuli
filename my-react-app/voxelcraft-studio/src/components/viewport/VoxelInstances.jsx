import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { cellCenter } from './sceneConfig.js'

const _m = new THREE.Matrix4()
const _c = new THREE.Color()
const _s = new THREE.Vector3()
const _p = new THREE.Vector3()
const _q = new THREE.Quaternion()

/** Smallest power of two ≥ n (min 64): capacity grows rarely, so the mesh is rarely rebuilt. */
const capacityFor = (n) => Math.max(64, 2 ** Math.ceil(Math.log2(Math.max(1, n))))

/** Writes one translation (+ uniform scale) matrix per block. */
function writeMatrices(mesh, blocks, scale = 1, withColor = true) {
  _s.setScalar(scale)
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    _p.set(cellCenter(b.x), b.y + 0.5, cellCenter(b.z))
    mesh.setMatrixAt(i, _m.compose(_p, _q, _s))
    if (withColor) mesh.setColorAt(i, _c.set(b.color))
  }
  mesh.count = blocks.length
  mesh.instanceMatrix.needsUpdate = true
  if (withColor && mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere() // keeps raycasting and frustum culling correct after edits
}

/**
 * All blocks of one cube type in ONE draw call. When the level changes, only the instance
 * buffers are rewritten (in a layout effect, so the change shows on the very next frame);
 * no meshes are created or destroyed, so placing blocks never stalls the frame.
 *
 * Pointer events report the clicked block (instanceId → block), not the raw mesh.
 * `halo` adds a slightly larger additive shell that reuses the same layout (used for lava glow).
 */
function VoxelInstances({ blocks, geometry, material, halo, onPointerMove, onPointerOut, onClick, onContextMenu }) {
  const mesh = useRef(null)
  const haloMesh = useRef(null)
  const blocksRef = useRef(blocks)
  const capacity = capacityFor(blocks.length)

  useLayoutEffect(() => {
    blocksRef.current = blocks
    if (mesh.current) writeMatrices(mesh.current, blocks)
    if (haloMesh.current) writeMatrices(haloMesh.current, blocks, halo.scale, false)
  }, [blocks, capacity, halo])

  // Handlers translate instanceId → block. Built once; they read the latest blocks via ref.
  const handlers = useMemo(() => {
    const wrap = (fn) => fn && ((e) => {
      const block = blocksRef.current[e.instanceId]
      if (block) fn(e, block)
    })
    return {
      onPointerMove: wrap(onPointerMove),
      onClick: wrap(onClick),
      onContextMenu: wrap(onContextMenu),
      onPointerOut,
    }
  }, [onPointerMove, onPointerOut, onClick, onContextMenu])

  return (
    <>
      <instancedMesh
        // key on capacity: a bigger buffer needs a new InstancedMesh; same-size edits reuse it.
        key={capacity}
        ref={mesh}
        args={[geometry, material, capacity]}
        castShadow
        receiveShadow
        frustumCulled={false}
        {...handlers}
      />
      {halo && (
        <instancedMesh
          key={`halo-${capacity}`}
          ref={haloMesh}
          args={[geometry, halo.material, capacity]}
          raycast={() => null}
          frustumCulled={false}
        />
      )}
    </>
  )
}

export default memo(VoxelInstances)
