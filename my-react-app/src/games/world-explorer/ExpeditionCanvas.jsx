/**
 * World Explorer 3D: one expedition's scene. Low-poly primitives only: no model files, no
 * textures, no fonts, so the scene makes no network requests. Per-frame state lives in refs
 * (ExplorerController); React re-renders only when the map changes.
 */
import { Component, memo, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { BufferGeometry, CanvasTexture, Float32BufferAttribute, MeshStandardMaterial, PCFShadowMap, SRGBColorSpace } from 'three'
import ExplorerController from './ExplorerController.jsx'
import AmazonAtmosphere from './rendering/AmazonAtmosphere.jsx'
import AmazonScenery from './rendering/AmazonScenery.jsx'
import BiomeAtmosphere from './rendering/BiomeAtmosphere.jsx'
import BiomeScatter from './rendering/BiomeScatter.jsx'
import SundarbansScenery from './rendering/SundarbansScenery.jsx'
import { SURFACE_PROFILES, createBiomeSurfaceTextures } from './rendering/biomeMaterials.js'
import { createTerrainGeometry } from './rendering/terrain.js'
import { createGiantTreeGeometry } from './rendering/giantTree.js'

/* ------------------------------------------------------------------ scenery pieces */

function Mangrove({ scale = 1, rot = 0 }) {
  return (
    <group scale={scale} rotation-y={rot}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.26) * 0.45, 0.35, Math.sin(i * 1.26) * 0.45]} rotation={[Math.sin(i * 1.26) * 0.5, 0, -Math.cos(i * 1.26) * 0.5]}>
          <cylinderGeometry args={[0.05, 0.07, 0.9, 10]} />
          <meshStandardMaterial color="#5a4632" roughness={0.88} />
        </mesh>
      ))}
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.17, 1.6, 14]} />
        <meshStandardMaterial color="#5a4632" roughness={0.88} />
      </mesh>
      {[
        [0, 2.5, 0, 0.78, 0.56, 0.78],
        [0.55, 2.42, 0.05, 0.62, 0.48, 0.62],
        [-0.48, 2.54, 0.18, 0.68, 0.51, 0.66],
        [0.06, 2.48, -0.5, 0.64, 0.48, 0.62],
      ].map(([x, y, z, sx, sy, sz], i) => (
        <mesh key={i} position={[x, y, z]} scale={[sx, sy, sz]} castShadow>
          <sphereGeometry args={[0.95, 18, 12]} />
          <meshStandardMaterial color={i % 2 ? '#477f48' : '#3e7d43'} roughness={0.86} />
        </mesh>
      ))}
    </group>
  )
}

function Pneumatophores({ scale = 1, rot = 0 }) {
  const spikes = useMemo(() => Array.from({ length: 9 }, (_, i) => [Math.cos(i * 2.4) * (0.25 + (i % 3) * 0.25), Math.sin(i * 2.4) * (0.25 + (i % 3) * 0.25), 0.18 + (i % 4) * 0.05]), [])
  return (
    <group scale={scale} rotation-y={rot}>
      {spikes.map(([x, z, h], i) => (
        <mesh key={i} position={[x, h / 2, z]}>
          <coneGeometry args={[0.035, h, 4]} />
          <meshStandardMaterial color="#6b5a43" flatShading />
        </mesh>
      ))}
    </group>
  )
}

function RainTree({ scale = 1, rot = 0 }) {
  const giant = false // the giant tree has its own model (GiantTree below)
  const h = 7
  const crowns = [[0, 0, 0, 1.1, 0.68, 1], [-1.0, -0.18, 0.2, 0.72, 0.66, 0.76], [0.9, -0.12, -0.12, 0.76, 0.68, 0.74]]
  return (
    <group scale={scale} rotation-y={rot}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[giant ? 0.8 : 0.35, giant ? 1.2 : 0.5, h, 16]} />
        <meshStandardMaterial color="#6a4b30" roughness={0.9} />
      </mesh>
      {crowns.map(([x, y, z, sx, sy, sz], i) => (
        <mesh key={i} position={[x, h + 0.6 + y, z]} scale={[sx, sy, sz]} castShadow>
          <sphereGeometry args={[giant ? 3.2 : 2.2, 20, 14]} />
          <meshStandardMaterial color={giant ? (i % 2 ? '#347b3b' : '#2f7a3a') : (i % 2 ? '#43864a' : '#3c8b45')} roughness={0.84} />
        </mesh>
      ))}
    </group>
  )
}

