import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { DoubleSide, Frustum, Matrix4, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, RingGeometry, Sphere, Vector2 } from 'three'
import { scatterAmazon } from './amazonScatter.js'
import {
  createAmazonDistantTree,
  createAmazonLog,
  createAmazonRootCluster,
  createAmazonShadowProxy,
  createAmazonTree,
  createAmazonUnderstory,
} from './amazonTrees.js'
import { AMAZON_BOUNDS, AMAZON_LOD, createLodSet, selectVisible } from './amazonLod.js'

const EMPTY = Object.freeze([])
const TAG = Object.freeze({ isCollider: true, collisionKind: 'amazon-prop' })
const PLAYER_VIEW_DEPTH = 5.4
/** Extra radius (metres) given to every item when testing whether it is in view. */
const VIEW_MARGIN = 2
/** ...plus this much per metre of distance (about 5 degrees of camera turn). */
const VIEW_MARGIN_PER_METRE = 0.09

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

/** Static instances drawn whole (a handful of items: logs, the trail, the shadow shapes). */
function AmazonInstances({ items, geometry, material, castShadow = false, receiveShadow = true, collider = false, kind }) {
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
      receiveShadow={receiveShadow}
      userData={collider ? { ...TAG, colliderKind: kind } : undefined}
    />
  )
}

/**
 * One kind of forest item, drawn only where the camera can see it and at the detail its distance
 * needs (amazonLod.js). One instanced mesh per level; each frame the visible items' transforms
 * are copied into the mesh for their level. `levels` = [{ geometry, material }] nearest first.
 */
