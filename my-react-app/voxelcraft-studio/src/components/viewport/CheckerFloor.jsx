import { memo, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { COLORS, GRID_SIZE, HALF_GRID } from './sceneConfig.js'

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** One texel per cell, sampled with NearestFilter: crisp checkers at any zoom, ~1.6 KB of VRAM. */
function createCheckerTexture(size, colorA, colorB) {
  const a = hexToRgb(colorA)
  const b = hexToRgb(colorB)
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, bl] = (x + y) % 2 === 0 ? a : b
      const i = (y * size + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = bl
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.colorSpace = THREE.SRGBColorSpace // bytes are sRGB hex values
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

/** Square outline of the build area, as line segments. */
function createFrameGeometry(half) {
  const p = [
    [-half, 0, -half], [half, 0, -half],
    [half, 0, -half], [half, 0, half],
    [half, 0, half], [-half, 0, half],
    [-half, 0, half], [-half, 0, -half],
  ].flat()
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  return geo
}

const noRaycast = () => null

/**
 * 20x20 checkerboard ground. It doesn't decide what clicks do: it forwards pointer events
 * as (event, null), where null means "the floor, not a block", to the placement controller.
 */
function CheckerFloor({ handlers }) {
  const texture = useMemo(() => createCheckerTexture(GRID_SIZE, COLORS.tileA, COLORS.tileB), [])
  const frame = useMemo(() => createFrameGeometry(HALF_GRID), [])
  useEffect(
    () => () => {
      texture.dispose()
      frame.dispose()
    },
    [texture, frame],
  )

  return (
    <group>
      {/* Ground plane: receives shadows, shows the checkerboard, is the raycast target for y = 0. */}
      <mesh
        rotation-x={-Math.PI / 2}
        receiveShadow
        onPointerMove={(e) => handlers.onPointerMove(e, null)}
        onPointerOut={handlers.onPointerOut}
        onClick={(e) => handlers.onClick(e, null)}
        onContextMenu={(e) => handlers.onContextMenu(e, null)}
      >
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
        <meshStandardMaterial map={texture} roughness={0.92} metalness={0.05} />
      </mesh>

      {/* Thin grid lines just above the plane to avoid z-fighting. */}
      <gridHelper
        args={[GRID_SIZE, GRID_SIZE, COLORS.gridAxis, COLORS.gridLine]}
        position-y={0.002}
        raycast={noRaycast}
        material-transparent
        material-opacity={0.55}
        material-depthWrite={false}
      />

      {/* Glowing frame around the build area. */}
      <lineSegments geometry={frame} position-y={0.004} raycast={noRaycast}>
        <lineBasicMaterial color={COLORS.gridAxis} toneMapped={false} />
      </lineSegments>
    </group>
  )
}

export default memo(CheckerFloor)
