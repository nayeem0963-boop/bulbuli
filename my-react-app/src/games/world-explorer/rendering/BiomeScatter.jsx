import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry,
  Float32BufferAttribute, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry,
} from 'three'
import { createBiomeSurfaceTextures } from './biomeMaterials.js'
import { scatterBiomeAssets } from './scattering.js'

const ROOTS = Array.from({ length: 5 }, (_, i) => {
  const angle = (i / 5) * Math.PI * 2
  return {
    x: 0.62,
    z: 0,
    angle,
    scale: 0.82 + (i % 3) * 0.1,
  }
})

const CANOPY_CLUSTERS = [
  [-0.62, -0.15, 0.08, 0.7],
  [0.58, -0.12, -0.12, 0.78],
  [0.04, 0.2, 0.62, 0.66],
  [-0.12, -0.08, -0.62, 0.72],
]
const SUNDARBANS_CROWNS = [
  [0, 0, 0, 0.92],
  [-0.48, -0.12, 0.24, 0.58],
  [0.35, -0.08, -0.42, 0.64],
]
const DISTANT_CROWNS = [
  [0, 0, 0, 0.92],
  [-0.56, 0.06, 0.28, 0.68],
  [0.42, 0.1, -0.46, 0.72],
  [0.12, 0.38, 0.52, 0.52],
]
const TREE_FORMS = Object.freeze({
  sundari: { height: 3.7, crown: 3.65, crownScale: [1.32, 0.72, 1.12], branch: 2.4 },
  gewa: { height: 3.1, crown: 3.1, crownScale: [1.08, 0.9, 0.94], branch: 2 },
  goran: { height: 2.2, crown: 2.25, crownScale: [1.2, 0.62, 1.08], branch: 1.4 },
  slender: { height: 4.5, crown: 4.45, crownScale: [0.9, 1.04, 0.86], branch: 3.2 },
})
const TREE_VARIANTS = Object.keys(TREE_FORMS)
const EMPTY_ITEMS = Object.freeze([])

function clusterItems(items, clusters) {
  return items.flatMap((item) => clusters.map(([x, y, z, scale], index) => ({
    ...item,
    localOffset: [x, y, z],
    clusterScale: scale,
    clusterIndex: index,
  })))
}

function groupByVariant(items) {
  return items.reduce((groups, item) => {
    const variant = item.variant ?? TREE_VARIANTS[0]
    if (!groups[variant]) groups[variant] = []
    groups[variant].push(item)
    return groups
  }, {})
}

function branchItems(items) {
  return items.flatMap((item) => [0, 1, 2].map((index) => {
    const angle = (index / 3) * Math.PI * 2
    return {
      ...item,
      localOffset: [Math.cos(angle) * 0.28, TREE_FORMS[item.variant].branch, Math.sin(angle) * 0.28],
      clusterScale: 0.72 + (index % 2) * 0.12,
      rot: item.rot + angle,
    }
  }))
}

function plantStemItems(items) {
  return items.flatMap((item) => [0, 1, 2].map((index) => {
    const angle = (index / 3) * Math.PI * 2
    return {
      ...item,
      localOffset: [Math.cos(angle) * 0.17, 0.32 + (index % 2) * 0.07, Math.sin(angle) * 0.17],
      clusterScale: 0.74 + (index % 2) * 0.18,
    }
  }))
}

function plantLeafItems(items) {
  return items.flatMap((item) => {
    const leafCount = item.variant === 'fern' ? 6 : item.variant === 'reed' ? 4 : 5
    return Array.from({ length: leafCount }, (_, index) => {
    const angle = (index / leafCount) * Math.PI * 2
    const height = 0.28 + (index % 3) * 0.08
    return {
      ...item,
      localOffset: [Math.cos(angle) * (item.variant === 'goran' ? 0.22 : 0.16), height, Math.sin(angle) * (item.variant === 'goran' ? 0.22 : 0.16)],
      rot: angle,
      tilt: [Math.sin(angle) * 0.22, 0, -Math.cos(angle) * (item.variant === 'reed' ? 0.62 : 0.8)],
      clusterScale: (item.variant === 'goran' ? 0.9 : 0.72) + (index % 3) * 0.1,
    }
    })
  })
}