/** The Amazon station's giant tree: one smooth-shaded, vertex-coloured mesh (rendering/giantTree.js). */
function GiantTree() {
  const geometry = useMemo(() => createGiantTreeGeometry(), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.86} metalness={0} side={2} />
    </mesh>
  )
}

/**
 * Canopy mist: a few soft, overlapping puffs whose edges fade to nothing (alpha falls off where
 * the surface turns away from the camera), so it reads as haze rather than a solid low-poly shell.
 * Same footprint as before (≈12 m across, 2.4 m deep). No depth writes; never a collider.
 */
const MIST_PUFFS = [
  [0, 0, 0, 3.1, 1.0, 2.9], [-2.6, 0.25, 1.1, 2.2, 0.8, 2.0], [2.4, -0.15, -0.9, 2.3, 0.85, 2.1],
  [0.8, 0.35, 2.6, 2.0, 0.7, 1.8], [-1.2, -0.2, -2.5, 2.1, 0.75, 1.9], [3.1, 0.3, 1.9, 1.5, 0.6, 1.4], [-3.2, 0.1, -1.6, 1.5, 0.6, 1.4],
]
function MistCloud() {
  const material = useMemo(() => {
    const m = new MeshStandardMaterial({ color: '#f1f5ef', roughness: 1, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false })
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        '#include <dithering_fragment>\ngl_FragColor.a *= pow( clamp( abs( dot( normalize( vNormal ), normalize( -vViewPosition ) ) ), 0.0, 1.0 ), 1.8 );',
      )
    }
    m.customProgramCacheKey = () => 'wx-soft-mist'
    return m
  }, [])
  useEffect(() => () => material.dispose(), [material])
  return (
    <group>
      {MIST_PUFFS.map(([x, y, z, sx, sy, sz], i) => (
        <mesh key={i} position={[x, y, z]} scale={[sx, sy, sz]} material={material} renderOrder={2}>
          <sphereGeometry args={[1, 28, 18]} />
        </mesh>
      ))}
    </group>
  )
}

/** Station wave tank: a framed glass tank holding silty water (the 2 × 0.7 × 0.8 m box is its collider). */
function WaveTank() {
  return (
    <group>
      <mesh position={[0, 0.35, 0]} userData={{ isCollider: true, collisionKind: 'box' }} renderOrder={1}>
        <boxGeometry args={[2, 0.7, 0.8]} />
        <meshStandardMaterial color="#dbe9ea" transparent opacity={0.22} roughness={0.08} metalness={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.23, 0]}>
        <boxGeometry args={[1.94, 0.42, 0.74]} />
        <meshStandardMaterial color="#56705f" transparent opacity={0.78} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[2.08, 0.06, 0.88]} />
        <meshStandardMaterial color="#6d5137" roughness={0.85} />
      </mesh>
      {[[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]].map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, 0.37, z]}>
          <boxGeometry args={[0.05, 0.68, 0.05]} />
          <meshStandardMaterial color="#6d5137" roughness={0.85} />
        </mesh>
      ))}
      {[-0.4, 0.4].map((z) => (
        <mesh key={z} position={[0, 0.71, z]}>
          <boxGeometry args={[2.05, 0.04, 0.05]} />
          <meshStandardMaterial color="#6d5137" roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

function Fern({ scale = 1, rot = 0 }) {
  return (
    <group scale={scale} rotation-y={rot}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.57) * 0.3, 0.25, Math.sin(i * 1.57) * 0.3]} rotation={[Math.sin(i * 1.57) * 0.7, 0, -Math.cos(i * 1.57) * 0.7]}>
          <coneGeometry args={[0.18, 0.8, 10]} />
          <meshStandardMaterial color="#4d9a4a" roughness={0.88} />
        </mesh>
      ))}
    </group>
  )
}

function Stump({ scale = 1 }) {
  return (
    <mesh position={[0, 0.25 * scale, 0]} scale={scale}>
      <cylinderGeometry args={[0.45, 0.55, 0.5, 14]} />
      <meshStandardMaterial color="#8a6a45" roughness={0.93} />
    </mesh>
  )
}

function Rock({ scale = 1, rot = 0 }) {
  return (
    <mesh position={[0, 0.4 * scale, 0]} scale={[scale * 1.2, scale * 0.8, scale]} rotation-y={rot}>
      <icosahedronGeometry args={[0.8, 2]} />
      <meshStandardMaterial color="#9a7a55" roughness={0.96} />
    </mesh>
  )
}

