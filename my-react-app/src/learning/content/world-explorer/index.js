/** World Explorer 3D wave 1 content: Sundarbans, Amazon, Sahara (all awaiting review). */
import { SUNDARBANS_ITEMS } from './sundarbans.js'
import { AMAZON_ITEMS } from './amazon.js'
import { SAHARA_ITEMS } from './sahara.js'
import { interactionFor } from './interactions.js'

/**
 * Each station item carries its hands-on Investigate activity inside `station`, so the activity is
 * part of the reviewable, hashed item (editing it invalidates both approvals).
 */
const withInteractions = (items) => Object.freeze(items.map((item) => (
  item.role === 'station' ? { ...item, station: { ...item.station, interaction: interactionFor(item.objective) } } : item
)))

export const WORLD_EXPLORER_ITEMS = Object.freeze({
  sundarbans: withInteractions(SUNDARBANS_ITEMS),
  amazon: withInteractions(AMAZON_ITEMS),
  sahara: withInteractions(SAHARA_ITEMS),
})
