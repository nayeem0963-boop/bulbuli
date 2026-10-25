/**
 * The world's land: the big floating island (grass, trees, boulders, a ring of ancient
 * pillars round an altar) and the small floating platforms that spiral up around it.
 *
 * Everything comes from `world` (layout.js), so the same seed always draws the same place.
 *
 * Draw calls are kept low for 60 fps on ordinary laptops and phones:
 *   • the island and all 12 platforms are merged into ONE mesh per material (3 in all)
 *   • trees, boulders, pillar parts and fallen drums are instanced (one call per shape)
 * so the whole landscape is about a dozen draw calls.
 *
 * Usage: <FloatingIsland world={generateWorld(seed)} />
 */
import { memo, useEffect, useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry } from 'three'
import { createLandGeometries } from './islandGeometry.js'
import { MATERIALS, PALETTE } from './materials.js'

// Shared low-poly shapes, sized 1 and scaled per instance.
const TRUNK = new CylinderGeometry(0.14, 0.22, 1, 6).translate(0, 0.5, 0)
const LEAVES = new ConeGeometry(1, 1, 7).translate(0, 0.5, 0)
const BOULDER = new DodecahedronGeometry(1, 0)
const PILLAR_BASE = new BoxGeometry(1.15, 0.3, 1.15).translate(0, 0.15, 0)
const PILLAR_CAP = new BoxGeometry(1.05, 0.26, 1.05)
const SHAFT = new CylinderGeometry(0.36, 0.42, 1, 8).translate(0, 0.5, 0)
const DRUM = new CylinderGeometry(0.37, 0.37, 1, 8)
const SLAB = new CylinderGeometry(1, 1, 0.1, 12).translate(0, 0.05, 0)
const ALTAR = new BoxGeometry(1.2, 0.6, 1.2).translate(0, 0.3, 0)

const pick = (list, t) => list[Math.min(list.length - 1, Math.floor(t * list.length))]

// drei's Instances work out their bounds once; these never move, but skip culling to be safe
const instanced = { frustumCulled: false, castShadow: true, receiveShadow: true }

/** Island + every platform, merged into one geometry per layer. */
function Land({ world }) {
  const geo = useMemo(() => createLandGeometries(world), [world])
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo])

  return (
    <group>
      <mesh geometry={geo.grass} material={MATERIALS.grass} receiveShadow castShadow />
      <mesh geometry={geo.dirt} material={MATERIALS.dirt} receiveShadow castShadow />
      {/* the hanging rock only ever shades open sky, so it doesn't need to cast */}
      <mesh geometry={geo.rock} material={MATERIALS.rock} receiveShadow />
    </group>
  )
}

function Trees({ trees }) {
  return (
    <>
      <Instances limit={trees.length} geometry={TRUNK} material={MATERIALS.instanced} {...instanced}>
        {trees.map((t) => (
          <Instance
            key={t.id}
            position={t.position}
            rotation={[t.lean, t.rotationY, t.lean]}
            scale={[1, t.height * 0.45, 1]}
            color={pick(PALETTE.trunk, t.shade)}
          />
        ))}
      </Instances>
      {/* two stacked cones of leaves per tree */}
      <Instances limit={trees.length * 2} geometry={LEAVES} material={MATERIALS.instanced} {...instanced}>
        {trees.flatMap((t) => {
          const [x, y, z] = t.position
          const base = t.height * 0.35
          const width = 0.75 + t.height * 0.18
          return [
            <Instance
              key={`${t.id}-low`}
              position={[x, y + base, z]}
              rotation={[t.lean, t.rotationY, t.lean]}
              scale={[width, t.height * 0.5, width]}
              color={pick(PALETTE.leaves, t.shade)}
            />,
            <Instance
              key={`${t.id}-high`}
              position={[x, y + base + t.height * 0.32, z]}
              rotation={[t.lean, t.rotationY + 0.4, t.lean]}
              scale={[width * 0.72, t.height * 0.42, width * 0.72]}
              color={pick(PALETTE.leavesTop, t.shade)}
            />,
          ]
        })}
      </Instances>
    </>
  )
}

function Boulders({ rocks }) {
  return (
    <Instances limit={rocks.length} geometry={BOULDER} material={MATERIALS.instanced} {...instanced}>
      {rocks.map((r) => (
        <Instance
          key={r.id}
          // sink each boulder a little so it sits in the grass rather than on it
          position={[r.position[0], r.scale[1] * 0.45, r.position[2]]}
          rotation={r.rotation}
          scale={r.scale}
          color={pick(PALETTE.boulder, r.shade)}
        />
      ))}
    </Instances>
  )
}

/** The ruins: a worn stone floor, an altar, a ring of pillars (some broken) and their fallen drums. */
function Ruins({ pillars, rubble }) {
  const standing = pillars.filter((p) => !p.broken)
  return (
    <group>
      <mesh geometry={SLAB} material={MATERIALS.stoneDark} scale={[5, 1, 5]} receiveShadow />
      <mesh geometry={ALTAR} material={MATERIALS.stone} castShadow receiveShadow />

      <Instances limit={pillars.length} geometry={PILLAR_BASE} material={MATERIALS.stoneDark} {...instanced}>
        {pillars.map((p) => <Instance key={p.id} position={p.position} rotation-y={p.rotationY} />)}
      </Instances>
      <Instances limit={pillars.length} geometry={SHAFT} material={MATERIALS.stone} {...instanced}>
        {pillars.map((p) => (
          <Instance key={p.id} position={[p.position[0], 0.3, p.position[2]]} rotation-y={p.rotationY} scale={[1, p.height, 1]} />
        ))}
      </Instances>
      {standing.length > 0 && (
        <Instances limit={standing.length} geometry={PILLAR_CAP} material={MATERIALS.stoneDark} {...instanced}>
          {standing.map((p) => (
            <Instance key={p.id} position={[p.position[0], 0.3 + p.height + 0.13, p.position[2]]} rotation-y={p.rotationY} />
          ))}
        </Instances>
      )}
      {rubble.length > 0 && (
        <Instances limit={rubble.length} geometry={DRUM} material={MATERIALS.stone} {...instanced}>
          {rubble.map((r) => (
            <Instance key={r.id} position={r.position} rotation={[0, r.rotationY, Math.PI / 2]} scale={[1, r.length, 1]} />
          ))}
        </Instances>
      )}
    </group>
  )
}

function FloatingIsland({ world }) {
  return (
    <group>
      <Land world={world} />
      <Ruins pillars={world.pillars} rubble={world.rubble} />
      <Trees trees={world.trees} />
      <Boulders rocks={world.rocks} />
    </group>
  )
}

export default memo(FloatingIsland)
