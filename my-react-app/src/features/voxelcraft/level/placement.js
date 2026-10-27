import { GRID_MAX, GRID_MIN } from './levelSchema.js'
import { blockAt, canPlace } from './levelOps.js'

/**
 * Pure placement maths: turns a raycast hit into "what would a click do here?".
 * Kept free of three.js and React so it can be unit-tested and reused by touch/gamepad input.
 *
 * @typedef {{ x: number, y: number, z: number }} Vec3
 * @typedef {{ block: object|null, normal: Vec3|null, point: Vec3, erase: boolean }} Hit
 *   block  = the block that was hit, or null for the floor
 *   normal = face normal of the hit (world space), point = world-space hit point
 * @typedef {{ action: 'place'|'erase', cell: Vec3, valid: boolean, reason?: string }} Target
 */

/** Snaps a face normal to its dominant axis: (0.1, 0.98, -0.2) → (0, 1, 0). */
export function axisNormal(n) {
  const ax = Math.abs(n.x)
  const ay = Math.abs(n.y)
  const az = Math.abs(n.z)
  if (ay >= ax && ay >= az) return { x: 0, y: Math.sign(n.y) || 1, z: 0 }
  if (ax >= az) return { x: Math.sign(n.x), y: 0, z: 0 }
  return { x: 0, y: 0, z: Math.sign(n.z) }
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/** Floor hit → the cell resting on the floor under the pointer (clamped: edges hit 10.0). */
export const floorCell = (point) => ({
  x: clamp(Math.floor(point.x), GRID_MIN, GRID_MAX),
  y: 0,
  z: clamp(Math.floor(point.z), GRID_MIN, GRID_MAX),
})

/**
 * @param {Hit} hit
 * @param {{ mode: 'build'|'erase', blockType: string }} tool
 * @param {import('./levelSchema.js').LevelState} level
 * @returns {Target|null} null = nothing to do here (e.g. erasing the bare floor)
 */
export function resolveTarget(hit, tool, level) {
  // A stale hit (that block was just removed or undone) resolves to nothing.
  if (hit.block && blockAt(level, hit.block) !== hit.block) return null

  if (tool.mode === 'erase' || hit.erase) {
    if (!hit.block) return null
    return { action: 'erase', cell: { x: hit.block.x, y: hit.block.y, z: hit.block.z }, valid: true }
  }

  let cell
  if (hit.block) {
    // Hit a block: the new block goes on the face that was clicked.
    const n = hit.normal ?? { x: 0, y: 1, z: 0 }
    cell = { x: hit.block.x + n.x, y: hit.block.y + n.y, z: hit.block.z + n.z }
  } else {
    cell = floorCell(hit.point)
  }
  const check = canPlace(level, cell, tool.blockType)
  return check.ok
    ? { action: 'place', cell, valid: true }
    : { action: 'place', cell, valid: false, reason: check.reason }
}
