/**
 * All Phase 2A learning content, gathered for the release gate (contentGate.js) and
 * `npm run content:report`.
 *
 * Stage 2A-2 adds Sky Watcher and Weather Flyer (all three bands); Stage 2A-3 adds the Sundarbans,
 * Amazon and Sahara expeditions. Wave 1 items (Sky Watcher, Weather Flyer, Sundarbans, Amazon, Sahara) are
 * authored in Stages 2A-2 / 2A-3 with verified sources, and stay "awaiting review" until real
 * reviewers approve them. Wave 2 follows after wave 1 review (design 0.2).
 */
import { SKY_WATCHER_ITEMS } from './sky-science/sky-watcher.js'
import { WEATHER_FLYER_ITEMS } from './sky-science/weather-flyer.js'
import { WORLD_EXPLORER_ITEMS } from './world-explorer/index.js'

export const SKY_SCIENCE_MISSIONS = Object.freeze([
  { id: 'sky-watcher', wave: 1 },
  { id: 'weather-flyer', wave: 1 },
  { id: 'moon-earth', wave: 2 },
  { id: 'planet-parade', wave: 2 },
  { id: 'planet-detectives', wave: 2 },
  { id: 'star-navigator', wave: 2 },
])

export const WORLD_EXPEDITIONS = Object.freeze([
  { id: 'sundarbans', wave: 1, playable: true },
  { id: 'amazon', wave: 1, playable: true },
  { id: 'sahara', wave: 1, playable: true },
  { id: 'himalaya', playable: false },
  { id: 'arctic', playable: false },
  { id: 'great-barrier-reef', playable: false },
])

/** Sky Science items by mission id (wave 2 missions have no items yet). */
export const SKY_SCIENCE_ITEMS = Object.freeze({
  'sky-watcher': SKY_WATCHER_ITEMS,
  'weather-flyer': WEATHER_FLYER_ITEMS,
})

/** @type {ReadonlyArray<object>} */
/** World Explorer items by expedition id (stations + report sets A and B). */
export { WORLD_EXPLORER_ITEMS }

export const ALL_CONTENT_ITEMS = Object.freeze([
  ...SKY_WATCHER_ITEMS,
  ...WEATHER_FLYER_ITEMS,
  ...WORLD_EXPLORER_ITEMS.sundarbans,
  ...WORLD_EXPLORER_ITEMS.amazon,
  ...WORLD_EXPLORER_ITEMS.sahara,
])
