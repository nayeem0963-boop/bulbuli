// The Play zone shows its games in two groups, picked with the Educational | Adventure switch.
//   educational  games built around one school skill: numbers, words, shapes, code, logic
//   adventure    games about moving through a world: running, flying, exploring in 3D
// Each game says which group it belongs to with `category` in registry.js.

export const GAME_CATEGORIES = ['educational', 'adventure']
export const DEFAULT_CATEGORY = 'educational'

/** A game's group. A game with no (or an unknown) category counts as Educational, so it never disappears. */
export function categoryOf(game) {
  return GAME_CATEGORIES.includes(game?.category) ? game.category : DEFAULT_CATEGORY
}

/** The games in one group, in registry order. Hidden (work-in-progress) games are left out. */
export function gamesInCategory(games, category) {
  return games.filter((game) => !game.hidden && categoryOf(game) === category)
}
