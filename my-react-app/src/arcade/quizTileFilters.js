/**
 * Filter helpers for the Pro Coder quiz tile (QuizTile.jsx). Kept out of the component file so
 * QuizTile.jsx exports only components (Fast Refresh boundary).
 */

/** The audience pills the quiz tile shows under ('all' = All Games). */
const QUIZ_FILTERS = ['all', 'logic']
export const showQuizTile = (filter) => QUIZ_FILTERS.includes(filter)

/** Adds the quiz tile to the pill counts from categoryCounts(), so each pill matches the cards shown. */
export const withQuizTile = (counts) =>
  Object.fromEntries(Object.entries(counts).map(([filter, n]) => [filter, n + (showQuizTile(filter) ? 1 : 0)]))
