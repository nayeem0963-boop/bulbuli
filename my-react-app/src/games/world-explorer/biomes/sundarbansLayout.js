/**
 * Sundarbans layout constants (pure data, no imports). Shared by the map (sundarbans.js) and by
 * the terrain height field (rendering/terrain.js), which keeps stations, the spawn point and the
 * boardwalks on flat, readable ground. Coordinates in metres; y is up.
 */

/** [id, x, z, radius, look] for each mud island. */
export const SUNDARBANS_ISLANDS = Object.freeze([
  ['home', 0, 0, 6, 'mud'],
  ['s1', 15, 0, 4, 'sandbar'],
  ['s2', 15, 13, 4, 'mud'],
  ['s3', 1, 17, 4.5, 'mud'],
  ['s4', -12, 9, 4, 'mudflat'],
  ['s5', -13, -4, 4, 'mud'],
])

/** [boardwalk prefix, from island, to island]. */
export const SUNDARBANS_WALKS = Object.freeze([
  ['bw-a', 'home', 's1'],
  ['bw-b', 's1', 's2'],
  ['bw-c', 's2', 's3'],
  ['bw-d', 's3', 's4'],
  ['bw-e', 's4', 'home'],
  ['bw-f', 'home', 's5'],
])

export const SUNDARBANS_STATIONS = Object.freeze([
  { n: 1, disc: 's1', x: 16.5, z: -1.2 },
  { n: 2, disc: 's2', x: 16.6, z: 14 },
  { n: 3, disc: 's3', x: 1.5, z: 19 },
  { n: 4, disc: 's4', x: -13.5, z: 10 },
  { n: 5, disc: 's5', x: -14.5, z: -5 },
])

export const SUNDARBANS_SPAWN = Object.freeze({ position: [0, 0, -2], facing: Math.PI / 2 })

/** The village stands here (kept clear of trees). */
export const SUNDARBANS_VILLAGE = Object.freeze({ x: -20, z: -8 })
