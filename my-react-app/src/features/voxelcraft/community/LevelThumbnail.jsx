import { memo, useMemo } from 'react'
import { BLOCK, BLOCK_TYPES } from '../level/blockTypes.js'
import { cellKey } from '../level/levelSchema.js'

/**
 * Isometric SVG thumbnail drawn straight from block data: no WebGL, no image files, instant.
 * It's the card's placeholder while the live 3D preview loads, and the fallback when WebGL
 * isn't available. Hidden faces are culled, and unit cubes painted in x+y+z order are a
 * correct back-to-front order for this camera.
 */
const COS30 = Math.cos(Math.PI / 6)
const proj = (x, y, z) => [(x - z) * COS30, (x + z) * 0.5 - y]
const pts = (list) => list.map(([x, y, z]) => proj(x, y, z).map((v) => v.toFixed(2)).join(',')).join(' ')

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * f)))
  return `rgb(${c.join(',')})`
}

function buildFaces(blocks) {
  const occupied = new Set(blocks.map((b) => cellKey(b.x, b.y, b.z)))
  const has = (x, y, z) => occupied.has(cellKey(x, y, z))
  const faces = []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const grow = (x, y, z) => {
    const [sx, sy] = proj(x, y, z)
    minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy)
  }
  const sorted = [...blocks].sort((a, b) => a.x + a.y + a.z - (b.x + b.y + b.z))
  for (const b of sorted) {
    const { x, y, z } = b
    grow(x, y + 1, z); grow(x + 1, y, z + 1); grow(x + 1, y + 1, z); grow(x, y + 1, z + 1); grow(x, y, z + 1); grow(x + 1, y, z)
    if (b.type === BLOCK.FINISH) {
      const [cx, cy] = proj(x + 0.5, y + 0.55, z + 0.5)
      faces.push({ ring: true, cx, cy, key: b.id })
      continue
    }
    const h = b.type === BLOCK.SPAWN ? 0.3 : 1
    const color = b.type === BLOCK.PLATFORM ? b.color : BLOCK_TYPES[b.type].defaultColor
    const glow = b.type === BLOCK.LAVA || b.type === BLOCK.BOUNCE ? 1.25 : 1
    if (h < 1 || !has(x, y + 1, z)) faces.push({ d: pts([[x, y + h, z], [x + 1, y + h, z], [x + 1, y + h, z + 1], [x, y + h, z + 1]]), fill: shade(color, 1.15 * glow), key: `${b.id}t` })
    if (!has(x + 1, y, z)) faces.push({ d: pts([[x + 1, y, z], [x + 1, y + h, z], [x + 1, y + h, z + 1], [x + 1, y, z + 1]]), fill: shade(color, 0.82 * glow), key: `${b.id}r` })
    if (!has(x, y, z + 1)) faces.push({ d: pts([[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + h, z + 1], [x, y + h, z + 1]]), fill: shade(color, 0.62 * glow), key: `${b.id}f` })
  }
  const pad = 1.2
  return { faces, viewBox: `${(minX - pad).toFixed(2)} ${(minY - pad).toFixed(2)} ${(maxX - minX + pad * 2).toFixed(2)} ${(maxY - minY + pad * 2).toFixed(2)}` }
}

function LevelThumbnail({ blocks, title, className = '' }) {
  const { faces, viewBox } = useMemo(() => buildFaces(blocks), [blocks])
  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Preview of ${title}`} className={`bg-[radial-gradient(circle_at_50%_40%,#1e1b4b,#0b1222_70%)] ${className}`}>
      {faces.map((f) =>
        f.ring ? (
          <ellipse key={f.key} cx={f.cx} cy={f.cy} rx="0.32" ry="0.42" fill="none" stroke="#fbbf24" strokeWidth="0.1" />
        ) : (
          <polygon key={f.key} points={f.d} fill={f.fill} stroke="rgba(15,23,42,0.35)" strokeWidth="0.03" strokeLinejoin="round" />
        ),
      )}
    </svg>
  )
}

export default memo(LevelThumbnail)