function Dune({ scale = 1 }) {
  return (
    <mesh position={[0, -0.2, 0]} scale={[scale * 5, scale * 1.6, scale * 3.5]}>
      <sphereGeometry args={[1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#e6c07e" roughness={0.98} />
    </mesh>
  )
}

function Palm({ scale = 1 }) {
  return (
    <group scale={scale}>
      <mesh position={[0.2, 2, 0]} rotation-z={-0.1}>
        <cylinderGeometry args={[0.14, 0.2, 4, 12]} />
        <meshStandardMaterial color="#8b6b44" roughness={0.9} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[0.4 + Math.cos(i * 1.05) * 0.8, 3.9, Math.sin(i * 1.05) * 0.8]} rotation={[Math.sin(i * 1.05) * 0.9, i * 1.05, -Math.cos(i * 1.05) * 0.9]}>
          <boxGeometry args={[0.25, 0.05, 1.6]} />
          <meshStandardMaterial color="#4f9a3e" roughness={0.88} />
        </mesh>
      ))}
    </group>
  )
}

function Camel({ rot = 0 }) {
  const fur = '#c99a5b'
  return (
    <group rotation-y={rot}>
      <mesh position={[0, 1.3, 0]} scale={[0.6, 0.55, 1.3]}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial color={fur} flatShading /></mesh>
      <mesh position={[0, 1.95, -0.1]} scale={[0.45, 0.45, 0.55]}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial color={fur} flatShading /></mesh>
      <mesh position={[0, 2.0, 1.2]} rotation-x={-0.6}><cylinderGeometry args={[0.13, 0.17, 1.2, 5]} /><meshStandardMaterial color={fur} flatShading /></mesh>
      <mesh position={[0, 2.5, 1.65]} scale={[0.22, 0.2, 0.4]}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial color={fur} flatShading /></mesh>
      {[[-0.3, -0.7], [0.3, -0.7], [-0.3, 0.7], [0.3, 0.7]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.5, z]}><cylinderGeometry args={[0.08, 0.1, 1, 4]} /><meshStandardMaterial color={fur} flatShading /></mesh>
      ))}
    </group>
  )
}

function Well() {
  return (
    <group>
      <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.8, 0.9, 0.8, 8, 1, true]} /><meshStandardMaterial color="#b49470" flatShading side={2} /></mesh>
      <mesh position={[0, 0.35, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.7, 8]} /><meshStandardMaterial color="#2c5c7a" /></mesh>
      <mesh position={[0, 1.5, 0]}><boxGeometry args={[1.8, 0.1, 0.1]} /><meshStandardMaterial color="#7b5a3a" /></mesh>
    </group>
  )
}

function Board({ color = '#f4efe6', w = 1.4, h = 0.9 }) {
  return (
    <group>
      <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.05, 0.05, 1.2, 4]} /><meshStandardMaterial color="#6b4d33" /></mesh>
      <mesh position={[0, 1.4, 0]}><boxGeometry args={[w, h, 0.08]} /><meshStandardMaterial color={color} /></mesh>
    </group>
  )
}

function Flat({ color, w, d, opacity = 1 }) {
  return (
    <mesh rotation-x={-Math.PI / 2}>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  )
}

/** Sundarbans prop types drawn instanced by SundarbansScenery instead of one mesh per part. */
const SUNDARBANS_INSTANCED_PROPS = new Set(['fern', 'pneumatophores', 'log'])

