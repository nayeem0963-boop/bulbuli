// The home page groups its games by audience, picked with the pills above the game grid:
//   young    Young Learners       ages 3–8   tapping, shapes, first words, reflexes
//   logic    Logic & Typing       ages 6–12  maths, patterns, typing, coding and debugging
//   arcade   Arcade               ages 12+   fast 3D action and exploration
// Each game names its own group with `category` in registry.js. "All Games" is not a
// category a game can have: it is the default filter and shows every game.

export const GAME_CATEGORIES = ['young', 'logic', 'arcade']
export const ALL_GAMES = 'all'
/** The pills, in order. The first is the default view. */
export const CATEGORY_FILTERS = [ALL_GAMES, ...GAME_CATEGORIES]
export const DEFAULT_FILTER = ALL_GAMES

/** Age range each group is aimed at (shown on its pill). */
export const CATEGORY_AGES = { young: '3–8', logic: '6–12', arcade: '12+' }
export const CATEGORY_ICONS = { all: '🎮', young: '🧸', logic: '🧩', arcade: '🚀' }

/** A game's group, or null when it has none (or an unknown one). Such a game still shows under All Games. */
export function categoryOf(game) {
  return GAME_CATEGORIES.includes(game?.category) ? game.category : null
}

/** The games for one pill, in registry order. Hidden (work-in-progress) games are left out. */
export function gamesInCategory(games, filter) {
  const visible = games.filter((game) => !game.hidden)
  if (!GAME_CATEGORIES.includes(filter)) return visible // 'all' (or anything unknown)
  return visible.filter((game) => categoryOf(game) === filter)
}

/** How many games each pill would show: { all, young, logic, arcade }. */
export function categoryCounts(games) {
  return Object.fromEntries(CATEGORY_FILTERS.map((filter) => [filter, gamesInCategory(games, filter).length]))
}

// ---------- age zones ----------
// The home page also splits its games into two zones, each with its own heading and grid:
//   play-learn     Play & Learn      ages up to 12  puzzles, memory, maths, shapes, first 3D play
//   build-create   Build & Create    ages 12+       coding, typing, technical skills, advanced 3D challenges
// Each game names its zone with `zone` in registry.js. The ages describe who a zone is for;
// they never lock a game. The audience pills above still filter both zones.

export const GAME_ZONES = ['play-learn', 'build-create']
export const ZONE_ICONS = { 'play-learn': '🎈', 'build-create': '🛠️' }

/** A game's zone. A game without a valid one falls into Play & Learn, so it is never lost. */
export function zoneOf(game) {
  return GAME_ZONES.includes(game?.zone) ? game.zone : GAME_ZONES[0]
}

/** The games of one zone, in the order given (registry order). */
export function gamesInZone(games, zone) {
  return games.filter((game) => zoneOf(game) === zone)
}
