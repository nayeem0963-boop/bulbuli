/*
 * Customization Vault catalog. Everything is data — the 3D model, trail and
 * wing accessory read these values, so adding an item is just adding an entry.
 * Prices are in energy crystals (banked at the end of each run).
 */

export const Slot = Object.freeze({ SKIN: 'skin', TRAIL: 'trail', WINGS: 'wings' })

export const RARITY = {
  common: { label: 'Common', color: '#a99bd0' },
  rare: { label: 'Rare', color: '#22f3ff' },
  epic: { label: 'Epic', color: '#ff2bd6' },
  legendary: { label: 'Legendary', color: '#ffd23f' },
}

export const SKINS = [
  {
    id: 'skin-classic', slot: Slot.SKIN, name: 'Red-Whiskered', price: 0, rarity: 'common',
    blurb: 'The original bulbul. Magenta crest, red cheeks.',
    colors: { body: '#1b1636', glow: '#7b2bff', belly: '#e9e4ff', crest: '#ff2bd6', cheek: '#ff3355', beak: '#ffd23f', accent: '#22f3ff' },
  },
  {
    id: 'skin-miami', slot: Slot.SKIN, name: 'Miami Nights', price: 60, rarity: 'common',
    blurb: 'Teal body, flamingo crest.',
    colors: { body: '#0f2a3a', glow: '#22f3ff', belly: '#c9fbff', crest: '#ff6ec7', cheek: '#ffd23f', beak: '#ffffff', accent: '#ff6ec7' },
  },
  {
    id: 'skin-sunset', slot: Slot.SKIN, name: 'Outrun Sunset', price: 140, rarity: 'rare',
    blurb: 'Burnt orange into deep violet.',
    colors: { body: '#2a0f2e', glow: '#ff6a2b', belly: '#ffd9b8', crest: '#ffb02b', cheek: '#ff2b6a', beak: '#fff1a8', accent: '#ff6a2b' },
  },
  {
    id: 'skin-mainframe', slot: Slot.SKIN, name: 'Mainframe', price: 220, rarity: 'rare',
    blurb: 'Phosphor green on black glass.',
    colors: { body: '#04140a', glow: '#2bff88', belly: '#b8ffd4', crest: '#2bff88', cheek: '#d4ff2b', beak: '#ffffff', accent: '#2bff88' },
  },
  {
    id: 'skin-chrome', slot: Slot.SKIN, name: 'Liquid Chrome', price: 380, rarity: 'epic',
    blurb: 'Mirror body, white-hot accents.', metallic: true,
    colors: { body: '#c9cfe0', glow: '#7b8cff', belly: '#ffffff', crest: '#ffffff', cheek: '#22f3ff', beak: '#ffd23f', accent: '#ffffff' },
  },
  {
    id: 'skin-void', slot: Slot.SKIN, name: 'Void Walker', price: 600, rarity: 'legendary',
    blurb: 'Absorbs light. Bleeds red neon.',
    colors: { body: '#020005', glow: '#ff0033', belly: '#1a0008', crest: '#ff0033', cheek: '#ff0033', beak: '#ff5577', accent: '#ff0033' },
  },
]