function rootItems(items) {
  return items.flatMap((item) => ROOTS.map((root, index) => ({
    ...item,
    localOffset: [root.x, 0.2, root.z],
    clusterScale: root.scale,
    rootIndex: index,
    rot: item.rot + root.angle,
  })))
}

function InstanceLayer({
  items, geometry, material, offset, rotation = [0, 0, 0],
  shapeScale = [1, 1, 1], castShadow = false, foliage = false,
}) {
  const mesh = useRef()
  const object = useMemo(() => new Object3D(), [])

  useLayoutEffect(() => {
    if (!mesh.current) return
    items.forEach((item, index) => {
      const yaw = item.rot ?? 0
      const scale = item.clusterScale ?? 1
      const local = item.localOffset ?? [0, 0, 0]
      const localX = (offset[0] + local[0]) * item.scale
      const localZ = (offset[2] + local[2]) * item.scale
      object.position.set(
        item.x + localX * Math.cos(yaw) + localZ * Math.sin(yaw),
        item.y + (offset[1] + local[1]) * item.scale,
        item.z - localX * Math.sin(yaw) + localZ * Math.cos(yaw),
      )
      const itemRotation = item.tilt ?? rotation
      object.rotation.set(itemRotation[0], itemRotation[1] + yaw, itemRotation[2])
      object.scale.set(
        shapeScale[0] * item.scale * scale,
        shapeScale[1] * item.scale * scale,
        shapeScale[2] * item.scale * scale,
      )
      object.updateMatrix()
      mesh.current.setMatrixAt(index, object.matrix)
      const tintOffset = item.kind === 'rock' ? (index % 5) * 0.055 : (index % 7) * 0.018
      const tint = item.kind === 'rock' ? 0.9 + (index % 5) * 0.02 : 0.84 + tintOffset
      const leafTint = foliage ? {
        reed: [0.78, 1.02, 0.74],
        fern: [0.92, 1.04, 0.82],
        sundari: [0.96, 1.02, 0.89],
        gewa: [0.86, 1.02, 0.91],
        goran: [1.04, 1.01, 0.8],
        slender: [0.9, 1.03, 0.96],
      }[item.variant]
        : null
      const backgroundTint = item.background ? 0.82 : 1
      mesh.current.setColorAt(index, leafTint
        ? new Color(leafTint[0] * backgroundTint, leafTint[1] * backgroundTint, leafTint[2] * backgroundTint)
        : new Color(tint, tint * (item.kind === 'rock' ? 0.96 : 1), tint * 0.92))
    })
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [items, offset, rotation, shapeScale, object, foliage])

  if (!items.length) return null
  return <instancedMesh ref={mesh} args={[geometry, material, items.length]} castShadow={castShadow} receiveShadow />
}

function createCanopyGeometry(variant = null) {
  const geometry = new IcosahedronGeometry(1, 2)
  const position = geometry.getAttribute('position')
  const formScale = {
    sundari: [1.18, 0.78, 1.02],
    gewa: [0.96, 0.93, 0.92],
    goran: [1.12, 0.65, 1.1],
    slender: [0.76, 1.16, 0.8],
  }[variant]
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    if (!formScale) {
      const wave = Math.sin(x * 13 + z * 9) * 0.045 + Math.cos(y * 11 - z * 7) * 0.035
      const lobe = Math.sin((x + y) * 6.5) * 0.04
      const scale = 1 + wave + lobe
      position.setXYZ(i, x * scale, y * scale, z * scale)
      continue
    }
    const angle = Math.atan2(z, x)
    const wave = Math.sin(angle * 3 + variant.length) * (variant === 'goran' ? 0.14 : 0.085)
      + Math.cos(angle * 5 - variant.length) * 0.04
      + Math.sin(y * 8 + x * 3) * 0.035
      + (variant === 'goran' ? Math.sin(angle * 2 + y * 4) * 0.06 : 0)
    const asymmetry = variant === 'gewa' ? x * 0.12 : variant === 'sundari' ? z * 0.08 : variant === 'goran' ? x * 0.14 + z * 0.08 : 0
    const scale = 1 + wave + asymmetry
    position.setXYZ(i, x * formScale[0] * scale, y * formScale[1] * scale, z * formScale[2] * scale)
  }
  geometry.computeVertexNormals()
  return geometry
}

