/**
 * The Sundarbans scene (everything except stations, props with gameplay meaning and the player):
 *   one continuous ground mesh: playable mud, shore, tidal flats, banks and channels
 *   tidal water with depth-based colour, soft ripples and a restrained sky/forest reflection
 *   instanced vegetation in foreground / midground / background layers
 *   the plank boardwalks between stations
 *   a sky dome that fades into the horizon haze
 *
 * Draw-call budget: every vegetation layer is one InstancedMesh (one call, plus one shadow call
 * for the few layers that cast shadows). Geometry and materials are shared and disposed on unmount.
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BackSide, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, MeshBasicMaterial, MeshLambertMaterial,
  MeshStandardMaterial, Object3D, SphereGeometry, Vector2,
} from 'three'
import { createSundarbansModels } from './mangroveModels.js'
import { MANGROVE_FORMS } from './mangroveForms.js'
import { scatterBiomeAssets } from './scattering.js'
import { createWetlandField, fbm, smoothstep } from './wetland.js'
import { createMudTextures, createReflectionTexture, createRippleNormalMap } from './wetlandTextures.js'

const EMPTY = Object.freeze([])
const MANGROVE_COLLIDER_TAG = Object.freeze({ isCollider: true, collisionKind: 'mangrove' })
const SPECIES = ['sundari', 'gewa', 'keora', 'garjan', 'goran']
/** Every (family, form) pair for a level of detail: one InstancedMesh each. */
const FORM_KEYS = (lod) => SPECIES.flatMap((name) => Array.from({ length: MANGROVE_FORMS[lod][name] }, (_, form) => [name, form]))
const NEAR_KEYS = FORM_KEYS('near')
const MID_KEYS = FORM_KEYS('mid')

/** Deterministic 0..1 from a position, for per-instance variation. */
function jitter(x, z, salt = 0) {
  const s = Math.sin(x * 12.9898 + z * 78.233 + salt * 37.719) * 43758.5453
  return s - Math.floor(s)
}

const TINTS = {
  sundari: [0.96, 1, 0.94],
  gewa: [1.04, 1.03, 0.9],
  keora: [1, 1.02, 1.02],
  garjan: [0.92, 0.98, 0.92],
  goran: [1.02, 1.02, 0.92],
}

/**
 * Keeps the explorer in view: foliage dissolves (screen-door dither, colour pass only, shadows
 * unchanged) when it is very close to the follow camera, or when it sits between the camera and
 * Bulbuli near the centre of the screen, where the follow camera always frames the player.
 */
