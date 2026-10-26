/** Locomotion states for PlayerPhysics. Exactly one is active per frame. */
export const PlayerMode = Object.freeze({
  RUN: 'RUN',         // grounded, running (includes riding up ramps)
  AIR: 'AIR',         // airborne: after a jump, walking off a ledge, wall jump, rail exit
  GLIDE: 'GLIDE',     // airborne + jump held while falling → slow descent
  SLIDE: 'SLIDE',     // grounded, low profile (head collider off) for a short time
  GRIND: 'GRIND',     // locked onto a rail, gravity off
  WALLRUN: 'WALLRUN', // stuck to a wall-run panel, gravity off, slowly sinking
})

export const MODE_LABELS = {
  RUN: 'Run',
  AIR: 'Air',
  GLIDE: 'Glide',
  SLIDE: 'Slide',
  GRIND: 'Grind',
  WALLRUN: 'Wall run',
}
