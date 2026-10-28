import { GAMES } from '../games/registry.js'
import { categoryCountsInZone, GAME_ZONES } from '../games/categories.js'
import { COURSE_CATALOG } from '../courses/catalog.js'
import { withQuizTile } from './QuizTile.jsx'

// What each home-page mode (zone) holds, counted once: the registry doesn't change while the page
// is open. The HTML course tile isn't a registry game but sits in its zone's grid, so its zone's
// pills count it too. (The 3D Game Studio card is a tool, not a game, so no pill counts it.)

/** The zone the Pro Coder (HTML course) tile sits in, set in courses/catalog.js like a game's `zone`. */
export const QUIZ_ZONE = COURSE_CATALOG.find((course) => course.id === 'html')?.zone ?? 'build-create'

const COUNTS = Object.fromEntries(GAME_ZONES.map((zone) => {
  const counts = categoryCountsInZone(GAMES, zone)
  return [zone, zone === QUIZ_ZONE ? withQuizTile(counts) : counts]
}))

/** Pill counts for one mode: { all, young, logic, arcade }. */
export const homeCounts = (zone) => COUNTS[zone] ?? COUNTS[GAME_ZONES[0]]

/** The mode that has something under this filter, preferring `current`; null if none does. */
export function modeWithFilter(filter, current) {
  if ((homeCounts(current)[filter] ?? 0) > 0) return current
  return GAME_ZONES.find((zone) => (homeCounts(zone)[filter] ?? 0) > 0) ?? null
}
