/**
 * Draws the Sahara's station landmarks (rendering/saharaLandmarks.js): date palms, the oasis pool,
 * the well, the resting camel and the dry river bed. One vertex-coloured mesh each (the pool and
 * the bed have a second, see-through layer that fades into the ground). No model files, no image
 * files: the one texture, the cracks in the dry clay, is drawn into a canvas here.
 */
import { useEffect, useMemo } from 'react'
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import {
  crackPattern, createCamelGeometry, createDatePalmGeometry, createDryRiverGeometry, createDryRiverPebblesGeometry,
  createOasisPlantsGeometry, createOasisShoreGeometry, createOasisWaterGeometry, createWellGeometry,
} from './saharaLandmarks.js'
import { createFortGeometry, createPackCamelGeometry, createStallGeometry, createTraderGeometry } from './saharaCaravan.js'

/** Builds each geometry once per mount and frees it on unmount. */
function useGeometries(build, deps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometries = useMemo(build, deps)
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries])
  return geometries
}

/** Opaque, matte, vertex-coloured, lit from both sides (fronds and blades are single sheets). */
function Solid({ geometry, roughness = 0.9, shadow = true }) {
  return (
    <mesh geometry={geometry} castShadow={shadow} receiveShadow>
      <meshStandardMaterial vertexColors roughness={roughness} metalness={0} side={2} />
    </mesh>
  )
}

/** A see-through layer lying on the ground: its vertex colours carry the fade at its edges. */
function Lying({ geometry, map = null, order = 1 }) {
  return (
    <mesh geometry={geometry} receiveShadow renderOrder={order}>
      <meshStandardMaterial vertexColors transparent depthWrite={false} side={2} roughness={0.95} metalness={0} map={map} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
    </mesh>
  )
}

export function DatePalm({ scale = 1, seed = 1 }) {
  const [geometry] = useGeometries(() => [createDatePalmGeometry(seed)], [seed])
  return <group scale={scale}><Solid geometry={geometry} roughness={0.86} /></group>
}

export function Well() {
  const [geometry] = useGeometries(() => [createWellGeometry()], [])
  return <Solid geometry={geometry} roughness={0.92} />
}

export function RestingCamel({ rot = 0 }) {
  const [geometry] = useGeometries(() => [createCamelGeometry()], [])
  return <group rotation-y={rot}><Solid geometry={geometry} roughness={0.95} /></group>
}

export function OasisPool() {
  const [shore, water, plants] = useGeometries(() => [createOasisShoreGeometry(), createOasisWaterGeometry(), createOasisPlantsGeometry()], [])
  return (
    <group>
      <Lying geometry={shore} />
      <mesh geometry={water} receiveShadow renderOrder={2}>
        {/* still water: smooth enough to catch the sun, never a mirror */}
        <meshStandardMaterial vertexColors roughness={0.16} metalness={0} side={2} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
      </mesh>
      <Solid geometry={plants} roughness={0.85} shadow={false} />
    </group>
  )
}

function createCrackTexture() {
  const size = 128
  const pattern = crackPattern(size)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  const image = context.createImageData(size, size)
  for (let i = 0; i < pattern.length; i += 1) {
    const value = Math.round(pattern[i] * 255)
    image.data[i * 4] = value
    image.data[i * 4 + 1] = value
    image.data[i * 4 + 2] = value
    image.data[i * 4 + 3] = 255
  }
  context.putImageData(image, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export function DryRiverBed({ rot = 0 }) {
  const [bed, pebbles] = useGeometries(() => [createDryRiverGeometry(), createDryRiverPebblesGeometry()], [])
  const cracks = useMemo(() => createCrackTexture(), [])
  useEffect(() => () => cracks.dispose(), [cracks])
  return (
    <group rotation-y={rot}>
      <Lying geometry={bed} map={cracks} />
      <Solid geometry={pebbles} roughness={0.8} />
    </group>
  )
}

const DECOR_GEOMETRY = {
  packCamel: (piece) => createPackCamelGeometry(piece.seed),
  trader: (piece) => createTraderGeometry(piece.seed, { staff: Boolean(piece.staff) }),
  stall: (piece) => createStallGeometry(piece.seed),
  fort: () => createFortGeometry(),
}

function DecorPiece({ piece }) {
  const [geometry] = useGeometries(() => [DECOR_GEOMETRY[piece.type](piece)], [piece])
  // the fort is far out in the haze: it takes no part in the shadow map
  return <Solid geometry={geometry} roughness={0.92} shadow={piece.type !== 'fort'} />
}

/** Life round the oasis (biomes/sahara.js `decor`): the caravan, the stalls, more palms, the fort. */
export function SaharaDecor({ decor }) {
  return decor.map((piece, index) => (
    <group key={index} position={[piece.x, piece.y ?? 0, piece.z]} rotation-y={piece.rot ?? 0}>
      {piece.type === 'datePalm' ? <DatePalm scale={piece.scale} seed={piece.seed} /> : <DecorPiece piece={piece} />}
    </group>
  ))
}
