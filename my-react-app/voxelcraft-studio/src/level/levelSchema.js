import { BLOCK, BLOCK_TYPES, isBlockType } from './blockTypes.js'

/**
 * Level data schema. A LevelState is plain JSON: it is what gets saved, published, shared and
 * loaded by the play mode. Coordinates are integer grid cells:
 *   x, z  in [GRID_MIN, GRID_MAX]  (the 20x20 plot, -10..9)
 *   y     in [0, MAX_HEIGHT - 1]   (0 = resting on the floor)
 *
 * @typedef {{ x: number, y: number, z: number }} Cell
 *
 * @typedef {Object} Block
 * @property {string} id
 * @property {'PLATFORM'|'BOUNCE'|'LAVA'|'SPAWN'|'FINISH'} type
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {string} color   '#rrggbb'
 *
 * @typedef {Object} LevelState
 * @property {number} schemaVersion
 * @property {string} id
 * @property {string} title
 * @property {string} author
 * @property {Block[]} blocks
 * @property {Cell|null} spawnPoint   cell of the SPAWN block; players appear on top of it
 * @property {Cell|null} finishGate   cell of the FINISH block
 * @property {string} updatedAt       ISO timestamp
 */

export const SCHEMA_VERSION = 1
export const GRID_MIN = -10
export const GRID_MAX = 9
export const MAX_HEIGHT = 16
export const MAX_BLOCKS = 4096
export const TITLE_MAX = 40

export const cellKey = (x, y, z) => `${x},${y},${z}`

export const inBounds = ({ x, y, z }) =>
  Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z) &&
  x >= GRID_MIN && x <= GRID_MAX && z >= GRID_MIN && z <= GRID_MAX && y >= 0 && y < MAX_HEIGHT

const HEX = /^#[0-9a-f]{6}$/i

let idSeq = 0
export const newBlockId = () => `b_${Date.now().toString(36)}${(idSeq++).toString(36)}`
export const newLevelId = () => `lvl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** @returns {LevelState} */
export function createEmptyLevel({ id = newLevelId(), title = 'Untitled Level', author = 'Anonymous' } = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    title,
    author,
    blocks: [],
    spawnPoint: null,
    finishGate: null,
    updatedAt: new Date().toISOString(),
  }
}

/** spawnPoint / finishGate are derived from the SPAWN / FINISH blocks so they can never drift. */
export function deriveMarkers(blocks) {
  let spawnPoint = null
  let finishGate = null
  for (const b of blocks) {
    if (b.type === BLOCK.SPAWN) spawnPoint = { x: b.x, y: b.y, z: b.z }
    else if (b.type === BLOCK.FINISH) finishGate = { x: b.x, y: b.y, z: b.z }
  }
  return { spawnPoint, finishGate }
}

/**
 * Problems that stop a level being published. Empty array = publishable.
 * @param {LevelState} level
 * @returns {string[]}
 */
export function validateLevel(level) {
  const errors = []
  if (!level.title.trim()) errors.push('Give your level a title.')
  if (!level.spawnPoint) errors.push('Place a Spawn block so players know where to start.')
  if (!level.finishGate) errors.push('Place a Finish ring so players can win.')
  if (level.spawnPoint && level.finishGate &&
      cellKey(level.spawnPoint.x, level.spawnPoint.y, level.spawnPoint.z) ===
      cellKey(level.finishGate.x, level.finishGate.y, level.finishGate.z)) {
    errors.push('Spawn and Finish need different spots.')
  }
  return errors
}

/**
 * Turns untrusted JSON (a saved file, an API response) into a valid LevelState, dropping
 * anything malformed: unknown types, bad colours, out-of-bounds or overlapping cells, extra
 * spawns/finishes, and blocks past MAX_BLOCKS. Never throws on bad blocks; throws only if the
 * input isn't an object at all.
 * @returns {{ level: LevelState, dropped: number }}
 */
export function parseLevel(input) {
  if (!input || typeof input !== 'object') throw new TypeError('Level data must be an object')
  const base = createEmptyLevel({
    id: typeof input.id === 'string' && input.id ? input.id : undefined,
    title: typeof input.title === 'string' ? input.title.slice(0, TITLE_MAX) : undefined,
    author: typeof input.author === 'string' ? input.author.slice(0, 32) : undefined,
  })

  const seen = new Set()
  const uniqueSeen = new Set()
  const blocks = []
  const raw = Array.isArray(input.blocks) ? input.blocks : []
  for (const b of raw) {
    if (blocks.length >= MAX_BLOCKS) break
    if (!b || !isBlockType(b.type) || !inBounds(b)) continue
    const key = cellKey(b.x, b.y, b.z)
    if (seen.has(key)) continue
    const def = BLOCK_TYPES[b.type]
    if (def.unique && uniqueSeen.has(b.type)) continue
    seen.add(key)
    if (def.unique) uniqueSeen.add(b.type)
    blocks.push({
      id: typeof b.id === 'string' && b.id ? b.id : newBlockId(),
      type: b.type,
      x: b.x,
      y: b.y,
      z: b.z,
      color: def.paintable && HEX.test(b.color) ? b.color.toLowerCase() : def.defaultColor,
    })
  }

  return {
    level: { ...base, blocks, ...deriveMarkers(blocks) },
    dropped: raw.length - blocks.length,
  }
}