function createLeafGeometry(shape = 'broad') {
  const widthScale = shape === 'narrow' ? 0.76 : 1.12
  const sections = [
    [-0.42, 0.015],
    [-0.2, 0.12],
    [0.04, 0.2],
    [0.26, 0.14],
    [0.43, 0.075],
    [0.54, 0],
  ]
  const positions = []
  const indices = []
  sections.forEach(([y, halfWidth], index) => {
    const width = halfWidth * widthScale
    const z = Math.sin((index / (sections.length - 1)) * Math.PI) * 0.035
    positions.push(-width, y, z, 0, y + 0.01, z + 0.01, width, y, z)
    if (index > 0) {
      const current = index * 3
      indices.push(
        current - 3, current - 2, current,
        current - 2, current + 1, current,
        current - 2, current - 1, current + 1,
        current - 1, current + 2, current + 1,
      )
    }
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createMudPatchGeometry() {
  const positions = [0, 0, 0]
  const indices = []
  const sides = 20
  for (let index = 0; index < sides; index += 1) {
    const angle = (index / sides) * Math.PI * 2
    const radius = 0.74 + Math.sin(index * 2.4) * 0.09 + Math.cos(index * 4.1) * 0.06
    positions.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
    if (index > 0) indices.push(0, index + 1, index)
  }
  indices.push(0, 1, sides)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createLeafLitterGeometry() {
  const positions = []
  const indices = []
  for (let leaf = 0; leaf < 3; leaf += 1) {
    const angle = leaf * 1.17
    const axisX = Math.cos(angle)
    const axisZ = Math.sin(angle)
    const sideX = -axisZ * 0.045
    const sideZ = axisX * 0.045
    const centerX = Math.cos(leaf * 2.1) * 0.07
    const centerZ = Math.sin(leaf * 2.1) * 0.07
    const base = positions.length / 3
    positions.push(
      centerX - axisX * 0.18, leaf * 0.001, centerZ - axisZ * 0.18,
      centerX + sideX, leaf * 0.001, centerZ + sideZ,
      centerX + axisX * 0.18, leaf * 0.001, centerZ + axisZ * 0.18,
      centerX - sideX, leaf * 0.001, centerZ - sideZ,
    )
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createRockGeometry() {
  const geometry = new IcosahedronGeometry(0.82, 1)
  const position = geometry.getAttribute('position')
  const colors = []
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const grain = Math.sin(x * 19 + z * 11) * Math.cos(y * 14 - z * 5)
    const stratum = Math.sin(y * 12 + x * 1.8) * 0.035
    const scale = 1 + grain * 0.075 + stratum
    position.setXYZ(i, x * scale, y * scale * 0.72, z * scale * (1 + Math.cos(x * 7) * 0.08))

    const band = Math.sin(y * 10 + grain * 2) > 0.55 ? 0.82 : 1
    colors.push(band, band * 0.94, band * 0.86)
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function ContactShadows({ items, geometry, material }) {
  const mesh = useRef()
  const object = useMemo(() => new Object3D(), [])

  useLayoutEffect(() => {
    if (!mesh.current) return
    items.forEach((item, index) => {
      object.position.set(item.x, item.y + 0.018, item.z)
      object.rotation.set(-Math.PI / 2, 0, item.rot ?? 0)
      const size = item.kind === 'rock' ? 1.25 : item.kind === 'kapok' ? 2.8 : 1.8
      object.scale.set(size * item.scale, size * item.scale, 1)
      object.updateMatrix()
      mesh.current.setMatrixAt(index, object.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  }, [items, object])

  if (!items.length) return null
  return <instancedMesh ref={mesh} args={[geometry, material, items.length]} frustumCulled={false} renderOrder={1} />
}

export default function BiomeScatter({ biome }) {
  const assets = useMemo(() => scatterBiomeAssets(biome), [biome])
  const byKind = useMemo(() => assets.reduce((groups, item) => {
    if (!groups[item.kind]) groups[item.kind] = []
    groups[item.kind].push(item)
    return groups
  }, {}), [assets])
  const resources = useMemo(() => {
    const textures = createBiomeSurfaceTextures(biome.id)
    const bark = new MeshStandardMaterial({
      map: textures.map,
      normalMap: textures.normalMap,
      roughnessMap: textures.roughnessMap,
      color: biome.id === 'sahara' ? '#927047' : '#74543b',
      roughness: 0.88,
    })
    const leaves = new MeshStandardMaterial({
      color: biome.id === 'sundarbans' ? '#527f4d' : biome.id === 'amazon' ? '#347b3d' : '#788747',
      roughness: 0.88,
      side: 2,
      flatShading: true,
    })
    const stone = new MeshStandardMaterial({
      map: textures.map,
      normalMap: textures.normalMap,
      roughnessMap: textures.roughnessMap,
      color: biome.id === 'sahara' ? '#c1a47d' : '#97866f',
      roughness: 0.97,
      metalness: 0.01,
      flatShading: true,
      vertexColors: true,
    })
    const mud = new MeshStandardMaterial({ color: '#594a39', roughness: 0.96, transparent: true, opacity: 0.28, depthWrite: false, side: 2 })
    const leafLitter = new MeshStandardMaterial({ color: '#765e40', roughness: 0.94, side: 2 })
    const canopies = biome.id === 'sundarbans'
      ? TREE_VARIANTS.map((variant) => createCanopyGeometry(variant))
      : [createCanopyGeometry()]
    const contactTexture = document.createElement('canvas')
    contactTexture.width = 64
    contactTexture.height = 64
    const context = contactTexture.getContext('2d')
    if (!context) throw new Error('Unable to create World Explorer contact shadow texture.')
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(0,0,0,0.44)')
    gradient.addColorStop(0.48, 'rgba(0,0,0,0.2)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 64, 64)
    const contactMap = new CanvasTexture(contactTexture)
    const contact = new MeshBasicMaterial({
      map: contactMap,
      color: biome.id === 'sundarbans' ? '#30271e' : biome.id === 'amazon' ? '#26301e' : '#53432e',
      transparent: true,
      depthWrite: false,
      opacity: biome.id === 'sundarbans' ? 0.3 : 0.62,
    })
    return {
      textures,
      contactMap,
      materials: [bark, leaves, stone, contact, mud, leafLitter],
      bark,
      leaves,
      stone,
      contact,
      mud,
      leafLitter,
      trunk: new CylinderGeometry(0.14, 0.22, 1, 12),
      root: new CylinderGeometry(0.035, 0.12, 1, 8),
      pneumatophore: new ConeGeometry(0.055, 1, 7),
      branch: new CylinderGeometry(0.045, 0.085, 1.45, 7),
      plantStem: new CylinderGeometry(0.025, 0.045, 0.75, 5),
      leafBroad: createLeafGeometry('broad'),
      leafNarrow: createLeafGeometry('narrow'),
      mudPatch: createMudPatchGeometry(),
      leafLitterGeometry: createLeafLitterGeometry(),
      canopies,
      understory: createCanopyGeometry(biome.id === 'sundarbans' ? 'goran' : null),
      rock: createRockGeometry(),
      contactGeometry: new PlaneGeometry(1, 1),
    }
  }, [biome])

  useLayoutEffect(() => () => {
    resources.materials.forEach((material) => material.dispose())
    Object.values(resources.textures).forEach((texture) => texture.dispose())
    resources.contactMap.dispose()
    resources.trunk.dispose()
    resources.root.dispose()
    resources.pneumatophore.dispose()
    resources.branch.dispose()
    resources.plantStem.dispose()
    resources.leafBroad.dispose()
    resources.leafNarrow.dispose()
    resources.mudPatch.dispose()
    resources.leafLitterGeometry.dispose()
    resources.canopies.forEach((geometry) => geometry.dispose())
    resources.understory.dispose()
    resources.rock.dispose()
    resources.contactGeometry.dispose()
  }, [resources])

  const mangroves = byKind.mangrove ?? EMPTY_ITEMS
  const backgroundMangroves = byKind.backgroundMangrove ?? EMPTY_ITEMS
  const kapok = byKind.kapok ?? EMPTY_ITEMS
  const acacia = byKind.acacia ?? EMPTY_ITEMS
  const understory = byKind.understory ?? EMPTY_ITEMS
  const rocks = byKind.rock ?? EMPTY_ITEMS
  const mudPatches = byKind.mudPatch ?? EMPTY_ITEMS
  const leafLitter = byKind.leafLitter ?? EMPTY_ITEMS
  const allMangroves = useMemo(() => [...mangroves, ...backgroundMangroves], [mangroves, backgroundMangroves])
  const treesByVariant = useMemo(() => groupByVariant(allMangroves), [allMangroves])
  const canopyClusters = useMemo(() => clusterItems(kapok, CANOPY_CLUSTERS), [kapok])
  const mangroveCanopy = useMemo(() => clusterItems(allMangroves, biome.id === 'sundarbans' ? SUNDARBANS_CROWNS : CANOPY_CLUSTERS), [allMangroves, biome.id])
  const backgroundCanopyByVariant = useMemo(() => groupByVariant(clusterItems(backgroundMangroves, DISTANT_CROWNS)), [backgroundMangroves])
  const foregroundCanopyByVariant = useMemo(() => groupByVariant(mangroveCanopy.filter((item) => !item.background)), [mangroveCanopy])
  const mangroveBranches = useMemo(() => branchItems(mangroves), [mangroves])
  const acaciaCanopy = useMemo(() => clusterItems(acacia, CANOPY_CLUSTERS), [acacia])
  const undergrowth = useMemo(() => clusterItems(understory, biome.id === 'sundarbans'
    ? [[0, 0.08, 0, 0.82], [-0.3, 0.05, 0.22, 0.52], [0.28, 0.08, -0.24, 0.58]]
    : [[0, 0.1, 0, 1], [0.35, 0.15, 0.2, 0.72]]), [understory, biome.id])
  const plantStems = useMemo(() => plantStemItems(understory), [understory])
  const plantLeaves = useMemo(() => plantLeafItems(understory), [understory])
  const plantLeavesByVariant = useMemo(() => groupByVariant(plantLeaves), [plantLeaves])
  const mangroveRoots = useMemo(() => rootItems(mangroves), [mangroves])
  const kapokRoots = useMemo(() => rootItems(kapok), [kapok])
  const pneumatophores = useMemo(() => rootItems(mangroves).map((item) => ({
    ...item, localOffset: [item.localOffset[0] * 0.82, 0, item.localOffset[2] * 0.82], clusterScale: 0.72 + (item.rootIndex % 3) * 0.12,
  })), [mangroves])
  const contactItems = useMemo(() => [...mangroves, ...kapok, ...acacia, ...rocks], [mangroves, kapok, acacia, rocks])

  return (
    <group>
      <ContactShadows items={contactItems} geometry={resources.contactGeometry} material={resources.contact} />
      {mangroves.length > 0 && (
        <>
          {biome.id === 'sundarbans'
            ? TREE_VARIANTS.map((variant, index) => {
              const items = (treesByVariant[variant] ?? EMPTY_ITEMS).filter((item) => !item.background)
              const distantItems = (treesByVariant[variant] ?? EMPTY_ITEMS).filter((item) => item.background)
              const form = TREE_FORMS[variant]
              return items.length || distantItems.length ? (
                <group key={variant}>
                  <InstanceLayer items={items} geometry={resources.trunk} material={resources.bark} offset={[0, form.height / 2, 0]} shapeScale={[1, form.height, 1]} castShadow />
                  <InstanceLayer items={foregroundCanopyByVariant[variant] ?? EMPTY_ITEMS} geometry={resources.canopies[index]} material={resources.leaves} offset={[0, form.crown, 0]} shapeScale={form.crownScale} castShadow foliage />
                  <InstanceLayer items={distantItems} geometry={resources.trunk} material={resources.bark} offset={[0, form.height / 2, 0]} shapeScale={[1, form.height, 1]} />
                  <InstanceLayer
                    items={backgroundCanopyByVariant[variant] ?? EMPTY_ITEMS}
                    geometry={resources.canopies[index]}
                    material={resources.leaves}
                    offset={[0, form.crown * 0.72, 0]}
                    shapeScale={[form.crownScale[0] * 1.18, form.crownScale[1] * 0.9, form.crownScale[2] * 1.18]}
                    foliage
                  />
                </group>
              ) : null
            })
            : <InstanceLayer items={mangroves} geometry={resources.trunk} material={resources.bark} offset={[0, 1.6, 0]} shapeScale={[1, 3.2, 1]} castShadow />}
          {biome.id === 'sundarbans'
            ? <InstanceLayer items={mangroveBranches} geometry={resources.branch} material={resources.bark} offset={[0, 0, 0]} rotation={[0, 0, -0.82]} castShadow />
            : null}
          <InstanceLayer items={mangroveRoots} geometry={resources.root} material={resources.bark} offset={[0.42, 0.38, 0]} rotation={[0, 0, -0.58]} shapeScale={[0.9, 1.8, 0.9]} castShadow />
          <InstanceLayer items={pneumatophores} geometry={resources.pneumatophore} material={resources.bark} offset={[0, 0.18, 0]} shapeScale={[0.55, 0.32, 0.55]} />
          {biome.id !== 'sundarbans' ? <InstanceLayer items={mangroveCanopy} geometry={resources.canopies[0]} material={resources.leaves} offset={[0, 3.5, 0]} shapeScale={[1.05, 0.7, 0.95]} castShadow /> : null}
        </>
      )}
      {kapok.length > 0 && (
        <>
          <InstanceLayer items={kapok} geometry={resources.trunk} material={resources.bark} offset={[0, 3.5, 0]} shapeScale={[1.25, 7, 1.25]} castShadow />
          <InstanceLayer items={kapokRoots} geometry={resources.root} material={resources.bark} offset={[0.68, 0.38, 0]} rotation={[0, 0, -0.72]} shapeScale={[1.7, 2.2, 1.7]} castShadow />
          <InstanceLayer items={canopyClusters} geometry={resources.canopies[0]} material={resources.leaves} offset={[0, 7.3, 0]} shapeScale={[2.25, 1.4, 2.05]} castShadow />
        </>
      )}
      {acacia.length > 0 && (
        <>
          <InstanceLayer items={acacia} geometry={resources.trunk} material={resources.bark} offset={[0, 2.2, 0]} shapeScale={[0.75, 4.4, 0.75]} castShadow />
          <InstanceLayer items={acaciaCanopy} geometry={resources.canopies[0]} material={resources.leaves} offset={[0, 4.45, 0]} shapeScale={[1.8, 0.48, 1.7]} castShadow />
        </>
      )}
      {biome.id === 'sundarbans' && plantStems.length > 0 && (
        <>
          <InstanceLayer items={plantStems} geometry={resources.plantStem} material={resources.bark} offset={[0, 0.32, 0]} shapeScale={[0.62, 1, 0.62]} />
          {['reed', 'fern', 'goran'].map((variant) => {
            const leaves = plantLeavesByVariant[variant] ?? EMPTY_ITEMS
            return leaves.length ? (
              <InstanceLayer
                key={variant}
                items={leaves}
                geometry={variant === 'goran' ? resources.leafBroad : resources.leafNarrow}
                material={resources.leaves}
                offset={[0, 0.32, 0]}
                shapeScale={variant === 'goran' ? [0.64, 0.66, 0.2] : variant === 'fern' ? [0.52, 0.58, 0.18] : [0.42, 0.68, 0.16]}
                foliage
              />
            ) : null
          })}
        </>
      )}
      {biome.id !== 'sundarbans' && undergrowth.length > 0 && (
        <InstanceLayer items={undergrowth} geometry={resources.understory} material={resources.leaves} offset={[0, 0.32, 0]} shapeScale={[0.75, 0.88, 0.75]} />
      )}
      {biome.id === 'sundarbans' && mudPatches.length > 0 && (
        <InstanceLayer items={mudPatches} geometry={resources.mudPatch} material={resources.mud} offset={[0, 0.006, 0]} shapeScale={[0.82, 1, 0.82]} />
      )}
      {biome.id === 'sundarbans' && leafLitter.length > 0 && (
        <InstanceLayer items={leafLitter} geometry={resources.leafLitterGeometry} material={resources.leafLitter} offset={[0, 0.03, 0]} />
      )}
      {rocks.length > 0 && (
        <InstanceLayer items={rocks} geometry={resources.rock} material={resources.stone} offset={[0, 0.35, 0]} shapeScale={[1.12, 0.9, 1]} castShadow />
      )}
    </group>
  )
}
