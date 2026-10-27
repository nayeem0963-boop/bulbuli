/**
 * Block type registry: the single source of truth for what each block is, how it looks,
 * and how gameplay will treat it. Rendering, the hotbar, validation and (later) the physics
 * runtime all read from here, so adding a block type means adding one entry.
 */

export const BLOCK = Object.freeze({
  PLATFORM: 'PLATFORM',
  BOUNCE: 'BOUNCE',
  LAVA: 'LAVA',
  SPAWN: 'SPAWN',
  FINISH: 'FINISH',
})

/**
 * @typedef {Object} BlockTypeDef
 * @property {string} id
 * @property {string} label
 * @property {string} hint          one-line description for the hotbar tooltip
 * @property {string} hotkey        number key that selects it
 * @property {string} defaultColor  hex colour new blocks get
 * @property {boolean} paintable    whether the colour picker applies. Hazards and goals keep
 *                                  their signature colour so players can always read them.
 * @property {boolean} unique       only one per level (placing another moves it)
 * @property {Object} physics       gameplay properties for the future play mode
 */

/** @type {Record<string, BlockTypeDef>} */
export const BLOCK_TYPES = {
  [BLOCK.PLATFORM]: {
    id: BLOCK.PLATFORM,
    label: 'Platform',
    hint: 'Solid ground to run and jump on',
    hotkey: '1',
    defaultColor: '#64748b',
    paintable: true,
    unique: false,
    physics: { solid: true, friction: 0.8, restitution: 0 },
  },
  [BLOCK.BOUNCE]: {
    id: BLOCK.BOUNCE,
    label: 'Bounce',
    hint: 'Launches players high into the air',
    hotkey: '2',
    defaultColor: '#22c55e',
    paintable: false,
    unique: false,
    // restitution > 1: players leave faster than they landed (capped by the runtime).
    physics: { solid: true, friction: 0.4, restitution: 1.8, launchVelocity: 14 },
  },
  [BLOCK.LAVA]: {
    id: BLOCK.LAVA,
    label: 'Lava',
    hint: 'Touch it and you respawn',
    hotkey: '3',
    defaultColor: '#ef4444',
    paintable: false,
    unique: false,
    physics: { solid: true, friction: 0.8, restitution: 0, hazard: 'respawn' },
  },
  [BLOCK.SPAWN]: {
    id: BLOCK.SPAWN,
    label: 'Spawn',
    hint: 'Where players start (one per level)',
    hotkey: '4',
    defaultColor: '#3b82f6',
    paintable: false,
    unique: true,
    physics: { solid: true, friction: 0.8, restitution: 0 },
  },
  [BLOCK.FINISH]: {
    id: BLOCK.FINISH,
    label: 'Finish',
    hint: 'Reach the gold ring to win (one per level)',
    hotkey: '5',
    defaultColor: '#fbbf24',
    paintable: false,
    unique: true,
    physics: { solid: false, trigger: 'finish' },
  },
}

export const BLOCK_TYPE_LIST = Object.values(BLOCK_TYPES)

export const isBlockType = (t) => Object.prototype.hasOwnProperty.call(BLOCK_TYPES, t)

/** Preset swatches for paintable blocks (the hex picker allows any colour). */
export const PAINT_PRESETS = [
  '#64748b', '#94a3b8', '#f8fafc', '#6366f1',
  '#818cf8', '#a855f7', '#c084fc', '#ec4899',
  '#10b981', '#06b6d4', '#f59e0b', '#1e293b',
]
