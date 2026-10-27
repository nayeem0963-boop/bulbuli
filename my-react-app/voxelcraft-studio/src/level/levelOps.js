import { BLOCK_TYPES } from './blockTypes.js'
import { MAX_BLOCKS, cellKey, deriveMarkers, inBounds, newBlockId } from './levelSchema.js'

/**
 * Pure, immutable operations on a LevelState. The editor reducer, the placement controller
 * (to decide which sound to play before dispatching) and future server code all share them.
 */

// Occupancy index per blocks array: built once per state change (O(n)), then O(1) lookups.
// WeakMap keyed by the array itself, so old indexes are garbage-collected with old states.
const indexCache = new WeakMap()
export function occupancy(blocks) {
  let index = indexCache.get(blocks)
  if (!index) {
    index = new Map()
    for (const b of blocks) index.set(cellKey(b.x, b.y, b.z), b)
    indexCache.set(blocks, index)
  }
  return index
}

export const blockAt = (level, { x, y, z }) => occupancy(level.blocks).get(cellKey(x, y, z)) ?? null

/**
 * Can a block of `type` go in `cell`?
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function canPlace(level, cell, type) {
  if (!BLOCK_TYPES[type]) return { ok: false, reason: 'Unknown block type' }
  if (!inBounds(cell)) return { ok: false, reason: 'Outside the build area' }
  if (blockAt(level, cell)) return { ok: false, reason: 'That spot is taken' }
  // Unique blocks move instead of adding, so they never hit the block cap.
  if (!BLOCK_TYPES[type].unique && level.blocks.length >= MAX_BLOCKS) {
    return { ok: false, reason: `Block limit reached (${MAX_BLOCKS})` }
  }
  return { ok: true }
}

const touch = (level, blocks) => ({
  ...level,
  blocks,
  ...deriveMarkers(blocks),
  updatedAt: new Date().toISOString(),
})

/** Adds a block. Unique types (SPAWN, FINISH) replace their previous instance. */
export function addBlock(level, { type, x, y, z, color }) {
  const cell = { x, y, z }
  if (!canPlace(level, cell, type).ok) return level
  const def = BLOCK_TYPES[type]
  const block = { id: newBlockId(), type, x, y, z, color: def.paintable && color ? color : def.defaultColor }
  const kept = def.unique ? level.blocks.filter((b) => b.type !== type) : level.blocks
  return touch(level, [...kept, block])
}

export function removeBlockAt(level, cell) {
  const target = blockAt(level, cell)
  if (!target) return level
  return touch(level, level.blocks.filter((b) => b !== target))
}

export function clearBlocks(level) {
  return level.blocks.length ? touch(level, []) : level
}

/** Counts per block type, for the side panel. */
export function countByType(blocks) {
  const counts = Object.fromEntries(Object.keys(BLOCK_TYPES).map((t) => [t, 0]))
  for (const b of blocks) counts[b.type] += 1
  return counts
}
