/**
 * Every avatar a player can pick on their dashboard. Pure data + rules (no React),
 * so the picker, the arcade header and the tests all agree.
 *
 * Kinds
 *   'image'    a picture; `image` is its path under src/assets/avatars/ (PlayerAvatar loads it)
 *   'bird'     the Bulbuli bird drawn in SVG (BirdArt.jsx) with a palette and an optional accessory
 *   'photo'    the player's account photo (Google), only offered when they have one
 *   'initial'  the first letter of their name on a colour
 *
 * unlockLevel  the player's level that unlocks it (levels come from XP; see src/lib/levels.js).
 * bg           the circle behind the character.
 *
 * Ids are saved to the player's account, so never rename one that has shipped.
 */
export const DEFAULT_AVATAR_ID = 'bulbuli'

// the 13 animal friends: art in src/assets/avatars/animals/<id>.webp (circle art, so a sky-to-sun bg)
const animal = (id, name, species) => ({
  id, name, species, kind: 'image', group: 'animals', image: `animals/${id}.webp`,
  bg: 'linear-gradient(160deg, #bae6fd, #fef3c7)',
})

export const AVATARS = [
  animal('bulbuli', 'Bulbuli', 'Bird'),
  animal('hoppy',   'Hoppy',   'Hare'),
  animal('shelly',  'Shelly',  'Turtle'),
  animal('fawnley', 'Fawnley', 'Deer'),
  animal('roary',   'Roary',   'Tiger'),
  animal('dashy',   'Dashy',   'Cheetah'),
  animal('leo',     'Leo',     'Lion'),
  animal('sky',     'Sky',     'Eagle'),
  animal('miskiti', 'Miskiti', 'Cat'),
  animal('buddy',   'Buddy',   'Dog'),
  animal('finny',   'Finny',   'Dolphin'),
  animal('buzzy',   'Buzzy',   'Bee'),
  animal('pip',     'Pip',     'Ant'),

  { id: 'classic', name: 'Classic', kind: 'bird', group: 'characters', bg: 'linear-gradient(160deg, #e0f2fe, #f0f9ff)' },
  {
    id: 'sunny', name: 'Sunny', kind: 'bird', group: 'characters', bg: 'linear-gradient(160deg, #fef3c7, #fffbeb)',
    palette: { body: '#f59e0b', cap: '#b45309', wing: '#d97706', tail: '#92400e', vent: '#ef4444' },
  },
  {
    id: 'berry', name: 'Berry', kind: 'bird', group: 'characters', bg: 'linear-gradient(160deg, #fce7f3, #fdf2f8)',
    palette: { body: '#f472b6', cap: '#9d174d', wing: '#db2777', tail: '#831843', vent: '#7c3aed' },
  },
  {
    id: 'mint', name: 'Mint', kind: 'bird', group: 'characters', bg: 'linear-gradient(160deg, #d1fae5, #ecfdf5)',
    palette: { body: '#34d399', cap: '#065f46', wing: '#059669', tail: '#064e3b', vent: '#f59e0b' },
  },
  {
    id: 'ocean', name: 'Ocean', kind: 'bird', group: 'characters', bg: 'linear-gradient(160deg, #dbeafe, #eff6ff)',
    palette: { body: '#60a5fa', cap: '#1e3a8a', wing: '#2563eb', tail: '#1e40af', vent: '#f43f5e' },
  },

  { id: 'scholar', name: 'Scholar', kind: 'bird', group: 'levels', unlockLevel: 3, accessory: 'scholar', bg: 'linear-gradient(160deg, #e0e7ff, #eef2ff)' },
  {
    id: 'royal', name: 'Royal', kind: 'bird', group: 'levels', unlockLevel: 5, accessory: 'crown', bg: 'linear-gradient(160deg, #ede9fe, #faf5ff)',
    palette: { body: '#a78bfa', cap: '#4c1d95', wing: '#7c3aed', tail: '#5b21b6', vent: '#f59e0b' },
  },
  {
    id: 'astro', name: 'Astro', kind: 'bird', group: 'levels', unlockLevel: 8, accessory: 'astro', bg: 'radial-gradient(circle at 30% 25%, #334155, #0f172a 70%)',
    palette: { body: '#cbd5e1', cap: '#334155', wing: '#94a3b8', tail: '#475569', vent: '#f43f5e' },
  },
  {
    id: 'wizard', name: 'Wizard', kind: 'bird', group: 'levels', unlockLevel: 10, accessory: 'wizard', bg: 'linear-gradient(160deg, #c4b5fd, #ede9fe)',
    palette: { body: '#8a7466', cap: '#1b2a49' },
  },

  { id: 'photo', name: 'My photo', kind: 'photo', group: 'mine', bg: '#e2e8f0' },
  { id: 'initial', name: 'My letter', kind: 'initial', group: 'mine', bg: 'linear-gradient(160deg, #a855f7, #7e22ce)' },
]

export const AVATAR_GROUPS = [
  ['animals', 'Animal friends'],
  ['characters', 'Bulbuli colours'],
  ['levels', 'Level up to unlock'],
  ['mine', 'Just me'],
]

const BY_ID = new Map(AVATARS.map((avatar) => [avatar.id, avatar]))
export const getAvatar = (id) => BY_ID.get(id)

/** Why an avatar can't be picked right now, or null if it can. */
export function lockReason(avatar, { level = 1, hasPhoto = false } = {}) {
  if (!avatar) return 'Unknown avatar'
  if (avatar.unlockLevel && level < avatar.unlockLevel) return `Reach level ${avatar.unlockLevel}`
  if (avatar.kind === 'photo' && !hasPhoto) return 'No account photo'
  return null
}

/**
 * The avatar to show. The player's choice when it's still available; otherwise the mascot.
 * (The initial-letter avatar is the last resort, used by PlayerAvatar if an image can't load.)
 */
export function resolveAvatar(selectedId, context = {}) {
  const chosen = getAvatar(selectedId)
  if (chosen && !lockReason(chosen, context)) return chosen
  return getAvatar(DEFAULT_AVATAR_ID)
}

/** Only real avatar ids are saved. */
export const isAvatarId = (id) => typeof id === 'string' && BY_ID.has(id)