/** Station 1 dressing: a small winding tidal creek set into a wet mud bed. */
function createCreekGeometry() {
  const positions = []
  const colors = []
  const indices = []
  const steps = 24
  // linear-space vertex colours: dark wet mud bed, olive water
  const bed = [0.12, 0.092, 0.064]
  const water = [0.06, 0.085, 0.055]
  const shine = [0.1, 0.13, 0.085]
  for (const [half, y, inner, outer] of [[0.62, 0.006, bed, bed], [0.3, 0.014, water, shine]]) {
    const start = positions.length / 3
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps
      const x = -2.6 + t * 5.2
      const z = Math.sin(t * Math.PI * 2.2) * 0.38
      const dz = Math.cos(t * Math.PI * 2.2) * 0.38 * Math.PI * 2.2 / 5.2
      const len = Math.hypot(1, dz)
      const nx = -dz / len
      const nz = 1 / len
      const taper = half * (0.55 + Math.sin(t * Math.PI) * 0.45) * (1 + Math.sin(i * 1.7) * 0.08)
      positions.push(x - nx * taper, y, z - nz * taper, x + nx * taper, y, z + nz * taper)
      colors.push(...inner, ...outer)
      if (i > 0) {
        const c = start + i * 2
        indices.push(c - 2, c, c - 1, c - 1, c, c + 1)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function TidalChannelModel() {
  const geometry = useMemo(() => createCreekGeometry(), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.35} side={2} />
    </mesh>
  )
}

function PropView({ prop }) {
  const { type, scale = 1, rot = 0 } = prop
  let body = null
  switch (type) {
    case 'mangrove': body = <Mangrove scale={scale} rot={rot} />; break
    case 'pneumatophores': body = <Pneumatophores scale={scale} rot={rot} />; break
    case 'rainTree': body = <RainTree scale={scale} rot={rot} />; break
    case 'giantTree': body = <GiantTree />; break
    case 'fern': body = <Fern scale={scale} rot={rot} />; break
    case 'stump': body = <Stump scale={scale} />; break
    case 'rock': body = <Rock scale={scale} rot={rot} />; break
    case 'dune': body = <Dune scale={scale} />; break
    case 'palm': body = <Palm scale={scale} />; break
    case 'camel': body = <Camel rot={rot} />; break
    case 'well': body = <Well />; break
    case 'channels': body = <TidalChannelModel />; break
    case 'pawPrints': body = (
      <group rotation-y={rot}>
        {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[(i % 2) * 0.35, 0, i * 0.7]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.14, 6]} /><meshStandardMaterial color="#3d2f22" /></mesh>)}
      </group>
    ); break
    case 'leafLitter': body = <Flat color="#8a5a2b" w={2.2} d={2.2} />; break
    case 'quadrat': body = <Flat color="#f4efe6" w={1.6} d={1.6} opacity={0.45} />; break
    case 'pool': body = <Flat color="#3b86a8" w={3} d={2} />; break
    case 'dryRiver': body = <group rotation-y={rot}><Flat color="#8d7150" w={1.6} d={9} /></group>; break
    case 'saltMeter': case 'lightMeter': case 'surveyMap': case 'timeline': body = <Board color={type === 'surveyMap' ? '#ffe4a3' : '#f4efe6'} />; break
    case 'leafBag': body = <mesh position={[0, 0.5, 0]} userData={{ isCollider: true, collisionKind: 'box' }}><boxGeometry args={[0.35, 0.5, 0.2]} /><meshStandardMaterial color="#dff3ff" transparent opacity={0.6} /></mesh>; break
    case 'waveTank': body = <WaveTank />; break
    case 'crate': case 'woodenCrate': body = <mesh position={[0, 0.3, 0]} userData={{ isCollider: true, collisionKind: 'box' }}><boxGeometry args={[0.7, 0.6, 0.6]} /><meshStandardMaterial color="#805b38" /></mesh>; break
    case 'mist': body = <MistCloud />; break
    case 'village': body = (
      <group>
        {[0, 1, 2].map((i) => (
          <group key={i} position={[i * 2.4, 0.6, i % 2]}>
            <mesh><boxGeometry args={[1.6, 1.2, 1.4]} /><meshStandardMaterial color="#d7b98a" flatShading /></mesh>
            <mesh position={[0, 0.95, 0]} rotation-y={Math.PI / 4}><coneGeometry args={[1.3, 0.8, 4]} /><meshStandardMaterial color="#8a5a3a" flatShading /></mesh>
          </group>
        ))}
      </group>
    ); break
    default: body = null
  }
  return <group position={[prop.x, prop.y ?? 0, prop.z]}>{body}</group>
}

/* ------------------------------------------------------------------ ground, water, stations */

function Ground({ biome, dark }) {
  const textures = useMemo(() => createBiomeSurfaceTextures(biome.id), [biome.id])
  const profile = SURFACE_PROFILES[biome.id]
  const geometry = useMemo(() => biome.discs.map((disc) => createTerrainGeometry(disc, biome.id)), [biome])
  useEffect(() => () => {
    geometry.forEach((value) => value.dispose())
    Object.values(textures).forEach((value) => value.dispose())
  }, [geometry, textures])

  return biome.discs.map((disc, index) => (
    <mesh key={disc.id} geometry={geometry[index]} position={[disc.x, disc.top, disc.z]} receiveShadow>
      <meshStandardMaterial
        color={biome.looks[disc.look] ?? '#8a7a5a'}
        map={textures.map}
        normalMap={textures.normalMap}
        normalScale={[profile.normalScale, profile.normalScale]}
        roughnessMap={textures.roughnessMap}
        aoMap={textures.aoMap}
        aoMapIntensity={0.75}
        roughness={Math.max(0.68, profile.roughness - (disc.look === 'mud' ? 0.18 : 0))}
        metalness={profile.metalness}
        emissive={dark ? '#111111' : '#000000'}
      />
    </mesh>
  ))
}

