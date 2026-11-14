/**
 * Which Amazon trees are drawn each frame, and at what level of detail. No React, no three.js.
 *
 * The forest used to be drawn whole, at full detail, every frame: about 12.6 million triangles
 * (and 4.2 million more for shadows), whichever way the camera faced. Now, every frame:
 *   - a tree outside the camera's view is not drawn at all
 *   - a tree in view is drawn at the detail its distance needs (amazonTrees.js AMAZON_TREE_LOD)
 * Nothing is removed from the forest: every tree is still there when the camera turns to it.
 *
 * `LAYERS` lists, nearest first, the levels a kind of item can be drawn at and the distance (in
 * metres from the camera, on the ground plane) at which each gives way to the next.
 */
export const AMAZON_LOD = Object.freeze({
  /** A tree keeps its current level until it is this far past a threshold, so it cannot flicker. */
  hysteresis: 1.5,
  tree: Object.freeze([{ level: 'near', until: 10 }, { level: 'mid', until: 28 }, { level: 'far', until: Infinity }]),
  distant: Object.freeze([{ level: 'distant', until: 66 }, { level: 'horizon', until: Infinity }]),
  /** Ferns, heliconia, bromeliads, roots and the like: one level, only hidden when out of view. */
  small: Object.freeze([{ level: 'near', until: Infinity }]),
})

/**
 * The level for an item `distance` away that was last drawn at index `previous` (-1 = not yet).
 * @returns the index into `layers`
 */
export function chooseLevel(layers, distance, previous = -1, hysteresis = AMAZON_LOD.hysteresis) {
  let index = 0
  while (index < layers.length - 1 && distance >= layers[index].until) index += 1
  if (previous < 0 || previous === index || previous >= layers.length) return index
  // stay at the previous level while within the hysteresis band of the threshold just crossed
  const edge = layers[Math.min(previous, index)].until
  return Math.abs(distance - edge) < hysteresis ? previous : index
}

/**
 * Prepares a set of items of one kind for per-frame selection.
 * @param items   placements ({ x, y, z, scale, rot })
 * @param reach   radius (metres at scale 1) of a sphere that contains one item's model
 * @param centre  height (metres at scale 1) of that sphere's centre above the item's position
 */
export function createLodSet(items, layers, { reach, centre }) {
  return {
    items,
    layers,
    spheres: items.map((item) => {
      const scale = item.scale ?? 1
      return [item.x, item.y + centre * scale, item.z, reach * scale]
    }),
    levels: new Int8Array(items.length).fill(-1),
    /** per level: the indices of the items to draw at it this frame, and how many */
    picked: layers.map(() => new Uint32Array(items.length)),
    counts: new Uint32Array(layers.length),
  }
}

/**
 * Chooses what to draw this frame. Fills `set.picked` / `set.counts`.
 * @param camera   { x, z } of the camera
 * @param inView   (x, y, z, radius) => boolean: whether that sphere can be seen
 * @returns the number of items drawn
 */
export function selectVisible(set, camera, inView) {
  set.counts.fill(0)
  let drawn = 0
  for (let i = 0; i < set.items.length; i += 1) {
    const [x, y, z, r] = set.spheres[i]
    const level = chooseLevel(set.layers, Math.hypot(x - camera.x, z - camera.z), set.levels[i])
    set.levels[i] = level // remembered even while out of view, so turning back does not pop
    if (!inView(x, y, z, r)) continue
    set.picked[level][set.counts[level]] = i
    set.counts[level] += 1
    drawn += 1
  }
  return drawn
}
