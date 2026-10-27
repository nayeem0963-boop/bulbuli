/**
 * Mock fixtures for the front-end shell. Every shape here mirrors what a future API would return,
 * so swapping these for fetch calls only touches the state provider's initial load.
 */

export const TABS = [
  { id: 'play', label: 'Play & Vote' },
  { id: 'build', label: 'Build Studio' },
  { id: 'leaderboards', label: 'Leaderboards' },
  { id: 'profile', label: 'My Profile' },
]

export const DEFAULT_TAB = 'build'

/** XP needed to finish a given level. Gentle curve: 1000, 1150, 1300, ... */
export const xpForLevel = (level) => 1000 + (level - 1) * 150

export const mockPlayer = {
  id: 'p_001',
  handle: 'NeonBuilder',
  avatarHue: 'indigo',
  level: 12,
  xp: 1840, // progress inside the current level
  gems: 1280,
  joined: '2026-03-14',
  badges: ['Early Crafter', 'Top 100 Builder', 'Vote Machine'],
  /** Medals from past weekly contests (1 = gold, 2 = silver, 3 = bronze). */
  medals: [
    { contestId: 'contest_lava_rush_2026-10-11', theme: 'Lava Rush Cup', place: 2, at: Date.UTC(2026, 9, 11, 18), levelTitle: 'Void Hopper' },
    { contestId: 'contest_sky_sprint_2026-09-27', theme: 'Sky High Sprint', place: 3, at: Date.UTC(2026, 8, 27, 18), levelTitle: 'Void Hopper' },
  ],
}

/**
 * Starter level for the Studio, as raw LevelState-shaped JSON. It goes through parseLevel()
 * like any loaded level, so ids, colours and spawn/finish markers are filled in and checked.
 * Grid cells: x/z in -10..9, y = 0 sits on the floor.
 */
const platformPath = [
  [-7, 0, -7], [-6, 0, -7], [-5, 0, -7], [-5, 0, -6], [-5, 0, -5],
  [-4, 1, -4], [-3, 1, -4], [-2, 2, -3], [-1, 2, -3],
  [3, 2, 1], [4, 2, 1], [5, 2, 2], [6, 1, 3], [7, 1, 4], [7, 0, 5], [7, 0, 6],
]
export const mockStarterLevel = {
  id: 'lvl_starter',
  title: 'Neon Leap',
  author: 'NeonBuilder',
  blocks: [
    { type: 'SPAWN', x: -7, y: 1, z: -7 },
    { type: 'FINISH', x: 7, y: 1, z: 6 },
    ...platformPath.map(([x, y, z], i) => ({ type: 'PLATFORM', x, y, z, color: i % 2 ? '#6366f1' : '#64748b' })),
    // supports under the raised path
    { type: 'PLATFORM', x: -4, y: 0, z: -4, color: '#334155' },
    { type: 'PLATFORM', x: -2, y: 1, z: -3, color: '#334155' },
    { type: 'PLATFORM', x: -2, y: 0, z: -3, color: '#334155' },
    // bounce pad across the lava pit
    { type: 'BOUNCE', x: 0, y: 2, z: -3 },
    { type: 'BOUNCE', x: 1, y: 0, z: -1 },
    ...[[0, -1], [1, 0], [2, 0], [0, 0], [2, -1], [1, 1], [2, 1]].map(([x, z]) => ({ type: 'LAVA', x, y: 0, z })),
  ],
}

// Community levels and the weekly contest live in ./communityLevels.js (real playable level data).

export const mockLeaderboard = [
  { rank: 1, handle: 'JumpKing_07', level: 41, votes: 18240, gems: 9800 },
  { rank: 2, handle: 'AeroAsh', level: 37, votes: 15102, gems: 8120 },
  { rank: 3, handle: 'PixelMira', level: 35, votes: 13877, gems: 7450 },
  { rank: 4, handle: 'GhostByte', level: 29, votes: 9031, gems: 5210 },
  { rank: 5, handle: 'Lumen', level: 26, votes: 7720, gems: 4630 },
  { rank: 6, handle: 'CubeCadet', level: 22, votes: 5288, gems: 3010 },
  { rank: 7, handle: 'NeonBuilder', level: 12, votes: 1873, gems: 1280 },
]

/** Rewards for mock actions, kept in one place so tuning doesn't mean hunting through components. */
export const REWARDS = {
  publishBuild: { xp: 250, gems: 40 },
  castVote: { xp: 0, gems: 10 }, // first upvote on each community level
  firstCreator: { xp: 500, gems: 0 }, // one-time bonus with the First Creator badge
  firstClear: { xp: 50, gems: 0 }, // first time you beat a given level
  medal: { 2: { xp: 400, gems: 100 }, 3: { xp: 200, gems: 50 } }, // gold pays the contest prize
}
