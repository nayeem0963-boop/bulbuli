/**
 * Every energy crystal in the world, instanced: one draw call per part per colour
 * (gem, orbiting shard, glow halo × 4 colours = 12 calls, instead of 3 per crystal).
 *
 * Each crystal bobs, spins and has a breathing halo, each on its own `phase` so they never
 * move in step. When one is collected (its id is in `collectedRef`, a Map of id → time in
 * seconds from performance.now()), it spins up, rises and shrinks away.
 * All of it runs in one useFrame: React never re-renders for crystals.
 */
import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, MathUtils, MeshBasicMaterial, MeshStandardMaterial, Object3D, OctahedronGeometry, SphereGeometry } from 'three'

const GEM = new OctahedronGeometry(1, 0)
const HALO = new SphereGeometry(1, 12, 8)

const BOB_HEIGHT = 0.18
const BOB_SPEED = 1.6
const SPIN_SPEED = 0.9
const SHRINK_SPEED = 3 // fully gone in 1/3 s

const dummy = new Object3D()

function CrystalColor({ color, crystals, collectedRef }) {
  const gems = useRef()
  const shards = useRef()
  const halos = useRef()

  const materials = useMemo(() => ({
    gem: new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, roughness: 0.15, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.92 }),
    shard: new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.3, flatShading: true }),
    halo: new MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false, fog: false }),
  }), [color])

  useFrame(({ clock }) => {
    if (!gems.current) return
    const t = clock.elapsedTime
    const now = performance.now() / 1000

    for (let i = 0; i < crystals.length; i++) {
      const c = crystals[i]
      const tt = t + c.phase
      const takenAt = collectedRef.current.get(c.id)
      const since = takenAt === undefined ? 0 : now - takenAt
      const shrink = takenAt === undefined ? 1 : Math.max(0, 1 - since * SHRINK_SPEED)
      const s = MathUtils.smoothstep(shrink, 0, 1)
      const [x, y0, z] = c.position
      const y = y0 + Math.sin(tt * BOB_SPEED) * BOB_HEIGHT + (1 - shrink) * 1.2
      const spin = tt * SPIN_SPEED + since * 10

      // the gem: a long eight-sided crystal, leaning a little
      dummy.position.set(x, y, z)
      dummy.rotation.set(0, spin, Math.sin(tt * 0.7) * 0.12)
      dummy.scale.set(0.32 * s, 0.62 * s, 0.32 * s)
      dummy.updateMatrix()
      gems.current.setMatrixAt(i, dummy.matrix)

      // a small shard orbiting with it
      dummy.position.set(x + Math.cos(spin) * 0.42 * s, y - 0.25 * s, z - Math.sin(spin) * 0.42 * s)
      dummy.rotation.set(0, spin, 0.5)
      dummy.scale.set(0.1 * s, 0.2 * s, 0.1 * s)
      dummy.updateMatrix()
      shards.current.setMatrixAt(i, dummy.matrix)

      // soft glow round it (cheap: no lights, no post-processing)
      dummy.position.set(x, y, z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(0.75 * (1 + Math.sin(tt * 2.4) * 0.12) * s)
      dummy.updateMatrix()
      halos.current.setMatrixAt(i, dummy.matrix)
    }
    gems.current.instanceMatrix.needsUpdate = true
    shards.current.instanceMatrix.needsUpdate = true
    halos.current.instanceMatrix.needsUpdate = true
    materials.halo.opacity = 0.22 + Math.sin(t * 2.4) * 0.06
  })

  // they move every frame, so bounds would be stale: skip culling (only a few dozen triangles each)
  return (
    <>
      <instancedMesh ref={gems} args={[GEM, materials.gem, crystals.length]} castShadow frustumCulled={false} />
      <instancedMesh ref={shards} args={[GEM, materials.shard, crystals.length]} frustumCulled={false} />
      <instancedMesh ref={halos} args={[HALO, materials.halo, crystals.length]} frustumCulled={false} renderOrder={1} />
    </>
  )
}

function CrystalField({ crystals, collectedRef }) {
  const byColor = useMemo(() => {
    const groups = new Map()
    for (const c of crystals) {
      if (!groups.has(c.color)) groups.set(c.color, [])
      groups.get(c.color).push(c)
    }
    return [...groups]
  }, [crystals])

  return byColor.map(([color, list]) => (
    <CrystalColor key={color} color={color} crystals={list} collectedRef={collectedRef} />
  ))
}

export default memo(CrystalField)
