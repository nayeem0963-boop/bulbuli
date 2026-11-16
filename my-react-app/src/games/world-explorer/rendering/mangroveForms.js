/**
 * Mangrove family / form tables shared by the layout (sundarbansScatter.js, pure data) and the
 * procedural models (mangroveTrees.js). No three.js imports here.
 */
export const MANGROVE_SPECIES = Object.freeze(['sundari', 'gewa', 'keora', 'garjan', 'goran'])

/** Number of seeded silhouettes ("forms") per family for each level of detail. */
export const MANGROVE_FORMS = Object.freeze({
  near: Object.freeze({ sundari: 3, gewa: 3, goran: 3, garjan: 2, keora: 2 }),
  mid: Object.freeze({ sundari: 2, gewa: 2, goran: 2, garjan: 2, keora: 2 }),
  far: 4,
})

/**
 * Far-forest silhouette per family: 0 broad tiered, 1 rounded multi-lobed, 2 tall narrow.
 * Form 3 (low bank shrubs) is chosen by the layout for low ground at the water's edge.
 */
export const FAR_FORM_OF = Object.freeze({ sundari: 0, gewa: 1, garjan: 1, goran: 1, keora: 2 })