export const TRAILS = [
  {
    id: 'trail-classic', slot: Slot.TRAIL, name: 'Neon Classic', price: 0, rarity: 'common',
    blurb: 'Magenta streak, cyan sparks.',
    ribbon: ['#ff2bd6', '#7b2bff'], wingRibbon: ['#22f3ff', '#ff2bd6'], sparks: ['#ff2bd6', '#22f3ff'], width: 1,
  },
  {
    id: 'trail-ice', slot: Slot.TRAIL, name: 'Cryo Stream', price: 80, rarity: 'common',
    blurb: 'Frost-white core, glacier edges.',
    ribbon: ['#e6fdff', '#22c8ff'], wingRibbon: ['#ffffff', '#22c8ff'], sparks: ['#ffffff', '#7fe8ff'], width: 1,
  },
  {
    id: 'trail-ember', slot: Slot.TRAIL, name: 'Afterburner', price: 160, rarity: 'rare',
    blurb: 'Jet-engine heat haze.',
    ribbon: ['#ffd23f', '#ff3b1f'], wingRibbon: ['#ffb02b', '#ff3b1f'], sparks: ['#ffd23f', '#ff6a2b'], width: 1.15,
  },
  {
    id: 'trail-toxic', slot: Slot.TRAIL, name: 'Biohazard', price: 240, rarity: 'rare',
    blurb: 'Radioactive lime with a purple fringe.',
    ribbon: ['#c8ff2b', '#7b2bff'], wingRibbon: ['#c8ff2b', '#2bff88'], sparks: ['#c8ff2b', '#7b2bff'], width: 1.1,
  },
  {
    id: 'trail-prism', slot: Slot.TRAIL, name: 'Prismatic', price: 450, rarity: 'epic',
    blurb: 'Splits light into a full spectrum.',
    ribbon: ['#ff2bd6', '#22f3ff'], wingRibbon: ['#ffd23f', '#2bff88'], sparks: ['#ffd23f', '#22f3ff'], width: 1.3,
  },
  {
    id: 'trail-supernova', slot: Slot.TRAIL, name: 'Supernova', price: 750, rarity: 'legendary',
    blurb: 'Permanently in surge colours. Wide and blinding.',
    ribbon: ['#ffffff', '#ffcf5a'], wingRibbon: ['#ffffff', '#ff2bd6'], sparks: ['#ffffff', '#ffcf5a'], width: 1.5,
  },
]

export const WINGS = [
  {
    id: 'wings-standard', slot: Slot.WINGS, name: 'Standard Issue', price: 0, rarity: 'common',
    blurb: 'Neon-edged flight feathers.', style: 'standard',
  },
  {
    id: 'wings-blade', slot: Slot.WINGS, name: 'Laser Blades', price: 120, rarity: 'rare',
    blurb: 'Swept-back light blades on each wing.', style: 'blade',
  },
  {
    id: 'wings-halo', slot: Slot.WINGS, name: 'Halo', price: 200, rarity: 'rare',
    blurb: 'A spinning ring of light overhead.', style: 'halo',
  },
  {
    id: 'wings-jet', slot: Slot.WINGS, name: 'Jet Pods', price: 320, rarity: 'epic',
    blurb: 'Under-wing thrusters that flare in surge.', style: 'jet',
  },
  {
    id: 'wings-plume', slot: Slot.WINGS, name: 'Holo Plumes', price: 520, rarity: 'legendary',
    blurb: 'Fanned holographic feathers.', style: 'plume',
  },
]

export const CATALOG = [...SKINS, ...TRAILS, ...WINGS]
export const ITEMS_BY_SLOT = { [Slot.SKIN]: SKINS, [Slot.TRAIL]: TRAILS, [Slot.WINGS]: WINGS }
export const DEFAULT_LOADOUT = { skin: 'skin-classic', trail: 'trail-classic', wings: 'wings-standard' }

const byId = new Map(CATALOG.map((item) => [item.id, item]))
export const getItem = (id) => byId.get(id)

/** CSS gradient for an item card swatch. */
export function swatchFor(item) {
  if (item.slot === Slot.SKIN) {
    const c = item.colors
    return `radial-gradient(circle at 35% 35%, ${c.crest} 0 14%, transparent 15%), linear-gradient(135deg, ${c.body} 0%, ${c.glow} 55%, ${c.accent} 100%)`
  }
  if (item.slot === Slot.TRAIL) {
    return `linear-gradient(90deg, transparent 0%, ${item.ribbon[1]} 25%, ${item.ribbon[0]} 70%, #fff 100%)`
  }
  return 'linear-gradient(135deg, #1b1636, #2a1550)'
}
