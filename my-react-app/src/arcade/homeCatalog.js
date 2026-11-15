import { catalogCounts } from '../catalog/learningCatalog.js'
import { GAME_ZONES } from '../games/categories.js'

// What each home-page mode (zone) holds, counted once from the learning catalogue
// (src/catalog/learningCatalog.js): one count per card, whatever its number of modes. Pro Coder and
// the 3D Game Studio are catalogue cards like the games, so they are counted too. Archived games
// (Neon Velocity) are not in the catalogue, so they are never counted.

const COUNTS = Object.fromEntries(GAME_ZONES.map((zone) => [zone, catalogCounts(zone)]))

/** Pill counts for one mode: { all, math, shapes, language, coding, create }. */
export const homeCounts = (zone) => COUNTS[zone] ?? COUNTS[GAME_ZONES[0]]

/** The mode that has something under this filter, preferring `current`; null if none does. */
export function modeWithFilter(filter, current) {
  if ((homeCounts(current)[filter] ?? 0) > 0) return current
  return GAME_ZONES.find((zone) => (homeCounts(zone)[filter] ?? 0) > 0) ?? null
}
