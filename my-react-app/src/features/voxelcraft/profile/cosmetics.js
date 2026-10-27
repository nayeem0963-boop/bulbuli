/**
 * Avatar cosmetics catalogue. Three slots (skin, shirt, trail); each item is a *finish*
 * (matte, chrome, glow, a trail effect…) and the player picks the colour separately. Items with
 * `fixedColor` ignore the picker (a rainbow is a rainbow).
 *
 * unlock: { type: 'free' }
 *         { type: 'gems', cost }                  bought once in the Creator Shop
 *         { type: 'badge', badge }                earned, never bought
 *         { type: 'medal', bestPlace }            any contest medal at this place or better (1 = gold)
 */

export const SLOTS = [
  { id: 'skin', label: 'Skin' },
  { id: 'shirt', label: 'Shirt' },
  { id: 'trail', label: 'Glow trail' },
]

export const COSMETICS = [
  // skin
  { id: 'skin_matte', slot: 'skin', name: 'Classic', blurb: 'Soft matte finish', unlock: { type: 'free' } },
  { id: 'skin_chrome', slot: 'skin', name: 'Chrome', blurb: 'Mirror-shiny metal', unlock: { type: 'gems', cost: 400 } },
  { id: 'skin_lava', slot: 'skin', name: 'Lava Core', blurb: 'Glows like molten rock', unlock: { type: 'badge', badge: 'Parkour King' } },
  // shirt
  { id: 'shirt_basic', slot: 'shirt', name: 'Basic Tee', blurb: 'Clean and simple', unlock: { type: 'free' } },
  { id: 'shirt_glow', slot: 'shirt', name: 'Neon Glow', blurb: 'Shirt lights up', unlock: { type: 'gems', cost: 250 } },
  { id: 'shirt_holo', slot: 'shirt', name: 'Holo Shift', blurb: 'Cycles through every hue', unlock: { type: 'badge', badge: 'Master Builder' }, fixedColor: true },
  // trail
  { id: 'trail_none', slot: 'trail', name: 'No trail', blurb: 'Keep it stealthy', unlock: { type: 'free' }, fixedColor: true },
  { id: 'trail_streak', slot: 'trail', name: 'Neon Streak', blurb: 'A smooth glowing stream', unlock: { type: 'free' } },
  { id: 'trail_sparks', slot: 'trail', name: 'Pixel Sparks', blurb: 'Tumbling voxel sparks', unlock: { type: 'gems', cost: 300 } },
  { id: 'trail_rainbow', slot: 'trail', name: 'Rainbow Ribbon', blurb: 'Every colour, all the time', unlock: { type: 'gems', cost: 800 }, fixedColor: true },
  { id: 'trail_creator', slot: 'trail', name: 'Creator Aura', blurb: 'Two-tone builder sparkle', unlock: { type: 'badge', badge: 'First Creator' } },
  { id: 'trail_comet', slot: 'trail', name: 'Silver Comet', blurb: 'Long shimmering tail', unlock: { type: 'medal', bestPlace: 2 }, fixedColor: true },
  { id: 'trail_flame', slot: 'trail', name: 'Champion Flame', blurb: 'Gold fire for contest winners', unlock: { type: 'badge', badge: 'Contest Winner' }, fixedColor: true },
]

export const COSMETIC_BY_ID = Object.fromEntries(COSMETICS.map((c) => [c.id, c]))

/** Free colour picks per slot (any hex is allowed through the custom picker too). */
export const PALETTES = {
  skin: ['#f5d0b4', '#e0a982', '#b97f5a', '#7b4a2e', '#6366f1', '#a855f7', '#34d399', '#f8fafc'],
  shirt: ['#6366f1', '#a855f7', '#10b981', '#f43f5e', '#f59e0b', '#06b6d4', '#1e293b', '#f8fafc'],
  trail: ['#34d399', '#818cf8', '#c084fc', '#22d3ee', '#f472b6', '#fbbf24', '#f8fafc', '#f43f5e'],
}

export const DEFAULT_LOOK = {
  skin: { item: 'skin_matte', color: '#6366f1' },
  shirt: { item: 'shirt_basic', color: '#10b981' },
  trail: { item: 'trail_streak', color: '#34d399' },
}

const HEX = /^#[0-9a-f]{6}$/i
export const isHex = (v) => typeof v === 'string' && HEX.test(v)

/** Best (lowest) medal place the player holds, or Infinity. */
export const bestMedalPlace = (player) => Math.min(Infinity, ...(player.medals ?? []).map((m) => m.place))

/** Whether the player can equip this item right now. */
export function isUnlocked(item, { player, cosmetics }) {
  if (!item) return false
  switch (item.unlock.type) {
    case 'free':
      return true
    case 'gems':
      return cosmetics.unlocked.includes(item.id)
    case 'badge':
      return player.badges.includes(item.unlock.badge)
    case 'medal':
      return bestMedalPlace(player) <= item.unlock.bestPlace
    default:
      return false
  }
}

const PLACE_NAME = { 1: 'gold', 2: 'silver', 3: 'bronze' }

/** Short human text for what unlocks an item ("300 gems", "Parkour King badge", …). */
export function unlockLabel(item) {
  const u = item.unlock
  if (u.type === 'gems') return `${u.cost} gems`
  if (u.type === 'badge') return `${u.badge} badge`
  if (u.type === 'medal') return u.bestPlace === 1 ? 'a gold contest medal' : `a ${PLACE_NAME[u.bestPlace]} medal or better`
  return 'Free'
}

/**
 * What the avatar actually wears: the equipped items, except any that aren't unlocked (e.g. an
 * edited save) fall back to the slot's default. Colours of fixed-colour items are ignored by
 * the renderer anyway.
 */
export function effectiveLook(state) {
  const out = {}
  for (const { id: slot } of SLOTS) {
    const e = state.cosmetics.equipped[slot] ?? DEFAULT_LOOK[slot]
    out[slot] = isUnlocked(COSMETIC_BY_ID[e.item], state) ? e : { ...DEFAULT_LOOK[slot], color: e.color }
  }
  return out
}
