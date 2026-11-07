import { useLayoutEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { DoubleSide, MeshStandardMaterial, Object3D, PlaneGeometry, RingGeometry, Vector2 } from 'three'
import { scatterAmazon } from './amazonScatter.js'
import {
  createAmazonDistantTree,
  createAmazonLog,
  createAmazonRootCluster,
  createAmazonTree,
  createAmazonUnderstory,
} from './amazonTrees.js'

const EMPTY = Object.freeze([])
const TAG = Object.freeze({ isCollider: true, collisionKind: 'amazon-prop' })
const PLAYER_VIEW_DEPTH = 5.4

function createFoliageFade(viewport) {
  const material = new MeshStandardMaterial({
    vertexColors: true,
    color: '#ffffff',
    roughness: 0.7,
    metalness: 0.05,
    emissive: '#1b3b18',
    emissiveIntensity: 0.05,
    side: DoubleSide,
    depthTest: true,
    depthWrite: true,
  })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWxViewport = viewport
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec2 uWxViewport;\nvoid main() {')
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        {
          float viewDepth = vViewPosition.z;
          float keep = smoothstep(2.6, 7.0, length(vViewPosition));
          if (viewDepth < ${PLAYER_VIEW_DEPTH.toFixed(1)}) {
            vec2 fromPlayer = (gl_FragCoord.xy - uWxViewport * vec2(0.5, 0.46)) / uWxViewport.y;
            float ring = smoothstep(0.2, 0.42, length(fromPlayer * vec2(0.72, 1.0)));
            float depthFade = smoothstep(${(PLAYER_VIEW_DEPTH - 0.4).toFixed(1)}, ${PLAYER_VIEW_DEPTH.toFixed(1)}, viewDepth);
            keep = min(keep, max(max(ring, depthFade), 0.18));
          }
          float noise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
          if (noise > keep) discard;
        }`,
      )
  }
  material.customProgramCacheKey = () => 'wx-amazon-foliage-fade'
  return material
}

function AmazonInstances({ items, geometry, material, castShadow = false, collider = false, kind }) {
  const mesh = useRef()
  const dummy = useMemo(() => new Object3D(), [])

  useLayoutEffect(() => {
    if (!mesh.current) return
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      const size = item.scale ?? 1
      dummy.position.set(item.x, item.y, item.z)
      dummy.rotation.set(0, item.rot ?? 0, 0)
      dummy.scale.set(size, size, size)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(index, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
    mesh.current.computeBoundingSphere()
  }, [items, dummy])

  if (!items.length) return null
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, items.length]}
      castShadow={castShadow}
      receiveShadow={!kind?.startsWith('distant')}
      userData={collider ? { ...TAG, colliderKind: kind } : undefined}
    />
  )
}

export default function AmazonScenery({ biome }) {
  const { size } = useThree()
  const viewport = useMemo(() => ({ value: new Vector2(1, 1) }), [])
  useLayoutEffect(() => {
    viewport.value.set(size.width, size.height)
  }, [size, viewport])

  const items = useMemo(() => scatterAmazon(biome), [biome])
  const groups = useMemo(() => {
    const result = {}
    for (const item of items) {
      if (!result[item.kind]) result[item.kind] = []
      result[item.kind].push(item)
    }
    return result
  }, [items])
  const resources = useMemo(() => ({
    emergent: createAmazonTree(11, 'emergent'),
    canopy: createAmazonTree(23, 'canopy'),
    subcanopy: createAmazonTree(37, 'subcanopy'),
    understory: createAmazonUnderstory(31, 'broadleaf'),
    fern: createAmazonUnderstory(41, 'fern'),
    heliconia: createAmazonUnderstory(43, 'heliconia'),
    bromeliad: createAmazonUnderstory(47, 'bromeliad'),
    roots: createAmazonRootCluster(53),
    log: createAmazonLog(),
    trail: new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    forestFloor: new RingGeometry(36, 900, 256).rotateX(-Math.PI / 2),
    distantEmergent: createAmazonDistantTree(61, 'emergent'),
    distantCanopy: createAmazonDistantTree(67, 'canopy'),
    distantSubcanopy: createAmazonDistantTree(71, 'subcanopy'),
    bark: new MeshStandardMaterial({ vertexColors: true, color: '#ffffff', roughness: 0.9 }),
    foliage: createFoliageFade(viewport),
    trailMaterial: new MeshStandardMaterial({ color: '#66503a', roughness: 0.98 }),
    forestFloorMaterial: new MeshStandardMaterial({ color: '#414c32', roughness: 1 }),
  }), [viewport])

  useLayoutEffect(() => () => {
    resources.emergent.dispose()
    resources.canopy.dispose()
    resources.subcanopy.dispose()
    resources.understory.dispose()
    resources.fern.dispose()
    resources.heliconia.dispose()
    resources.bromeliad.dispose()
    resources.roots.dispose()
    resources.log.dispose()
    resources.trail.dispose()
    resources.forestFloor.dispose()
    resources.distantEmergent.dispose()
    resources.distantCanopy.dispose()
    resources.distantSubcanopy.dispose()
    resources.bark.dispose()
    resources.foliage.dispose()
    resources.trailMaterial.dispose()
    resources.forestFloorMaterial.dispose()
  }, [resources])

  const trees = groups.emergent ?? EMPTY
  return (
    <group>
      <mesh
        geometry={resources.forestFloor}
        material={resources.forestFloorMaterial}
        position={[0, -0.06, 0]}
        receiveShadow={false}
      />
      <AmazonInstances items={trees} geometry={resources.emergent} material={resources.foliage} castShadow collider kind="emergent-tree" />
      <AmazonInstances items={groups.canopy ?? EMPTY} geometry={resources.canopy} material={resources.foliage} collider kind="canopy-tree" />
      <AmazonInstances items={groups.subcanopy ?? EMPTY} geometry={resources.subcanopy} material={resources.foliage} collider kind="subcanopy-tree" />
      <AmazonInstances items={groups.understory ?? EMPTY} geometry={resources.understory} material={resources.foliage} collider kind="understory" />
      <AmazonInstances items={groups.fern ?? EMPTY} geometry={resources.fern} material={resources.foliage} />
      <AmazonInstances items={groups.heliconia ?? EMPTY} geometry={resources.heliconia} material={resources.foliage} />
      <AmazonInstances items={groups.bromeliad ?? EMPTY} geometry={resources.bromeliad} material={resources.foliage} />
      <AmazonInstances items={groups.roots ?? EMPTY} geometry={resources.roots} material={resources.bark} />
      <AmazonInstances items={groups.log ?? EMPTY} geometry={resources.log} material={resources.bark} castShadow collider kind="fallen-log" />
      <AmazonInstances items={groups.trail ?? EMPTY} geometry={resources.trail} material={resources.trailMaterial} />
      <AmazonInstances items={groups.distantEmergent ?? EMPTY} geometry={resources.distantEmergent} material={resources.foliage} kind="distant-emergent" />
      <AmazonInstances items={groups.distantCanopy ?? EMPTY} geometry={resources.distantCanopy} material={resources.foliage} kind="distant-canopy" />
      <AmazonInstances items={groups.distantSubcanopy ?? EMPTY} geometry={resources.distantSubcanopy} material={resources.foliage} kind="distant-subcanopy" />
    </group>
  )
}
