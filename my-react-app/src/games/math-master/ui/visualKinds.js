// Shared by the DOM (Stage) and the 3D scene, without pulling three.js into the DOM chunk.

/** Board-like figures face the player and can only tilt; solids spin all the way round. */
export const BOARD_VISUALS = ['coords', 'flat', 'tiles', 'bars', 'balance', 'matches']

export const isBoardVisual = (visual) => BOARD_VISUALS.includes(visual?.type)