function LodInstances({ items, layers, levels, reach, centre, receiveShadow = true, collider = false, kind }) {
  const meshes = useRef([])
  const set = useMemo(() => createLodSet(items, layers, { reach, centre }), [items, layers, reach, centre])
  // every item's transform, computed once
  const matrices = useMemo(() => {
    const dummy = new Object3D()
    const all = new Float32Array(items.length * 16)
    items.forEach((item, index) => {
      const size = item.scale ?? 1
      dummy.position.set(item.x, item.y, item.z)
      dummy.rotation.set(0, item.rot ?? 0, 0)
      dummy.scale.set(size, size, size)
      dummy.updateMatrix()
      dummy.matrix.toArray(all, index * 16)
    })
    return all
  }, [items])
  // per-frame scratch state (a ref: it is rewritten every frame and never rendered from)
  const viewRef = useRef(null)

  useFrame(({ camera }) => {
    if (!viewRef.current) viewRef.current = { frustum: new Frustum(), matrix: new Matrix4(), sphere: new Sphere(), last: new Float32Array(16), set: null }
    const view = viewRef.current
    view.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    // nothing to do while the camera has not moved
    const elements = view.matrix.elements
    let moved = view.set !== set // first frame, or the items changed
    for (let i = 0; i < 16 && !moved; i += 1) if (Math.abs(elements[i] - view.last[i]) > 1e-5) moved = true
    if (!moved) return
    view.set = set
    view.last.set(elements)
    view.frustum.setFromProjectionMatrix(view.matrix)
    const inView = (x, y, z, r) => {
      view.sphere.center.set(x, y, z)
      // generous, and more so with distance: this runs just before the camera's move for the frame
      // is applied, and a turn sweeps far trees across the screen edge faster than near ones
      view.sphere.radius = r + VIEW_MARGIN + VIEW_MARGIN_PER_METRE * Math.hypot(x - camera.position.x, z - camera.position.z)
      return view.frustum.intersectsSphere(view.sphere)
    }
    selectVisible(set, camera.position, inView)
    for (let level = 0; level < levels.length; level += 1) {
      const mesh = meshes.current[level]
      if (!mesh) continue
      const count = set.counts[level]
      const target = mesh.instanceMatrix.array
      const picked = set.picked[level]
      for (let n = 0; n < count; n += 1) {
        const from = picked[n] * 16
        for (let k = 0; k < 16; k += 1) target[n * 16 + k] = matrices[from + k]
      }
      mesh.count = count
      mesh.visible = count > 0
      mesh.instanceMatrix.needsUpdate = true
    }
  })

  if (!items.length) return null
  return levels.map((level, index) => (
    <instancedMesh
      key={index}
      ref={(mesh) => { meshes.current[index] = mesh }}
      args={[level.geometry, level.material, items.length]}
      count={0}
      frustumCulled={false}
      receiveShadow={receiveShadow}
      userData={collider ? { ...TAG, colliderKind: kind } : undefined}
    />
  ))
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
  const resources = useMemo(() => {
    const tree = (seed, layer) => AMAZON_LOD.tree.map(({ level }) => createAmazonTree(seed, layer, level))
    const distant = (seed, form) => AMAZON_LOD.distant.map(({ level }) => createAmazonDistantTree(seed, form, level))
    return {
      emergent: tree(11, 'emergent'),
      canopy: tree(23, 'canopy'),
      subcanopy: tree(37, 'subcanopy'),
      shadow: createAmazonShadowProxy(11),
      understory: createAmazonUnderstory(31, 'broadleaf'),
      fern: createAmazonUnderstory(41, 'fern'),
      heliconia: createAmazonUnderstory(43, 'heliconia'),
      bromeliad: createAmazonUnderstory(47, 'bromeliad'),
      roots: createAmazonRootCluster(53),
      log: createAmazonLog(),
      trail: new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      forestFloor: new RingGeometry(36, 900, 256).rotateX(-Math.PI / 2),
      distantEmergent: distant(61, 'emergent'),
      distantCanopy: distant(67, 'canopy'),
      distantSubcanopy: distant(71, 'subcanopy'),
      bark: new MeshStandardMaterial({ vertexColors: true, color: '#ffffff', roughness: 0.9 }),
      // close to the camera: foliage that thins out in front of Bulbuli so the bird stays in view
      foliage: createFoliageFade(viewport),
      // further than the fade ever reaches (7 m): the same surface without the per-pixel discard,
      // so the graphics card can skip pixels hidden behind nearer leaves
      foliageFar: new MeshStandardMaterial({ vertexColors: true, color: '#ffffff', roughness: 0.7, metalness: 0.05, emissive: '#1b3b18', emissiveIntensity: 0.05, side: DoubleSide }),
      // casts a shadow, draws nothing
      shadowOnly: new MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
      trailMaterial: new MeshStandardMaterial({ color: '#66503a', roughness: 0.98 }),
      forestFloorMaterial: new MeshStandardMaterial({ color: '#414c32', roughness: 1 }),
    }
  }, [viewport])

  useLayoutEffect(() => () => {
    for (const value of Object.values(resources)) {
      if (Array.isArray(value)) value.forEach((entry) => entry.dispose())
      else value.dispose()
    }
  }, [resources])

  const treeLevels = (geometries) => geometries.map((geometry, level) => (
    { geometry, material: level < AMAZON_LOD.ditherLevels ? resources.foliage : resources.foliageFar }
  ))
  const distantLevels = (geometries) => geometries.map((geometry) => ({ geometry, material: resources.foliageFar }))
  const small = (geometry, material = resources.foliage) => [{ geometry, material }]
  const trees = groups.emergent ?? EMPTY
  return (
    <group>
      <mesh
        geometry={resources.forestFloor}
        material={resources.forestFloorMaterial}
        position={[0, -0.06, 0]}
        receiveShadow={false}
      />
      {/* emergent trees cast their shadows through a simple stand-in shape (never drawn itself) */}
      <AmazonInstances items={trees} geometry={resources.shadow} material={resources.shadowOnly} castShadow receiveShadow={false} />
      <LodInstances items={trees} layers={AMAZON_LOD.tree} levels={treeLevels(resources.emergent)} {...AMAZON_BOUNDS.emergent} collider kind="emergent-tree" />
      <LodInstances items={groups.canopy ?? EMPTY} layers={AMAZON_LOD.tree} levels={treeLevels(resources.canopy)} {...AMAZON_BOUNDS.canopy} collider kind="canopy-tree" />
      <LodInstances items={groups.subcanopy ?? EMPTY} layers={AMAZON_LOD.tree} levels={treeLevels(resources.subcanopy)} {...AMAZON_BOUNDS.subcanopy} collider kind="subcanopy-tree" />
      <LodInstances items={groups.understory ?? EMPTY} layers={AMAZON_LOD.small} levels={small(resources.understory)} {...AMAZON_BOUNDS.understory} collider kind="understory" />
      <LodInstances items={groups.fern ?? EMPTY} layers={AMAZON_LOD.small} levels={small(resources.fern)} {...AMAZON_BOUNDS.fern} />
      <LodInstances items={groups.heliconia ?? EMPTY} layers={AMAZON_LOD.small} levels={small(resources.heliconia)} {...AMAZON_BOUNDS.heliconia} />
      <LodInstances items={groups.bromeliad ?? EMPTY} layers={AMAZON_LOD.small} levels={small(resources.bromeliad)} {...AMAZON_BOUNDS.bromeliad} />
      <LodInstances items={groups.roots ?? EMPTY} layers={AMAZON_LOD.small} levels={small(resources.roots, resources.bark)} {...AMAZON_BOUNDS.roots} />
      <AmazonInstances items={groups.log ?? EMPTY} geometry={resources.log} material={resources.bark} castShadow collider kind="fallen-log" />
      <AmazonInstances items={groups.trail ?? EMPTY} geometry={resources.trail} material={resources.trailMaterial} />
      <LodInstances items={groups.distantEmergent ?? EMPTY} layers={AMAZON_LOD.distant} levels={distantLevels(resources.distantEmergent)} {...AMAZON_BOUNDS.distantEmergent} receiveShadow={false} kind="distant-emergent" />
      <LodInstances items={groups.distantCanopy ?? EMPTY} layers={AMAZON_LOD.distant} levels={distantLevels(resources.distantCanopy)} {...AMAZON_BOUNDS.distantCanopy} receiveShadow={false} kind="distant-canopy" />
      <LodInstances items={groups.distantSubcanopy ?? EMPTY} layers={AMAZON_LOD.distant} levels={distantLevels(resources.distantSubcanopy)} {...AMAZON_BOUNDS.distantSubcanopy} receiveShadow={false} kind="distant-subcanopy" />
    </group>
  )
}