function Water({ water, dark }) {
  if (!water) return null
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, water.y, 0]}>
      <planeGeometry args={[160, 160]} />
      <meshStandardMaterial color={dark ? water.dark : water.color} roughness={0.4} metalness={0.1} />
    </mesh>
  )
}

/** A station name drawn into a small canvas texture (no DOM overlay, no font download). */
function Label({ text, background }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 64
    const g = c.getContext('2d')
    if (g) {
      g.fillStyle = background
      g.strokeStyle = '#1b2a49'
      g.lineWidth = 6
      g.beginPath()
      g.roundRect(4, 4, 248, 56, 28)
      g.fill()
      g.stroke()
      g.fillStyle = '#1b2a49'
      g.font = '800 30px system-ui, sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(text, 128, 34)
    }
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    return t
  }, [text, background])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <sprite position={[0, 2.8, 0]} scale={[2, 0.5, 1]} renderOrder={2}>
      <spriteMaterial map={texture} depthTest depthWrite={false} />
    </sprite>
  )
}

function StationMarker({ station, top, state, label }) {
  const color = state === 'complete' ? '#4fc58d' : state === 'near' ? '#ffc93c' : '#ff8a5c'
  return (
    <group position={[station.x, top, station.z]}>
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2} renderOrder={1}>
        <ringGeometry args={[0.9, 1.15, 24]} />
        <meshBasicMaterial color={color} depthTest depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.1, 0]} renderOrder={1}>
        <cylinderGeometry args={[0.08, 0.08, 2.2, 6]} />
        <meshStandardMaterial color="#f4efe6" depthTest depthWrite />
      </mesh>
      <mesh position={[0.35, 1.9, 0]} renderOrder={1}>
        <boxGeometry args={[0.7, 0.45, 0.05]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} depthTest depthWrite />
      </mesh>
      <Label text={label} background={state === 'complete' ? '#c9f2dc' : state === 'near' ? '#ffe9a8' : '#ffffff'} />
    </group>
  )
}

/* ------------------------------------------------------------------ canvas */

class CanvasBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { console.warn('World Explorer: 3D unavailable.', error?.message) }
  render() { return this.state.failed ? <p className="wx-no3d" role="status">{this.props.message}</p> : this.props.children }
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function ExpeditionCanvas({ biome, dark, inputRef, activeRef, teleportRef, onNear, near, completed, reducedMotion, label, noWebglMessage, stationLabel, paused }) {
  const supported = useMemo(() => hasWebGL(), [])
  const discTops = useMemo(() => Object.fromEntries(biome.discs.map((d) => [d.id, d.top])), [biome])
  if (!supported) return <p className="wx-no3d" role="status">{noWebglMessage}</p>
  const sky = dark ? biome.sky.dark : biome.sky
  return (
    <CanvasBoundary message={noWebglMessage}>
      <Canvas
        className="wx-canvas"
        aria-label={label}
        role="img"
        dpr={[1, 1.5]}
        shadows
        frameloop={paused ? 'never' : 'always'}
        gl={{ antialias: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => { gl.shadowMap.type = PCFShadowMap }}
        camera={{ position: [0, 2.4, 4], fov: 50, near: 0.1, far: 320 }}
      >
        <color attach="background" args={[sky.top]} />
        <BiomeAtmosphere biome={biome} dark={dark} />
        {biome.id === 'amazon' && <AmazonAtmosphere />}
        {biome.id === 'sundarbans'
          ? <SundarbansScenery biome={biome} dark={dark} />
          : biome.id === 'amazon'
            ? (
              <>
                <Water water={biome.water} dark={dark} />
                <Ground biome={biome} dark={dark} />
                <AmazonScenery biome={biome} />
              </>
            )
          : (
            <>
              <Water water={biome.water} dark={dark} />
              <Ground biome={biome} dark={dark} />
              <BiomeScatter biome={biome} />
            </>
          )}
        {biome.props.map((p, i) => (biome.id === 'sundarbans' && SUNDARBANS_INSTANCED_PROPS.has(p.type) ? null : <PropView key={i} prop={p} />))}
        {biome.stations.map((s) => (
          <StationMarker
            key={s.n}
            station={s}
            top={discTops[s.disc]}
            state={completed.includes(s.n) ? 'complete' : near === s.n ? 'near' : 'open'}
            label={stationLabel(s.n)}
          />
        ))}
        <ExplorerController key={biome.id} biome={biome} inputRef={inputRef} activeRef={activeRef} teleportRef={teleportRef} onNear={onNear} reducedMotion={reducedMotion} />
      </Canvas>
    </CanvasBoundary>
  )
}

export default memo(ExpeditionCanvas)