const PLAYER_VIEW_DEPTH = 5.4 // tuned for the closer, bird-scale follow camera (ExplorerController)
function createFoliageFade(viewport) {
  return (material, key) => {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWxViewport = viewport
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', 'uniform vec2 uWxViewport;\nvoid main() {')
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
          {
            float viewDepth = vViewPosition.z; // positive distance in front of the camera
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
    material.customProgramCacheKey = () => `wx-sundarbans-foliage-fade-${key}`
    return material
  }
}

/* ---------------------------------------------------------------- instancing */

const itemScale = (item) => item.scale
const treeTint = (item) => TINTS[item.variant] ?? [1, 1, 1]
const farTint = (item) => {
  const t = TINTS[item.variant] ?? [1, 1, 1]
  return [t[0] * 0.95, t[1] * 0.97, t[2] * 0.95]
}

function Instances({ items, geometry, material, castShadow = false, receiveShadow = true, yOffset = 0, sizeOf = itemScale, tint, isCollider = false }) {
  const mesh = useRef()
  const helper = useMemo(() => new Object3D(), [])
  const color = useMemo(() => new Color(), [])

  useLayoutEffect(() => {
    const target = mesh.current
    if (!target) return
    items.forEach((item, index) => {
      const size = sizeOf(item)
      const widen = 0.92 + jitter(item.x, item.z, 1) * 0.16
      helper.position.set(item.x, item.y + yOffset, item.z)
      const yaw = (item.rot ?? 0) + (jitter(item.x, item.z, 4) - 0.5) * 0.22
      helper.rotation.set(item.tiltX ?? 0, yaw, item.tiltZ ?? 0)
      helper.scale.set(size * widen, size * (item.stretch ?? 1), size * widen * (0.94 + jitter(item.x, item.z, 2) * 0.12))
      helper.updateMatrix()
      target.setMatrixAt(index, helper.matrix)
      const light = 0.88 + jitter(item.x, item.z, 3) * 0.2
      const base = tint ? tint(item) : [1, 1, 1]
      color.setRGB(base[0] * light, base[1] * light, base[2] * light)
      target.setColorAt(index, color)
    })
    target.instanceMatrix.needsUpdate = true
    if (target.instanceColor) target.instanceColor.needsUpdate = true
    target.computeBoundingSphere()
  }, [items, helper, color, yOffset, sizeOf, tint])

  if (!items.length) return null
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      userData={isCollider ? MANGROVE_COLLIDER_TAG : undefined}
    />
  )
}

/* ---------------------------------------------------------------- ground + water geometry */

const GROUND_COLORS = {
  mud: new Color('#735e48'),
  dry: new Color('#978167'),
  clearing: new Color('#a28f74'),
  grey: new Color('#857a69'),
  moss: new Color('#6f6d45'),
  wet: new Color('#584838'),
  wetSilt: new Color('#3a3227'),
  algae: new Color('#5d6840'),
  silt: new Color('#4a4734'),
  bank: new Color('#5f503c'),
  litter: new Color('#55492f'),
}

function ringRadii(radius) {
  const radii = []
  for (let r = 0.5; r <= 36; r += 0.5) radii.push(r)
  let r = 36
  while (r < radius) {
    r = Math.min(radius, r * 1.042)
    radii.push(r)
  }
  return radii
}

/** Soft canopy shading on the ground under trees (cheap stand-in for ambient occlusion). */
function createCanopyShade(trees) {
  const cell = 6
  const cells = new Map()
  for (const tree of trees) {
    const reach = (tree.lod === 'far' ? 2.8 : 2.4) * tree.scale
    const k = `${Math.floor(tree.x / cell)},${Math.floor(tree.z / cell)}`
    if (!cells.has(k)) cells.set(k, [])
    cells.get(k).push([tree.x, tree.z, reach])
  }
  return (x, z) => {
    let shade = 0
    const ix = Math.floor(x / cell)
    const iz = Math.floor(z / cell)
    for (let i = -1; i <= 1; i += 1) {
      for (let j = -1; j <= 1; j += 1) {
        const list = cells.get(`${ix + i},${iz + j}`)
        if (!list) continue
        for (const [tx, tz, reach] of list) {
          const d = Math.hypot(x - tx, z - tz)
          if (d < reach) shade = Math.max(shade, 1 - (d / reach) ** 1.5)
        }
      }
    }
    return shade
  }
}

function createGroundAndWater(biome, field, trees) {
  const radii = ringRadii(field.radius)
  const sectors = 288
  const { x: cx, z: cz } = field.center
  const shadeAt = createCanopyShade(trees)
  const flatSpots = [...biome.stations, { x: biome.spawn.position[0], z: biome.spawn.position[2] }]

  const heights = []
  const xs = []
  const zs = []
  const positions = []
  const colors = []
  const shoreWetness = []
  const uvs = []
  const c = new Color()
  const addVertex = (x, z) => {
    const h = field.heightAt(x, z)
    const e = field.walkSD(x, z)
    const dw = h - field.waterY
    const wetShore = (1 - smoothstep(0.08, 0.72, Math.abs(dw))) * smoothstep(-1.5, 1.8, e)
    // colour patches sample the noise in rotated, offset coordinates: value noise is laid on a
    // world-aligned grid, and thresholding it unrotated left square, axis-aligned blotches
    const px = x * 0.79 - z * 0.61 + 17.3
    const pz = x * 0.61 + z * 0.79 - 9.1
    const dry = fbm(px * 0.07, pz * 0.07, 201, 3)
    const patch = fbm(px * 0.028 + 3.3, pz * 0.028, 211, 2)
    const silt = fbm(px * 0.045 - 7.1, pz * 0.045 + 2.3, 223, 3)
    const moss = fbm(px * 0.11 + 1.7, pz * 0.11, 227, 2)
    c.copy(GROUND_COLORS.mud).lerp(GROUND_COLORS.grey, smoothstep(0.42, 0.74, silt) * 0.5)
    c.lerp(GROUND_COLORS.dry, smoothstep(0.4, 0.78, dry) * 0.7)
    c.lerp(GROUND_COLORS.clearing, smoothstep(0.55, 0.82, patch) * 0.42)
    c.lerp(GROUND_COLORS.moss, smoothstep(0.58, 0.8, moss) * 0.35)
    // damp hollows: broad, soft-edged and partial, so open mud never shows hard-edged dark sheets
    const damp = fbm(px * 0.09 - 3.7, pz * 0.09 + 8.1, 233, 3)
    c.lerp(GROUND_COLORS.wet, smoothstep(0.5, 0.82, damp) * 0.32)
    const trodden = flatSpots.reduce((best, s) => Math.max(best, 1 - smoothstep(1.5, 4.5, Math.hypot(x - s.x, z - s.z))), 0)
    c.lerp(GROUND_COLORS.clearing, trodden * 0.3)
    // wet margin towards the tide line: soft, partial and with a noisy edge, so the boundary of
    // the walkable mud never shows as a straight dark band
    const edge = e + (fbm(px * 0.19 + 4.1, pz * 0.19 - 2.6, 241, 2) - 0.5) * 2.4
    c.lerp(GROUND_COLORS.wet, smoothstep(-4.5, 1.6, edge) * 0.55)
    if (e > 0) {
      c.lerp(GROUND_COLORS.algae, (1 - smoothstep(0.02, 0.2, Math.abs(dw - 0.05))) * 0.55)
      if (dw > 0.12 && e > 4) c.lerp(GROUND_COLORS.bank, 0.55)
      if (dw < 0) c.lerp(GROUND_COLORS.silt, smoothstep(0, -0.25, dw))
    }
    c.lerp(GROUND_COLORS.wetSilt, wetShore * 0.82)
    const shade = shadeAt(x, z)
    c.lerp(GROUND_COLORS.litter, shade * 0.4).multiplyScalar(1 - shade * 0.22)
    positions.push(x, h, z)
    colors.push(c.r, c.g, c.b)
    shoreWetness.push(wetShore)
    uvs.push(x / 6.5, z / 6.5)
    heights.push(h)
    xs.push(x)
    zs.push(z)
    return heights.length - 1
  }

  addVertex(cx, cz)
  for (const r of radii) {
    for (let s = 0; s < sectors; s += 1) {
      const a = (s / sectors) * Math.PI * 2
      addVertex(cx + Math.cos(a) * r, cz + Math.sin(a) * r)
    }
  }
  const index = (ring, s) => 1 + ring * sectors + (s % sectors)
  const indices = []
  for (let s = 0; s < sectors; s += 1) indices.push(0, index(0, s + 1), index(0, s))
  for (let ring = 1; ring < radii.length; ring += 1) {
    for (let s = 0; s < sectors; s += 1) {
      const a = index(ring - 1, s)
      const b = index(ring - 1, s + 1)
      const d = index(ring, s)
      const e = index(ring, s + 1)
      indices.push(a, b, e, a, e, d)
    }
  }
  const ground = new BufferGeometry()
  ground.setAttribute('position', new Float32BufferAttribute(positions, 3))
  ground.setAttribute('color', new Float32BufferAttribute(colors, 3))
  ground.setAttribute('shoreWetness', new Float32BufferAttribute(shoreWetness, 1))
  ground.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  ground.setIndex(indices)
  ground.computeVertexNormals()
  ground.computeBoundingSphere()

  // water: the same grid at half resolution, only where the ground dips below the waterline
  const waterPositions = []
  const waterColors = []
  const waterUvs = []
  // brackish, silt-laden tidal water: olive-brown shallows to a dark grey-green channel (never turquoise)
  const deep = new Color('#33402f')
  const mid = new Color('#48523b')
  const shallow = new Color('#665d42')
  const sheen = new Color('#7a6f52')
  const wy = field.waterY + 0.012
  const waterIndex = new Map()
  const addWater = (i) => {
    if (waterIndex.has(i)) return waterIndex.get(i)
    const depth = field.waterY - heights[i]
    if (depth < 0.1) c.copy(sheen).lerp(shallow, smoothstep(0.0, 0.1, depth))
    else if (depth < 0.32) c.copy(shallow).lerp(mid, smoothstep(0.1, 0.32, depth))
    else c.copy(mid).lerp(deep, smoothstep(0.32, 0.75, depth))
    const ripple = 0.96 + fbm(xs[i] * 0.05, zs[i] * 0.05, 307, 2) * 0.08
    const alpha = depth <= 0 ? 0 : Math.min(0.95, 0.5 + smoothstep(0, 0.4, depth) * 0.45)
    waterPositions.push(xs[i], wy, zs[i])
    waterColors.push(c.r * ripple, c.g * ripple, c.b * ripple, alpha)
    waterUvs.push(xs[i] / 9, zs[i] / 9)
    const next = waterPositions.length / 3 - 1
    waterIndex.set(i, next)
    return next
  }
  const waterIndices = []
  const wet = (i) => heights[i] < field.waterY + 0.04
  const pushWater = (a, b, d) => {
    if (!wet(a) && !wet(b) && !wet(d)) return
    waterIndices.push(addWater(a), addWater(b), addWater(d))
  }
  const ringStep = (ring) => (radii[ring] < 36 ? 2 : 1)
  const waterRings = [-1]
  for (let ring = 0; ring < radii.length; ring += ringStep(ring)) waterRings.push(ring)
  for (let w = 1; w < waterRings.length; w += 1) {
    const r0 = waterRings[w - 1]
    const r1 = waterRings[w]
    for (let s = 0; s < sectors; s += 2) {
      if (r0 < 0) {
        pushWater(0, index(r1, s + 2), index(r1, s))
        continue
      }
      const a = index(r0, s)
      const b = index(r0, s + 2)
      const d = index(r1, s)
      const e = index(r1, s + 2)
      pushWater(a, b, e)
      pushWater(a, e, d)
    }
  }
  const water = new BufferGeometry()
  water.setAttribute('position', new Float32BufferAttribute(waterPositions, 3))
  water.setAttribute('color', new Float32BufferAttribute(waterColors, 4))
  water.setAttribute('uv', new Float32BufferAttribute(waterUvs, 2))
  water.setIndex(waterIndices)
  water.computeVertexNormals()
  water.computeBoundingSphere()
  return { ground, water }
}

function createSkyDome(sky) {
  const geometry = new SphereGeometry(290, 32, 20)
  const position = geometry.getAttribute('position')
  const top = new Color(sky.top)
  const horizon = new Color(sky.horizon ?? sky.fog)
  const fog = new Color(sky.fog)
  const colors = []
  const c = new Color()
  for (let i = 0; i < position.count; i += 1) {
    const y = position.getY(i) / 290
    if (y < 0.02) c.copy(fog)
    else c.copy(horizon).lerp(top, smoothstep(0.02, 0.62, y) ** 0.8)
    colors.push(c.r, c.g, c.b)
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return geometry
}

/* ---------------------------------------------------------------- boardwalks */

function boardwalkBoards(biome, field) {
  const groups = new Map()
  for (const disc of biome.discs) {
    if (disc.look !== 'plank') continue
    const prefix = disc.id.replace(/\d+$/, '')
    if (!groups.has(prefix)) groups.set(prefix, [])
    groups.get(prefix).push(disc)
  }
  const boards = []
  for (const discs of groups.values()) {
    discs.sort((a, b) => Number(a.id.match(/\d+$/)[0]) - Number(b.id.match(/\d+$/)[0]))
    const first = discs[0]
    const last = discs[discs.length - 1]
    let dx = last.x - first.x
    let dz = last.z - first.z
    let length = Math.hypot(dx, dz)
    if (length < 1e-6) {
      dx = 1
      dz = 0
      length = 1
    }
    dx /= length
    dz /= length
    const startX = first.x - dx * first.r * 0.9
    const startZ = first.z - dz * first.r * 0.9
    const span = length + first.r * 0.9 + last.r * 0.9
    const count = Math.floor(span / 0.27)
    for (let i = 0; i <= count; i += 1) {
      const x = startX + dx * i * 0.27
      const z = startZ + dz * i * 0.27
      boards.push({
        x,
        z,
        y: Math.max(field.heightAt(x, z), first.top) + (jitter(x, z, 4) - 0.5) * 0.008,
        rot: Math.atan2(dx, dz) + (jitter(x, z, 5) - 0.5) * 0.06,
        scale: 1,
        stretch: 1,
      })
    }
  }
  return boards
}

/* ---------------------------------------------------------------- the scene */

export default function SundarbansScenery({ biome, dark }) {
  const field = useMemo(() => createWetlandField(biome), [biome])
  const placements = useMemo(() => scatterBiomeAssets(biome), [biome])
  const groups = useMemo(() => {
    const byKind = {}
    for (const item of placements) {
      const key = item.kind === 'backgroundMangrove' ? `bg-${item.lod}` : item.kind
      if (!byKind[key]) byKind[key] = []
      byKind[key].push(item)
    }
    // map-level dressing from sundarbans.js, now drawn instanced and seated on the real ground
    const seat = (prop) => ({ ...prop, y: field.heightAt(prop.x, prop.z) })
    const props = biome.props
    const propsOf = (type) => props.filter((prop) => prop.type === type).map(seat)
    // trees are grouped per family AND seeded form, so neighbours rarely share a silhouette
    const byForm = (items, lod) => {
      const count = (name) => MANGROVE_FORMS[lod][name] ?? 1
      return Object.fromEntries(SPECIES.map((name) => [name, Array.from({ length: count(name) }, (_, form) => (
        items.filter((item) => item.variant === name && ((item.form ?? 0) % count(name)) === form)
      ))]))
    }
    const understory = byKind.understory ?? EMPTY
    return {
      trees: byForm(byKind.mangrove ?? EMPTY, 'near'),
      saplings: byForm(byKind.sapling ?? EMPTY, 'mid'),
      mid: byForm(byKind['bg-mid'] ?? EMPTY, 'mid'),
      far: Array.from({ length: MANGROVE_FORMS.far }, (_, form) => (byKind['bg-far'] ?? EMPTY).filter((item) => (item.form ?? 0) % MANGROVE_FORMS.far === form)),
      fern: [...understory.filter((item) => item.variant === 'fern'), ...propsOf('fern').map((prop) => ({ ...prop, scale: prop.scale * 1.35 }))],
      reed: [...understory.filter((item) => item.variant === 'reed'), ...(byKind.shoreReeds ?? EMPTY)],
      broadleaf: understory.filter((item) => item.variant === 'broadleaf'),
      hantal: understory.filter((item) => item.variant === 'hantal'),
      nipa: byKind.shoreNipa ?? EMPTY,
      roots: [...(byKind.pneumatophoreField ?? EMPTY), ...propsOf('pneumatophores')],
      shoreRoots: byKind.shoreRoots ?? EMPTY,
      shorePneumatophores: byKind.shorePneumatophore ?? EMPTY,
      logs: propsOf('log').map((prop) => ({ ...prop, y: prop.y - 0.05 })),
      debris: byKind.debris ?? EMPTY,
      allTrees: placements.filter((item) => ['mangrove', 'sapling', 'backgroundMangrove'].includes(item.kind)),
    }
  }, [placements, biome.props, field])

  const viewport = useMemo(() => ({ value: new Vector2(1, 1) }), [])
  const resources = useMemo(() => {
    const fade = createFoliageFade(viewport)
    const models = createSundarbansModels()
    const mud = createMudTextures()
    const ripples = createRippleNormalMap()
    ripples.repeat.set(1, 1)
    const surfaces = createGroundAndWater(biome, field, groups.allTrees)
    // double-sided: leaf blades are single sheets. Trees are welded with smooth normals
    // (mangroveTrees.js smoothShaded), so crowns and trunks read rounded rather than faceted.
    const vegetation = fade(new MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.84, metalness: 0, side: DoubleSide }), 'near')
    const plants = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8, metalness: 0, side: DoubleSide })
    // smooth shading: the far forest's welded lobes read as soft crowns (mid trees keep their own face normals)
    const distant = fade(new MeshLambertMaterial({ vertexColors: true, flatShading: false, side: DoubleSide }), 'distant')
    const distantPlants = new MeshLambertMaterial({ vertexColors: true, flatShading: true, side: DoubleSide })
    const wood = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.78, metalness: 0 })
    const rootCarpet = new MeshStandardMaterial({ color: '#5c5243', flatShading: true, roughness: 0.94, metalness: 0 })
    const groundMaterial = new MeshStandardMaterial({
      vertexColors: true,
      map: mud.map,
      normalMap: mud.normalMap,
      roughnessMap: mud.roughnessMap,
      roughness: 0.96,
      metalness: 0,
    })
    groundMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float shoreWetness;\nvarying float vShoreWetness;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShoreWetness = shoreWetness;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vShoreWetness;')
        // The mud's fine detail (6.5 m tile) belongs near Bulbuli. Further away it is faded out
        // and blended with a second, offset scale, so the tile never lines up into the parallel
        // "terraces" that showed from the air; the large-scale colour still comes from the mesh.
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nfloat wxDetailFade = smoothstep(14.0, 40.0, length(vViewPosition));')
        .replace('#include <map_fragment>', `#ifdef USE_MAP
          vec4 wxNear = texture2D( map, vMapUv );
          vec4 wxWide = texture2D( map, vMapUv * 0.37 + vec2( 0.31, 0.17 ) );
          vec4 sampledDiffuseColor = mix( wxNear, mix( wxNear, wxWide, 0.5 ), smoothstep( 6.0, 18.0, length( vViewPosition ) ) );
          sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, vec3( 0.9 ), wxDetailFade * 0.85 );
          diffuseColor *= sampledDiffuseColor;
        #endif`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.93, wxDetailFade);\nroughnessFactor = mix(roughnessFactor, 0.35, vShoreWetness);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.1, vShoreWetness);')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize( mix( normal, nonPerturbedNormal, wxDetailFade ) );')
    }
    groundMaterial.customProgramCacheKey = () => 'sundarbans-shore-wetness-detail-fade'
    groundMaterial.normalScale.set(0.55, 0.55)
    return { models, mud, ripples, surfaces, vegetation, plants, distant, distantPlants, wood, rootCarpet, groundMaterial }
  }, [biome, field, groups.allTrees, viewport])

  const sky = dark ? biome.sky.dark : biome.sky
  const look = useMemo(() => {
    // reflections take the hazy grey-green sky and the dark forest line, not a cyan sky
    const reflection = createReflectionTexture(dark
      ? { top: '#1c2c3a', horizon: '#2b3d38', forest: '#101b15' }
      : { top: '#98a99a', horizon: '#b3bba8', forest: '#33452f' })
    const waterMaterial = new MeshStandardMaterial({
      vertexColors: true, transparent: true, depthWrite: false, roughness: dark ? 0.62 : 0.3, metalness: 0,
      normalMap: resources.ripples, envMap: reflection, envMapIntensity: dark ? 0.28 : 0.34,
    })
    waterMaterial.normalScale.set(dark ? 0.2 : 0.3, dark ? 0.2 : 0.3)
    // the 9 m ripple tile fades out with distance, so far channels don't show repeating lines
    waterMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        '#include <normal_fragment_maps>\nnormal = normalize( mix( normal, nonPerturbedNormal, smoothstep( 10.0, 32.0, length( vViewPosition ) ) ) );',
      )
    }
    waterMaterial.customProgramCacheKey = () => 'sundarbans-water-ripple-fade'
    const skyGeometry = createSkyDome(sky)
    const skyMaterial = new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false })
    return { reflection, waterMaterial, skyGeometry, skyMaterial }
  }, [sky, dark, resources.ripples])

  const boards = useMemo(() => boardwalkBoards(biome, field), [biome, field])

  useEffect(() => () => {
    resources.models.dispose()
    Object.values(resources.mud).forEach((texture) => texture.dispose())
    resources.ripples.dispose()
    resources.surfaces.ground.dispose()
    resources.surfaces.water.dispose()
    ;[resources.vegetation, resources.plants, resources.distant, resources.distantPlants, resources.wood, resources.rootCarpet, resources.groundMaterial].forEach((m) => m.dispose())
  }, [resources])
  useEffect(() => () => {
    look.reflection.dispose()
    look.waterMaterial.dispose()
    look.skyGeometry.dispose()
    look.skyMaterial.dispose()
  }, [look])

  // slow drifting ripples (texture offset only, no geometry work per frame)
  const waterMesh = useRef()
  useFrame(({ gl }, delta) => {
    gl.getDrawingBufferSize(viewport.value)
    const map = waterMesh.current?.material?.normalMap
    if (!map) return
    map.offset.x = (map.offset.x + delta * 0.011) % 1
    map.offset.y = (map.offset.y + delta * 0.006) % 1
  })

  const { models } = resources

  return (
    <group>
      <mesh geometry={look.skyGeometry} material={look.skyMaterial} renderOrder={-10} frustumCulled={false} />
      <mesh geometry={resources.surfaces.ground} material={resources.groundMaterial} receiveShadow />
      <mesh ref={waterMesh} geometry={resources.surfaces.water} material={look.waterMaterial} receiveShadow renderOrder={-1} />

      {NEAR_KEYS.map(([name, form]) => (
        <Instances key={`near-${name}-${form}`} items={groups.trees[name][form]} geometry={models.tree[name][form]} material={resources.vegetation} castShadow tint={treeTint} isCollider />
      ))}
      {MID_KEYS.map(([name, form]) => (
        <group key={`mid-${name}-${form}`}>
          {/* knee-high saplings: no shadow pass (their shadows are barely visible) */}
          <Instances items={groups.saplings[name][form]} geometry={models.treeMid[name][form]} material={resources.vegetation} tint={treeTint} />
          <Instances items={groups.mid[name][form]} geometry={models.treeMid[name][form]} material={resources.distant} receiveShadow={false} tint={treeTint} />
        </group>
      ))}
      {groups.far.map((items, form) => (
        <Instances key={`far-${form}`} items={items} geometry={models.treeFar[form]} material={resources.distant} receiveShadow={false} tint={farTint} />
      ))}

      <Instances items={groups.fern} geometry={models.plant.fern} material={resources.plants} />
      <Instances items={groups.reed} geometry={models.plant.reed} material={resources.plants} />
      <Instances items={groups.broadleaf} geometry={models.plant.broadleaf} material={resources.plants} />
      <Instances items={groups.hantal} geometry={models.plant.hantal} material={resources.plants} />
      <Instances items={groups.nipa} geometry={models.plant.nipa} material={resources.distantPlants} receiveShadow={false} />
      <Instances items={groups.roots} geometry={models.roots} material={resources.vegetation} />
      <Instances items={groups.shoreRoots} geometry={models.rootsFar} material={resources.distant} receiveShadow={false} />
      <Instances items={groups.shorePneumatophores} geometry={models.rootsCarpet} material={resources.rootCarpet} receiveShadow={false} />
      <Instances items={groups.logs} geometry={models.log} material={resources.wood} castShadow />
      <Instances items={groups.debris} geometry={models.debris} material={resources.wood} />
      <Instances items={boards} geometry={models.board} material={resources.wood} isCollider />
    </group>
  )
}
